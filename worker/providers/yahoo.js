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
 * Extracts DST-safe Eastern Time weekday/hour/minute via Intl.DateTimeFormat (America/New_York).
 * Never uses fixed UTC offsets.
 * @param {number} epochSeconds
 * @returns {{ weekday: string, minutesOfDay: number }}
 */
function getNewYorkTimeParts(epochSeconds) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(new Date(epochSeconds * 1000));
  const map = {};
  for (const p of parts) {
    if (p.type !== 'literal') map[p.type] = p.value;
  }
  const hour = Number(map.hour) === 24 ? 0 : Number(map.hour);
  const minute = Number(map.minute);
  return {
    weekday: map.weekday || '',
    minutesOfDay: hour * 60 + minute,
  };
}

/**
 * Maps Yahoo trading periods / marketState (with DST-safe America/New_York fallback)
 * to standardized market session state.
 * @param {object|null} currentTradingPeriod
 * @param {number} nowSeconds
 * @param {string} sector
 * @param {string|null} [marketState=null]
 * @returns {'regular'|'pre'|'post'|'closed'|'24x7'}
 */
export function determineSessionState(currentTradingPeriod, nowSeconds, sector, marketState = null) {
  if (sector === 'crypto') return '24x7';

  const ms = typeof marketState === 'string' ? marketState.toUpperCase() : '';
  if (ms === 'CLOSED') return 'closed';

  if (currentTradingPeriod) {
    const { pre, regular, post } = currentTradingPeriod;

    if (regular && typeof regular.start === 'number' && typeof regular.end === 'number' &&
        nowSeconds >= regular.start && nowSeconds < regular.end) {
      return 'regular';
    }
    if (pre && typeof pre.start === 'number' && typeof pre.end === 'number' &&
        nowSeconds >= pre.start && nowSeconds < pre.end) {
      return 'pre';
    }
    if (post && typeof post.start === 'number' && typeof post.end === 'number' &&
        nowSeconds >= post.start && nowSeconds < post.end) {
      return 'post';
    }
    if (regular || pre || post) {
      return 'closed';
    }
  }

  if (ms === 'REGULAR') return 'regular';
  if (ms === 'PRE' || ms === 'PREPRE') return 'pre';
  if (ms === 'POST' || ms === 'POSTPOST') return 'post';

  // DST-safe America/New_York schedule fallback
  const { weekday, minutesOfDay } = getNewYorkTimeParts(nowSeconds);
  if (sector === 'equities') {
    if (weekday === 'Sat' || weekday === 'Sun') return 'closed';
    if (minutesOfDay >= 570 && minutesOfDay < 960) return 'regular'; // 09:30-16:00 ET
    if (minutesOfDay >= 240 && minutesOfDay < 570) return 'pre';     // 04:00-09:30 ET
    if (minutesOfDay >= 960 && minutesOfDay < 1200) return 'post';   // 16:00-20:00 ET
    return 'closed';
  }

  // 24x5 FX & CME Globex futures schedule (Sun 18:00 ET - Fri 17:00 ET)
  if (weekday === 'Sat') return 'closed';
  if (weekday === 'Sun') return minutesOfDay >= 1080 ? 'regular' : 'closed';
  if (weekday === 'Fri') return minutesOfDay < 1020 ? 'regular' : 'closed';
  return 'regular';
}

/**
 * Extracts and filters a clean sparkline from chart indicators.
 * Preserves unrounded floats to avoid staircase quantization on energy/FX series.
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
      points.push([t * 1000, c]);
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
  const candidatePrev = meta.chartPreviousClose ?? meta.previousClose;
  const prevClose = (typeof candidatePrev === 'number' && Number.isFinite(candidatePrev) && candidatePrev > 0)
    ? candidatePrev
    : null;
  const quoteTs = (typeof meta.regularMarketTime === 'number' && Number.isFinite(meta.regularMarketTime) && meta.regularMarketTime > 0)
    ? meta.regularMarketTime * 1000
    : null;

  if (typeof rawPrice !== 'number' || !Number.isFinite(rawPrice) || rawPrice <= 0) {
    throw new Error(`Invalid price ${rawPrice} for ${symbol}`);
  }

  const timestamps = result.timestamp || [];
  const closes = result.indicators?.quote?.[0]?.close || [];
  const spark1d = extractSparkline(timestamps, closes, 60);

  return {
    symbol,
    price: rawPrice,
    prevClose,
    quoteTs,
    marketState: meta.marketState || null,
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
  if (!json || typeof json.c !== 'number' || !Number.isFinite(json.c) || json.c <= 0) return null;

  return {
    symbol,
    price: json.c,
    prevClose: (typeof json.pc === 'number' && Number.isFinite(json.pc) && json.pc > 0) ? json.pc : null,
    quoteTs: (typeof json.t === 'number' && Number.isFinite(json.t) && json.t > 0) ? json.t * 1000 : null,
  };
}
