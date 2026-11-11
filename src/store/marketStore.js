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
    const ts = typeof item.quoteTs === 'number' && Number.isFinite(item.quoteTs)
      ? item.quoteTs
      : (typeof item.timestamp === 'number' && Number.isFinite(item.timestamp) ? item.timestamp : null);
    const unified = { ...item, id: idKey, symbol: symKey, ...(ts !== null ? { timestamp: ts } : {}) };
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
 * 3. Atomic state reconciliation via applySnapshot: replaces the whole quote set simultaneously.
 * 4. Tracks generatedAt, sourcesHealth, and oldest quoteTs from the Worker.
 */
export const useMarketStore = create((set, get) => ({
  quotes: {},
  fxExtras: { usdaed: 3.6725 },
  generatedAt: null,
  oldestQuoteTs: null,
  sourcesHealth: {},
  healthTimestamp: null,
  healthStatus: null,
  lastSync: null,
  isSyncing: false,
  isWorkerOnline: true,
  workerError: null,

  /**
   * Replace the entire quote map atomically from Worker response.
   * @param {object} payload - { generatedAt, assets, health, fx }
   */
  applySnapshot: (payload) => {
    if (!payload || typeof payload !== 'object') return;
    const assets = payload.assets || payload;
    const synchronized = syncAllUI(assets);

    let oldestTs = null;
    for (const item of Object.values(assets)) {
      if (item && typeof item.quoteTs === 'number') {
        if (oldestTs === null || item.quoteTs < oldestTs) {
          oldestTs = item.quoteTs;
        }
      }
    }

    set((state) => ({
      quotes: synchronized,
      fxExtras: payload.fx && typeof payload.fx === 'object'
        ? { usdaed: 3.6725, ...payload.fx }
        : state.fxExtras,
      generatedAt: payload.generatedAt || new Date().toISOString(),
      oldestQuoteTs: oldestTs,
      sourcesHealth: payload.health?.perSource && Object.keys(payload.health.perSource).length > 0
        ? payload.health.perSource
        : state.sourcesHealth,
      lastSync: Date.now(),
      isSyncing: false,
      isWorkerOnline: true,
      workerError: null,
    }));
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
  setWorkerError: (err) => set({ isWorkerOnline: false, workerError: err }),
  setHealth: (healthPayload) => {
    if (!healthPayload || typeof healthPayload !== 'object') return;
    set((state) => {
      const incomingSources = healthPayload.sources && typeof healthPayload.sources === 'object'
        ? healthPayload.sources
        : null;
      const hasIncomingSources = incomingSources && Object.keys(incomingSources).length > 0;
      return {
        sourcesHealth: hasIncomingSources ? incomingSources : state.sourcesHealth,
        healthTimestamp: healthPayload.timestamp || state.healthTimestamp,
        healthStatus: healthPayload.status || state.healthStatus,
      };
    });
  },
}));
