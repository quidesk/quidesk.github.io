import { describe, it, expect, vi, afterEach } from 'vitest';
import worker, { getCorsOrigin, withHeaders } from './index.js';
import { buildAssetQuote, handleQuotes } from './routes/quotes.js';
import { extractStrictAssetTags, parseRssXml } from './providers/news.js';
import { checkMetalsBasis } from './providers/metals.js';
import { determineSessionState } from './providers/yahoo.js';
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
      const sampleXml = `
        <rss><channel>
          <item>
            <title><![CDATA[Bitcoin Breaks Higher As Inflation Cools]]></title>
            <link>https://decrypt.co/12345?utm_source=rss</link>
            <pubDate>Wed, 11 Nov 2026 03:00:00 GMT</pubDate>
            <description><![CDATA[Crypto markets reacted positively to the latest consumer price index.]]></description>
          </item>
          <item>
            <title><![CDATA[Fed Officials Debate Policy Path Amid Sticky Inflation]]></title>
            <link>https://cnbc.com/999?utm_source=rss</link>
            <pubDate>Wed, 11 Nov 2026 03:05:00 GMT</pubDate>
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
});
