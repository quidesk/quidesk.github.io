/**
 * Quidesk Market Engine — Quotes & FX Route Handler
 * 
 * Aggregates all 32 assets into the canonical unified quote schema.
 * Computes change ONLY on the worker: ((price - prevClose) / prevClose) * 100, 2dp.
 */

import { ASSET_DEFINITIONS } from '../config.js';
import { fetchYahooChart, fetchFinnhubQuote, determineSessionState } from '../providers/yahoo.js';
import { fetchBinanceCrypto, fetchCoinGeckoCrypto } from '../providers/binance.js';
import { fetchSpotMetals, checkMetalsBasis } from '../providers/metals.js';
import { fetchFrankfurterFallback } from '../providers/forex.js';

/**
 * Normalizes an asset into the strict canonical schema.
 */
export function buildAssetQuote(def, rawData, now = Date.now()) {
  const price = typeof rawData?.price === 'number' && Number.isFinite(rawData.price) ? rawData.price : null;
  const prevClose = typeof rawData?.prevClose === 'number' && Number.isFinite(rawData.prevClose) && rawData.prevClose > 0
    ? rawData.prevClose
    : price;

  const quoteTs = typeof rawData?.quoteTs === 'number' && Number.isFinite(rawData.quoteTs) ? rawData.quoteTs : now;
  const changeBasis = rawData?.changeBasis || (def.sector === 'crypto' ? 'rolling_24h' : 'prev_close');
  const session = rawData?.session || (def.sector === 'crypto' ? '24x7' : 'regular');
  const source = rawData?.source || 'yahoo';
  const flags = Array.isArray(rawData?.flags) ? [...rawData.flags] : [];
  const spark1d = Array.isArray(rawData?.spark1d) ? rawData.spark1d : [];

  // Strictly compute change in the Worker
  const change = (price !== null && prevClose !== null && prevClose > 0)
    ? parseFloat((((price - prevClose) / prevClose) * 100).toFixed(2))
    : 0.00;

  // Status determination
  let status = 'live';
  if (price === null || price <= 0) {
    status = 'unavailable';
  } else if (session === 'closed') {
    status = 'closed';
  } else if (source === 'ECB daily ref') {
    status = 'delayed';
  } else {
    const ageMs = now - quoteTs;
    const threshold = def.sector === 'crypto' ? 120000 : 900000; // 120s crypto, 15m others
    if (ageMs > threshold) {
      status = 'stale';
    }
  }

  return {
    id: def.id,
    symbol: def.symbol,
    name: def.name,
    sector: def.sector,
    unit: def.unit,
    price: price !== null ? parseFloat(price.toFixed(def.decimals)) : null,
    prevClose: prevClose !== null ? parseFloat(prevClose.toFixed(def.decimals)) : null,
    change,
    changeBasis,
    quoteTs,
    fetchedAt: new Date(now).toISOString(),
    source,
    session,
    status,
    flags,
    spark1d,
  };
}

/**
 * Handles GET /v1/quotes request.
 * @param {Request} request
 * @param {object} env
 * @returns {Promise<Response>}
 */
export async function handleQuotes(request, env) {
  const now = Date.now();
  const nowSeconds = Math.floor(now / 1000);
  const health = {
    perSource: {
      yahoo: { ok: false, lastOk: null, latencyMs: 0 },
      binance: { ok: false, lastOk: null, latencyMs: 0 },
      'gold-api': { ok: false, lastOk: null, latencyMs: 0 },
    },
  };

  // 1. Fetch Crypto Batch (1 subrequest)
  let cryptoQuotes = {};
  const t0Crypto = Date.now();
  try {
    cryptoQuotes = await fetchBinanceCrypto();
    health.perSource.binance = { ok: true, lastOk: now, latencyMs: Date.now() - t0Crypto };
  } catch (err) {
    try {
      cryptoQuotes = await fetchCoinGeckoCrypto();
      health.perSource.binance = { ok: true, lastOk: now, latencyMs: Date.now() - t0Crypto, fallback: 'coingecko' };
    } catch {
      health.perSource.binance = { ok: false, lastOk: null, latencyMs: Date.now() - t0Crypto };
    }
  }

  // 2. Fetch Spot Metals Cross-Check (3 subrequests)
  let spotMetals = {};
  const t0Metals = Date.now();
  try {
    spotMetals = await fetchSpotMetals(env?.GOLD_API_KEY);
    health.perSource['gold-api'] = { ok: true, lastOk: now, latencyMs: Date.now() - t0Metals };
  } catch {
    health.perSource['gold-api'] = { ok: false, lastOk: null, latencyMs: Date.now() - t0Metals };
  }

  // 3. Fetch Yahoo Chart Assets (Equities, Energy, Metals, FX) with Finnhub Failover
  const yahooDefs = Object.values(ASSET_DEFINITIONS).filter(d => d.yahooSymbol);
  const yahooResults = {};
  const t0Yahoo = Date.now();

  await Promise.allSettled(
    yahooDefs.map(async (def) => {
      try {
        const chart = await fetchYahooChart(def.yahooSymbol, { range: '1d', interval: '5m' });
        if (chart) {
          const session = determineSessionState(chart.currentTradingPeriod, nowSeconds, def.sector);
          let flags = [];
          if (def.sector === 'metals' && def.spotSymbol && spotMetals[def.id]) {
            const basis = checkMetalsBasis(chart.price, spotMetals[def.id]);
            flags = basis.flags;
          }

          yahooResults[def.id] = {
            price: chart.price,
            prevClose: chart.prevClose,
            quoteTs: chart.quoteTs,
            source: 'yahoo',
            session,
            changeBasis: 'prev_close',
            flags,
            spark1d: chart.spark1d,
          };
        } else if (def.sector === 'equities' && env?.FINNHUB_KEY) {
          const fh = await fetchFinnhubQuote(def.symbol, env.FINNHUB_KEY);
          if (fh) {
            yahooResults[def.id] = {
              price: fh.price,
              prevClose: fh.prevClose,
              quoteTs: fh.quoteTs,
              source: 'finnhub',
              session: 'regular',
              changeBasis: 'prev_close',
              flags: ['finnhub_failover'],
              spark1d: [],
            };
          }
        }
      } catch {
        if (def.sector === 'equities' && env?.FINNHUB_KEY) {
          try {
            const fh = await fetchFinnhubQuote(def.symbol, env.FINNHUB_KEY);
            if (fh) {
              yahooResults[def.id] = {
                price: fh.price,
                prevClose: fh.prevClose,
                quoteTs: fh.quoteTs,
                source: 'finnhub',
                session: 'regular',
                changeBasis: 'prev_close',
                flags: ['finnhub_failover'],
                spark1d: [],
              };
            }
          } catch {
            // Handled
          }
        }
      }
    })
  );

  const yahooSuccessCount = Object.keys(yahooResults).length;
  health.perSource.yahoo = {
    ok: yahooSuccessCount >= 10,
    lastOk: yahooSuccessCount > 0 ? now : null,
    latencyMs: Date.now() - t0Yahoo,
    assetsIngested: yahooSuccessCount,
  };

  // 4. Forex Fallback if Yahoo FX quotes failed
  const missingForex = Object.values(ASSET_DEFINITIONS).filter(d => d.sector === 'forex' && !yahooResults[d.id]);
  if (missingForex.length > 0) {
    try {
      const frankfurter = await fetchFrankfurterFallback();
      for (const def of missingForex) {
        if (frankfurter[def.id]) {
          yahooResults[def.id] = frankfurter[def.id];
        }
      }
    } catch {
      // continue
    }
  }

  // 5. Assemble All 32 Canonical Quotes
  const assets = {};
  for (const [id, def] of Object.entries(ASSET_DEFINITIONS)) {
    const raw = def.sector === 'crypto' ? cryptoQuotes[id] : yahooResults[id];
    assets[id] = buildAssetQuote(def, raw, now);
  }

  const payload = {
    schemaVersion: '1.0.0',
    generatedAt: new Date(now).toISOString(),
    assets,
    health,
  };

  return payload;
}

/**
 * Handles GET /v1/fx request (canonical cross rates).
 */
export function handleFx(quotesPayload) {
  const assets = quotesPayload?.assets || {};
  const rates = {};

  for (const [id, a] of Object.entries(assets)) {
    if (a.sector === 'forex' && a.price !== null) {
      rates[a.symbol] = a.price;
      rates[id] = a.price;
    }
  }

  return {
    schemaVersion: '1.0.0',
    generatedAt: quotesPayload.generatedAt,
    rates,
  };
}
