/**
 * Quidesk — Data Freshness & Source Tracking
 */

const REGIONAL_FX_IDS = new Set(['usdinr', 'eurinr']);

export function getFreshnessLevel(
  quote,
  thresholds = { stale: 15000, veryStale: 60000 }
) {
  if (!quote || quote.status === 'unavailable' || typeof quote.price !== 'number' || !Number.isFinite(quote.price)) {
    return 'unavailable';
  }

  if (quote.status === 'closed' || quote.tradingPeriod === 'closed') {
    return 'closed';
  }

  if (quote.status === 'delayed') {
    return 'delayed';
  }

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

  if (quote.status === 'live') {
    const isCrypto = quote.session === '24x7' || quote.sector === 'crypto';
    const idLower = String(quote.id || '').toLowerCase();
    const workerLimit = isCrypto ? 120000 : (REGIONAL_FX_IDS.has(idLower) ? 3600000 : 900000);
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

  const hasUnavailable = (allAssets || []).some((a) => a && a.status === 'unavailable');
  const hasDelayedOrStaleQuote = available.some((a) => {
    const level = getFreshnessLevel(a);
    return level === 'delayed' || level === 'stale' || level === 'very_stale';
  });

  // Only flag primary Yahoo degradation; crypto fallback tiers (binance/kraken/cc) are redundant
  const primaryYahooDown = sourcesHealth?.yahoo && sourcesHealth.yahoo.ok === false;

  if (hasUnavailable || hasDelayedOrStaleQuote || primaryYahooDown) {
    return { key: 'delayed', label: 'Delayed', badgeText: 'DELAYED FEED', color: 'var(--amber, #D98A3C)' };
  }

  return { key: 'live', label: 'Live', badgeText: 'EDGE STREAMING', color: 'var(--bull)' };
}

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
