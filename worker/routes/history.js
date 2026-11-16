/**
 * Quidesk Market Engine — History Route Handler
 * 
 * Supplies authentic historical OHLCV chart series for 1H, 24H (1D), 1M, 1Y.
 * Endpoints: GET /v1/history?id=&range=1H|24H|1D|5D|1M|1Y
 * 
 * Phase 2 Requirements:
 * - Crypto: CryptoCompare histohour (limit 24) or Binance klines 1h.
 * - Equities / energy / metals / forex intraday: Yahoo chart interval 15m range 2d (or 5d for forex),
 *   taking close values where non-null and > 0.
 * - Forex daily fallback: Frankfurter timeseries, labelled "ECB daily" in the response.
 * - Return format: { points: [{t, v}], granularity: '15m'|'1h'|'1d', source }
 */

import { ASSET_DEFINITIONS } from '../config.js';

/**
 * Fetches real crypto candles using CryptoCompare with Binance fallback.
 * @param {object} def - Asset definition
 * @param {string} range - '1H' | '24H' | '1D' | '1M' | '1Y'
 * @returns {Promise<{ points: Array<{t: number, v: number}>, granularity: string, source: string, previousClose: number|null }|null>}
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
          const first = points[0].v;
          return {
            points,
            granularity,
            source: 'cryptocompare',
            previousClose: first,
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
            const v = Number(item[4]); // close
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
      // Both providers failed
    }
  }

  return null;
}

/**
 * Fetches Frankfurter ECB daily timeseries as forex fallback.
 * @param {object} def
 * @returns {Promise<{ points: Array<{t: number, v: number}>, granularity: string, source: string, previousClose: number|null }|null>}
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

/**
 * Handles GET /v1/history?id=&range=
 * @param {Request} request
 * @param {object} env
 * @returns {Promise<object>}
 */
export async function handleHistory(request, env) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id')?.toLowerCase() || 'spx';
  const rangeParam = (url.searchParams.get('range') || '24H').toUpperCase();

  const def = ASSET_DEFINITIONS[id];
  if (!def) {
    return {
      error: `Unknown asset id: ${id}`,
      points: [],
      granularity: null,
      source: null,
      previousClose: null,
    };
  }

  // 1. Sector Crypto: CryptoCompare with Binance fallback
  if (def.sector === 'crypto') {
    const cryptoRes = await fetchCryptoHistory(def, rangeParam);
    if (cryptoRes && cryptoRes.points.length >= 10) {
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

  // 2. Equities, Energy, Metals, Forex: Yahoo Finance Chart
  let interval = '15m';
  let yahooRange = def.sector === 'forex' ? '5d' : '2d';
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

  const yahooSymbol = def.yahooSymbol || def.symbol;
  const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=${interval}&range=${yahooRange}`;

  try {
    const res = await fetch(yahooUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(6000),
    });

    if (res.ok) {
      const json = await res.json();
      const result = json?.chart?.result?.[0];
      if (result && result.meta) {
        const timestamps = result.timestamp || [];
        const quote = result.indicators?.quote?.[0] || {};
        const closes = quote.close || [];

        let points = [];
        for (let i = 0; i < timestamps.length; i++) {
          const c = closes[i];
          if (typeof c === 'number' && Number.isFinite(c) && c > 0) {
            const t = timestamps[i] * 1000;
            points.push({
              t,
              v: c,
              time: t,
              value: c,
              close: c,
            });
          }
        }

        // For 1H range, filter down to the trailing 60 minutes
        if (rangeParam === '1H' && points.length > 0) {
          const latestT = points[points.length - 1].t;
          const cutoff = latestT - 3600000;
          points = points.filter(p => p.t >= cutoff);
        }

        const rawPrev = result.meta?.chartPreviousClose ?? result.meta?.previousClose ?? null;
        const prevClose = (typeof rawPrev === 'number' && Number.isFinite(rawPrev) && rawPrev > 0) ? rawPrev : null;

        if (points.length >= 10) {
          return {
            id: def.id,
            symbol: def.symbol,
            range: rangeParam,
            granularity,
            source: 'yahoo',
            previousClose: prevClose,
            pointCount: points.length,
            points,
          };
        }
      }
    }
  } catch {
    // Yahoo failed or timed out
  }

  // 3. Forex Fallback: Frankfurter Timeseries (ECB daily)
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
