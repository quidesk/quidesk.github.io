import { describe, it, expect, beforeEach } from 'vitest';
import {
  D,
  validateMarketPayload,
  mergeAssetState,
  formatAssetPriceDisplay,
  computeEightCurrencies,
  getSessionStatus,
} from './marketEngine';

describe('Market Engine (Sovereign V3 / Module 3 & 6)', () => {
  beforeEach(() => {
    if (typeof window !== 'undefined') {
      window.marketState = {};
    }
  });

  it('D() performs arbitrary-precision arithmetic without floating point drift', () => {
    const a = D(0.1);
    const b = D(0.2);
    expect(a.plus(b).toDecimalPlaces(2).toNumber()).toBe(0.3);
    expect(D(100).minus(90).div(90).times(100).toDecimalPlaces(2).toNumber()).toBe(11.11);
  });

  it('validateMarketPayload rejects NaN, Infinity, negative/zero prices, and empty symbols', () => {
    expect(validateMarketPayload(null)).toBeNull();
    expect(validateMarketPayload({ symbol: '' })).toBeNull();
    expect(validateMarketPayload({ symbol: 'BTC', price: -100 })).toBeNull();
    expect(validateMarketPayload({ symbol: 'BTC', price: 0 })).toBeNull();
    expect(validateMarketPayload({ symbol: 'BTC', price: NaN })).toBeNull();
    expect(validateMarketPayload({ symbol: 'BTC', price: Infinity })).toBeNull();

    const valid = validateMarketPayload({
      symbol: 'BTC',
      category: 'crypto',
      price: 74500,
      prevClose: 72000,
      change24h: 3.47,
      history: [72000, 73000, 74500]
    });
    expect(valid).not.toBeNull();
    expect(valid.price).toBe(74500);
    expect(valid.prevClose).toBe(72000);
    expect(valid.history).toHaveLength(3);
  });

  it('mergeAssetState locks prevClose and protects it against spot-only ticks', () => {
    // Initial payload with locked prevClose
    mergeAssetState('BTC', {
      category: 'crypto',
      price: 70000,
      prevClose: 68000,
    });
    expect(window.marketState['BTC'].prevClose).toBe(68000);

    // Incoming spot tick without prevClose
    mergeAssetState('BTC', {
      category: 'crypto',
      price: 71400,
    });
    expect(window.marketState['BTC'].prevClose).toBe(68000);
    expect(window.marketState['BTC'].price).toBe(71400);
    expect(window.marketState['BTC'].change24h).toBe(5.0);
  });

  it('mergeAssetState enforces strict triangular parity: EUR/INR === EUR/USD * USD/INR', () => {
    mergeAssetState('USD/INR', {
      category: 'forex',
      price: 94.03,
      prevClose: 94.00,
    });
    mergeAssetState('EUR/INR', {
      category: 'forex',
      price: 104.00,
      prevClose: 103.50,
    });
    mergeAssetState('EUR/USD', {
      category: 'forex',
      price: 1.1062,
      prevClose: 1.1050,
    });

    // Parity: 1.1062 * 94.03 = 104.015986 -> rounded to 104.02
    expect(window.marketState['EUR/INR'].price).toBe(104.02);
  });

  it('formatAssetPriceDisplay produces exact secondary conversions and units', () => {
    window.marketState['USD/INR'] = { price: 94.03 };
    window.marketState['EUR/USD'] = { price: 1.1062 };

    const eurUsdDisplay = formatAssetPriceDisplay({
      symbol: 'EUR/USD',
      category: 'forex',
      price: 1.1062,
      change24h: 0.15,
    });
    expect(eurUsdDisplay.primary).toBe('1.1062');
    expect(eurUsdDisplay.secondary).toBe('(1 EUR = ₹104.02)');

    const eurInrDisplay = formatAssetPriceDisplay({
      symbol: 'EUR/INR',
      category: 'forex',
      price: 104.02,
      change24h: 0.25,
    });
    expect(eurInrDisplay.primary).toBe('₹104.02');
  });

  it('computeEightCurrencies on USD/JPY converts 1.00 USD rather than treating 159.90 as USD', () => {
    window.marketState['USD/INR'] = { price: 94.03 };
    window.marketState['EUR/USD'] = { price: 1.1062 };
    window.marketState['GBP/USD'] = { price: 1.3237 };
    window.marketState['USD/JPY'] = { price: 159.90 };
    window.marketState['BTC'] = { price: 74500 };

    const result = computeEightCurrencies({
      symbol: 'USD/JPY',
      category: 'forex',
      price: 159.90,
    });

    const usdItem = result.find(r => r.code === 'USD');
    const inrItem = result.find(r => r.code === 'INR');
    const jpyItem = result.find(r => r.code === 'JPY');

    expect(usdItem.display).toBe('$1.00');
    expect(inrItem.display).toBe('₹94.03');
    expect(jpyItem.display).toBe('¥159.90');
  });

  it('getSessionStatus returns LIVE for crypto 24/7, LIVE for forex on weekdays, CLOSED for equities outside NYSE', () => {
    // Wednesday 10:00 UTC (NYSE closed, Forex open, Crypto open)
    const wed10Utc = Date.UTC(2026, 10, 11, 10, 0, 0);
    expect(getSessionStatus('crypto', wed10Utc)).toBe('LIVE');
    expect(getSessionStatus('forex', wed10Utc)).toBe('LIVE');
    expect(getSessionStatus('equities', wed10Utc)).toBe('CLOSED');

    // Wednesday 15:30 UTC (NYSE open, Forex open, Crypto open)
    const wed1530Utc = Date.UTC(2026, 10, 11, 15, 30, 0);
    expect(getSessionStatus('equities', wed1530Utc)).toBe('LIVE');

    // Saturday 12:00 UTC (Weekend: Forex closed, Equities closed, Crypto open)
    const sat12Utc = Date.UTC(2026, 10, 14, 12, 0, 0);
    expect(getSessionStatus('crypto', sat12Utc)).toBe('LIVE');
    expect(getSessionStatus('forex', sat12Utc)).toBe('CLOSED');
    expect(getSessionStatus('equities', sat12Utc)).toBe('CLOSED');
  });
});
