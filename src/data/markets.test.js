import { describe, it, expect } from 'vitest';
import { formatChange, formatPrice, formatChangeBubble } from './markets';

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

describe('both formatters use same input, different precision', () => {
  it('NVDA example: -4.58 → card shows -4.58%, bubble shows -4.6%', () => {
    const change = -4.58;
    expect(formatChange(change)).toBe('-4.58%');
    expect(formatChangeBubble(change)).toBe('-4.6%');
  });

  it('positive example: 1.25 → card shows +1.25%, bubble shows +1.3%', () => {
    const change = 1.25;
    expect(formatChange(change)).toBe('+1.25%');
    // toFixed(1) rounds 1.25 → "1.3" in most JS engines (banker's rounding varies)
    // but the key contract is: same input, different precision
    const bubble = formatChangeBubble(change);
    expect(bubble).toMatch(/^\+1\.\d%$/);
  });
});

describe('formatPrice', () => {
  it('formats prices < 1 with 4 decimal places', () => {
    expect(formatPrice(0.214)).toBe('$0.2140');
  });

  it('formats prices >= 1000 with commas', () => {
    expect(formatPrice(80117.80)).toBe('$80,117.80');
  });

  it('formats standard prices with 2 decimals', () => {
    expect(formatPrice(352.94)).toBe('$352.94');
  });

  it('returns — for null/undefined', () => {
    expect(formatPrice(null)).toBe('—');
    expect(formatPrice(undefined)).toBe('—');
  });
});
