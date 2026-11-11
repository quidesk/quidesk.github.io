import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { getFreshnessLevel } from '../lib/freshness';
import { useMarketStore } from '../store/marketStore';
import { PriceDisplay } from '../components/PriceDisplay';
import { computePulseFromQuotes } from '../selectors/marketPulse';

describe('Fault Remediation & State Synchronization Test Suite', () => {

  describe('1. getFreshnessLevel (Thresholds: stale > 15s, very_stale > 60s or fallback)', () => {
    it('returns "fresh" for recent quotes from authoritative source', () => {
      const quote = {
        price: 766.81,
        timestamp: Date.now() - 5000, // 5s old
        source: 'rest',
        changePercent: 1.65,
      };
      expect(getFreshnessLevel(quote)).toBe('fresh');
    });

    it('returns "stale" when quote age exceeds 15 seconds', () => {
      const quote = {
        price: 766.81,
        timestamp: Date.now() - 18000, // 18s old
        source: 'rest',
        changePercent: 1.65,
      };
      expect(getFreshnessLevel(quote)).toBe('stale');
    });

    it('returns "very_stale" when quote age exceeds 60 seconds', () => {
      const quote = {
        price: 766.81,
        timestamp: Date.now() - 75000, // 75s old
        source: 'rest',
        changePercent: 1.65,
      };
      expect(getFreshnessLevel(quote)).toBe('very_stale');
    });

    it('returns "very_stale" immediately if source is "fallback" even if recently fetched', () => {
      const quote = {
        price: 1.1257,
        timestamp: Date.now() - 2000, // 2s old
        source: 'fallback',
        changePercent: 0.20,
      };
      expect(getFreshnessLevel(quote)).toBe('very_stale');
    });

    it('returns "unavailable" for missing quote or invalid timestamp', () => {
      expect(getFreshnessLevel(null)).toBe('unavailable');
      expect(getFreshnessLevel(undefined)).toBe('unavailable');
      expect(getFreshnessLevel({ price: 100 })).toBe('unavailable');
      expect(getFreshnessLevel({ price: 100, timestamp: 'invalid' })).toBe('unavailable');
    });
  });

  describe('2. Atomic State Store (applySnapshot & applyTick)', () => {
    beforeEach(() => {
      useMarketStore.setState({ quotes: {}, lastSync: null, isSyncing: false });
    });

    it('applySnapshot replaces the quote map atomically', () => {
      const snapshot = {
        spy: { symbol: 'SPY', price: 766.81, change: 1.65, changePercent: 1.65, timestamp: 1000, source: 'rest' },
        qqq: { symbol: 'QQQ', price: 691.95, change: 0.97, changePercent: 0.97, timestamp: 1000, source: 'rest' },
      };

      useMarketStore.getState().applySnapshot(snapshot);

      const state = useMarketStore.getState();
      expect(state.quotes.spy.price).toBe(766.81);
      expect(state.quotes.qqq.price).toBe(691.95);
      expect(state.lastSync).toBeGreaterThan(0);
      expect(state.isSyncing).toBe(false);

      // Now apply a second snapshot atomically replacing the entire set
      const nextSnapshot = {
        btc: { symbol: 'BTC', price: 80500.0, change: 5.0, changePercent: 5.0, timestamp: 2000, source: 'websocket' },
      };
      useMarketStore.getState().applySnapshot(nextSnapshot);

      const updatedState = useMarketStore.getState();
      expect(updatedState.quotes.btc).toBeDefined();
      expect(updatedState.quotes.spy).toBeUndefined(); // Replaced atomically
    });

    it('applyTick updates newer tick and rejects out-of-order timestamps', () => {
      const initialQuote = {
        id: 'btc',
        symbol: 'BTC',
        price: 80000.0,
        change: 2.0,
        changePercent: 2.0,
        timestamp: 10000,
        source: 'rest',
      };

      useMarketStore.getState().applySnapshot({ btc: initialQuote });

      // 1. Tick with newer timestamp (12000 > 10000) should be applied
      const newerTick = {
        symbol: 'BTC',
        price: 80500.0,
        change: 2.5,
        changePercent: 2.5,
        timestamp: 12000,
        source: 'websocket',
      };
      useMarketStore.getState().applyTick('btc', newerTick);
      expect(useMarketStore.getState().quotes.btc.price).toBe(80500.0);
      expect(useMarketStore.getState().quotes.btc.timestamp).toBe(12000);

      // 2. Out-of-order tick with older timestamp (11000 < 12000) should be rejected
      const olderTick = {
        symbol: 'BTC',
        price: 79999.0,
        change: 1.9,
        changePercent: 1.9,
        timestamp: 11000,
        source: 'websocket',
      };
      useMarketStore.getState().applyTick('btc', olderTick);
      expect(useMarketStore.getState().quotes.btc.price).toBe(80500.0); // Preserves newer price!
      expect(useMarketStore.getState().quotes.btc.timestamp).toBe(12000);

      // 3. Stale tick with equal timestamp (12000 <= 12000) should also be rejected
      const equalTick = {
        symbol: 'BTC',
        price: 75000.0,
        change: 0.0,
        changePercent: 0.0,
        timestamp: 12000,
        source: 'websocket',
      };
      useMarketStore.getState().applyTick('btc', equalTick);
      expect(useMarketStore.getState().quotes.btc.price).toBe(80500.0);
    });
  });

  describe('3. PriceDisplay Precision (< 1 uses 4 decimals, >= 1 uses 2 decimals)', () => {
    it('emits 4 decimal places for values < 1', () => {
      const htmlAda = renderToStaticMarkup(<PriceDisplay value={0.1829} />);
      expect(htmlAda).toContain('0.1829');

      const htmlFraction = renderToStaticMarkup(<PriceDisplay value={0.5} />);
      expect(htmlFraction).toContain('0.5000');
    });

    it('emits 2 decimal places for values >= 1', () => {
      const htmlXrp = renderToStaticMarkup(<PriceDisplay value={1.23} />);
      expect(htmlXrp).toContain('1.23');

      const htmlSpy = renderToStaticMarkup(<PriceDisplay value={754.35} />);
      expect(htmlSpy).toContain('754.35');
    });

    it('supports custom prefix (e.g. $ prefix)', () => {
      const html = renderToStaticMarkup(<PriceDisplay value={183.63} prefix="$" />);
      expect(html).toContain('$183.63');
    });

    it('honors explicit precision override', () => {
      const html = renderToStaticMarkup(<PriceDisplay value={157.981} precision={3} />);
      expect(html).toContain('157.981');
    });
  });

  describe('4. computePulseFromQuotes Reconciliation', () => {
    it('returns advancing percentage consistent with the exact quotes snapshot', () => {
      const snapshot = {
        spy: { id: 'spy', changePercent: 1.5 },
        qqq: { id: 'qqq', changePercent: -0.8 },
        dia: { id: 'dia', changePercent: 0.4 },
        aapl: { id: 'aapl', changePercent: -2.1 },
      };

      const pulse = computePulseFromQuotes(snapshot, 12345);
      // 2 advancing out of 4 = 50%
      expect(pulse.advancingPct).toBe(50);
      expect(pulse.risingCount).toBe(2);
      expect(pulse.fallingCount).toBe(2);
      expect(pulse.totalAssets).toBe(4);
      expect(pulse.lastSync).toBe(12345);
    });

    it('reconciles when market is dominated by negative movers', () => {
      const bearSnapshot = {
        a: { id: 'a', changePercent: -3.5 },
        b: { id: 'b', changePercent: -1.2 },
        c: { id: 'c', changePercent: -0.4 },
        d: { id: 'd', changePercent: 0.8 },
      };

      const pulse = computePulseFromQuotes(bearSnapshot);
      // 1 advancing out of 4 = 25% (NOT 47% or disconnected number)
      expect(pulse.advancingPct).toBe(25);
      expect(pulse.risingCount).toBe(1);
      expect(pulse.fallingCount).toBe(3);
    });
  });
});
