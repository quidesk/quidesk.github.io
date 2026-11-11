import { useMarketStore } from '../store/marketStore';

/**
 * Pure selector to compute pulse metrics from a quote dictionary.
 * Ensures that pulse metrics are always strictly derived from the exact same
 * snapshot that populates the asset list.
 *
 * @param {Record<string, any>} quotes
 * @param {number|null} lastSync
 */
export function computePulseFromQuotes(quotes = {}, lastSync = null) {
  // De-duplicate in case both lowercase id and uppercase symbol are keyed
  const seenIds = new Set();
  const values = [];

  Object.values(quotes).forEach(q => {
    if (!q) return;
    const key = q.id || q.symbol;
    if (key && !seenIds.has(key)) {
      seenIds.add(key);
      values.push(q);
    } else if (!key) {
      values.push(q);
    }
  });

  const total = values.length;
  const advancing = values.filter(q => {
    const chg = typeof q.changePercent === 'number' ? q.changePercent : q.change;
    return typeof chg === 'number' && chg > 0;
  }).length;

  const declining = values.filter(q => {
    const chg = typeof q.changePercent === 'number' ? q.changePercent : q.change;
    return typeof chg === 'number' && chg < 0;
  }).length;

  const advancingPct = total ? Math.round((advancing / total) * 100) : 0;

  return {
    advancingPct,
    risingCount: advancing,
    fallingCount: declining,
    lastSync,
    totalAssets: total,
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
