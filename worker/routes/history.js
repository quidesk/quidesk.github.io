/**
 * Quidesk Market Engine — History Route Handler
 * 
 * Supplies authentic historical OHLCV chart series for 1H, 24H (1D), 1M, 1Y.
 * Endpoints: GET /v1/history?id=&range=1H|24H|1D|5D|1M|1Y
 */

import { ASSET_DEFINITIONS } from '../config.js';

async function fetchYahooSeries(yahooSymbol, rangeParam, sector) {
  let interval = '15m';
  let yahooRange = sector === 'forex' ? '5d' : '2d';
  let granularity = '15m';

  if (rangeParam === '1H') {
    interval = '2m';
    yahooRange = '1d';
    granularity = '2m';
  } else if (rangeParam === '1M') {
    interval = '1d';
    yahooRange = '1mo';
    granularity = '1d';
  } else if (rangeParam === '1Y') {
    interval = '1wk';
    yahooRange = '1y';
    granularity = '1d';
  }

  const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=${interval}&range=${yahooRange}`;
  const res = await fetch(yahooUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json',
    },
    signal: AbortSignal.timeout(6000),
  });

  if (!res.ok) return null;
  const json = await res.json();
  const result = json?.chart?.result?.[0];
  if (!result || !result.meta) return null;

  const timestamps = result.timestamp || [];
  const closes = result.indicators?.quote?.[0]?.close || [];
  let points = [];
  for (let i = 0; i < timestamps.length; i++) {
    const c = closes[i];
    if (typeof c === 'number' && Number.isFinite(c) && c > 0) {
      const t = timestamps[i] * 1000;
      points.push({ t, v: c, time: t, value: c, close: c });
    }
  }

  if (rangeParam === '1H' && points.length > 0) {
    const latestT = points[points.length - 1].t;
    const cutoff = latestT - 3600000;
    const sliced = points.filter(p => p.t >= cutoff);
    if (sliced.length >= 2) points = sliced;
  }

  const rawPrev = result.meta?.chartPreviousClose ?? result.meta?.previousClose ?? null;
  const prevClose = (typeof rawPrev === 'number' && Number.isFinite(rawPrev) && rawPrev > 0) ? rawPrev : null;
  const minRequired = rangeParam === '1H' ? 2 : 10;
  if (points.length < minRequired) return null;

  return {
    points,
    granularity,
    source: 'yahoo',
    previousClose: prevClose ?? points[0].v,
  };
}

/**
 * Fetches real crypto candles using CryptoCompare -> Binance -> Yahoo Finance fallback.
 */
async function fetchCryptoHistory(def, range) {
  const sym = def.symbol;
  let endpoint = 'histohour';
  let limit = 24;
  let granularity = '1h';
  let binanceInterval = '1h';

  if (range === '1H') {
    endpoint = 'histominute';
    limit = 60;
    granularity = '1m';
    binanceInterval = '5m';
  } else if (range === '1M') {
    endpoint = 'histoday';
    limit = 30;
    granularity = '1d';
    binanceInterval = '1d';
  } else if (range === '1Y') {
    endpoint = 'histoday';
    limit = 365;
    granularity = '1d';
    binanceInterval = '1w';
  }

  // Tier 1: CryptoCompare
  try {
    const ccUrl = `https://min-api.cryptocompare.com/data/v2/${endpoint}?fsym=${encodeURIComponent(sym)}&tsym=USD&limit=${limit}`;
    const res = await fetch(ccUrl, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(4000),
    });

    if (res.ok) {
      const json = await res.json();
      const list = json?.Data?.Data;
      if (Array.isArray(list) && list.length > 0) {
        const points = [];
        for (const item of list) {
          const v = Number(item.close);
          const t = typeof item.time === 'number' ? item.time * 1000 : null;
          if (t && Number.isFinite(v) && v > 0) {
            points.push({ t, v, time: t, value: v, close: v });
          }
        }
        if (points.length >= 10) {
          return {
            points,
            granularity,
            source: 'cryptocompare',
            previousClose: points[0].v,
          };
        }
      }
    }
  } catch {
    // Fallback to Binance
  }

  // Tier 2: Binance Klines Fallback
  if (def.binanceSymbol) {
    try {
      const bLimit = range === '1H' ? 12 : (range === '1M' ? 30 : (range === '1Y' ? 52 : 24));
      const binanceUrl = `https://data-api.binance.vision/api/v3/klines?symbol=${encodeURIComponent(def.binanceSymbol)}&interval=${binanceInterval}&limit=${bLimit}`;
      const res = await fetch(binanceUrl, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(4000),
      });

      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list) && list.length > 0) {
          const points = [];
          for (const item of list) {
            const t = Number(item[0]);
            const v = Number(item[4]);
            if (Number.isFinite(t) && Number.isFinite(v) && v > 0) {
              points.push({ t, v, time: t, value: v, close: v });
            }
          }
          if (points.length >= 10) {
            return {
              points,
              granularity: range === '1H' ? '5m' : (range === '1M' || range === '1Y' ? '1d' : '1h'),
              source: 'binance',
              previousClose: points[0].v,
            };
          }
        }
      }
    } catch {
      // Fallback to Yahoo
    }
  }

  // Tier 3: Yahoo Finance Crypto Fallback (BTC-USD, BNB-USD, etc.)
  if (def.yahooSymbol) {
    try {
      return await fetchYahooSeries(def.yahooSymbol, range, 'crypto');
    } catch {
      // All tiers failed
    }
  }

  return null;
}

/**
 * Fetches Frankfurter ECB daily timeseries as forex fallback.
 */
async function fetchFrankfurterForexHistory(def) {
  if (!def.base || !def.quote) return null;
  const startDate = new Date(Date.now() - 45 * 86400000).toISOString().split('T')[0];
  const urls = [
    `https://api.frankfurter.dev/v1/${startDate}..?base=${encodeURIComponent(def.base)}&symbols=${encodeURIComponent(def.quote)}`,
    `https://api.frankfurter.app/${startDate}..?base=${encodeURIComponent(def.base)}&symbols=${encodeURIComponent(def.quote)}`,
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) {
        const json = await res.json();
        const rates = json?.rates;
        if (rates && typeof rates === 'object') {
          const dates = Object.keys(rates).sort();
          const points = [];
          for (const d of dates) {
            const v = Number(rates[d]?.[def.quote]);
            const t = new Date(d).getTime();
            if (Number.isFinite(t) && Number.isFinite(v) && v > 0) {
              points.push({ t, v, time: t, value: v, close: v });
            }
          }
          if (points.length >= 10) {
            return {
              points,
              granularity: '1d',
              source: 'ECB daily',
              previousClose: points[0].v,
            };
          }
        }
      }
    } catch {
      // continue to next url
    }
  }

  return null;
}

const ALLOWED_HISTORY_RANGES = new Set(['1H', '24H', '1D', '5D', '1M', '1Y']);
const VALID_HISTORY_ID_RE = /^[a-z0-9_-]{1,20}$/;

/**
 * Handles GET /v1/history?id=&range=
 */
export async function handleHistory(request, env) {
  const url = new URL(request.url);
  const rawId = url.searchParams.get('id');
  const id = (rawId ? rawId.trim().toLowerCase() : 'spx');
  const rangeParam = (url.searchParams.get('range') || '24H').trim().toUpperCase();

  if (!VALID_HISTORY_ID_RE.test(id)) {
    return {
      statusCode: 400,
      error: 'Invalid asset id',
      points: [],
      granularity: null,
      source: null,
      previousClose: null,
      pointCount: 0,
    };
  }

  if (!ALLOWED_HISTORY_RANGES.has(rangeParam)) {
    return {
      statusCode: 400,
      error: 'Invalid range parameter',
      points: [],
      granularity: null,
      source: null,
      previousClose: null,
      pointCount: 0,
    };
  }

  const def = ASSET_DEFINITIONS[id];
  if (!def) {
    return {
      statusCode: 404,
      error: 'Unknown asset id',
      points: [],
      granularity: null,
      source: null,
      previousClose: null,
      pointCount: 0,
    };
  }

  if (def.sector === 'crypto') {
    const cryptoRes = await fetchCryptoHistory(def, rangeParam);
    if (cryptoRes && cryptoRes.points.length >= 2) {
      return {
        id: def.id,
        symbol: def.symbol,
        range: rangeParam,
        granularity: cryptoRes.granularity,
        source: cryptoRes.source,
        previousClose: cryptoRes.previousClose,
        pointCount: cryptoRes.points.length,
        points: cryptoRes.points,
      };
    }
    return {
      id: def.id,
      symbol: def.symbol,
      range: rangeParam,
      granularity: null,
      source: null,
      previousClose: null,
      pointCount: 0,
      points: [],
    };
  }

  try {
    const yahooRes = await fetchYahooSeries(def.yahooSymbol || def.symbol, rangeParam, def.sector);
    if (yahooRes) {
      return {
        id: def.id,
        symbol: def.symbol,
        range: rangeParam,
        granularity: yahooRes.granularity,
        source: yahooRes.source,
        previousClose: yahooRes.previousClose,
        pointCount: yahooRes.points.length,
        points: yahooRes.points,
      };
    }
  } catch {
    // Yahoo failed or timed out
  }

  if (def.sector === 'forex') {
    const frankfurterRes = await fetchFrankfurterForexHistory(def);
    if (frankfurterRes && frankfurterRes.points.length >= 10) {
      return {
        id: def.id,
        symbol: def.symbol,
        range: rangeParam,
        granularity: frankfurterRes.granularity,
        source: frankfurterRes.source,
        previousClose: frankfurterRes.previousClose,
        pointCount: frankfurterRes.points.length,
        points: frankfurterRes.points,
      };
    }
  }

  return {
    statusCode: 502,
    id: def.id,
    symbol: def.symbol,
    range: rangeParam,
    granularity: null,
    source: null,
    previousClose: null,
    pointCount: 0,
    points: [],
  };
}
