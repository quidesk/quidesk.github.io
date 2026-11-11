/**
 * Quidesk Market Engine — Yahoo Finance v8 Chart Provider
 * 
 * NOTE & DISCLOSURE ON UPSTREAM TERMS OF SERVICE:
 * The Yahoo Finance v8 chart endpoint is an unauthenticated, reverse-engineered public interface.
 * While widely used across financial engineering, it is not an officially licensed commercial API.
 * For production resilience, this module supports secondary failover to Finnhub when
 * FINNHUB_KEY is provisioned as an encrypted Cloudflare Worker secret.
 */

/**
 * Maps Yahoo trading periods to standardized market session state.
 * @param {object} currentTradingPeriod
 * @param {number} nowSeconds
 * @param {string} sector
 * @returns {'regular'|'pre'|'post'|'closed'|'24x7'}
 */
export function determineSessionState(currentTradingPeriod, nowSeconds, sector) {
  if (sector === 'crypto') return '24x7';
  if (!currentTradingPeriod) return 'regular';

  const { pre, regular, post } = currentTradingPeriod;

  if (regular && nowSeconds >= regular.start && nowSeconds < regular.end) {
    return 'regular';
  }
  if (pre && nowSeconds >= pre.start && nowSeconds < pre.end) {
    return 'pre';
  }
  if (post && nowSeconds >= post.start && nowSeconds < post.end) {
    return 'post';
  }

  return 'closed';
}

/**
 * Extracts and filters a clean sparkline from chart indicators.
 * @param {number[]} timestamps
 * @param {number[]} closes
 * @param {number} maxPoints
 * @returns {Array<[number, number]>}
 */
export function extractSparkline(timestamps, closes, maxPoints = 60) {
  if (!Array.isArray(timestamps) || !Array.isArray(closes)) return [];
  const points = [];

  for (let i = 0; i < timestamps.length; i++) {
    const t = timestamps[i];
    const c = closes[i];
    if (typeof t === 'number' && typeof c === 'number' && Number.isFinite(c) && c > 0) {
      points.push([t * 1000, parseFloat(c.toFixed(4))]);
    }
  }

  if (points.length <= maxPoints) return points;
  // Downsample evenly to stay within maxPoints limit
  const step = Math.ceil(points.length / maxPoints);
  const sampled = [];
  for (let i = 0; i < points.length; i += step) {
    sampled.push(points[i]);
  }
  if (sampled[sampled.length - 1] !== points[points.length - 1]) {
    sampled.push(points[points.length - 1]);
  }
  return sampled;
}

/**
 * Fetches Yahoo v8 chart for a single symbol.
 * @param {string} symbol
 * @param {object} [options]
 * @param {string} [options.range='1d']
 * @param {string} [options.interval='5m']
 * @param {number} [options.timeoutMs=8000]
 * @returns {Promise<object|null>}
 */
export async function fetchYahooChart(symbol, options = {}) {
  const { range = '1d', interval = '5m', timeoutMs = 8000 } = options;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`;

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json',
    },
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) {
    throw new Error(`Yahoo HTTP ${res.status} for ${symbol}`);
  }

  const json = await res.json();
  const result = json?.chart?.result?.[0];
  if (!result || !result.meta) {
    throw new Error(`Invalid Yahoo payload for ${symbol}`);
  }

  const meta = result.meta;
  const rawPrice = meta.regularMarketPrice;
  const prevClose = meta.chartPreviousClose || meta.previousClose;
  const quoteTs = (meta.regularMarketTime || Math.floor(Date.now() / 1000)) * 1000;

  if (typeof rawPrice !== 'number' || !Number.isFinite(rawPrice) || rawPrice <= 0) {
    throw new Error(`Invalid price ${rawPrice} for ${symbol}`);
  }

  const timestamps = result.timestamp || [];
  const closes = result.indicators?.quote?.[0]?.close || [];
  const spark1d = extractSparkline(timestamps, closes, 60);

  return {
    symbol,
    price: rawPrice,
    prevClose: (typeof prevClose === 'number' && prevClose > 0) ? prevClose : rawPrice,
    quoteTs,
    currentTradingPeriod: meta.currentTradingPeriod,
    spark1d,
    rawMeta: meta,
  };
}

/**
 * Optional secondary failover to Finnhub for equity quotes.
 * @param {string} symbol
 * @param {string} apiKey
 * @param {number} [timeoutMs=6000]
 * @returns {Promise<object|null>}
 */
export async function fetchFinnhubQuote(symbol, apiKey, timeoutMs = 6000) {
  if (!apiKey) return null;
  const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}`;
  const res = await fetch(url, {
    headers: { 'X-Finnhub-Token': apiKey },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`Finnhub HTTP ${res.status}`);
  const json = await res.json();
  if (!json || typeof json.c !== 'number' || json.c <= 0) return null;

  return {
    symbol,
    price: json.c,
    prevClose: json.pc || json.c,
    quoteTs: (json.t || Math.floor(Date.now() / 1000)) * 1000,
  };
}
