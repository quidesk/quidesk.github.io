/**
 * Quidesk Market Stream Service
 * 
 * Live edge client connecting the frontend directly to the Cloudflare Worker market aggregator
 * at https://quidesk-market-engine.quidesk0.workers.dev
 */

const WORKER_BASE = (import.meta.env?.VITE_MARKET_WORKER_URL || 'https://quidesk-market-engine.quidesk0.workers.dev').replace(/\/$/, '');

/**
 * Fetch all market quotes from Cloudflare Worker edge aggregator
 * @returns {Promise<Record<string, any> | null>}
 */
export async function fetchMarketStream() {
  try {
    const res = await fetch(`${WORKER_BASE}/api/market?_t=${Date.now()}`, {
      cache: 'no-cache',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.assets && typeof data.assets === 'object') {
        const snapTs = data.timestamp ? Date.parse(data.timestamp) : Date.now();
        const quoteMap = {};

        Object.entries(data.assets).forEach(([id, a]) => {
          const obsTs = a.observedAt ? Date.parse(a.observedAt) : snapTs;
          quoteMap[id] = {
            ...a,
            id,
            changePercent: a.change ?? a.changePercent ?? 0,
            timestamp: isNaN(obsTs) ? Date.now() : obsTs,
            source: a.source || 'edge-worker',
          };
        });

        return quoteMap;
      }
    }
  } catch (err) {
    console.warn('[MarketStream] Cloudflare Worker edge request warning:', err.message);
  }
  return null;
}

/**
 * Fetch a single asset quote by symbol or ID
 * @param {string} symbol
 * @returns {Promise<any | null>}
 */
export async function fetchAssetStream(symbol) {
  if (!symbol) return null;
  try {
    const res = await fetch(`${WORKER_BASE}/api/market?symbol=${encodeURIComponent(symbol)}&_t=${Date.now()}`, {
      cache: 'no-cache',
      headers: { 'Accept': 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.price) {
        return {
          ...data,
          changePercent: data.change ?? data.changePercent ?? 0,
          source: data.source || 'edge-worker',
        };
      }
    }
  } catch (err) {
    console.warn(`[MarketStream] Cloudflare Worker quote error for ${symbol}:`, err.message);
  }
  return null;
}

export { WORKER_BASE };
