import { describe, it, expect } from 'vitest';
import { computeMarketPulse } from './marketPulse';

describe('computeMarketPulse', () => {
  it('advancingPct matches count of tiles where change > 0 divided by total', () => {
    const assets = [
      { id: 'a', symbol: 'A', change: 1.5 },
      { id: 'b', symbol: 'B', change: -0.3 },
      { id: 'c', symbol: 'C', change: 2.1 },
      { id: 'd', symbol: 'D', change: 0 },     // zero change — not advancing
      { id: 'e', symbol: 'E', change: -1.2 },
    ];

    const pulse = computeMarketPulse(assets, []);
    const expectedRising = assets.filter(a => a.change > 0).length;
    const expectedPct = Math.round((expectedRising / assets.length) * 100);

    expect(pulse.advancingPct).toBe(expectedPct);
    expect(pulse.risingCount).toBe(expectedRising);
    expect(pulse.total).toBe(assets.length);
  });

  it('returns 0% for empty asset list', () => {
    const pulse = computeMarketPulse([], []);
    expect(pulse.advancingPct).toBe(0);
    expect(pulse.total).toBe(0);
    expect(pulse.narrative).toBe('No market data available');
  });

  it('returns 100% when all assets are advancing', () => {
    const assets = [
      { id: 'a', symbol: 'A', change: 0.5 },
      { id: 'b', symbol: 'B', change: 3.2 },
      { id: 'c', symbol: 'C', change: 0.01 },
    ];
    const pulse = computeMarketPulse(assets, []);
    expect(pulse.advancingPct).toBe(100);
    expect(pulse.risingCount).toBe(3);
  });

  it('includes hotspot info in narrative when present', () => {
    const assets = [
      { id: 'btc', symbol: 'BTC', change: 5.2 },
      { id: 'eth', symbol: 'ETH', change: -1.0 },
    ];
    const hotspots = [
      { assetId: 'btc', symbol: 'BTC', signal: '5.20% surge', severity: 'high' },
    ];
    const pulse = computeMarketPulse(assets, hotspots);
    expect(pulse.narrative).toContain('1 signal detected');
    expect(pulse.narrative).toContain('BTC showing 5.20% surge');
  });

  it('narrative includes top gainer and loser', () => {
    const assets = [
      { id: 'a', symbol: 'AAPL', change: 3.14 },
      { id: 'b', symbol: 'TSLA', change: -2.50 },
    ];
    const pulse = computeMarketPulse(assets, []);
    expect(pulse.narrative).toContain('AAPL leading (+3.14%)');
    expect(pulse.narrative).toContain('TSLA lagging (-2.50%)');
  });
});
