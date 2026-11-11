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
  const price = typeof rawData?.price === 'number' && Number.isFinite(rawData.price) && rawData.price > 0
    ? rawData.price
    : null;
  const prevClose = typeof rawData?.prevClose === 'number' && Number.isFinite(rawData.prevClose) && rawData.prevClose > 0
    ? rawData.prevClose
    : null;

  const quoteTs = typeof rawData?.quoteTs === 'number' && Number.isFinite(rawData.quoteTs) && rawData.quoteTs > 0
    ? rawData.quoteTs
    : null;
  const source = rawData?.source || (rawData ? 'yahoo' : 'unavailable');
  const isEcb = source === 'ECB daily ref' || rawData?.status === 'delayed';
  const changeBasis = rawData?.changeBasis || (isEcb ? 'vs prior ECB fix' : (def.sector === 'crypto' ? 'rolling_24h' : 'prev_close'));
  const session = rawData?.session || (def.sector === 'crypto' ? '24x7' : 'regular');
  const flags = Array.isArray(rawData?.flags) ? [...rawData.flags] : [];
  const spark1d = Array.isArray(rawData?.spark1d) ? rawData.spark1d : [];

  // Strictly compute change in the Worker; missing prevClose => change: null, changeStatus: 'unavailable'
  const change = (price !== null && prevClose !== null && prevClose > 0)
    ? parseFloat((((price - prevClose) / prevClose) * 100).toFixed(2))
    : null;
  const changeStatus = change === null ? 'unavailable' : 'available';

  // Status determination
  let status = 'live';
  if (price === null) {
    status = 'unavailable';
  } else if (isEcb) {
    status = 'delayed';
  } else if (quoteTs === null) {
    // Provider gave no timestamp: never synthesize now; mark stale
    status = 'stale';
  } else if (session === 'closed') {
    status = 'closed';
  } else {
    const ageMs = now - quoteTs;
    const threshold = def.sector === 'crypto' ? 120000 : 900000; // 120s crypto, 15m others
    if (ageMs > threshold) {
      status = 'stale';
    }
  }

  const priceDecimals = def.sector === 'crypto' && price !== null && price < 2 ? 4 : def.decimals;
  const prevDecimals = def.sector === 'crypto' && prevClose !== null && prevClose < 2 ? 4 : def.decimals;

  const result = {
    id: def.id,
    symbol: def.symbol,
    name: def.name,
    sector: def.sector,
    unit: def.unit,
    price: price !== null ? parseFloat(price.toFixed(priceDecimals)) : null,
    prevClose: prevClose !== null ? parseFloat(prevClose.toFixed(prevDecimals)) : null,
    change,
    changeStatus,
    changeBasis,
    quoteTs,
    fetchedAt: new Date(now).toISOString(),
    source,
    session,
    status,
    flags,
    spark1d,
  };

  if (typeof rawData?.spotPrice === 'number' && Number.isFinite(rawData.spotPrice)) {
    result.spotPrice = rawData.spotPrice;
  }

  return result;
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

  // 3. Fetch Yahoo Chart Assets (Equities, Energy, Metals, FX) with Finnhub Failover + SGD=X
  const yahooDefs = Object.values(ASSET_DEFINITIONS).filter(d => d.yahooSymbol);
  const yahooResults = {};
  let usdsgd = null;
  const t0Yahoo = Date.now();

  await Promise.allSettled([
    ...yahooDefs.map(async (def) => {
      try {
        const chart = await fetchYahooChart(def.yahooSymbol, { range: '1d', interval: '5m' });
        if (chart) {
          const session = determineSessionState(
            chart.currentTradingPeriod,
            nowSeconds,
            def.sector,
            chart.marketState
          );
          let flags = [];
          let spotPrice = null;
          if (def.sector === 'metals' && def.spotSymbol && spotMetals[def.id]) {
            const basis = checkMetalsBasis(chart.price, spotMetals[def.id]);
            flags = basis.flags;
            spotPrice = basis.spotPrice;
          }

          yahooResults[def.id] = {
            price: chart.price,
            prevClose: chart.prevClose,
            quoteTs: chart.quoteTs,
            source: 'yahoo',
            session,
            changeBasis: 'prev_close',
            flags,
            spotPrice,
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
              session: determineSessionState(null, nowSeconds, def.sector, null),
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
                session: determineSessionState(null, nowSeconds, def.sector, null),
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
    }),
    (async () => {
      try {
        const sgdChart = await fetchYahooChart('SGD=X', { range: '1d', interval: '5m' });
        if (sgdChart && typeof sgdChart.price === 'number' && Number.isFinite(sgdChart.price) && sgdChart.price > 0) {
          usdsgd = parseFloat(sgdChart.price.toFixed(4));
        }
      } catch {
        // Fallback handled below only if missing
      }
    })(),
  ]);

  const yahooSuccessCount = Object.keys(yahooResults).length;
  health.perSource.yahoo = {
    ok: yahooSuccessCount >= 10,
    lastOk: yahooSuccessCount > 0 ? now : null,
    latencyMs: Date.now() - t0Yahoo,
    assetsIngested: yahooSuccessCount,
  };

  // 4. Forex Fallback ONLY when Yahoo FX quotes failed
  const missingForex = Object.values(ASSET_DEFINITIONS).filter(d => d.sector === 'forex' && !yahooResults[d.id]);
  if (missingForex.length > 0 || usdsgd === null) {
    try {
      const frankfurter = await fetchFrankfurterFallback();
      for (const def of missingForex) {
        if (frankfurter[def.id]) {
          yahooResults[def.id] = frankfurter[def.id];
        }
      }
      if (usdsgd === null && frankfurter.usdsgd?.price) {
        usdsgd = frankfurter.usdsgd.price;
      }
    } catch {
      // continue
    }
  }

  // 5. Assemble All 32 Canonical Quotes + FX Extras (SGD=X + AED 3.6725 peg)
  const assets = {};
  for (const [id, def] of Object.entries(ASSET_DEFINITIONS)) {
    const raw = def.sector === 'crypto' ? cryptoQuotes[id] : yahooResults[id];
    assets[id] = buildAssetQuote(def, raw, now);
  }

  const payload = {
    schemaVersion: '1.0.0',
    generatedAt: new Date(now).toISOString(),
    assets,
    fx: {
      usdsgd,
      usdaed: 3.6725,
    },
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

  if (typeof quotesPayload?.fx?.usdsgd === 'number') {
    rates['USD/SGD'] = quotesPayload.fx.usdsgd;
    rates.usdsgd = quotesPayload.fx.usdsgd;
  }
  rates['USD/AED'] = quotesPayload?.fx?.usdaed ?? 3.6725;
  rates.usdaed = quotesPayload?.fx?.usdaed ?? 3.6725;

  return {
    schemaVersion: '1.0.0',
    generatedAt: quotesPayload.generatedAt,
    rates,
  };
}
