import { create } from 'zustand';

/**
 * syncAllUI — Normalizes and indexes any market state map by both
 * canonical ticker symbol (e.g. 'BTC', 'SPY', 'XAU/USD', 'EUR/USD')
 * and lowercase id (e.g. 'btc', 'spx', 'gold', 'eurusd').
 */
export function syncAllUI(quotes = {}) {
  const synchronized = {};
  for (const [key, item] of Object.entries(quotes || {})) {
    if (!item) continue;
    const idKey = (item.id || key).toLowerCase();
    const symKey = item.symbol || item.id || key;
    const unified = { ...item, id: idKey, symbol: symKey };
    synchronized[idKey] = unified;
    synchronized[symKey] = unified;
  }
  return synchronized;
}

/**
 * Quidesk — Centralized Atomic Market Store (Zustand)
 *
 * Guarantees:
 * 1. Single Source of Truth for all displayed assets across cards, pulse, heatmaps, and charts.
 * 2. Keyed by canonical ticker symbol and lowercase id for instantaneous O(1) sync.
 * 3. Atomic state reconciliation via applySnapshot: replaces the whole quote set simultaneously
 *    so all UI values share one synchronized sync cycle.
 * 4. Out-of-order update protection via applyTick: rejects stale ticks where quote.timestamp <= existing.timestamp.
 */
export const useMarketStore = create((set, get) => ({
  quotes: {},
  lastSync: null,
  isSyncing: false,

  /**
   * Replace the entire quote map atomically.
   * @param {Record<string, any>} snapshot
   */
  applySnapshot: (snapshot) => {
    if (!snapshot || typeof snapshot !== 'object') return;
    const synchronized = syncAllUI(snapshot);
    set({
      quotes: synchronized,
      lastSync: Date.now(),
      isSyncing: false,
    });
  },

  /**
   * Apply an incremental tick for a specific symbol.
   * Rejects any tick whose timestamp is less than or equal to existing quote's timestamp.
   * Updates canonical symbol and lowercase id simultaneously.
   * @param {string} symbol
   * @param {any} quote
   */
  applyTick: (symbol, quote) => {
    if (!symbol || !quote || typeof quote.price !== 'number') return;
    const idKey = (quote.id || symbol).toLowerCase();
    const symKey = quote.symbol || symbol;
    const existing = get().quotes[idKey] || get().quotes[symKey];

    if (existing && typeof existing.timestamp === 'number' && quote.timestamp <= existing.timestamp) {
      // Out-of-order tick detected; drop it
      return;
    }

    set((state) => {
      const merged = existing ? { ...existing, ...quote } : quote;
      merged.id = idKey;
      merged.symbol = symKey;
      const nextQuotes = { ...state.quotes };
      nextQuotes[idKey] = merged;
      nextQuotes[symKey] = merged;
      return { quotes: nextQuotes, lastSync: Date.now() };
    });
  },

  setSyncing: (isSyncing) => set({ isSyncing }),
}));
