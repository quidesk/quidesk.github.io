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
 * @typedef {'fresh' | 'stale' | 'very_stale' | 'closed' | 'unavailable'} FreshnessLevel
 *
 * @typedef {Object} Quote
 * @property {number} price
 * @property {number} timestamp - Unix epoch ms
 * @property {QuoteSource} source
 * @property {number} changePercent
 * @property {string} [status]
 * @property {string} [tradingPeriod]
 */

/**
 * Calculates the freshness level of a quote based on elapsed age, session status, and source.
 *
 * @param {Quote | null | undefined} quote
 * @param {{ stale?: number, veryStale?: number }} [thresholds]
 * @returns {FreshnessLevel}
 */
export function getFreshnessLevel(
  quote,
  thresholds = { stale: 15000, veryStale: 60000 }
) {
  if (!quote || quote.status === 'unavailable') {
    return 'unavailable';
  }

  // Session closed takes precedence over age staleness
  if (quote.status === 'closed' || quote.tradingPeriod === 'closed') {
    return 'closed';
  }

  if (typeof quote.timestamp !== 'number' || !Number.isFinite(quote.timestamp)) {
    return 'unavailable';
  }

  const now = Date.now();
  const age = now - quote.timestamp;

  if (quote.source === 'fallback' || age > thresholds.veryStale || quote.status === 'stale') {
    return 'very_stale';
  }
  if (age > thresholds.stale) {
    return 'stale';
  }
  return 'fresh';
}

/**
 * Human-readable relative time formatter (e.g. "4s ago", "1m ago")
 * @param {number} timestamp
 * @returns {string}
 */
export function formatQuoteAge(timestamp) {
  if (!timestamp || !Number.isFinite(timestamp)) return 'unknown';
  const sec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (sec < 5) return 'just now';
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  return `${Math.floor(min / 60)}h ago`;
}
