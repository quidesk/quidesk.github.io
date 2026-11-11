import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  formatAssetPrice,
  formatUsdPrice,
  formatForexSecondaryValue,
  formatCardUnitSuffix,
  formatChangePercentage,
  getAssetPrecision,
} from './formatters';
import {
  computeCurrencyConversions,
  resolveBaseUsdAmount,
  formatRatesMeta,
} from '../hooks/useCurrencyRates';
import CurrencyTooltip from '../components/CurrencyTooltip';

describe('Formatters & Financial Math Suite', () => {
  describe('1. formatForexSecondaryValue — Currency Triangulation', () => {
    const canonicalRates = {
      'USD/INR': 93.96,
      'EUR/USD': 1.1187,
      'GBP/USD': 1.3366,
      'USD/JPY': 158.56,
      'USD/CAD': 1.4170,
      'USD/CHF': 0.8242,
    };

    it('converts USD-quoted pairs to INR value per 1 base unit', () => {
      // EUR/USD: 1 EUR = 1.1187 * 93.96 = 105.11
      expect(formatForexSecondaryValue('EUR/USD', 1.1187, canonicalRates)).toBe('(1 EUR = ₹105.11)');
      // GBP/USD: 1 GBP = 1.3366 * 93.96 = 125.59
      expect(formatForexSecondaryValue('GBP/USD', 1.3366, canonicalRates)).toBe('(1 GBP = ₹125.59)');
    });

    it('converts USD-base pairs to INR value per 1 quote unit', () => {
      // USD/JPY: 1 JPY = 93.96 / 158.56 = 0.5926
      expect(formatForexSecondaryValue('USD/JPY', 158.56, canonicalRates)).toBe('(1 JPY = ₹0.5926)');
      // USD/CAD: 1 CAD = 93.96 / 1.4170 = 66.31
      expect(formatForexSecondaryValue('USD/CAD', 1.4170, canonicalRates)).toBe('(1 CAD = ₹66.31)');
      // USD/CHF: 1 CHF = 93.96 / 0.8242 = 114.00
      expect(formatForexSecondaryValue('USD/CHF', 0.8242, canonicalRates)).toBe('(1 CHF = ₹114.00)');
    });

    it('converts INR-quoted pairs to primary ₹ and USD equivalent', () => {
      // EUR/INR: 105.10 / 93.96 = 1.12
      expect(formatForexSecondaryValue('EUR/INR', 105.10, canonicalRates)).toBe('($1.12)');
      // USD/INR: 93.96 / 93.96 = 1.00
      expect(formatForexSecondaryValue('USD/INR', 93.96, canonicalRates)).toBe('($1.00)');
    });

    it('converts cross-currency pairs via base-to-USD triangulation', () => {
      // EUR/GBP: 1 EUR = EUR/USD * USD/INR = 1.1187 * 93.96 = 105.11
      expect(formatForexSecondaryValue('EUR/GBP', 0.8370, canonicalRates)).toBe('(1 EUR = ₹105.11)');
      // GBP/JPY: 1 GBP = GBP/USD * USD/INR = 1.3366 * 93.96 = 125.59
      expect(formatForexSecondaryValue('GBP/JPY', 211.93, canonicalRates)).toBe('(1 GBP = ₹125.59)');
      // EUR/JPY: 1 EUR = EUR/USD * USD/INR = 1.1187 * 93.96 = 105.11
      expect(formatForexSecondaryValue('EUR/JPY', 177.38, canonicalRates)).toBe('(1 EUR = ₹105.11)');
    });

    it('handles direct number passed as usdInr rate', () => {
      expect(formatForexSecondaryValue('EUR/USD', 1.1187, 93.96)).toBe('(1 EUR = ₹105.11)');
      expect(formatForexSecondaryValue('USD/JPY', 158.56, 93.96)).toBe('(1 JPY = ₹0.5926)');
    });

    it('returns empty string for invalid or zero inputs', () => {
      expect(formatForexSecondaryValue('', 1.1187, canonicalRates)).toBe('');
      expect(formatForexSecondaryValue('EUR/USD', null, canonicalRates)).toBe('');
      expect(formatForexSecondaryValue('EUR/USD', -5, canonicalRates)).toBe('');
      expect(formatForexSecondaryValue('INVALID', 1.1187, canonicalRates)).toBe('');
    });
  });

  describe('2. formatCardUnitSuffix — Unit Rendering Rules', () => {
    it('renders quote currency code without slash for standard Forex pairs', () => {
      expect(formatCardUnitSuffix('forex', 'USD', 'EUR/USD')).toBe(' USD');
      expect(formatCardUnitSuffix('forex', 'JPY', 'USD/JPY')).toBe(' JPY');
      expect(formatCardUnitSuffix('forex', 'GBP', 'EUR/GBP')).toBe(' GBP');
      expect(formatCardUnitSuffix('forex', 'CHF', 'USD/CHF')).toBe(' CHF');
    });

    it('omits unit suffix entirely for INR pairs once ₹ is prefixed', () => {
      expect(formatCardUnitSuffix('forex', 'INR', 'USD/INR')).toBe('');
      expect(formatCardUnitSuffix('forex', 'INR', 'EUR/INR')).toBe('');
    });

    it('preserves commodity unit prefixes (/oz, /bbl, /MMBtu, /gal)', () => {
      expect(formatCardUnitSuffix('metals', 'oz', 'GOLD')).toBe('/oz');
      expect(formatCardUnitSuffix('metals', 'oz', 'XAU/USD')).toBe('/oz');
      expect(formatCardUnitSuffix('metals', 'oz', 'SILVER')).toBe('/oz');
      expect(formatCardUnitSuffix('energy', 'bbl', 'WTI')).toBe('/bbl');
      expect(formatCardUnitSuffix('energy', 'bbl', 'BRENT')).toBe('/bbl');
      expect(formatCardUnitSuffix('energy', 'MMBtu', 'NG')).toBe('/MMBtu');
      expect(formatCardUnitSuffix('energy', 'gal', 'HOIL')).toBe('/gal');
    });

    it('returns empty string for Equities and Crypto', () => {
      expect(formatCardUnitSuffix('equities', 'USD', 'SPY')).toBe('');
      expect(formatCardUnitSuffix('equities', 'USD', 'AAPL')).toBe('');
      expect(formatCardUnitSuffix('crypto', 'USD', 'BTC')).toBe('');
      expect(formatCardUnitSuffix('crypto', 'USD', 'ETH')).toBe('');
    });
  });

  describe('3. Precision Rules & Price Formatting', () => {
    it('returns 2 decimals for JPY and INR Forex pairs, 4 decimals for other Forex', () => {
      expect(getAssetPrecision('USD/JPY', 'forex', 158.56)).toBe(2);
      expect(getAssetPrecision('USD/INR', 'forex', 93.96)).toBe(2);
      expect(getAssetPrecision('GBP/JPY', 'forex', 211.93)).toBe(2);
      expect(getAssetPrecision('EUR/USD', 'forex', 1.1187)).toBe(4);
      expect(getAssetPrecision('USD/CHF', 'forex', 0.8242)).toBe(4);
      expect(getAssetPrecision('NZD/USD', 'forex', 0.5644)).toBe(4);
    });

    it('returns 3 decimals for Natural Gas and Heating Oil, 2 for Crude Oil', () => {
      expect(getAssetPrecision('NG', 'energy', 2.854)).toBe(3);
      expect(getAssetPrecision('HOIL', 'energy', 2.312)).toBe(3);
      expect(getAssetPrecision('WTI', 'energy', 71.20)).toBe(2);
      expect(getAssetPrecision('BRENT', 'energy', 75.50)).toBe(2);
    });

    it('returns 2 decimals for Metals and Equities', () => {
      expect(getAssetPrecision('GOLD', 'metals', 4050.00)).toBe(2);
      expect(getAssetPrecision('SILVER', 'metals', 52.00)).toBe(2);
      expect(getAssetPrecision('SPY', 'equities', 766.81)).toBe(2);
      expect(getAssetPrecision('NVDA', 'equities', 142.50)).toBe(2);
    });

    it('formats prices correctly through formatAssetPrice', () => {
      expect(formatAssetPrice(158.56, 'USD/JPY', 'forex')).toBe('158.56');
      expect(formatAssetPrice(1.1187, 'EUR/USD', 'forex')).toBe('1.1187');
      expect(formatAssetPrice(766.81, 'SPY', 'equities')).toBe('$766.81');
      expect(formatAssetPrice(80537.38, 'BTC', 'crypto')).toBe('$80,537.38');
      expect(formatAssetPrice(0.1829, 'ADA', 'crypto')).toBe('$0.1829');
      expect(formatAssetPrice(2.854, 'NG', 'energy')).toBe('$2.854');
      expect(formatAssetPrice(null, 'SPY', 'equities')).toBe('—');
    });
  });

  describe('4. formatChangePercentage — Neutral Flat Styling', () => {
    it('formats near-zero changes (|c| < 0.005) as neutral 0.00% without sign', () => {
      expect(formatChangePercentage(0)).toBe('0.00%');
      expect(formatChangePercentage(0.002)).toBe('0.00%');
      expect(formatChangePercentage(-0.003)).toBe('0.00%');
      expect(formatChangePercentage(-0.0049)).toBe('0.00%');
    });

    it('formats positive and negative changes with explicit signs', () => {
      expect(formatChangePercentage(1.25)).toBe('+1.25%');
      expect(formatChangePercentage(-2.40)).toBe('-2.40%');
      expect(formatChangePercentage(0.05)).toBe('+0.05%');
    });

    it('formats invalid/missing numbers as —', () => {
      expect(formatChangePercentage(null)).toBe('—');
      expect(formatChangePercentage(undefined)).toBe('—');
      expect(formatChangePercentage(NaN)).toBe('—');
    });
  });

  describe('5. Phase 4 Store-Only FX, Crypto <$2, 8-Currency Popover & Real Meta', () => {
    it('hides ₹ values cleanly when store USD/INR is missing (zero hardcoded fallback)', () => {
      expect(formatForexSecondaryValue('EUR/USD', 1.1187, {})).toBe('');
      expect(formatForexSecondaryValue('USD/JPY', 158.56, {})).toBe('');
      expect(formatForexSecondaryValue('EUR/INR', 105.10, {})).toBe('');
      expect(formatForexSecondaryValue('USD/INR', 93.96, {})).toBe('($1.00)');
    });

    it('generalizes secondary conversion to other local currencies via store FX', () => {
      const storeQuotes = {
        usdinr: { price: 93.96 },
        eurusd: { price: 1.1187 },
        usdjpy: { price: 158.56 },
      };
      // 1 JPY in EUR = (1 / 1.1187) / 158.56 = 0.0056 EUR -> €0.0056
      expect(formatForexSecondaryValue('USD/JPY', 158.56, storeQuotes, 'EUR')).toBe('(1 JPY = €0.0056)');
    });

    it('applies 4 decimals for crypto < $2 and 2 decimals >= $2', () => {
      expect(getAssetPrecision('XRP', 'crypto', 1.25)).toBe(4);
      expect(getAssetPrecision('ADA', 'crypto', 0.42)).toBe(4);
      expect(getAssetPrecision('SOL', 'crypto', 142.5)).toBe(2);
      expect(getAssetPrecision('NGAS', 'energy', 2.854)).toBe(3);
    });

    it('converts 1 unit of BASE currency for USD/JPY, EUR/USD, and EUR/GBP in 8-currency popover', () => {
      const storeQuotes = {
        usdinr: { price: 93.96, source: 'Yahoo Finance', quoteTs: Date.UTC(2026, 4, 1, 14, 30, 0) },
        eurusd: { price: 1.1187, source: 'Yahoo Finance', quoteTs: Date.UTC(2026, 4, 1, 14, 30, 0) },
        gbpusd: { price: 1.3366, source: 'Yahoo Finance', quoteTs: Date.UTC(2026, 4, 1, 14, 30, 0) },
        usdjpy: { price: 158.56, source: 'Yahoo Finance', quoteTs: Date.UTC(2026, 4, 1, 14, 30, 0) },
        btc: { price: 80000, source: 'Binance Live', quoteTs: Date.UTC(2026, 4, 1, 14, 30, 0) },
      };
      const fxExtras = { usdsgd: 1.34, usdaed: 3.6725 };

      expect(resolveBaseUsdAmount({ symbol: 'USD/JPY', sector: 'forex', price: 158.56 }, storeQuotes)).toBe(1.0);
      const usdJpyRows = computeCurrencyConversions({ symbol: 'USD/JPY', sector: 'forex', price: 158.56 }, storeQuotes, fxExtras);
      expect(usdJpyRows).toHaveLength(8);
      const byCode = Object.fromEntries(usdJpyRows.map((r) => [r.code, r.display]));
      expect(byCode.USD).toBe('$1.00');
      expect(byCode.INR).toBe('₹93.96');
      expect(byCode.JPY).toBe('¥158.56');
      expect(byCode.SGD).toBe('S$1.34');
      expect(byCode.AED).toBe('AED 3.67');

      const eurGbpRows = computeCurrencyConversions({ symbol: 'EUR/GBP', sector: 'forex', price: 0.837 }, storeQuotes, fxExtras);
      const eurByCode = Object.fromEntries(eurGbpRows.map((r) => [r.code, r.display]));
      expect(eurByCode.USD).toBe('$1.12');
      expect(eurByCode.INR).toBe('₹105.11');
      expect(eurByCode.EUR).toBe('€1.00');

      const meta = formatRatesMeta(storeQuotes, '2026-05-01T14:30:05.000Z');
      expect(meta).toContain('Yahoo Finance');
      expect(meta).not.toMatch(/fawazahmed0/i);

      const html = renderToStaticMarkup(
        React.createElement(CurrencyTooltip, { conversions: usdJpyRows, visible: true, x: 10, y: 10, ratesMeta: meta })
      );
      expect(html).toContain('PRICE IN 8 CURRENCIES');
      expect(html).toContain('$1.00');
      expect(html).toContain('¥158.56');
      expect(html).toContain(meta);
      expect(html).not.toMatch(/fawazahmed0/i);
    });
  });
});
