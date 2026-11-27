/**
 * Quidesk Market Engine — Multi-Tier Resilient Crypto Provider
 *
 * Tiers (tried in strict priority order, taking first valid price per symbol):
 * 1. Binance Vision REST (data-api.binance.vision) + 30m klines spark1d
 * 2. Kraken Public Ticker (XBT, ETH, SOL, XRP, ADA) + 30m OHLC spark1d
 * 3. CryptoCompare Multi-Symbol Full Price (covers BNB and rest)
 * 4. Yahoo Finance v8 Chart (BTC-USD, ETH-USD, SOL-USD, BNB-USD, XRP-USD, ADA-USD) — covers BNB & spark1d backfill
 * 5. CoinGecko Simple Price (ONLY when COINGECKO_API_KEY / CG_API_KEY is configured in Worker env)
 *
 * Per-provider timeout: 4s
 * Strictly validates: Number.isFinite(price) && price > 0
 * changeBasis: 'rolling_24h', change = (price - open24h) / open24h * 100
 */

import { fetchYahooChart } from './yahoo.js';

export const CRYPTO_DEFINITIONS = {
  btc: { id: 'btc', symbol: 'BTC', binance: 'BTCUSDT', kraken: 'XXBTZUSD', krakenAlt: 'XBT', cc: 'BTC', yahoo: 'BTC-USD', cg: 'bitcoin' },
  eth: { id: 'eth', symbol: 'ETH', binance: 'ETHUSDT', kraken: 'XETHZUSD', krakenAlt: 'ETH', cc: 'ETH', yahoo: 'ETH-USD', cg: 'ethereum' },
  sol: { id: 'sol', symbol: 'SOL', binance: 'SOLUSDT', kraken: 'SOLUSD', krakenAlt: 'SOL', cc: 'SOL', yahoo: 'SOL-USD', cg: 'solana' },
  bnb: { id: 'bnb', symbol: 'BNB', binance: 'BNBUSDT', kraken: null, krakenAlt: null, cc: 'BNB', yahoo: 'BNB-USD', cg: 'binancecoin' },
  xrp: { id: 'xrp', symbol: 'XRP', binance: 'XRPUSDT', kraken: 'XXRPZUSD', krakenAlt: 'XRP', cc: 'XRP', yahoo: 'XRP-USD', cg: 'ripple' },
  ada: { id: 'ada', symbol: 'ADA', binance: 'ADAUSDT', kraken: 'ADAUSD', krakenAlt: 'ADA', cc: 'ADA', yahoo: 'ADA-USD', cg: 'cardano' },
};

async function fetchBinanceSparkline(binanceSymbol, timeoutMs = 4500) {
  try {
    const url = `https://data-api.binance.vision/api/v3/klines?symbol=${encodeURIComponent(binanceSymbol)}&interval=30m&limit=48`;
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return [];
    const klines = await res.json();
    if (!Array.isArray(klines)) return [];
    const points = [];
    for (const k of klines) {
      const ts = Number(k?.[0]);
      const close = parseFloat(k?.[4]);
      if (Number.isFinite(ts) && ts > 0 && Number.isFinite(close) && close > 0) {
        points.push([ts, close]);
      }
    }
    return points;
  } catch {
    return [];
  }
}

async function fetchKrakenSparkline(krakenPair, krakenAlt, timeoutMs = 3500) {
  try {
    const since = Math.floor((Date.now() - 24 * 3600 * 1000) / 1000);
    const url = `https://api.kraken.com/0/public/OHLC?pair=${encodeURIComponent(krakenPair)}&interval=30&since=${since}`;
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return [];
    const json = await res.json();
    const rawResult = json?.result;
    if (!rawResult || typeof rawResult !== 'object') return [];
    const rows = rawResult[krakenPair] ||
      Object.entries(rawResult).find(([k]) => k !== 'last' && (!krakenAlt || k.includes(krakenAlt)))?.[1];
    if (!Array.isArray(rows)) return [];
    const points = [];
    for (const row of rows.slice(-48)) {
      const ts = Number(row?.[0]) * 1000;
      const close = parseFloat(row?.[4]);
      if (Number.isFinite(ts) && ts > 0 && Number.isFinite(close) && close > 0) {
        points.push([ts, close]);
      }
    }
    return points;
  } catch {
    return [];
  }
}

/**
 * Fetch from Binance Vision (Tier 1)
 */
export async function fetchBinanceTier(neededSymbols, timeoutMs = 4000) {
  if (neededSymbols.length === 0) return {};
  const binanceSymbols = neededSymbols.map(s => CRYPTO_DEFINITIONS[s]?.binance).filter(Boolean);
  const url = `https://data-api.binance.vision/api/v3/ticker/24hr?symbols=${encodeURIComponent(JSON.stringify(binanceSymbols))}`;

  const res = await fetch(url, {
    headers: { 'Accept': 'application/json' },
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) throw new Error(`Binance HTTP ${res.status}`);
  const json = await res.json();
  if (!Array.isArray(json)) throw new Error('Invalid Binance payload');

  const sparkEntries = await Promise.all(
    binanceSymbols.map(async (sym) => [sym, await fetchBinanceSparkline(sym)])
  );
  const sparkMap = Object.fromEntries(sparkEntries);

  const results = {};
  for (const item of json) {
    const entry = Object.values(CRYPTO_DEFINITIONS).find(c => c.binance === item.symbol);
    if (!entry) continue;

    const price = parseFloat(item.lastPrice);
    const parsedOpen = parseFloat(item.openPrice);
    const parsedPrev = parseFloat(item.prevClosePrice);
    const open24h = (Number.isFinite(parsedOpen) && parsedOpen > 0)
      ? parsedOpen
      : ((Number.isFinite(parsedPrev) && parsedPrev > 0) ? parsedPrev : null);

    if (Number.isFinite(price) && price > 0) {
      results[entry.id] = {
        id: entry.id,
        symbol: entry.symbol,
        price,
        prevClose: open24h,
        quoteTs: typeof item.closeTime === 'number' && item.closeTime > 0 ? item.closeTime : Date.now(),
        source: 'binance',
        changeBasis: 'rolling_24h',
        session: '24x7',
        spark1d: sparkMap[item.symbol] || [],
      };
    }
  }
  return results;
}

/**
 * Fetch from Kraken Public Ticker + OHLC Sparklines (Tier 2)
 */
export async function fetchKrakenTier(neededSymbols, timeoutMs = 4000) {
  const eligible = neededSymbols.filter(s => CRYPTO_DEFINITIONS[s]?.kraken);
  if (eligible.length === 0) return {};

  const pairs = eligible.map(s => CRYPTO_DEFINITIONS[s].kraken).join(',');
  const url = `https://api.kraken.com/0/public/Ticker?pair=${pairs}`;

  const res = await fetch(url, {
    headers: { 'Accept': 'application/json' },
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) throw new Error(`Kraken HTTP ${res.status}`);
  const json = await res.json();
  const rawResult = json?.result;
  if (!rawResult || typeof rawResult !== 'object') throw new Error('Invalid Kraken payload');

  const sparkEntries = await Promise.all(
    eligible.map(async (sym) => {
      const cfg = CRYPTO_DEFINITIONS[sym];
      return [cfg.id, await fetchKrakenSparkline(cfg.kraken, cfg.krakenAlt, 3500)];
    })
  );
  const sparkMap = Object.fromEntries(sparkEntries);

  const results = {};
  for (const sym of eligible) {
    const cfg = CRYPTO_DEFINITIONS[sym];
    const row = rawResult[cfg.kraken] || Object.entries(rawResult).find(([k]) => k.includes(cfg.krakenAlt))?.[1];
    if (row && Array.isArray(row.c) && row.c.length > 0) {
      const price = parseFloat(row.c[0]);
      const open24h = parseFloat(row.o);
      const prevClose = (Number.isFinite(open24h) && open24h > 0) ? open24h : null;

      if (Number.isFinite(price) && price > 0) {
        results[cfg.id] = {
          id: cfg.id,
          symbol: cfg.symbol,
          price,
          prevClose,
          quoteTs: Date.now(),
          source: 'kraken',
          changeBasis: 'rolling_24h',
          session: '24x7',
          spark1d: sparkMap[cfg.id] || [],
        };
      }
    }
  }
  return results;
}

/**
 * Fetch from CryptoCompare Full Price (Tier 3)
 */
export async function fetchCryptoCompareTier(neededSymbols, timeoutMs = 4000) {
  if (neededSymbols.length === 0) return {};
  const fsyms = neededSymbols.map(s => CRYPTO_DEFINITIONS[s]?.cc).filter(Boolean).join(',');
  const url = `https://min-api.cryptocompare.com/data/pricemultifull?fsyms=${fsyms}&tsyms=USD`;

  const res = await fetch(url, {
    headers: { 'Accept': 'application/json' },
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) throw new Error(`CryptoCompare HTTP ${res.status}`);
  const json = await res.json();
  const raw = json?.RAW || {};

  const results = {};
  for (const sym of neededSymbols) {
    const cfg = CRYPTO_DEFINITIONS[sym];
    const usd = raw[cfg.cc]?.USD;
    if (usd) {
      const price = parseFloat(usd.PRICE);
      const open24h = parseFloat(usd.OPEN24HOUR);
      const prevClose = (Number.isFinite(open24h) && open24h > 0) ? open24h : null;
      const ts = typeof usd.LASTUPDATE === 'number' && usd.LASTUPDATE > 0
        ? usd.LASTUPDATE * 1000
        : Date.now();

      if (Number.isFinite(price) && price > 0) {
        results[cfg.id] = {
          id: cfg.id,
          symbol: cfg.symbol,
          price,
          prevClose,
          quoteTs: ts,
          source: 'cryptocompare',
          changeBasis: 'rolling_24h',
          session: '24x7',
          spark1d: [],
        };
      }
    }
  }
  return results;
}

/**
 * Fetch from Yahoo Finance v8 Chart (Tier 4 — guarantees BNB & 24H sparklines on US Cloudflare colos)
 */
export async function fetchYahooCryptoTier(neededSymbols, timeoutMs = 5000) {
  const eligible = neededSymbols.filter(s => CRYPTO_DEFINITIONS[s]?.yahoo);
  if (eligible.length === 0) return {};

  const results = {};
  await Promise.allSettled(
    eligible.map(async (sym) => {
      const cfg = CRYPTO_DEFINITIONS[sym];
      const chart = await fetchYahooChart(cfg.yahoo, { range: '1d', interval: '30m', timeoutMs });
      if (chart && Number.isFinite(chart.price) && chart.price > 0) {
        results[cfg.id] = {
          id: cfg.id,
          symbol: cfg.symbol,
          price: chart.price,
          prevClose: chart.prevClose,
          quoteTs: chart.quoteTs || Date.now(),
          source: 'yahoo',
          changeBasis: 'rolling_24h',
          session: '24x7',
          spark1d: Array.isArray(chart.spark1d) ? chart.spark1d : [],
        };
      }
    })
  );

  return results;
}

/**
 * Fetch from CoinGecko Simple Price (Tier 5, only when API key is configured)
 */
export async function fetchCoinGeckoTier(neededSymbols, apiKey, timeoutMs = 4000) {
  if (!apiKey || neededSymbols.length === 0) return {};
  const ids = neededSymbols.map(s => CRYPTO_DEFINITIONS[s]?.cg).filter(Boolean).join(',');
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_last_updated_at=true`;

  const res = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'x-cg-demo-api-key': apiKey,
    },
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);
  const json = await res.json();

  const results = {};
  for (const sym of neededSymbols) {
    const cfg = CRYPTO_DEFINITIONS[sym];
    const data = json[cfg.cg];
    if (data && typeof data.usd === 'number' && Number.isFinite(data.usd) && data.usd > 0) {
      const price = data.usd;
      const chg = typeof data.usd_24h_change === 'number' && Number.isFinite(data.usd_24h_change)
        ? data.usd_24h_change
        : null;
      const open24h = chg !== null && (1 + chg / 100) > 0 ? price / (1 + chg / 100) : null;
      const ts = typeof data.last_updated_at === 'number' && data.last_updated_at > 0
        ? data.last_updated_at * 1000
        : Date.now();

      results[cfg.id] = {
        id: cfg.id,
        symbol: cfg.symbol,
        price,
        prevClose: open24h,
        quoteTs: ts,
        source: 'coingecko',
        changeBasis: 'rolling_24h',
        session: '24x7',
        spark1d: [],
      };
    }
  }
  return results;
}

/**
 * Multi-Tier Crypto Orchestrator with guaranteed intraday sparkline backfill
 */
export async function fetchMultiTierCrypto(env = {}, now = Date.now()) {
  const allIds = Object.keys(CRYPTO_DEFINITIONS);
  let remaining = [...allIds];
  const quotes = {};
  const health = {
    binance: { ok: false, lastOk: null, latencyMs: 0 },
    kraken: { ok: false, lastOk: null, latencyMs: 0 },
    cryptocompare: { ok: false, lastOk: null, latencyMs: 0 },
  };

  const cgKey = env?.COINGECKO_API_KEY || env?.CG_API_KEY;
  if (cgKey) {
    health.coingecko = { ok: false, lastOk: null, latencyMs: 0 };
  }

  // Tier 1: Binance
  if (remaining.length > 0) {
    const t0 = Date.now();
    try {
      const res = await fetchBinanceTier(remaining, 4000);
      const count = Object.keys(res).length;
      health.binance = { ok: count > 0, lastOk: count > 0 ? now : null, latencyMs: Date.now() - t0 };
      for (const [id, q] of Object.entries(res)) {
        quotes[id] = q;
      }
      remaining = remaining.filter(id => !quotes[id]);
    } catch {
      health.binance = { ok: false, lastOk: null, latencyMs: Date.now() - t0 };
    }
  }

  // Tier 2: Kraken (with OHLC sparklines)
  if (remaining.length > 0) {
    const t0 = Date.now();
    try {
      const res = await fetchKrakenTier(remaining, 4000);
      const count = Object.keys(res).length;
      health.kraken = { ok: count > 0, lastOk: count > 0 ? now : null, latencyMs: Date.now() - t0 };
      for (const [id, q] of Object.entries(res)) {
        quotes[id] = q;
      }
      remaining = remaining.filter(id => !quotes[id]);
    } catch {
      health.kraken = { ok: false, lastOk: null, latencyMs: Date.now() - t0 };
    }
  }

  // Tier 3: CryptoCompare
  if (remaining.length > 0) {
    const t0 = Date.now();
    try {
      const res = await fetchCryptoCompareTier(remaining, 4000);
      const count = Object.keys(res).length;
      health.cryptocompare = { ok: count > 0, lastOk: count > 0 ? now : null, latencyMs: Date.now() - t0 };
      for (const [id, q] of Object.entries(res)) {
        quotes[id] = q;
      }
      remaining = remaining.filter(id => !quotes[id]);
    } catch {
      health.cryptocompare = { ok: false, lastOk: null, latencyMs: Date.now() - t0 };
    }
  }

  // Tier 4: Yahoo Finance Crypto (covers BNB + any remaining assets with full spark1d)
  if (remaining.length > 0) {
    try {
      const res = await fetchYahooCryptoTier(remaining, 5000);
      for (const [id, q] of Object.entries(res)) {
        quotes[id] = q;
      }
      remaining = remaining.filter(id => !quotes[id]);
    } catch {
      // continue to Tier 5
    }
  }

  // Tier 5: CoinGecko (key required)
  if (remaining.length > 0 && cgKey) {
    const t0 = Date.now();
    try {
      const res = await fetchCoinGeckoTier(remaining, cgKey, 4000);
      const count = Object.keys(res).length;
      health.coingecko = { ok: count > 0, lastOk: count > 0 ? now : null, latencyMs: Date.now() - t0 };
      for (const [id, q] of Object.entries(res)) {
        quotes[id] = q;
      }
      remaining = remaining.filter(id => !quotes[id]);
    } catch {
      health.coingecko = { ok: false, lastOk: null, latencyMs: Date.now() - t0 };
    }
  }

  // Sparkline Backfill Pass: guarantee >= 10 intraday points for any active crypto quote
  const needsSpark = Object.keys(quotes).filter(
    (id) => !Array.isArray(quotes[id].spark1d) || quotes[id].spark1d.length < 10
  );
  if (needsSpark.length > 0) {
    await Promise.allSettled(
      needsSpark.map(async (id) => {
        const cfg = CRYPTO_DEFINITIONS[id];
        if (!cfg?.yahoo) return;
        const chart = await fetchYahooChart(cfg.yahoo, { range: '1d', interval: '30m', timeoutMs: 4500 });
        if (chart && Array.isArray(chart.spark1d) && chart.spark1d.length >= 10) {
          quotes[id].spark1d = chart.spark1d;
        }
      })
    );
  }

  return { quotes, health };
}
