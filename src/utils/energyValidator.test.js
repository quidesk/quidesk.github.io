import { describe, it, expect } from 'vitest';
import { calcDivergence, ENERGY_DIVERGENCE_THRESHOLD } from './energyValidator';

describe('calcDivergence', () => {
  it('returns 0 for identical prices', () => {
    expect(calcDivergence(90.0, 90.0)).toBe(0);
  });

  it('returns correct divergence for known values', () => {
    // 90 vs 91 → diff=1, midpoint=90.5, divergence = 1/90.5 ≈ 0.01105
    const div = calcDivergence(90, 91);
    expect(div).toBeCloseTo(1 / 90.5, 5);
  });

  it('returns same value regardless of argument order', () => {
    expect(calcDivergence(100, 102)).toBe(calcDivergence(102, 100));
  });

  it('returns Infinity for zero or negative prices', () => {
    expect(calcDivergence(0, 90)).toBe(Infinity);
    expect(calcDivergence(90, 0)).toBe(Infinity);
    expect(calcDivergence(-5, 90)).toBe(Infinity);
  });

  it('detects divergence above 1% threshold', () => {
    // 100 vs 102 → divergence ≈ 1.98%
    const div = calcDivergence(100, 102);
    expect(div).toBeGreaterThan(ENERGY_DIVERGENCE_THRESHOLD);
  });

  it('detects divergence below 1% threshold', () => {
    // 100 vs 100.5 → divergence ≈ 0.498%
    const div = calcDivergence(100, 100.5);
    expect(div).toBeLessThan(ENERGY_DIVERGENCE_THRESHOLD);
  });
});
