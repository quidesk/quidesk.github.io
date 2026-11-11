/**
 * Quidesk — Unified Cloudflare Worker API Client
 * 
 * Strict architectural rule:
 * NO third-party endpoints (Yahoo, Binance, Gold-API, Finnhub, FMP, CoinGecko, etc.)
 * are called directly from the client. ALL data flows exclusively through the
 * Cloudflare Worker edge feed (/v1/quotes, /v1/history, /v1/news, /v1/health).
 */

const FEED_BASE = (
  import.meta.env?.VITE_FEED_URL ||
  'https://quidesk-market-engine.quidesk0.workers.dev'
).replace(/\/$/, '').replace(/\/v1\/quotes$/, '');

/**
 * Fetches all 32 market quotes from the Cloudflare Worker edge aggregator.
 * @param {object} [options]
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<object>}
 */
export async function fetchWorkerQuotes(options = {}) {
  const url = `${FEED_BASE}/v1/quotes?_t=${Date.now()}`;
  const res = await fetch(url, {
    headers: { 'Accept': 'application/json' },
    signal: options.signal || AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    throw new Error(`Worker feed HTTP ${res.status}`);
  }

  const json = await res.json();
  if (!json || typeof json.assets !== 'object') {
    throw new Error('Invalid quote payload from Worker feed');
  }

  return json;
}

/**
 * Fetches authentic historical OHLCV chart series from the Worker.
 * @param {string} id - Asset id (e.g. 'spx', 'btc')
 * @param {'1D'|'5D'|'1M'|'1Y'} [range='1D']
 * @param {object} [options]
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<object>}
 */
export async function fetchWorkerHistory(id, range = '1D', options = {}) {
  const url = `${FEED_BASE}/v1/history?id=${encodeURIComponent(id)}&range=${encodeURIComponent(range)}&_t=${Date.now()}`;
  const res = await fetch(url, {
    headers: { 'Accept': 'application/json' },
    signal: options.signal || AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    throw new Error(`Worker history HTTP ${res.status}`);
  }

  return res.json();
}

/**
 * Fetches directly ingested OSINT news articles from the Worker.
 * @param {object} [options]
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<Array<object>>}
 */
export async function fetchWorkerNews(options = {}) {
  const url = `${FEED_BASE}/v1/news?_t=${Date.now()}`;
  const res = await fetch(url, {
    headers: { 'Accept': 'application/json' },
    signal: options.signal || AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    throw new Error(`Worker news HTTP ${res.status}`);
  }

  const json = await res.json();
  return Array.isArray(json?.articles) ? json.articles : [];
}

/**
 * Fetches runtime health and upstream source status.
 * @returns {Promise<object>}
 */
export async function fetchWorkerHealth() {
  const url = `${FEED_BASE}/v1/health?_t=${Date.now()}`;
  const res = await fetch(url, {
    headers: { 'Accept': 'application/json' },
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`Worker health HTTP ${res.status}`);
  return res.json();
}
