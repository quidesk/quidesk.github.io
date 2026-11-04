import { describe, it, expect } from 'vitest';
import { formatChange, formatPrice, formatChangeBubble, MARKET_DATA, ALL_ASSETS } from './markets';

describe('formatChange (2-decimal precision)', () => {
  it('formats positive change with + prefix', () => {
    expect(formatChange(1.23)).toBe('+1.23%');
  });

  it('formats negative change', () => {
    expect(formatChange(-4.58)).toBe('-4.58%');
  });

  it('formats zero as +0.00%', () => {
    expect(formatChange(0)).toBe('+0.00%');
  });

  it('always shows 2 decimal places', () => {
    expect(formatChange(3.1)).toBe('+3.10%');
    expect(formatChange(-0.5)).toBe('-0.50%');
  });
});

describe('formatChangeBubble (1-decimal, space-constrained)', () => {
  it('formats positive change with + prefix and 1 decimal', () => {
    expect(formatChangeBubble(1.23)).toBe('+1.2%');
  });

  it('formats negative change with 1 decimal', () => {
    expect(formatChangeBubble(-4.58)).toBe('-4.6%');
  });

  it('formats zero as +0.0%', () => {
    expect(formatChangeBubble(0)).toBe('+0.0%');
  });
});

describe('formatPrice unitless Forex & currency prefix rules', () => {
  it('formats Forex pairs without $ prefix and with proper decimals', () => {
    // USD/JPY and USD/INR should have 2 decimal places and NO '$'
    expect(formatPrice(157.56, 'USD/JPY', 'forex')).toBe('157.56');
    expect(formatPrice(94.9342, 'USD/INR', 'forex')).toBe('94.93');
    expect(formatPrice(210.974, 'GBP/JPY', 'forex')).toBe('210.97');

    // Other Forex pairs should have 4 decimal places and NO '$'
    expect(formatPrice(1.1159, 'EUR/USD', 'forex')).toBe('1.1159');
    expect(formatPrice(1.3390, 'GBP/USD', 'forex')).toBe('1.3390');
    expect(formatPrice(0.8334, 'EUR/GBP', 'forex')).toBe('0.8334');
    expect(formatPrice(0.5638, 'NZD/USD', 'forex')).toBe('0.5638');
    expect(formatPrice(0.7032, 'AUD/USD', 'forex')).toBe('0.7032');
  });

  it('formats USD-denominated Equities, Metals, Energy with $ prefix', () => {
    expect(formatPrice(755.72, 'SPY', 'equities')).toBe('$755.72');
    expect(formatPrice(3878.00, 'XAU/USD', 'metals')).toBe('$3,878.00');
    expect(formatPrice(104.21, 'WTI', 'energy')).toBe('$104.21');
  });

  it('formats Crypto with $ and 4 decimals if < $2, else 2 decimals with commas', () => {
    expect(formatPrice(77672.94, 'BTC', 'crypto')).toBe('$77,672.94');
    expect(formatPrice(1.25, 'XRP', 'crypto')).toBe('$1.2500');
    expect(formatPrice(0.1935, 'ADA', 'crypto')).toBe('$0.1935');
  });

  it('returns — for null/undefined', () => {
    expect(formatPrice(null)).toBe('—');
    expect(formatPrice(undefined)).toBe('—');
  });
});

describe('28+ Asset Integrity Verification', () => {
  it('contains at least 28 unique tickers across 5 sectors', () => {
    const sectors = Object.keys(MARKET_DATA);
    expect(sectors).toEqual(expect.arrayContaining(['equities', 'crypto', 'metals', 'energy', 'forex']));
    expect(ALL_ASSETS.length).toBeGreaterThanOrEqual(28);
  });

  it('contains valid non-zero prices and sanitized history for all assets', () => {
    ALL_ASSETS.forEach(asset => {
      expect(asset.price).toBeGreaterThan(0);
      expect(Number.isFinite(asset.price)).toBe(true);
      expect(asset.history).toBeDefined();
      expect(asset.history['24H'].length).toBeGreaterThan(0);
      // Ensure no 0 or negative values in sparklines
      asset.history['24H'].forEach(pt => {
        const val = typeof pt === 'object' ? pt.value : pt;
        expect(val).toBeGreaterThan(0);
      });
    });
  });

  it('includes all targeted high-profile tickers', () => {
    const symbols = ALL_ASSETS.map(a => a.symbol);
    const required = [
      'SPY', 'QQQ', 'DIA', 'AAPL', 'TSLA', 'META', 'NVDA',
      'BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA',
      'XAU/USD', 'XAG/USD', 'XPT/USD',
      'WTI', 'BRENT', 'NGAS', 'HOIL',
      'EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD', 'USD/CHF', 'NZD/USD', 'EUR/GBP', 'GBP/JPY', 'USD/INR'
    ];
    required.forEach(sym => {
      expect(symbols).toContain(sym);
    });
  });
});
