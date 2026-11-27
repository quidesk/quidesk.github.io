/**
 * Quidesk Market Engine — Quotes & FX Route Handler
 * 
 * Aggregates all 32 assets into the canonical unified quote schema.
 * Computes change ONLY on the worker: ((price - prevClose) / prevClose) * 100, 2dp.
 */

import { ASSET_DEFINITIONS } from '../config.js';
import { fetchYahooChart, fetchFrontMonthBrent, fetchFinnhubQuote, determineSessionState } from '../providers/yahoo.js';
import { fetchMultiTierCrypto } from '../providers/crypto.js';
import { fetchSpotMetals, checkMetalsBasis } from '../providers/metals.js';
import { fetchFrankfurterFallback } from '../providers/forex.js';

const REGIONAL_FX_IDS = new Set(['usdinr', 'eurinr']);

export function getStalenessThresholdMs(def) {
  if (def?.sector === 'crypto') return 120000;        // 2 min
  if (REGIONAL_FX_IDS.has(def?.id)) return 3600000;   // 60 min (off-peak INR interbank cadence)
  return 900000;                                      // 15 min (Equities, G10 FX, Metals, Energy)
}

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

  const change = (price !== null && prevClose !== null && prevClose > 0)
    ? parseFloat((((price - prevClose) / prevClose) * 100).toFixed(2))
    : null;
  const changeStatus = change === null ? 'unavailable' : 'available';

  let status = 'live';
  if (price === null) {
    status = 'unavailable';
  } else if (isEcb) {
    status = 'delayed';
  } else if (quoteTs === null) {
    status = 'stale';
  } else if (session === 'closed' || session === 'post' || session === 'pre') {
    status = 'closed';
  } else {
    const ageMs = now - quoteTs;
    const threshold = getStalenessThresholdMs(def);
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
    changePercent: change,
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
 */
export async function handleQuotes(request, env) {
  const now = Date.now();
  const nowSeconds = Math.floor(now / 1000);
  const health = {
    perSource: {
      yahoo: { ok: false, lastOk: null, latencyMs: 0 },
      binance: { ok: false, lastOk: null, latencyMs: 0 },
      kraken: { ok: false, lastOk: null, latencyMs: 0 },
      cryptocompare: { ok: false, lastOk: null, latencyMs: 0 },
      'gold-api': { ok: false, lastOk: null, latencyMs: 0 },
    },
  };

  // 1. Fetch Multi-Tier Crypto (Binance -> Kraken -> CryptoCompare -> Yahoo -> CoinGecko)
  const { quotes: cryptoQuotes, health: cryptoHealth } = await fetchMultiTierCrypto(env, now);
  health.perSource.binance = cryptoHealth.binance;
  health.perSource.kraken = cryptoHealth.kraken;
  health.perSource.cryptocompare = cryptoHealth.cryptocompare;
  if (cryptoHealth.coingecko) {
    health.perSource.coingecko = cryptoHealth.coingecko;
  }

  // 2. Fetch Spot Metals Cross-Check
  let spotMetals = {};
  const t0Metals = Date.now();
  try {
    spotMetals = await fetchSpotMetals(env?.GOLD_API_KEY);
    health.perSource['gold-api'] = { ok: true, lastOk: now, latencyMs: Date.now() - t0Metals };
  } catch {
    health.perSource['gold-api'] = { ok: false, lastOk: null, latencyMs: Date.now() - t0Metals };
  }

  // 3. Fetch Non-Crypto Yahoo Assets (Equities, Energy, Metals, FX) + SGD=X
  const yahooDefs = Object.values(ASSET_DEFINITIONS).filter(d => d.sector !== 'crypto' && d.yahooSymbol);
  const yahooResults = {};
  let usdsgd = null;
  const t0Yahoo = Date.now();

  await Promise.allSettled([
    ...yahooDefs.map(async (def) => {
      try {
        const chart = def.id === 'brent'
          ? await fetchFrontMonthBrent({ range: '1d', interval: '5m' }, now)
          : await fetchYahooChart(def.yahooSymbol, { range: '1d', interval: '5m' });

        if (chart) {
          const session = determineSessionState(
            chart.currentTradingPeriod,
            nowSeconds,
            def.sector,
            chart.marketState
          );
          let flags = Array.isArray(chart.flags) ? [...chart.flags] : [];
          let spotPrice = null;
          if (def.sector === 'metals' && def.spotSymbol && spotMetals[def.id]) {
            const basis = checkMetalsBasis(chart.price, spotMetals[def.id]);
            flags = [...flags, ...basis.flags];
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

  // 5. Assemble All 32 Canonical Quotes + Enforce EUR/INR Triangular Parity + Brent-WTI Sanity Check
  const assets = {};
  for (const [id, def] of Object.entries(ASSET_DEFINITIONS)) {
    const raw = def.sector === 'crypto' ? cryptoQuotes[id] : yahooResults[id];
    assets[id] = buildAssetQuote(def, raw, now);
  }

  if (assets.brent?.price > 0 && assets.wti?.price > 0 && assets.brent.price < assets.wti.price) {
    if (!assets.brent.flags.includes('brent_below_wti')) {
      assets.brent.flags.push('brent_below_wti');
    }
  }

  if (assets.eurusd?.price > 0 && assets.usdinr?.price > 0 && assets.eurinr) {
    const exactEurInr = parseFloat((assets.eurusd.price * assets.usdinr.price).toFixed(2));
    const prevEurInr = (assets.eurusd.prevClose > 0 && assets.usdinr.prevClose > 0)
      ? parseFloat((assets.eurusd.prevClose * assets.usdinr.prevClose).toFixed(2))
      : assets.eurinr.prevClose;
    assets.eurinr.price = exactEurInr;
    if (prevEurInr && prevEurInr > 0) {
      assets.eurinr.prevClose = prevEurInr;
      assets.eurinr.change = parseFloat((((exactEurInr - prevEurInr) / prevEurInr) * 100).toFixed(2));
      assets.eurinr.changePercent = assets.eurinr.change;
      assets.eurinr.changeStatus = 'available';
    }
    const derivedTs = Math.max(assets.eurusd.quoteTs || 0, assets.usdinr.quoteTs || 0);
    if (derivedTs > 0) {
      assets.eurinr.quoteTs = derivedTs;
      if (assets.eurinr.status === 'stale' && (now - derivedTs) <= getStalenessThresholdMs(ASSET_DEFINITIONS.eurinr)) {
        assets.eurinr.status = 'live';
      }
    }
  }

  return {
    schemaVersion: '1.0.0',
    generatedAt: new Date(now).toISOString(),
    assets,
    fx: {
      usdsgd,
      usdaed: 3.6725,
    },
    health,
  };
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
