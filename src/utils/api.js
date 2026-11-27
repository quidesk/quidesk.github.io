/**
 * Quidesk — Unified Cloudflare Worker API Client
 *
 * Strict architectural rule:
 * NO third-party endpoints (Yahoo, Binance, Gold-API, Finnhub, FMP, CoinGecko, etc.)
 * are called directly from the client. ALL data flows exclusively through the
 * Cloudflare Worker edge feed (/v1/quotes, /v1/history, /v1/news, /v1/health).
 */

export const PRIMARY_FEED_BASE = (
  import.meta.env?.VITE_FEED_URL ||
  'https://quidesk-market-engine.quidesk0.workers.dev'
).replace(/\/$/, '').replace(/\/v1\/quotes$/, '');

export const FALLBACK_FEED_BASE = 'https://quidesk-market-engine.librepisteme.workers.dev';

/**
 * Combines a caller AbortSignal with a per-attempt timeout signal so
 * a stalled primary Worker ALWAYS times out and fails over to the backup Worker.
 */
function buildAttemptSignal(callerSignal, timeoutMs) {
  const timeoutSignal = typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'
    ? AbortSignal.timeout(timeoutMs)
    : null;

  if (!callerSignal) return timeoutSignal || undefined;
  if (!timeoutSignal) return callerSignal;

  if (typeof AbortSignal.any === 'function') {
    return AbortSignal.any([callerSignal, timeoutSignal]);
  }

  // Fallback for older runtimes without AbortSignal.any
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  if (callerSignal.aborted) {
    controller.abort();
    return controller.signal;
  }
  callerSignal.addEventListener('abort', onAbort, { once: true });
  const timer = setTimeout(() => controller.abort(new DOMException('Timeout', 'TimeoutError')), timeoutMs);
  controller.signal.addEventListener('abort', () => {
    clearTimeout(timer);
    callerSignal.removeEventListener('abort', onAbort);
  }, { once: true });
  return controller.signal;
}

async function fetchWithFailover(pathWithQuery, options = {}, timeoutMs = 6500) {
  const callerSignal = options.signal || null;

  try {
    const primaryUrl = `${PRIMARY_FEED_BASE}${pathWithQuery}`;
    const res = await fetch(primaryUrl, {
      headers: { 'Accept': 'application/json' },
      signal: buildAttemptSignal(callerSignal, timeoutMs),
    });
    if (res.ok) return res;
  } catch (err) {
    // Only rethrow if the caller explicitly aborted (e.g. unmount); timeouts must fail over
    if (callerSignal?.aborted) throw err;
  }

  // Failover to secondary worker instance with a fresh timeout budget
  const fallbackUrl = `${FALLBACK_FEED_BASE}${pathWithQuery}`;
  return fetch(fallbackUrl, {
    headers: { 'Accept': 'application/json' },
    signal: buildAttemptSignal(callerSignal, timeoutMs + 2000),
  });
}

/**
 * Fetches all 32 market quotes from the Cloudflare Worker edge aggregator.
 */
export async function fetchWorkerQuotes(options = {}) {
  const res = await fetchWithFailover('/v1/quotes', options, 6500);

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
 */
export async function fetchWorkerHistory(id, range = '1D', options = {}) {
  const res = await fetchWithFailover(
    `/v1/history?id=${encodeURIComponent(id)}&range=${encodeURIComponent(range)}`,
    options,
    8000
  );

  if (!res.ok) {
    throw new Error(`Worker history HTTP ${res.status}`);
  }

  return res.json();
}

/**
 * Fetches directly ingested OSINT news articles from the Worker.
 */
export async function fetchWorkerNews(options = {}) {
  const res = await fetchWithFailover('/v1/news', options, 8000);

  if (!res.ok) {
    throw new Error(`Worker news HTTP ${res.status}`);
  }

  const json = await res.json();
  return Array.isArray(json?.articles) ? json.articles : [];
}

/**
 * Fetches runtime health and upstream source status.
 */
export async function fetchWorkerHealth() {
  const res = await fetchWithFailover('/v1/health', {}, 5000);
  if (!res.ok) throw new Error(`Worker health HTTP ${res.status}`);
  return res.json();
}
