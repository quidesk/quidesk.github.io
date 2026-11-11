import { describe, it, expect } from 'vitest';
import {
  selectGainers,
  selectLosers,
  selectEquitiesIndexVsStocks,
  selectSectorAverages,
  selectMarketPulse,
} from './marketSelectors';

describe('Market Selectors — Single Source of Truth', () => {
  const sampleQuotes = [
    { id: 'spx', symbol: 'SPY', sector: 'equities', change: -0.37 },
    { id: 'ndx', symbol: 'QQQ', sector: 'equities', change: -0.68 },
    { id: 'dow', symbol: 'DIA', sector: 'equities', change: -0.31 },
    { id: 'aapl', symbol: 'AAPL', sector: 'equities', change: -0.62 },
    { id: 'tsla', symbol: 'TSLA', sector: 'equities', change: 0.46 },
    { id: 'meta', symbol: 'META', sector: 'equities', change: 0.00 }, // flat
    { id: 'nvda', symbol: 'NVDA', sector: 'equities', change: -5.47 },
    { id: 'btc', symbol: 'BTC', sector: 'crypto', change: 2.50 },
    { id: 'eth', symbol: 'ETH', sector: 'crypto', change: -1.20 },
    { id: 'gold', symbol: 'XAU/USD', sector: 'metals', change: 1.80 },
    { id: 'silver', symbol: 'XAG/USD', sector: 'metals', change: 0.002 }, // flat (< 0.005)
    { id: 'wti', symbol: 'WTI', sector: 'energy', change: 0.75 },
    { id: 'brent', symbol: 'BRENT', sector: 'energy', change: -0.80 },
    { id: 'eurusd', symbol: 'EUR/USD', sector: 'forex', change: 0.15 },
  ];

  describe('1. selectGainers & selectLosers', () => {
    it('selectGainers excludes flat assets and sorts descending', () => {
      const gainers = selectGainers(sampleQuotes, 3);
      expect(gainers.length).toBe(3);
      expect(gainers[0].symbol).toBe('BTC');     // +2.50%
      expect(gainers[1].symbol).toBe('XAU/USD'); // +1.80%
      expect(gainers[2].symbol).toBe('WTI');     // +0.75%
      // Ensures META (0.00) and Silver (0.002) are excluded
      expect(gainers.some(g => g.symbol === 'META' || g.symbol === 'XAG/USD')).toBe(false);
    });

    it('selectLosers excludes flat assets and sorts ascending', () => {
      const losers = selectLosers(sampleQuotes, 3);
      expect(losers.length).toBe(3);
      expect(losers[0].symbol).toBe('NVDA');  // -5.47%
      expect(losers[1].symbol).toBe('ETH');   // -1.20%
      expect(losers[2].symbol).toBe('BRENT'); // -0.80%
    });
  });

  describe('2. Equities Index vs Stock Constituent Separation', () => {
    it('separates indices and individual stocks to prevent double-counting', () => {
      const { indices, stocks, combinedMedian } = selectEquitiesIndexVsStocks(sampleQuotes);

      expect(indices.map(i => i.symbol)).toEqual(['SPY', 'QQQ', 'DIA']);
      expect(stocks.map(s => s.symbol)).toEqual(['AAPL', 'TSLA', 'META', 'NVDA']);
      expect(typeof combinedMedian).toBe('number');
      expect(Number.isFinite(combinedMedian)).toBe(true);
    });
  });

  describe('3. selectSectorAverages & selectMarketPulse', () => {
    it('computes unbiased sector averages across all 5 sectors and marks closed state', () => {
      const averages = selectSectorAverages(sampleQuotes);
      expect(averages).toHaveProperty('equities');
      expect(averages).toHaveProperty('crypto');
      expect(averages).toHaveProperty('metals');
      expect(averages).toHaveProperty('energy');
      expect(averages).toHaveProperty('forex');
      expect(averages.equities.method).toBe('median');
      // Gold (+1.80) with flat silver (0.002) excluded -> Metals avg +1.80
      expect(averages.metals.avgChange).toBe(1.80);

      const closedEquities = sampleQuotes.map(q =>
        q.sector === 'equities' ? { ...q, status: 'closed' } : q
      );
      expect(selectSectorAverages(closedEquities).equities.isClosed).toBe(true);
    });

    it('selectMarketPulse computes advance percent, sentiment, and excludes unavailable quotes', () => {
      const withUnavailable = [
        ...sampleQuotes,
        { id: 'ada', symbol: 'ADA', sector: 'crypto', change: null, status: 'unavailable' },
      ];
      const pulse = selectMarketPulse(withUnavailable);
      expect(pulse.totalCount).toBe(14);
      expect(pulse.flatCount).toBe(2); // META (0.00) and Silver (0.002)
      expect(pulse.advancingCount).toBe(5); // BTC, XAU/USD, WTI, TSLA, EUR/USD
      expect(pulse.decliningCount).toBe(7); // NVDA, ETH, BRENT, QQQ, AAPL, SPY, DIA
      expect(pulse.advancePercent).toBe(Math.round((5 / 14) * 100)); // 36%
      expect(pulse.sentiment).toBe('bearish'); // <= 40%
    });
  });
});
