import { describe, it, expect } from 'vitest';
import {
  FOREX_PAIRS_CONFIG,
  formatForexRate,
  parseYahooFxMeta,
  parseFxRatesApiPayload,
  parseOpenErApiPayload
} from './forexHelpers';
import { formatPrice } from '../data/markets';

describe('Forex Verification & FX Pipeline Integrity Suite', () => {

  describe('1. Symbol-to-Pair and Provider Mapping', () => {
    it('contains all 12 institutional FX pairs with verified Yahoo Finance ticker symbols', () => {
      const requiredPairs = {
        usdjpy: { symbol: 'USD/JPY', yahooSymbol: 'JPY=X', decimals: 2 },
        usdchf: { symbol: 'USD/CHF', yahooSymbol: 'CHF=X', decimals: 4 },
        nzdusd: { symbol: 'NZD/USD', yahooSymbol: 'NZDUSD=X', decimals: 4 },
        eurusd: { symbol: 'EUR/USD', yahooSymbol: 'EURUSD=X', decimals: 4 },
        gbpusd: { symbol: 'GBP/USD', yahooSymbol: 'GBPUSD=X', decimals: 4 },
        audusd: { symbol: 'AUD/USD', yahooSymbol: 'AUDUSD=X', decimals: 4 },
        usdcad: { symbol: 'USD/CAD', yahooSymbol: 'CAD=X', decimals: 4 },
        eurgbp: { symbol: 'EUR/GBP', yahooSymbol: 'EURGBP=X', decimals: 4 },
        gbpjpy: { symbol: 'GBP/JPY', yahooSymbol: 'GBPJPY=X', decimals: 2 },
        eurjpy: { symbol: 'EUR/JPY', yahooSymbol: 'EURJPY=X', decimals: 2 },
        usdinr: { symbol: 'USD/INR', yahooSymbol: 'INR=X', decimals: 2 },
        eurinr: { symbol: 'EUR/INR', yahooSymbol: 'EURINR=X', decimals: 2 },
      };

      for (const [id, expected] of Object.entries(requiredPairs)) {
        const config = FOREX_PAIRS_CONFIG[id];
        expect(config, `Missing config for ${id}`).toBeDefined();
        expect(config.symbol).toBe(expected.symbol);
        expect(config.yahooSymbol).toBe(expected.yahooSymbol);
        expect(config.decimals).toBe(expected.decimals);
      }
    });
  });

  describe('2. Quote Orientation (USD/JPY, USD/CHF, NZD/USD)', () => {
    it('verifies USD/JPY uses direct USD orientation (JPY per 1 USD ~ 150-165)', () => {
      const config = FOREX_PAIRS_CONFIG.usdjpy;
      expect(config.orientation).toBe('direct');
      expect(config.base).toBe('USD');
      expect(config.quote).toBe('JPY');

      const mockRates = { JPY: 157.94 };
      const calculated = config.computeRate(mockRates);
      expect(calculated).toBe(157.94);
      // Ensure it is NOT inverted to 0.0063
      expect(calculated).toBeGreaterThan(100);
    });

    it('verifies USD/CHF uses direct USD orientation (CHF per 1 USD ~ 0.80-0.95)', () => {
      const config = FOREX_PAIRS_CONFIG.usdchf;
      expect(config.orientation).toBe('direct');
      expect(config.base).toBe('USD');
      expect(config.quote).toBe('CHF');

      const mockRates = { CHF: 0.8144 };
      const calculated = config.computeRate(mockRates);
      expect(calculated).toBe(0.8144);
      // Ensure it is NOT inverted to 1.228
      expect(calculated).toBeLessThan(1.0);
      expect(calculated).toBeGreaterThan(0.5);
    });

    it('verifies NZD/USD uses indirect orientation (USD per 1 NZD ~ 0.50-0.65)', () => {
      const config = FOREX_PAIRS_CONFIG.nzdusd;
      expect(config.orientation).toBe('indirect');
      expect(config.base).toBe('NZD');
      expect(config.quote).toBe('USD');

      // USD-based rates have NZD per 1 USD = 1.7717
      const mockRates = { NZD: 1.7717 };
      const calculated = config.computeRate(mockRates);
      // 1 / 1.7717 ≈ 0.5644
      expect(calculated).toBeCloseTo(0.5644, 4);
      expect(calculated).toBeLessThan(1.0);
      expect(calculated).toBeGreaterThan(0.4);
    });
  });

  describe('3. Numeric Precision & Unitless Formatting', () => {
    it('formats USD/JPY with unitless 2 decimal places and no dollar sign', () => {
      const formatted = formatForexRate(157.937, 'USD/JPY');
      expect(formatted).toBe('157.94');
      expect(formatted).not.toContain('$');
    });

    it('formats USD/CHF with unitless 4 decimal places and no dollar sign', () => {
      const formatted = formatForexRate(0.81442, 'USD/CHF');
      expect(formatted).toBe('0.8144');
      expect(formatted).not.toContain('$');
    });

    it('formats NZD/USD with unitless 4 decimal places and no dollar sign', () => {
      const formatted = formatForexRate(0.56443, 'NZD/USD');
      expect(formatted).toBe('0.5644');
      expect(formatted).not.toContain('$');
    });

    it('handles global formatPrice helper for forex without dollar signs', () => {
      expect(formatPrice(157.95, 'USD/JPY', 'forex')).toBe('157.95');
      expect(formatPrice(0.8144, 'USD/CHF', 'forex')).toBe('0.8144');
      expect(formatPrice(0.5644, 'NZD/USD', 'forex')).toBe('0.5644');
      expect(formatPrice(94.53, 'USD/INR', 'forex')).toBe('94.53');
      expect(formatPrice(null, 'USD/JPY', 'forex')).toBe('—');
      expect(formatPrice(undefined, 'USD/CHF', 'forex')).toBe('—');
      expect(formatPrice(NaN, 'NZD/USD', 'forex')).toBe('—');
    });
  });

  describe('4. Stale and Failed Response Handling (No Synthetic Data)', () => {
    it('throws or rejects on null/invalid provider payload without inventing values', () => {
      expect(() => parseFxRatesApiPayload(null)).toThrow();
      expect(() => parseFxRatesApiPayload({})).toThrow();
      expect(() => parseFxRatesApiPayload({ rates: 'invalid' })).toThrow();
    });

    it('returns null on invalid Yahoo Finance chart result', () => {
      expect(parseYahooFxMeta('usdjpy', null)).toBeNull();
      expect(parseYahooFxMeta('usdjpy', {})).toBeNull();
      expect(parseYahooFxMeta('usdjpy', { meta: {} })).toBeNull();
      expect(parseYahooFxMeta('usdjpy', { meta: { regularMarketPrice: -5 } })).toBeNull();
      expect(parseYahooFxMeta('usdjpy', { meta: { regularMarketPrice: 0 } })).toBeNull();
    });

    it('ignores non-positive/zero rates and does not fabricate missing pairs', () => {
      const mockPayload = {
        date: '2026-11-05T02:30:00Z',
        rates: {
          JPY: 157.94,
          CHF: -0.5, // invalid
          NZD: 0,    // invalid
        }
      };
      const parsed = parseFxRatesApiPayload(mockPayload);
      expect(parsed.usdjpy).toBeDefined();
      expect(parsed.usdjpy.price).toBe(157.94);
      expect(parsed.usdchf).toBeUndefined();
      expect(parsed.nzdusd).toBeUndefined();
    });
  });

  describe('5. Observation Window Tolerance Comparison', () => {
    it('verifies live USD/JPY, USD/CHF, and NZD/USD parsed across sources match within 0.25% tolerance', () => {
      // Simulated live quotes captured in the same 5-minute window
      const mockYahooJpy = { meta: { regularMarketPrice: 157.91, chartPreviousClose: 158.32, regularMarketTime: 1730773800 } };
      const mockYahooChf = { meta: { regularMarketPrice: 0.8145, chartPreviousClose: 0.8164, regularMarketTime: 1730773800 } };
      const mockYahooNzd = { meta: { regularMarketPrice: 0.5643, chartPreviousClose: 0.5622, regularMarketTime: 1730773800 } };

      const yahooJpy = parseYahooFxMeta('usdjpy', mockYahooJpy);
      const yahooChf = parseYahooFxMeta('usdchf', mockYahooChf);
      const yahooNzd = parseYahooFxMeta('nzdusd', mockYahooNzd);

      const mockFxRatesPayload = {
        date: '2026-11-05T02:30:00.000Z',
        rates: {
          JPY: 157.94,
          CHF: 0.8144,
          NZD: 1.7718, // 1 / 1.7718 = 0.564397 -> 0.5644
        }
      };
      const fxParsed = parseFxRatesApiPayload(mockFxRatesPayload);

      // USD/JPY difference
      const diffJpy = Math.abs(fxParsed.usdjpy.price - yahooJpy.price) / yahooJpy.price * 100;
      expect(diffJpy).toBeLessThan(0.25); // Pass tolerance

      // USD/CHF difference
      const diffChf = Math.abs(fxParsed.usdchf.price - yahooChf.price) / yahooChf.price * 100;
      expect(diffChf).toBeLessThan(0.25); // Pass tolerance

      // NZD/USD difference
      const diffNzd = Math.abs(fxParsed.nzdusd.price - yahooNzd.price) / yahooNzd.price * 100;
      expect(diffNzd).toBeLessThan(0.25); // Pass tolerance
    });
  });

});
