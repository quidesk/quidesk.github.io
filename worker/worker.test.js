import { describe, it, expect, vi, afterEach } from 'vitest';
import worker, { getCorsOrigin, withHeaders, buildNormalizedCacheKey } from './index.js';
import { buildAssetQuote, handleQuotes } from './routes/quotes.js';
import { handleHistory } from './routes/history.js';
import { extractStrictAssetTags, parseRssXml } from './providers/news.js';
import { checkMetalsBasis } from './providers/metals.js';
import { determineSessionState, fetchFrontMonthBrent } from './providers/yahoo.js';
import { fetchMultiTierCrypto } from './providers/crypto.js';
import { fetchFrankfurterFallback } from './providers/forex.js';
import { ASSET_DEFINITIONS } from './config.js';
import quotesFixture from './fixtures/quotes.fixture.json';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Cloudflare Worker — Phase 1 Contract & Schema Validation', () => {
  describe('1. Top-level Response & Asset Quote Schema', () => {
    it('fixture conforms to top-level contract schema', () => {
      expect(quotesFixture).toHaveProperty('schemaVersion', '1.0.0');
      expect(quotesFixture).toHaveProperty('generatedAt');
      expect(quotesFixture).toHaveProperty('assets');
      expect(quotesFixture).toHaveProperty('health');
      expect(quotesFixture.health).toHaveProperty('perSource');
    });

    it('every asset quote strictly implements the required contract schema', () => {
      const requiredFields = [
        'id', 'symbol', 'name', 'sector', 'unit', 'price',
        'prevClose', 'change', 'changeStatus', 'changeBasis', 'quoteTs',
        'fetchedAt', 'source', 'session', 'status', 'flags', 'spark1d'
      ];

      for (const [id, asset] of Object.entries(quotesFixture.assets)) {
        for (const field of requiredFields) {
          expect(asset, `Asset ${id} missing field ${field}`).toHaveProperty(field);
        }
        expect(['prev_close', 'rolling_24h', 'vs prior ECB fix']).toContain(asset.changeBasis);
        expect(['regular', 'pre', 'post', 'closed', '24x7']).toContain(asset.session);
        expect(['live', 'delayed', 'closed', 'stale', 'unavailable']).toContain(asset.status);
        expect(['available', 'unavailable']).toContain(asset.changeStatus);
        expect(Array.isArray(asset.flags)).toBe(true);
        expect(Array.isArray(asset.spark1d)).toBe(true);
        expect(asset.spark1d.length).toBeLessThanOrEqual(60);
      }
      expect(quotesFixture.fx).toHaveProperty('usdaed', 3.6725);
    });

    it('returns change:null and changeStatus:unavailable when prevClose is missing while keeping price', () => {
      const def = ASSET_DEFINITIONS.nvda;
      const quote = buildAssetQuote(def, {
        price: 185.20,
        prevClose: null,
        quoteTs: 1794360000000,
        session: 'regular',
        source: 'yahoo',
      }, 1794360005000);

      expect(quote.price).toBe(185.20);
      expect(quote.prevClose).toBeNull();
      expect(quote.change).toBeNull();
      expect(quote.changeStatus).toBe('unavailable');
      expect(quote.status).toBe('live');
    });

    it('returns quoteTs:null and status:stale when provider gives no timestamp (never defaults to now)', () => {
      const def = ASSET_DEFINITIONS.aapl;
      const now = 1794360005000;
      const quote = buildAssetQuote(def, {
        price: 225.50,
        prevClose: 224.00,
        quoteTs: null,
        session: 'regular',
        source: 'yahoo',
      }, now);

      expect(quote.quoteTs).toBeNull();
      expect(quote.status).toBe('stale');
      expect(quote.change).toBe(0.67);
    });

    it('change is strictly computed as ((price - prevClose) / prevClose) * 100 to 2dp', () => {
      const def = ASSET_DEFINITIONS.spx;
      const raw = {
        price: 749.92,
        prevClose: 752.69,
        quoteTs: Date.now(),
        session: 'regular',
        source: 'yahoo',
      };

      const quote = buildAssetQuote(def, raw);
      const expected = parseFloat((((749.92 - 752.69) / 752.69) * 100).toFixed(2));
      expect(quote.change).toBe(expected);
      expect(quote.change).toBe(-0.37);
    });
  });

  describe('2. Session & Staleness Status Transitions', () => {
    const def = ASSET_DEFINITIONS.aapl;
    const now = 1794360000000;

    it('marks asset closed when session is closed, regardless of age', () => {
      const raw = { price: 348.51, prevClose: 350.00, quoteTs: now - 3600000, session: 'closed' };
      const quote = buildAssetQuote(def, raw, now);
      expect(quote.session).toBe('closed');
      expect(quote.status).toBe('closed');
    });

    it('marks asset stale only if session expects live data and age exceeds threshold', () => {
      const freshRaw = { price: 348.51, prevClose: 350.00, quoteTs: now - 60000, session: 'regular' };
      const freshQuote = buildAssetQuote(def, freshRaw, now);
      expect(freshQuote.status).toBe('live');

      const staleRaw = { price: 348.51, prevClose: 350.00, quoteTs: now - 1000000, session: 'regular' };
      const staleQuote = buildAssetQuote(def, staleRaw, now);
      expect(staleQuote.status).toBe('stale');
    });

    it('marks crypto stale after 120 seconds in 24x7 session', () => {
      const btcDef = ASSET_DEFINITIONS.btc;
      const fresh = buildAssetQuote(btcDef, { price: 73000, prevClose: 72000, quoteTs: now - 60000 }, now);
      expect(fresh.status).toBe('live');

      const stale = buildAssetQuote(btcDef, { price: 73000, prevClose: 72000, quoteTs: now - 130000 }, now);
      expect(stale.status).toBe('stale');
    });

    it('marks unavailable if price is missing or invalid', () => {
      const invalid = buildAssetQuote(def, { price: null, prevClose: null }, now);
      expect(invalid.status).toBe('unavailable');
      expect(invalid.price).toBeNull();
      expect(invalid.change).toBeNull();
      expect(invalid.changeStatus).toBe('unavailable');
    });

    it('uses DST-safe Intl America/New_York session windows and Yahoo marketState', () => {
      // 2026-01-15T14:00:00Z = 09:00 AM EST (pre-market)
      const winterPre = Math.floor(Date.parse('2026-01-15T14:00:00Z') / 1000);
      expect(determineSessionState(null, winterPre, 'equities', null)).toBe('pre');

      // 2026-07-15T14:00:00Z = 10:00 AM EDT (regular session under DST)
      const summerRegular = Math.floor(Date.parse('2026-07-15T14:00:00Z') / 1000);
      expect(determineSessionState(null, summerRegular, 'equities', null)).toBe('regular');

      // 2026-07-15T20:05:00Z = 16:05 PM EDT (post-market)
      const summerPost = Math.floor(Date.parse('2026-07-15T20:05:00Z') / 1000);
      expect(determineSessionState(null, summerPost, 'equities', null)).toBe('post');

      // Explicit CLOSED marketState overrides generic period
      expect(determineSessionState(null, summerRegular, 'equities', 'CLOSED')).toBe('closed');
    });

    it('manages CME energy futures electronic trading schedule and daily 17:00-18:00 ET break', () => {
      // Mon 17:30 EDT = 21:30 UTC -> inside 17:00-18:00 ET maintenance break -> closed
      const monBreak = Math.floor(Date.parse('2026-07-13T21:30:00Z') / 1000);
      expect(determineSessionState(null, monBreak, 'energy', null)).toBe('closed');

      // Mon 18:30 EDT = 22:30 UTC -> active electronic trading -> regular
      const monElectronic = Math.floor(Date.parse('2026-07-13T22:30:00Z') / 1000);
      expect(determineSessionState(null, monElectronic, 'energy', null)).toBe('regular');

      // Sun 17:00 EDT = 21:00 UTC -> before 18:00 ET open -> closed
      const sunBeforeOpen = Math.floor(Date.parse('2026-07-12T21:00:00Z') / 1000);
      expect(determineSessionState(null, sunBeforeOpen, 'energy', null)).toBe('closed');

      // Sun 18:15 EDT = 22:15 UTC -> electronic session open -> regular
      const sunOpen = Math.floor(Date.parse('2026-07-12T22:15:00Z') / 1000);
      expect(determineSessionState(null, sunOpen, 'energy', null)).toBe('regular');

      // Fri 17:15 EDT = 21:15 UTC -> after 17:00 ET close -> closed
      const friAfterClose = Math.floor(Date.parse('2026-07-17T21:15:00Z') / 1000);
      expect(determineSessionState(null, friAfterClose, 'energy', null)).toBe('closed');
    });

    it('labels Frankfurter ECB fallback with ECB rate date, status delayed, and vs prior ECB fix', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify({
        base: 'USD',
        rates: {
          '2026-11-10': { EUR: 0.8950, GBP: 0.7490, JPY: 158.10, INR: 93.80, SGD: 1.3300 },
          '2026-11-11': { EUR: 0.8939, GBP: 0.7482, JPY: 158.56, INR: 93.96, SGD: 1.3320 },
        },
      }), { status: 200 }));

      const fx = await fetchFrankfurterFallback();
      const quote = buildAssetQuote(ASSET_DEFINITIONS.eurusd, fx.eurusd, Date.now());

      expect(quote.source).toBe('ECB daily ref');
      expect(quote.status).toBe('delayed');
      expect(quote.changeBasis).toBe('vs prior ECB fix');
      expect(quote.quoteTs).toBe(Date.parse('2026-11-11T00:00:00Z'));
    });

    it('never invokes Frankfurter while Yahoo FX works and exposes fx.usdsgd + AED 3.6725 peg', async () => {
      let frankfurterCalls = 0;
      vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
        const url = typeof input === 'string' ? input : input.url;
        if (url.includes('frankfurter.dev')) {
          frankfurterCalls++;
          return new Response('{}', { status: 500 });
        }
        if (url.includes('query1.finance.yahoo.com')) {
          const isSgd = url.includes('SGD%3DX');
          const price = isSgd ? 1.3312 : 1.12;
          return new Response(JSON.stringify({
            chart: {
              result: [{
                meta: {
                  regularMarketPrice: price,
                  chartPreviousClose: isSgd ? 1.33 : 1.11,
                  regularMarketTime: Math.floor(Date.now() / 1000) - 5,
                  marketState: 'REGULAR',
                },
                timestamp: [1794359000, 1794359300],
                indicators: { quote: [{ close: [price - 0.001, price] }] },
              }],
            },
          }), { status: 200 });
        }
        if (url.includes('binance.vision')) {
          return new Response(JSON.stringify([
            { symbol: 'BTCUSDT', lastPrice: '80000', prevClosePrice: '79000', closeTime: Date.now() },
          ]), { status: 200 });
        }
        if (url.includes('gold-api.com')) {
          return new Response(JSON.stringify([]), { status: 200 });
        }
        return new Response('{}', { status: 404 });
      });

      const payload = await handleQuotes(new Request('https://worker.internal/v1/quotes'), {});
      expect(frankfurterCalls).toBe(0);
      expect(payload.assets.eurusd.source).toBe('yahoo');
      expect(payload.assets.gold.name).toContain('(fut.)');
      expect(payload.fx).toEqual({ usdsgd: 1.3312, usdaed: 3.6725 });
    });
  });

  describe('3. Metals Spot vs Futures Basis Detection', () => {
    it('defines all metals headlines as (fut.) and sets spot_futures_basis flag when divergence > 0.50%', () => {
      expect(ASSET_DEFINITIONS.gold.name).toContain('(fut.)');
      expect(ASSET_DEFINITIONS.silver.name).toContain('(fut.)');
      expect(ASSET_DEFINITIONS.platinum.name).toContain('(fut.)');

      // 1% divergence
      const basis = checkMetalsBasis(4040.00, 4000.00);
      expect(basis.flags).toContain('spot_futures_basis');
      expect(basis.basisDivergence).toBe(1.00);
    });

    it('does not flag when divergence is within 0.50%', () => {
      // 0.25% divergence
      const basis = checkMetalsBasis(4010.00, 4000.00);
      expect(basis.flags).toEqual([]);
      expect(basis.basisDivergence).toBe(0.25);
    });
  });

  describe('4. Strict OSINT News Asset Tagging', () => {
    it('correctly matches required test cases with canonical btc asset id only', () => {
      const testCases = [
        "Bitcoin Short-Term Holders...",
        "Bitcoin Miner HIVE Eyes $45 Million...",
        "Trump Media Posts $410 Million Profit. Bitcoin...",
        "Bitcoin devs merge 3 new BIPs...",
        "MARA dumps Bitcoin...",
      ];

      for (const title of testCases) {
        const tags = extractStrictAssetTags(title);
        expect(tags).toEqual(['btc']);
      }
    });

    it('bans false positives including Tether/consolidate/solution/Canada/method/spy thriller/Apple pie/Fed inflation', () => {
      const negativeCases = [
        "Tether's Tiny AI Agent Beats Models...",
        "Federal Reserve holds rates steady amid stubborn inflation pressures",
        "Companies consolidate market share",
        "A novel blockchain solution is presented",
        "Regulators in Canada approve new framework",
        "Researchers test new cryptographic method",
        "Hollywood spy thriller opens at number one",
        "Best autumn Apple pie recipe for Thanksgiving",
        "New ADA compliance deadline looms for fintech apps",
        "Study conducts meta analysis of market microstructure",
      ];

      for (const text of negativeCases) {
        const tags = extractStrictAssetTags(text);
        expect(tags, `Expected [] for "${text}"`).toEqual([]);
      }
    });

    it('tags European Gas Prices -> ng, and caps tags at max 3 without defaults', () => {
      expect(extractStrictAssetTags("European Gas Prices Rebound on Iran War")).toEqual(['ng']);
      expect(extractStrictAssetTags("Dow Jones industrial index drops")).toEqual(['dow']);
      expect(extractStrictAssetTags("Markets slowdown as growth drops down")).toEqual([]);
      expect(extractStrictAssetTags("Bitcoin, Ethereum, Solana, and XRP rally together")).toHaveLength(3);
    });

    it('parses RSS XML feed blocks with asset IDs and keeps zero-match items empty (sector tag only)', () => {
      const recentDate = new Date(Date.now() - 3600000).toUTCString();
      const sampleXml = `
        <rss><channel>
          <item>
            <title><![CDATA[Bitcoin Breaks Higher As Inflation Cools]]></title>
            <link>https://decrypt.co/12345?utm_source=rss</link>
            <pubDate>${recentDate}</pubDate>
            <description><![CDATA[Crypto markets reacted positively to the latest consumer price index.]]></description>
          </item>
          <item>
            <title><![CDATA[Fed Officials Debate Policy Path Amid Sticky Inflation]]></title>
            <link>https://cnbc.com/999?utm_source=rss</link>
            <pubDate>${recentDate}</pubDate>
            <description><![CDATA[Policymakers signaled patience before easing rates further.]]></description>
          </item>
        </channel></rss>
      `;

      const articles = parseRssXml(sampleXml, 'Decrypt', 'crypto');
      expect(articles.length).toBe(2);
      expect(articles[0].title).toBe('Bitcoin Breaks Higher As Inflation Cools');
      expect(articles[0].link).toBe('https://decrypt.co/12345');
      expect(articles[0].assetTags).toEqual(['btc']);
      expect(articles[0].isSponsored).toBe(false);
      // Zero matches => sector tag remains, assetTags stays empty (no default asset tag)
      expect(articles[1].sector).toBe('crypto');
      expect(articles[1].assetTags).toEqual([]);
    });

    it('drops items older than 24 hours or with unparseable dates', () => {
      const oldDate = new Date(Date.now() - 25 * 3600 * 1000).toUTCString();
      const freshDate = new Date(Date.now() - 2 * 3600 * 1000).toUTCString();
      const xml = `
        <rss><channel>
          <item>
            <title>Old Story</title>
            <link>https://example.com/old</link>
            <pubDate>${oldDate}</pubDate>
          </item>
          <item>
            <title>Corrupted Date Story</title>
            <link>https://example.com/corrupt</link>
            <pubDate>not-a-valid-date-string</pubDate>
          </item>
          <item>
            <title>Fresh Story</title>
            <link>https://example.com/fresh</link>
            <pubDate>${freshDate}</pubDate>
          </item>
        </channel></rss>
      `;
      const articles = parseRssXml(xml, 'Reuters', 'equities');
      expect(articles).toHaveLength(1);
      expect(articles[0].title).toBe('Fresh Story');
    });

    it('tags "U.S. crude oil declines to $85" with WTI and shows in energy sector, NOT equities', () => {
      const freshDate = new Date(Date.now() - 1800000).toUTCString();
      const xml = `
        <rss><channel>
          <item>
            <title>U.S. crude oil declines to $85</title>
            <link>https://example.com/crude-oil-85</link>
            <pubDate>${freshDate}</pubDate>
            <description>Energy markets reflect easing supply constraints</description>
          </item>
        </channel></rss>
      `;
      const articles = parseRssXml(xml, 'Bloomberg Markets', 'equities');
      expect(articles).toHaveLength(1);
      expect(articles[0].assetTags).toContain('wti');
      expect(articles[0].sector).toBe('energy');
      expect(articles[0].sector).not.toBe('equities');
    });
  });

  describe('5. CORS & Request Routing', () => {
    const mockEnv = {
      ALLOWED_ORIGINS: 'https://quidesk.github.io,http://localhost:3000',
    };

    it('permits whitelisted origins and rejects unauthorized origins', () => {
      expect(getCorsOrigin('https://quidesk.github.io', mockEnv)).toBe('https://quidesk.github.io');
      expect(getCorsOrigin('http://localhost:3000', mockEnv)).toBe('http://localhost:3000');
      expect(getCorsOrigin('https://malicious-site.com', mockEnv)).toBeNull();
    });

    it('attaches proper CORS and security headers without wildcard fallback', () => {
      const rawRes = new Response(JSON.stringify({ ok: true }));
      const wrapped = withHeaders(rawRes, 'https://quidesk.github.io', 'public, max-age=15');

      expect(wrapped.headers.get('Access-Control-Allow-Origin')).toBe('https://quidesk.github.io');
      expect(wrapped.headers.get('Cache-Control')).toBe('public, max-age=15');
      expect(wrapped.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(wrapped.headers.get('X-Frame-Options')).toBe('DENY');

      const blocked = withHeaders(rawRes, null);
      expect(blocked.headers.get('Access-Control-Allow-Origin')).toBeNull();
    });

    it('handles OPTIONS preflight with 204 status', async () => {
      const optReq = new Request('http://worker.internal/v1/quotes', {
        method: 'OPTIONS',
        headers: { Origin: 'https://quidesk.github.io' },
      });
      const res = await worker.fetch(optReq, mockEnv);
      expect(res.status).toBe(204);
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://quidesk.github.io');
    });
  });

  describe('6. Multi-Tier Crypto Provider (Phase 1)', () => {
    const cryptoIds = ['btc', 'eth', 'sol', 'bnb', 'xrp', 'ada'];

    it('every provider failing => all six crypto assets unavailable, and no 0 in the output', async () => {
      vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
        return new Response('Internal Server Error', { status: 500 });
      });

      const payload = await handleQuotes(new Request('https://worker.internal/v1/quotes'), {});
      for (const id of cryptoIds) {
        const asset = payload.assets[id];
        expect(asset.price).toBeNull();
        expect(asset.prevClose).toBeNull();
        expect(asset.change).toBeNull();
        expect(asset.changeStatus).toBe('unavailable');
        expect(asset.status).toBe('unavailable');
        // Strict guard: NEVER 0
        expect(asset.price).not.toBe(0);
        expect(asset.change).not.toBe(0);
      }
      expect(payload.health.perSource.binance.ok).toBe(false);
      expect(payload.health.perSource.kraken.ok).toBe(false);
      expect(payload.health.perSource.cryptocompare.ok).toBe(false);
    });

    it('one provider succeeding (Binance only) => only its values and binance source', async () => {
      vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
        const url = typeof input === 'string' ? input : input.url;
        if (url.includes('binance.vision')) {
          return new Response(JSON.stringify([
            { symbol: 'BTCUSDT', lastPrice: '85000', openPrice: '82000', closeTime: Date.now() },
            { symbol: 'ETHUSDT', lastPrice: '3200', openPrice: '3100', closeTime: Date.now() },
          ]), { status: 200 });
        }
        return new Response('Fail', { status: 500 });
      });

      const payload = await handleQuotes(new Request('https://worker.internal/v1/quotes'), {});
      expect(payload.assets.btc.price).toBe(85000);
      expect(payload.assets.btc.source).toBe('binance');
      expect(payload.assets.btc.status).toBe('live');
      expect(payload.assets.btc.change).toBe(3.66);

      expect(payload.assets.eth.price).toBe(3200);
      expect(payload.assets.eth.source).toBe('binance');

      // The remaining 4 symbols should be unavailable and NOT 0
      for (const id of ['sol', 'bnb', 'xrp', 'ada']) {
        expect(payload.assets[id].price).toBeNull();
        expect(payload.assets[id].status).toBe('unavailable');
        expect(payload.assets[id].price).not.toBe(0);
      }
      expect(payload.health.perSource.binance.ok).toBe(true);
      expect(payload.health.perSource.kraken.ok).toBe(false);
      expect(payload.health.perSource.cryptocompare.ok).toBe(false);
    });

    it('BNB-only fallback case: Kraken satisfies non-BNB, CryptoCompare provides BNB', async () => {
      vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
        const url = typeof input === 'string' ? input : input.url;
        // Binance fails completely
        if (url.includes('binance.vision')) {
          return new Response('Fail', { status: 500 });
        }
        // Kraken succeeds for BTC, ETH, SOL, XRP, ADA (BNB not on Kraken)
        if (url.includes('api.kraken.com')) {
          return new Response(JSON.stringify({
            result: {
              XXBTZUSD: { c: ['86000'], o: '84000' },
              XETHZUSD: { c: ['3300'], o: '3200' },
              SOLUSD: { c: ['180'], o: '175' },
              XXRPZUSD: { c: ['1.15'], o: '1.10' },
              ADAUSD: { c: ['0.75'], o: '0.70' },
            }
          }), { status: 200 });
        }
        // CryptoCompare satisfies BNB
        if (url.includes('cryptocompare.com')) {
          return new Response(JSON.stringify({
            RAW: {
              BNB: { USD: { PRICE: 650, OPEN24HOUR: 630, LASTUPDATE: Math.floor(Date.now() / 1000) } }
            }
          }), { status: 200 });
        }
        return new Response('Fail', { status: 500 });
      });

      const payload = await handleQuotes(new Request('https://worker.internal/v1/quotes'), {});
      expect(payload.assets.btc.price).toBe(86000);
      expect(payload.assets.btc.source).toBe('kraken');

      expect(payload.assets.bnb.price).toBe(650);
      expect(payload.assets.bnb.source).toBe('cryptocompare');
      expect(payload.assets.bnb.status).toBe('live');
      expect(payload.assets.bnb.change).toBe(3.17);

      expect(payload.health.perSource.binance.ok).toBe(false);
      expect(payload.health.perSource.kraken.ok).toBe(true);
      expect(payload.health.perSource.cryptocompare.ok).toBe(true);
    });
  });

  describe('8. Phase 2: Real History Route Contract (/v1/history)', () => {
    it('crypto history returns real points from CryptoCompare when available', async () => {
      vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
        const url = typeof input === 'string' ? input : input.url;
        if (url.includes('cryptocompare.com/data/v2/histohour')) {
          const list = Array.from({ length: 24 }, (_, i) => ({
            time: 1700000000 + i * 3600,
            close: 80000 + i * 100,
          }));
          return new Response(JSON.stringify({
            Response: 'Success',
            Data: { Data: list },
          }), { status: 200 });
        }
        return new Response('Fail', { status: 500 });
      });

      const res = await handleHistory(new Request('https://worker.internal/v1/history?id=btc&range=24H'), {});
      expect(res.id).toBe('btc');
      expect(res.source).toBe('cryptocompare');
      expect(res.granularity).toBe('1h');
      expect(res.points).toHaveLength(24);
      expect(res.points[0]).toHaveProperty('t');
      expect(res.points[0]).toHaveProperty('v');
      expect(res.points[0].v).toBe(80000);
      expect(res.points[23].v).toBe(82300);
    });

    it('crypto history falls back to Binance klines when CryptoCompare fails', async () => {
      vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
        const url = typeof input === 'string' ? input : input.url;
        if (url.includes('cryptocompare.com')) {
          return new Response('Fail', { status: 500 });
        }
        if (url.includes('binance.vision/api/v3/klines')) {
          const list = Array.from({ length: 24 }, (_, i) => [
            1700000000000 + i * 3600000,
            '3000', '3100', '2900', (3000 + i * 10).toString(), '1000'
          ]);
          return new Response(JSON.stringify(list), { status: 200 });
        }
        return new Response('Fail', { status: 500 });
      });

      const res = await handleHistory(new Request('https://worker.internal/v1/history?id=eth&range=24H'), {});
      expect(res.id).toBe('eth');
      expect(res.source).toBe('binance');
      expect(res.granularity).toBe('1h');
      expect(res.points).toHaveLength(24);
      expect(res.points[0].v).toBe(3000);
      expect(res.points[23].v).toBe(3230);
    });

    it('equities/energy/metals returns 15m granularity and yahoo source', async () => {
      vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
        const url = typeof input === 'string' ? input : input.url;
        if (url.includes('query1.finance.yahoo.com')) {
          const timestamps = Array.from({ length: 30 }, (_, i) => 1700000000 + i * 900);
          const closes = Array.from({ length: 30 }, (_, i) => 500 + i * 0.5);
          return new Response(JSON.stringify({
            chart: {
              result: [{
                meta: { chartPreviousClose: 498.5 },
                timestamp: timestamps,
                indicators: { quote: [{ close: closes }] },
              }]
            }
          }), { status: 200 });
        }
        return new Response('Fail', { status: 500 });
      });

      const res = await handleHistory(new Request('https://worker.internal/v1/history?id=spx&range=24H'), {});
      expect(res.id).toBe('spx');
      expect(res.source).toBe('yahoo');
      expect(res.granularity).toBe('15m');
      expect(res.previousClose).toBe(498.5);
      expect(res.points).toHaveLength(30);
      expect(res.points[0].v).toBe(500);
    });

    it('forex falls back to Frankfurter ECB daily when Yahoo fails', async () => {
      vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
        const url = typeof input === 'string' ? input : input.url;
        if (url.includes('query1.finance.yahoo.com')) {
          return new Response('Fail', { status: 500 });
        }
        if (url.includes('frankfurter.')) {
          const rates = {};
          for (let i = 1; i <= 20; i++) {
            const dateStr = `2026-04-${String(i).padStart(2, '0')}`;
            rates[dateStr] = { USD: 1.08 + i * 0.001 };
          }
          return new Response(JSON.stringify({ rates }), { status: 200 });
        }
        return new Response('Fail', { status: 500 });
      });

      const res = await handleHistory(new Request('https://worker.internal/v1/history?id=eurusd&range=24H'), {});
      expect(res.id).toBe('eurusd');
      expect(res.source).toBe('ECB daily');
      expect(res.granularity).toBe('1d');
      expect(res.points.length).toBeGreaterThanOrEqual(10);
    });

    it('returns empty points when fewer than 10 points are available', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('Fail', { status: 500 }));

      const res = await handleHistory(new Request('https://worker.internal/v1/history?id=spx&range=24H'), {});
      expect(res.points).toEqual([]);
      expect(res.pointCount).toBe(0);
    });
  });

  describe('Regression Tests — Root Cause Bug Remedies', () => {
    it('does not mark post-market or pre-market quotes as stale when older than 15 minutes', () => {
      const def = ASSET_DEFINITIONS.nvda;
      const now = Date.now();
      const quoteTs = now - (60 * 60 * 1000); // 1 hour old

      const postQuote = buildAssetQuote(def, {
        price: 130.5,
        prevClose: 128.0,
        quoteTs,
        session: 'post',
        source: 'yahoo',
      }, now);
      expect(postQuote.status).toBe('closed');
      expect(postQuote.session).toBe('post');

      const preQuote = buildAssetQuote(def, {
        price: 131.0,
        prevClose: 128.0,
        quoteTs,
        session: 'pre',
        source: 'yahoo',
      }, now);
      expect(preQuote.status).toBe('closed');
      expect(preQuote.session).toBe('pre');
    });

    it('rejects price: 0 or negative price and sets status unavailable and change null', () => {
      const def = ASSET_DEFINITIONS.btc;
      const now = Date.now();

      const zeroQuote = buildAssetQuote(def, {
        price: 0,
        prevClose: 65000,
        quoteTs: now,
        session: '24x7',
        source: 'binance',
      }, now);

      expect(zeroQuote.price).toBeNull();
      expect(zeroQuote.status).toBe('unavailable');
      expect(zeroQuote.change).toBeNull();
      expect(zeroQuote.changeStatus).toBe('unavailable');
      expect(zeroQuote.changePercent).toBeNull();

      const negQuote = buildAssetQuote(def, {
        price: -50,
        prevClose: 65000,
        quoteTs: now,
      }, now);
      expect(negQuote.price).toBeNull();
      expect(negQuote.status).toBe('unavailable');
    });

    it('exposes changePercent as exact match to change on all valid quotes', () => {
      const def = ASSET_DEFINITIONS.gold;
      const now = Date.now();

      const quote = buildAssetQuote(def, {
        price: 2400.00,
        prevClose: 2380.00,
        quoteTs: now,
        source: 'yahoo',
      }, now);

      expect(quote.change).toBe(0.84);
      expect(quote.changePercent).toBe(quote.change);
    });

    it('BNB Yahoo fallback & 6-coin sparkline backfill (spark1d.length >= 10)', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn(async (url) => {
        const urlStr = String(url);
        if (urlStr.includes('binance')) {
          return { ok: false, status: 451 };
        }
        if (urlStr.includes('kraken.com/0/public/Ticker')) {
          return {
            ok: true,
            json: async () => ({
              error: [],
              result: {
                XXBTZUSD: { c: ['65000'], o: '64000' },
                XETHZUSD: { c: ['3500'], o: '3400' },
                SOLUSD: { c: ['150'], o: '145' },
                XXRPZUSD: { c: ['0.60'], o: '0.58' },
                ADAUSD: { c: ['0.45'], o: '0.44' },
              },
            }),
          };
        }
        if (urlStr.includes('kraken.com/0/public/OHLC')) {
          return { ok: false, status: 500 };
        }
        if (urlStr.includes('cryptocompare')) {
          return { ok: false, status: 429 };
        }
        if (urlStr.includes('finance.yahoo.com')) {
          const nowSec = Math.floor(Date.now() / 1000);
          return {
            ok: true,
            json: async () => ({
              chart: {
                result: [
                  {
                    meta: {
                      regularMarketPrice: 642.50,
                      chartPreviousClose: 630.00,
                      regularMarketTime: nowSec,
                    },
                    timestamp: Array.from({ length: 24 }, (_, i) => nowSec - (23 - i) * 1800),
                    indicators: {
                      quote: [
                        {
                          close: Array.from({ length: 24 }, (_, i) => 630 + i * 0.5),
                        },
                      ],
                    },
                  },
                ],
              },
            }),
          };
        }
        return { ok: false, status: 404 };
      });

      try {
        const { quotes } = await fetchMultiTierCrypto({});
        expect(quotes.bnb).toBeDefined();
        expect(quotes.bnb.price).toBe(642.50);
        
        const bnbQuote = buildAssetQuote(ASSET_DEFINITIONS.bnb, quotes.bnb, Date.now());
        expect(bnbQuote.status).toBe('live');

        const coins = ['btc', 'eth', 'sol', 'bnb', 'xrp', 'ada'];
        for (const coin of coins) {
          expect(quotes[coin]).toBeDefined();
          expect(quotes[coin].price).toBeGreaterThan(0);
          expect(Array.isArray(quotes[coin].spark1d)).toBe(true);
          expect(quotes[coin].spark1d.length).toBeGreaterThanOrEqual(10);
        }
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('Brent front-month override when prompt curve diverges > 1.5%', async () => {
      const originalFetch = globalThis.fetch;
      const nowMs = Date.now();
      const nowSec = Math.floor(nowMs / 1000);

      globalThis.fetch = vi.fn(async (url) => {
        const urlStr = String(url);
        if (urlStr.includes('BZ=F') || urlStr.includes('BZ%3DF')) {
          return {
            ok: true,
            json: async () => ({
              chart: {
                result: [{
                  meta: { regularMarketPrice: 89.27, chartPreviousClose: 90.00, regularMarketTime: nowSec },
                  timestamp: [nowSec],
                  indicators: { quote: [{ close: [89.27] }] },
                }],
              },
            }),
          };
        }
        if (urlStr.includes('BZ') && (urlStr.includes('.NYM') || urlStr.includes('%2ENYM'))) {
          return {
            ok: true,
            json: async () => ({
              chart: {
                result: [{
                  meta: { regularMarketPrice: 91.99, chartPreviousClose: 90.00, regularMarketTime: nowSec },
                  timestamp: [nowSec],
                  indicators: { quote: [{ close: [91.99] }] },
                }],
              },
            }),
          };
        }
        return { ok: false, status: 404 };
      });

      try {
        const brent = await fetchFrontMonthBrent({}, nowMs);
        expect(brent.price).toBe(91.99);
        expect(brent.flags).toContain('brent_front_month_override');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('prefers live continuous BZ=F over an expired/lagging front-month NYM contract', async () => {
      const originalFetch = globalThis.fetch;
      const nowMs = Date.UTC(2026, 10, 26, 23, 15, 0); // Nov 26, 2026 23:15 UTC
      const liveSec = Math.floor((nowMs - 120000) / 1000); // 2m old
      const expiredSec = Math.floor((nowMs - 5 * 3600 * 1000) / 1000); // 5h old expired Jan contract

      globalThis.fetch = vi.fn(async (url) => {
        const urlStr = String(url);
        if (urlStr.includes('BZ=F') || urlStr.includes('BZ%3DF')) {
          return {
            ok: true,
            json: async () => ({
              chart: {
                result: [{
                  meta: { regularMarketPrice: 91.75, chartPreviousClose: 90.64, regularMarketTime: liveSec },
                  timestamp: [liveSec],
                  indicators: { quote: [{ close: [91.75] }] },
                }],
              },
            }),
          };
        }
        if (urlStr.includes('BZF27')) {
          return {
            ok: true,
            json: async () => ({
              chart: {
                result: [{
                  meta: { regularMarketPrice: 96.12, chartPreviousClose: 94.61, regularMarketTime: expiredSec },
                  timestamp: [expiredSec],
                  indicators: { quote: [{ close: [96.12] }] },
                }],
              },
            }),
          };
        }
        if (urlStr.includes('BZG27')) {
          return {
            ok: true,
            json: async () => ({
              chart: {
                result: [{
                  meta: { regularMarketPrice: 91.75, chartPreviousClose: 90.64, regularMarketTime: liveSec },
                  timestamp: [liveSec],
                  indicators: { quote: [{ close: [91.75] }] },
                }],
              },
            }),
          };
        }
        return { ok: false, status: 404 };
      });

      try {
        const brent = await fetchFrontMonthBrent({}, nowMs);
        expect(brent.price).toBe(91.75);
        expect(brent.quoteTs).toBe(liveSec * 1000);
        expect(brent.flags || []).not.toContain('brent_front_month_override');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('INR pair 60m freshness threshold (30m stays live, >60m turns stale)', () => {
      const now = Date.now();
      const quote30m = buildAssetQuote(ASSET_DEFINITIONS.usdinr, {
        price: 93.44,
        prevClose: 93.46,
        quoteTs: now - 1800000,
        session: 'regular',
        source: 'yahoo',
      }, now);
      expect(quote30m.status).toBe('live');

      const quote70m = buildAssetQuote(ASSET_DEFINITIONS.usdinr, {
        price: 93.44,
        prevClose: 93.46,
        quoteTs: now - 4200000,
        session: 'regular',
        source: 'yahoo',
      }, now);
      expect(quote70m.status).toBe('stale');
    });
  });

  describe('9. Stage 2 Security Hardening Regression Suite', () => {
    it('rejects origin userinfo/subdomain bypasses and arbitrary localhost ports in production', () => {
      const prodEnv = {
        ENVIRONMENT: 'production',
        ALLOWED_ORIGINS: 'https://quidesk.github.io,http://localhost:4173',
      };
      expect(getCorsOrigin('http://localhost:80@evil.com', prodEnv)).toBeNull();
      expect(getCorsOrigin('http://localhost:4173.evil.com', prodEnv)).toBeNull();
      expect(getCorsOrigin('http://localhost:4173/path', prodEnv)).toBeNull();
      expect(getCorsOrigin('http://localhost:9999', prodEnv)).toBeNull();
      expect(getCorsOrigin('http://localhost:4173', prodEnv)).toBe('http://localhost:4173');
      expect(getCorsOrigin('https://quidesk.github.io', prodEnv)).toBe('https://quidesk.github.io');

      const devEnv = { ENVIRONMENT: 'development', ALLOWED_ORIGINS: 'https://quidesk.github.io' };
      expect(getCorsOrigin('http://localhost:9999', devEnv)).toBe('http://localhost:9999');
      expect(getCorsOrigin('http://localhost:80@evil.com', devEnv)).toBeNull();
    });

    it('normalizes cache keys to strip cache-buster params and caller headers', () => {
      const urlWithBuster = new URL('https://quidesk-market-engine.quidesk0.workers.dev/v1/quotes?_t=17950000&foo=bar');
      const key = buildNormalizedCacheKey(urlWithBuster, '/v1/quotes');
      expect(key.url).toBe('https://quidesk-market-engine.quidesk0.workers.dev/v1/quotes');
      expect(key.headers.has('Origin')).toBe(false);
    });

    it('sets HSTS, Referrer-Policy, Permissions-Policy, CSP, and sanitizes 405/404 responses', async () => {
      const postRes = await worker.fetch(new Request('https://worker.internal/v1/quotes', {
        method: 'POST',
        headers: { Origin: 'https://quidesk.github.io' },
      }), { ENVIRONMENT: 'production', ALLOWED_ORIGINS: 'https://quidesk.github.io' });
      expect(postRes.status).toBe(405);
      expect(postRes.headers.get('Strict-Transport-Security')).toContain('max-age=31536000');
      expect(postRes.headers.get('Content-Security-Policy')).toContain("frame-ancestors 'none'");
      expect(postRes.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');

      const notFoundRes = await worker.fetch(new Request('https://worker.internal/%3Cscript%3E'), {
        ENVIRONMENT: 'production',
        ALLOWED_ORIGINS: 'https://quidesk.github.io',
      });
      expect(notFoundRes.status).toBe(404);
      const body = await notFoundRes.json();
      expect(body.error).toBe('Not found');
    });

    it('validates /v1/history id & range strictly with 400 and avoids input reflection', async () => {
      const badId = await handleHistory(new Request('https://worker.internal/v1/history?id=<script>&range=24H'), {});
      expect(badId.statusCode).toBe(400);
      expect(badId.error).toBe('Invalid asset id');

      const badRange = await handleHistory(new Request('https://worker.internal/v1/history?id=spx&range=100Y'), {});
      expect(badRange.statusCode).toBe(400);
      expect(badRange.error).toBe('Invalid range parameter');
    });

    it('strips unsafe javascript:/data: RSS article links at the Worker ingestion boundary', () => {
      const freshDate = new Date(Date.now() - 1800000).toUTCString();
      const xml = `
        <rss><channel>
          <item>
            <title>XSS Link Payload</title>
            <link>javascript:alert(document.domain)</link>
            <pubDate>${freshDate}</pubDate>
          </item>
          <item>
            <title>Valid HTTPS Bitcoin News</title>
            <link>https://decrypt.co/safe-article?utm_source=x</link>
            <pubDate>${freshDate}</pubDate>
          </item>
        </channel></rss>
      `;
      const articles = parseRssXml(xml, 'Decrypt', 'crypto');
      expect(articles).toHaveLength(1);
      expect(articles[0].link).toBe('https://decrypt.co/safe-article');
    });
  });
});
