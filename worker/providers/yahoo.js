/**
 * Quidesk Market Engine — Yahoo Finance v8 Chart Provider
 * 
 * NOTE & DISCLOSURE ON UPSTREAM TERMS OF SERVICE:
 * The Yahoo Finance v8 chart endpoint is an unauthenticated, reverse-engineered public interface.
 * While widely used across financial engineering, it is not an officially licensed commercial API.
 * For production resilience, this module supports secondary failover to Finnhub when
 * FINNHUB_KEY is provisioned as an encrypted Cloudflare Worker secret.
 */

const FUTURES_MONTH_CODES = ['F', 'G', 'H', 'J', 'K', 'M', 'N', 'Q', 'U', 'V', 'X', 'Z'];

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
 */
export function determineSessionState(currentTradingPeriod, nowSeconds, sector, marketState = null) {
  if (sector === 'crypto') return '24x7';

  const { weekday, minutesOfDay } = getNewYorkTimeParts(nowSeconds);
  if (sector === 'energy' || sector === 'metals') {
    if (weekday === 'Sat') return 'closed';
    if (weekday === 'Sun') return minutesOfDay >= 1080 ? 'regular' : 'closed';
    if (weekday === 'Fri') return minutesOfDay < 1020 ? 'regular' : 'closed';
    if (minutesOfDay >= 1020 && minutesOfDay < 1080) return 'closed';
    return 'regular';
  }

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

  if (sector === 'equities') {
    if (weekday === 'Sat' || weekday === 'Sun') return 'closed';
    if (minutesOfDay >= 570 && minutesOfDay < 960) return 'regular';
    if (minutesOfDay >= 240 && minutesOfDay < 570) return 'pre';
    if (minutesOfDay >= 960 && minutesOfDay < 1200) return 'post';
    return 'closed';
  }

  if (weekday === 'Sat') return 'closed';
  if (weekday === 'Sun') return minutesOfDay >= 1080 ? 'regular' : 'closed';
  if (weekday === 'Fri') return minutesOfDay < 1020 ? 'regular' : 'closed';
  return 'regular';
}

/**
 * Extracts and filters a clean sparkline from chart indicators.
 * Preserves unrounded floats to avoid staircase quantization on energy/FX series.
 */
export function extractSparkline(timestamps, closes, maxPoints = 60, trailingWindowMs = null) {
  if (!Array.isArray(timestamps) || !Array.isArray(closes)) return [];
  let points = [];

  for (let i = 0; i < timestamps.length; i++) {
    const t = timestamps[i];
    const c = closes[i];
    if (typeof t === 'number' && typeof c === 'number' && Number.isFinite(c) && c > 0) {
      points.push([t * 1000, c]);
    }
  }

  if (typeof trailingWindowMs === 'number' && trailingWindowMs > 0 && points.length > 0) {
    const latestTs = points[points.length - 1][0];
    const cutoff = latestTs - trailingWindowMs;
    const sliced = points.filter((p) => p[0] >= cutoff);
    if (sliced.length >= 12) {
      points = sliced;
    } else if (points.length > 24) {
      points = points.slice(-24);
    }
  }

  if (points.length <= maxPoints) return points;
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
 */
export async function fetchYahooChart(symbol, options = {}) {
  const { range = '1d', interval = '5m', timeoutMs = 8000, trailingWindowMs = null } = options;
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

  const rawVol = meta.regularMarketVolume;
  const volume = (typeof rawVol === 'number' && Number.isFinite(rawVol) && rawVol > 0) ? rawVol : null;

  const timestamps = result.timestamp || [];
  const closes = result.indicators?.quote?.[0]?.close || [];
  const spark1d = extractSparkline(timestamps, closes, 60, trailingWindowMs);

  return {
    symbol,
    price: rawPrice,
    prevClose,
    volume,
    quoteTs,
    marketState: meta.marketState || null,
    currentTradingPeriod: meta.currentTradingPeriod,
    spark1d,
    rawMeta: meta,
  };
}

/**
 * Generates candidate front-month NYMEX Brent contract symbols ordered by
 * earliest active delivery month (M+1, M+2, M+3).
 */
export function getFrontMonthBrentSymbols(nowMs = Date.now()) {
  const d = new Date(nowMs);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth();
  const candidates = [];
  for (const offset of [1, 2, 3]) {
    const target = new Date(Date.UTC(year, month + offset, 1));
    const code = FUTURES_MONTH_CODES[target.getUTCMonth()];
    const yy = String(target.getUTCFullYear()).slice(-2);
    candidates.push(`BZ${code}${yy}.NYM`);
  }
  return candidates;
}

/**
 * Fetches front-month Brent Crude futures with directional early-rollover
 * and stale-contract guards.
 *
 * Only overrides continuous BZ=F when:
 * 1. An active prompt contract is fresher (not lagging/stale), AND
 * 2. activeFront.price is HIGHER than continuous.price by > 1.5%
 *    (indicating BZ=F rolled early onto a lower-priced backwardated deferred month).
 * Never lets a lower-priced deferred contract overwrite a live prompt BZ=F quote.
 */
export async function fetchFrontMonthBrent(options = {}, nowMs = Date.now()) {
  const contractCandidates = getFrontMonthBrentSymbols(nowMs);
  const [continuousRes, ...contractResults] = await Promise.allSettled([
    fetchYahooChart('BZ=F', options),
    ...contractCandidates.slice(0, 3).map((sym) => fetchYahooChart(sym, options)),
  ]);

  const continuous = continuousRes.status === 'fulfilled' ? continuousRes.value : null;
  const freshContracts = contractResults
    .filter((r) => r.status === 'fulfilled' && r.value && Number.isFinite(r.value.price) && r.value.price > 0)
    .map((r) => r.value)
    .filter((c) => c.quoteTs && (nowMs - c.quoteTs) < 24 * 3600 * 1000)
    .sort((a, b) => {
      // Prefer highest-volume / prompt active contract among fresh candidates
      const volDiff = (b.volume || 0) - (a.volume || 0);
      if (volDiff !== 0) return volDiff;
      return (b.quoteTs || 0) - (a.quoteTs || 0);
    });

  const activeFront = freshContracts[0] || null;

  if (continuous && activeFront) {
    const frontAgeMs = nowMs - (activeFront.quoteTs || 0);
    const contAgeMs = continuous.quoteTs ? (nowMs - continuous.quoteTs) : Infinity;
    const frontLaggingContinuous = continuous.quoteTs && activeFront.quoteTs < (continuous.quoteTs - 300000);
    const frontStaleWhileContinuousFresh = frontAgeMs > 900000 && contAgeMs <= 900000;

    if (frontLaggingContinuous || frontStaleWhileContinuousFresh) {
      return continuous;
    }

    // Directional guard: only override when BZ=F is >1.5% BELOW activeFront (early roll into backwardation)
    const backwardationLagPct = ((activeFront.price - continuous.price) / continuous.price) * 100;
    if (backwardationLagPct > 1.5) {
      return {
        ...activeFront,
        flags: ['brent_front_month_override'],
      };
    }
    return continuous;
  }

  if (continuous) return continuous;
  if (activeFront) return activeFront;
  throw new Error('All Brent futures symbols failed');
}

/**
 * Optional secondary failover to Finnhub for equity quotes.
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
