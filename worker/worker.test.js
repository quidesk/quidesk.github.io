import { describe, it, expect } from 'vitest';
import worker, { getCorsOrigin, withHeaders } from './index.js';
import { buildAssetQuote } from './routes/quotes.js';
import { extractStrictAssetTags, parseRssXml } from './providers/news.js';
import { checkMetalsBasis } from './providers/metals.js';
import { ASSET_DEFINITIONS } from './config.js';
import quotesFixture from './fixtures/quotes.fixture.json';

describe('Cloudflare Worker — Phase 1 Contract & Schema Validation', () => {
  describe('1. Top-level Response & Asset Quote Schema', () => {
    it('fixture conforms to top-level contract schema', () => {
      expect(quotesFixture).toHaveProperty('schemaVersion', '1.0.0');
      expect(quotesFixture).toHaveProperty('generatedAt');
      expect(quotesFixture).toHaveProperty('assets');
      expect(quotesFixture).toHaveProperty('health');
      expect(quotesFixture.health).toHaveProperty('perSource');
    });

    it('every asset quote strictly implements the required 15-field schema', () => {
      const requiredFields = [
        'id', 'symbol', 'name', 'sector', 'unit', 'price',
        'prevClose', 'change', 'changeBasis', 'quoteTs',
        'fetchedAt', 'source', 'session', 'status', 'flags', 'spark1d'
      ];

      for (const [id, asset] of Object.entries(quotesFixture.assets)) {
        for (const field of requiredFields) {
          expect(asset, `Asset ${id} missing field ${field}`).toHaveProperty(field);
        }
        expect(['prev_close', 'rolling_24h']).toContain(asset.changeBasis);
        expect(['regular', 'pre', 'post', 'closed', '24x7']).toContain(asset.session);
        expect(['live', 'delayed', 'closed', 'stale', 'unavailable']).toContain(asset.status);
        expect(Array.isArray(asset.flags)).toBe(true);
        expect(Array.isArray(asset.spark1d)).toBe(true);
        expect(asset.spark1d.length).toBeLessThanOrEqual(60);
      }
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
    });
  });

  describe('3. Metals Spot vs Futures Basis Detection', () => {
    it('sets spot_futures_basis flag when divergence > 0.50%', () => {
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
    it('correctly matches required test cases with BTC only', () => {
      const testCases = [
        "Bitcoin Miner HIVE Eyes $45 Million...",
        "Trump Media Posts $410 Million Profit. Bitcoin...",
        "Bitcoin devs merge 3 new BIPs...",
        "MARA dumps Bitcoin...",
      ];

      for (const title of testCases) {
        const tags = extractStrictAssetTags(title);
        expect(tags).toEqual(['BTC']);
      }
    });

    it('bans false positives inside unrelated words like consolidate, solution, Canada, method', () => {
      const negativeCases = [
        "Companies consolidate market share",
        "A novel blockchain solution is presented",
        "Regulators in Canada approve new framework",
        "Researchers test new cryptographic method",
      ];

      for (const text of negativeCases) {
        const tags = extractStrictAssetTags(text);
        expect(tags).toEqual([]);
      }
    });

    it('requires DOW to match Dow Jones or DJIA, not generic down or slowdown', () => {
      expect(extractStrictAssetTags("Dow Jones industrial index drops")).toEqual(['DIA']);
      expect(extractStrictAssetTags("Markets slowdown as growth drops down")).toEqual([]);
    });

    it('parses RSS XML feed blocks into clean normalized article objects', () => {
      const sampleXml = `
        <rss><channel>
          <item>
            <title><![CDATA[Bitcoin Breaks Higher As Inflation Cools]]></title>
            <link>https://decrypt.co/12345?utm_source=rss</link>
            <pubDate>Wed, 11 Nov 2026 03:00:00 GMT</pubDate>
            <description><![CDATA[Crypto markets reacted positively to the latest consumer price index.]]></description>
          </item>
        </channel></rss>
      `;

      const articles = parseRssXml(sampleXml, 'Decrypt', 'crypto');
      expect(articles.length).toBe(1);
      expect(articles[0].title).toBe('Bitcoin Breaks Higher As Inflation Cools');
      expect(articles[0].link).toBe('https://decrypt.co/12345');
      expect(articles[0].assetTags).toContain('BTC');
      expect(articles[0].isSponsored).toBe(false);
    });
  });

  describe('5. CORS & Request Routing', () => {
    const mockEnv = {
      ALLOWED_ORIGINS: 'https://librepiste.me,https://quidesk.github.io,http://localhost:3000',
    };

    it('permits whitelisted origins and rejects unauthorized origins', () => {
      expect(getCorsOrigin('https://librepiste.me', mockEnv)).toBe('https://librepiste.me');
      expect(getCorsOrigin('https://quidesk.github.io', mockEnv)).toBe('https://quidesk.github.io');
      expect(getCorsOrigin('http://localhost:3000', mockEnv)).toBe('http://localhost:3000');
      expect(getCorsOrigin('https://malicious-site.com', mockEnv)).toBeNull();
    });

    it('attaches proper CORS and security headers', () => {
      const rawRes = new Response(JSON.stringify({ ok: true }));
      const wrapped = withHeaders(rawRes, 'https://librepiste.me', 'public, max-age=15');

      expect(wrapped.headers.get('Access-Control-Allow-Origin')).toBe('https://librepiste.me');
      expect(wrapped.headers.get('Cache-Control')).toBe('public, max-age=15');
      expect(wrapped.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(wrapped.headers.get('X-Frame-Options')).toBe('DENY');
    });

    it('handles OPTIONS preflight with 204 status', async () => {
      const optReq = new Request('http://worker.internal/v1/quotes', {
        method: 'OPTIONS',
        headers: { Origin: 'https://librepiste.me' },
      });
      const res = await worker.fetch(optReq, mockEnv);
      expect(res.status).toBe(204);
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://librepiste.me');
    });
  });
});
