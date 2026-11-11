/**
 * Quidesk Market Engine — History Route Handler
 * 
 * Supplies authentic historical OHLCV chart series for 1D, 5D, 1M, 1Y.
 * Endpoints: GET /v1/history?id=&range=1D|5D|1M|1Y
 */

import { ASSET_DEFINITIONS } from '../config.js';

const RANGE_CONFIGS = {
  '1D': { range: '1d', interval: '5m' },
  '5D': { range: '5d', interval: '15m' },
  '1M': { range: '1mo', interval: '1d' },
  '1Y': { range: '1y', interval: '1wk' },
};

/**
 * Handles GET /v1/history?id=&range=
 * @param {Request} request
 * @param {object} env
 * @returns {Promise<Response>}
 */
export async function handleHistory(request, env) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id')?.toLowerCase() || 'spx';
  const rangeParam = (url.searchParams.get('range') || '1D').toUpperCase();

  const def = ASSET_DEFINITIONS[id];
  if (!def) {
    return new Response(JSON.stringify({ error: `Unknown asset id: ${id}` }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const rangeCfg = RANGE_CONFIGS[rangeParam] || RANGE_CONFIGS['1D'];
  const yahooSymbol = def.yahooSymbol || (def.sector === 'crypto' ? `${def.symbol}-USD` : def.symbol);

  const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?range=${rangeCfg.range}&interval=${rangeCfg.interval}`;

  try {
    const res = await fetch(yahooUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      throw new Error(`Yahoo HTTP ${res.status}`);
    }

    const json = await res.json();
    const result = json?.chart?.result?.[0];
    if (!result || !result.meta) {
      throw new Error('Invalid Yahoo chart response');
    }

    const timestamps = result.timestamp || [];
    const quote = result.indicators?.quote?.[0] || {};
    const opens = quote.open || [];
    const highs = quote.high || [];
    const lows = quote.low || [];
    const closes = quote.close || [];
    const volumes = quote.volume || [];

    const points = [];
    for (let i = 0; i < timestamps.length; i++) {
      const c = closes[i];
      if (typeof c === 'number' && Number.isFinite(c) && c > 0) {
        points.push({
          time: timestamps[i] * 1000,
          open: typeof opens[i] === 'number' && Number.isFinite(opens[i]) ? opens[i] : c,
          high: typeof highs[i] === 'number' && Number.isFinite(highs[i]) ? highs[i] : c,
          low: typeof lows[i] === 'number' && Number.isFinite(lows[i]) ? lows[i] : c,
          close: c,
          volume: volumes[i] || 0,
        });
      }
    }

    const rawPrev = result.meta?.chartPreviousClose ?? result.meta?.previousClose ?? null;
    const prevClose = (typeof rawPrev === 'number' && Number.isFinite(rawPrev) && rawPrev > 0) ? rawPrev : null;

    return {
      id: def.id,
      symbol: def.symbol,
      range: rangeParam,
      interval: rangeCfg.interval,
      previousClose: prevClose,
      pointCount: points.length,
      points,
    };
  } catch (err) {
    return {
      id: def.id,
      symbol: def.symbol,
      range: rangeParam,
      error: `Historical chart unavailable: ${err.message}`,
      points: [],
    };
  }
}
