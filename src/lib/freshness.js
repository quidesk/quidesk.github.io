/**
 * Quidesk — Data Freshness & Source Tracking
 *
 * Provides standardized Quote structures and staleness classification:
 * - 'fresh': quote received within stale threshold (<= 15s) from authoritative source
 * - 'stale': quote age between 15s and 60s
 * - 'very_stale': quote age > 60s OR source is 'fallback'
 * - 'closed': market session is closed (official close price, not stale)
 * - 'unavailable': missing quote, invalid price, or invalid timestamp
 */

/**
 * @typedef {'websocket' | 'rest' | 'cache' | 'fallback'} QuoteSource
 * @typedef {'fresh' | 'stale' | 'very_stale' | 'closed' | 'delayed' | 'unavailable'} FreshnessLevel
 *
 * @typedef {Object} Quote
 * @property {number} price
 * @property {number} [timestamp] - Unix epoch ms
 * @property {number} [quoteTs] - Authoritative upstream quote epoch ms
 * @property {QuoteSource|string} source
 * @property {number} changePercent
 * @property {string} [status]
 * @property {string} [tradingPeriod]
 */

/**
 * Calculates the freshness level of a quote using authoritative Worker status and quote timestamp
 * (never browser poll times). When status is omitted (unit tests), falls back to thresholds.
 *
 * @param {Quote | null | undefined} quote
 * @param {{ stale?: number, veryStale?: number }} [thresholds]
 * @returns {FreshnessLevel}
 */
export function getFreshnessLevel(
  quote,
  thresholds = { stale: 15000, veryStale: 60000 }
) {
  if (!quote || quote.status === 'unavailable' || typeof quote.price !== 'number' || !Number.isFinite(quote.price)) {
    return 'unavailable';
  }

  // Session closed takes precedence over age staleness
  if (quote.status === 'closed' || quote.tradingPeriod === 'closed') {
    return 'closed';
  }

  // Daily ECB / delayed reference feed
  if (quote.status === 'delayed') {
    return 'delayed';
  }

  // Missing quote timestamp flagged stale by Worker
  if (quote.status === 'stale') {
    return 'stale';
  }

  const ts = typeof quote.quoteTs === 'number' && Number.isFinite(quote.quoteTs)
    ? quote.quoteTs
    : quote.timestamp;

  if (typeof ts !== 'number' || !Number.isFinite(ts)) {
    return 'unavailable';
  }

  const now = Date.now();
  const age = now - ts;

  if (quote.source === 'fallback') {
    return 'very_stale';
  }

  // When Worker explicitly reports status === 'live', use market age limits (120s crypto / 900s others)
  // rather than treating poll interval gaps as stale.
  if (quote.status === 'live') {
    const isCrypto = quote.session === '24x7' || quote.sector === 'crypto';
    const workerLimit = isCrypto ? 120000 : 900000;
    return age > workerLimit ? 'stale' : 'fresh';
  }

  if (age > thresholds.veryStale) {
    return 'very_stale';
  }
  if (age > thresholds.stale) {
    return 'stale';
  }
  return 'fresh';
}

/**
 * Derives aggregate Navbar feed status from live toggle, Worker connectivity, and asset statuses.
 * Returns one of: 'Paused' | 'Offline' | 'Closed' | 'Delayed' | 'Live'.
 */
export function deriveFeedStatus({
  isLive = true,
  isWorkerOnline = true,
  allAssets = [],
  sourcesHealth = {},
} = {}) {
  if (!isLive) {
    return { key: 'paused', label: 'Paused', badgeText: 'PAUSED', color: 'var(--text-dim)' };
  }
  if (!isWorkerOnline) {
    return { key: 'offline', label: 'Offline', badgeText: 'OFFLINE', color: 'var(--bear)' };
  }

  const available = (allAssets || []).filter(
    (a) => a && a.status && a.status !== 'unavailable' && typeof a.price === 'number' && Number.isFinite(a.price)
  );
  if (available.length === 0) {
    return { key: 'offline', label: 'Offline', badgeText: 'OFFLINE', color: 'var(--bear)' };
  }

  const allClosed = available.every((a) => a.status === 'closed' || a.tradingPeriod === 'closed');
  if (allClosed) {
    return { key: 'closed', label: 'Closed', badgeText: 'MARKETS CLOSED', color: 'var(--text-dim)' };
  }

  const hasDelayedOrStaleQuote = available.some((a) => {
    const level = getFreshnessLevel(a);
    return level === 'delayed' || level === 'stale' || level === 'very_stale';
  });
  const sourceValues = Object.values(sourcesHealth || {});
  const hasDegradedSource = sourceValues.length > 0 && sourceValues.some((s) => s && s.ok === false);

  if (hasDelayedOrStaleQuote || hasDegradedSource) {
    return { key: 'delayed', label: 'Delayed', badgeText: 'DELAYED FEED', color: 'var(--amber, #f59e0b)' };
  }

  return { key: 'live', label: 'Live', badgeText: 'EDGE STREAMING', color: 'var(--bull)' };
}

/**
 * Human-readable relative time formatter (e.g. "4s ago", "1m ago", "2d ago")
 * @param {number|null|undefined} timestamp
 * @returns {string}
 */
export function formatQuoteAge(timestamp) {
  if (!timestamp || !Number.isFinite(timestamp)) return 'unknown';
  const sec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (sec < 5) return 'just now';
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 48) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}
