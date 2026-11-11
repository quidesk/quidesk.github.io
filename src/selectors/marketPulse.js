import { useMarketStore } from '../store/marketStore';
import { selectMarketPulse } from './marketSelectors';

/**
 * Pure selector to compute pulse metrics from a quote dictionary.
 * Delegates strictly to selectMarketPulse so null/unavailable quotes and
 * flat (< 0.005%) moves follow the exact same rules across every widget.
 *
 * @param {Record<string, any>} quotes
 * @param {number|null} lastSync
 */
export function computePulseFromQuotes(quotes = {}, lastSync = null) {
  const pulse = selectMarketPulse(quotes);
  return {
    advancingPct: pulse.advancePercent,
    risingCount: pulse.advancingCount,
    fallingCount: pulse.decliningCount,
    flatCount: pulse.flatCount,
    lastSync,
    totalAssets: pulse.totalCount,
  };
}

/**
 * Hook to read market pulse metrics directly from Zustand store.
 */
export function useMarketPulse() {
  const quotes = useMarketStore((s) => s.quotes);
  const lastSync = useMarketStore((s) => s.lastSync);
  return computePulseFromQuotes(quotes, lastSync);
}
