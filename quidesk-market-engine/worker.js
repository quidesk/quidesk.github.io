/**
 * Quidesk Market Engine — Cloudflare Worker Market Aggregator
 * 
 * Aggregates live prices for Equities, Crypto, Metals, Energy, and Forex
 * from Yahoo Finance, Binance, and Gold-API with Cloudflare KV caching.
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
};

// Base baseline targets for all 32 Quidesk assets
const ASSET_DEFINITIONS = {
  // Equities
  spx:  { symbol: 'SPY',      name: 'SPDR S&P 500 ETF',  sector: 'equities', volume: '60M',  marketCap: '540B', yahoo: 'SPY',     defaultPrice: 754.35,  defaultChange: 0.30 },
  ndx:  { symbol: 'QQQ',      name: 'Invesco QQQ Trust', sector: 'equities', volume: '40M',  marketCap: '300B', yahoo: 'QQQ',     defaultPrice: 685.28,  defaultChange: 0.62 },
  dow:  { symbol: 'DIA',      name: 'SPDR Dow Jones',    sector: 'equities', volume: '5M',   marketCap: '35B',  yahoo: 'DIA',     defaultPrice: 517.06,  defaultChange: -0.44 },
  aapl: { symbol: 'AAPL',     name: 'Apple Inc.',        sector: 'equities', volume: '58M',  marketCap: '3.5T', yahoo: 'AAPL',    defaultPrice: 331.90,  defaultChange: -1.90 },
  tsla: { symbol: 'TSLA',     name: 'Tesla Inc.',        sector: 'equities', volume: '98M',  marketCap: '1.1T', yahoo: 'TSLA',    defaultPrice: 398.50,  defaultChange: -1.32 },
  meta: { symbol: 'META',     name: 'Meta Platforms',    sector: 'equities', volume: '32M',  marketCap: '1.4T', yahoo: 'META',    defaultPrice: 621.03,  defaultChange: 2.36 },
  nvda: { symbol: 'NVDA',     name: 'NVIDIA Corp.',      sector: 'equities', volume: '42M',  marketCap: '3.4T', yahoo: 'NVDA',    defaultPrice: 206.69,  defaultChange: 2.29 },

  // Crypto
  btc:  { symbol: 'BTC',      name: 'Bitcoin',           sector: 'crypto',   volume: '28.4B', marketCap: '1.54T', binance: 'BTCUSDT', yahoo: 'BTC-USD', defaultPrice: 77718.01, defaultChange: 1.14 },
  eth:  { symbol: 'ETH',      name: 'Ethereum',          sector: 'crypto',   volume: '14.2B', marketCap: '272B',  binance: 'ETHUSDT', yahoo: 'ETH-USD', defaultPrice: 2283.58,  defaultChange: 1.33 },
  sol:  { symbol: 'SOL',      name: 'Solana',            sector: 'crypto',   volume: '3.8B',  marketCap: '44B',   binance: 'SOLUSDT', yahoo: 'SOL-USD', defaultPrice: 93.17,    defaultChange: 1.34 },
  bnb:  { symbol: 'BNB',      name: 'BNB',               sector: 'crypto',   volume: '1.9B',  marketCap: '102B',  binance: 'BNBUSDT', yahoo: 'BNB-USD', defaultPrice: 700.33,   defaultChange: 0.15 },
  xrp:  { symbol: 'XRP',      name: 'XRP',               sector: 'crypto',   volume: '2.1B',  marketCap: '72B',   binance: 'XRPUSDT', yahoo: 'XRP-USD', defaultPrice: 1.2813,   defaultChange: 2.59 },
  ada:  { symbol: 'ADA',      name: 'Cardano',           sector: 'crypto',   volume: '820M',  marketCap: '6.8B',  binance: 'ADAUSDT', yahoo: 'ADA-USD', defaultPrice: 0.1908,   defaultChange: 1.33 },

  // Metals
  gold:     { symbol: 'XAU/USD', name: 'Gold Spot',      sector: 'metals',   volume: '142B',  marketCap: '14.6T', unit: 'oz', yahoo: 'GC=F', metalSym: 'XAU', defaultPrice: 3936.70, defaultChange: 1.51 },
  silver:   { symbol: 'XAG/USD', name: 'Silver Spot',    sector: 'metals',   volume: '18B',   marketCap: '1.7T',  unit: 'oz', yahoo: 'SI=F', metalSym: 'XAG', defaultPrice: 49.93,   defaultChange: 2.10 },
  platinum: { symbol: 'XPT/USD', name: 'Platinum',       sector: 'metals',   volume: '4.2B',  marketCap: '—',     unit: 'oz', yahoo: 'PL=F', metalSym: 'XPT', defaultPrice: 1425.00, defaultChange: -0.77 },

  // Energy
  wti:   { symbol: 'WTI',     name: 'WTI Crude Oil',     sector: 'energy',   volume: '820M',  marketCap: '—', unit: 'bbl',   yahoo: 'CL=F', defaultPrice: 96.56,  defaultChange: 0.49 },
  brent: { symbol: 'BRENT',   name: 'Brent Crude',       sector: 'energy',   volume: '940M',  marketCap: '—', unit: 'bbl',   yahoo: 'BZ=F', defaultPrice: 104.27, defaultChange: 0.65 },
  ng:    { symbol: 'NGAS',    name: 'Natural Gas',       sector: 'energy',   volume: '210M',  marketCap: '—', unit: 'MMBtu', yahoo: 'NG=F', defaultPrice: 2.896,  defaultChange: 0.03 },
  hoil:  { symbol: 'HOIL',    name: 'Heating Oil',       sector: 'energy',   volume: '180M',  marketCap: '—', unit: 'gal',   yahoo: 'HO=F', defaultPrice: 4.559,  defaultChange: 0.64 },

  // Forex
  eurusd: { symbol: 'EUR/USD', name: 'Euro / US Dollar',        sector: 'forex', volume: '580B', marketCap: '—', unit: 'USD', yahoo: 'EURUSD=X', defaultPrice: 1.1195, defaultChange: 0.03 },
  gbpusd: { symbol: 'GBP/USD', name: 'British Pound / USD',     sector: 'forex', volume: '310B', marketCap: '—', unit: 'USD', yahoo: 'GBPUSD=X', defaultPrice: 1.3410, defaultChange: 0.07 },
  usdjpy: { symbol: 'USD/JPY', name: 'US Dollar / Yen',         sector: 'forex', volume: '430B', marketCap: '—', unit: 'JPY', yahoo: 'USDJPY=X', defaultPrice: 157.90, defaultChange: 0.56 },
  audusd: { symbol: 'AUD/USD', name: 'Australian Dollar / USD', sector: 'forex', volume: '170B', marketCap: '—', unit: 'USD', yahoo: 'AUDUSD=X', defaultPrice: 0.7003, defaultChange: -0.41 },
  usdcad: { symbol: 'USD/CAD', name: 'US Dollar / CAD',         sector: 'forex', volume: '160B', marketCap: '—', unit: 'CAD', yahoo: 'USDCAD=X', defaultPrice: 1.3981, defaultChange: 0.05 },
  usdchf: { symbol: 'USD/CHF', name: 'US Dollar / CHF',         sector: 'forex', volume: '130B', marketCap: '—', unit: 'CHF', yahoo: 'USDCHF=X', defaultPrice: 0.8195, defaultChange: 0.31 },
  nzdusd: { symbol: 'NZD/USD', name: 'NZ Dollar / USD',         sector: 'forex', volume: '95B',  marketCap: '—', unit: 'USD', yahoo: 'NZDUSD=X', defaultPrice: 0.5621, defaultChange: -0.30 },
  eurgbp: { symbol: 'EUR/GBP', name: 'Euro / GBP',              sector: 'forex', volume: '90B',  marketCap: '—', unit: 'GBP', yahoo: 'EURGBP=X', defaultPrice: 0.8348, defaultChange: -0.02 },
  gbpjpy: { symbol: 'GBP/JPY', name: 'British Pound / Yen',     sector: 'forex', volume: '70B',  marketCap: '—', unit: 'JPY', yahoo: 'GBPJPY=X', defaultPrice: 211.73, defaultChange: 0.64 },
  eurjpy: { symbol: 'EUR/JPY', name: 'Euro / Yen',              sector: 'forex', volume: '85B',  marketCap: '—', unit: 'JPY', yahoo: 'EURJPY=X', defaultPrice: 176.76, defaultChange: 0.52 },
  usdinr: { symbol: 'USD/INR', name: 'US Dollar / INR',         sector: 'forex', volume: '40B',  marketCap: '—', unit: 'INR', yahoo: 'USDINR=X', defaultPrice: 94.93,  defaultChange: -0.01 },
  eurinr: { symbol: 'EUR/INR', name: 'Euro / INR',              sector: 'forex', volume: '20B',  marketCap: '—', unit: 'INR', yahoo: 'EURINR=X', defaultPrice: 106.27, defaultChange: 0.12 },
};

function generateChartHistory(basePrice, changePercent) {
  const points = 48;
  const startPrice = basePrice / (1 + changePercent / 100);
  const diff = basePrice - startPrice;
  const arr = [];

  for (let i = 0; i < points; i++) {
    const progress = i / (points - 1);
    const noise = Math.sin(i * 0.45) * 0.003 * basePrice;
    const val = parseFloat((startPrice + diff * progress + noise).toFixed(basePrice < 1 ? 4 : 2));
    arr.push(Math.max(0.0001, val));
  }
  arr[arr.length - 1] = basePrice;

  return {
    '1H': arr.slice(-12),
    '24H': arr,
    '1M': arr,
    '1Y': arr,
  };
}

async function fetchYahooQuote(symbol) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
    });

    if (res.ok) {
      const data = await res.json();
      const meta = data?.chart?.result?.[0]?.meta;
      if (meta && meta.regularMarketPrice > 0) {
        const price = meta.regularMarketPrice;
        const prev = meta.chartPreviousClose || price;
        const change = parseFloat((((price - prev) / prev) * 100).toFixed(2));
        return { price, change };
      }
    }
  } catch (err) {
    // Return null on failure to allow fallback
  }
  return null;
}

async function fetchBinanceCrypto() {
  try {
    const syms = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT'];
    const url = `https://data-api.binance.vision/api/v3/ticker/24hr?symbols=${encodeURIComponent(JSON.stringify(syms))}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });

    if (res.ok) {
      const json = await res.json();
      const map = { BTCUSDT: 'btc', ETHUSDT: 'eth', SOLUSDT: 'sol', BNBUSDT: 'bnb', XRPUSDT: 'xrp', ADAUSDT: 'ada' };
      const out = {};
      for (const item of json) {
        const id = map[item.symbol];
        if (id) {
          const price = parseFloat(item.lastPrice);
          const change = parseFloat(item.priceChangePercent);
          if (price > 0) {
            out[id] = {
              price: parseFloat(price.toFixed(id === 'ada' || id === 'xrp' ? 4 : 2)),
              change: parseFloat(change.toFixed(2)),
            };
          }
        }
      }
      return out;
    }
  } catch (err) {
    // Fallback handled by caller
  }
  return null;
}

async function fetchGoldApiMetals() {
  const metals = { gold: 'XAU', silver: 'XAG', platinum: 'XPT' };
  const out = {};
  for (const [id, sym] of Object.entries(metals)) {
    try {
      const res = await fetch(`https://api.gold-api.com/price/${sym}`);
      if (res.ok) {
        const j = await res.json();
        const p = parseFloat(j.price);
        if (p > 0) {
          const def = ASSET_DEFINITIONS[id].defaultPrice;
          const change = parseFloat((((p - def) / def) * 100).toFixed(2));
          out[id] = { price: parseFloat(p.toFixed(2)), change };
        }
      }
    } catch {
      // Continue to next
    }
  }
  return Object.keys(out).length > 0 ? out : null;
}

async function aggregateLiveMarketData() {
  const timestamp = new Date().toISOString();
  const nowMs = Date.now();
  const assets = {};

  // Parallel fetch: Binance Crypto & Gold API
  const [binanceData, goldApiData] = await Promise.all([
    fetchBinanceCrypto(),
    fetchGoldApiMetals(),
  ]);

  // Fetch Yahoo quotes for equities, energy, forex, and metals (as backup/primary)
  const yahooKeys = Object.entries(ASSET_DEFINITIONS);
  const yahooPromises = yahooKeys.map(async ([id, def]) => {
    // If we already have crypto from Binance, skip Yahoo crypto request to preserve rate limits
    if (def.sector === 'crypto' && binanceData?.[id]) {
      return { id, data: binanceData[id], source: 'binance' };
    }
    // If we have precious metal from Gold-API, use it
    if (def.sector === 'metals' && goldApiData?.[id]) {
      return { id, data: goldApiData[id], source: 'gold-api' };
    }

    // Fetch from Yahoo
    if (def.yahoo) {
      const yData = await fetchYahooQuote(def.yahoo);
      if (yData) {
        return { id, data: yData, source: 'yahoo' };
      }
    }

    return { id, data: null, source: 'fallback' };
  });

  const resolved = await Promise.all(yahooPromises);

  resolved.forEach(({ id, data, source }) => {
    const def = ASSET_DEFINITIONS[id];
    const price = data?.price ?? def.defaultPrice;
    const change = data?.change ?? def.defaultChange;
    const cleanPrice = parseFloat(price.toFixed(def.sector === 'forex' && (def.symbol.includes('JPY') || def.symbol.includes('INR')) ? 2 : (price < 1 ? 4 : 2)));
    const cleanChange = parseFloat(change.toFixed(2));
    const history = generateChartHistory(cleanPrice, cleanChange);
    const chartData = history['24H'].map((val, idx) => ({ time: `${idx}:00`, value: val }));

    assets[id] = {
      id,
      symbol: def.symbol,
      name: def.name,
      price: cleanPrice,
      change: cleanChange,
      changePercent: cleanChange,
      sector: def.sector,
      volume: def.volume,
      marketCap: def.marketCap,
      unit: def.unit,
      timestamp: nowMs,
      observedAt: timestamp,
      source: source || 'rest',
      history,
      chartData,
    };
  });

  return {
    timestamp,
    version: '2.0.0',
    assetCount: Object.keys(assets).length,
    assets,
  };
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. CORS Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS,
      });
    }

    // 2. Health check endpoint
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({
        status: 'ok',
        service: 'quidesk-market-engine',
        timestamp: new Date().toISOString(),
      }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // 3. Cache retrieval via Cloudflare KV
    const KV_KEY = 'MARKET_DATA_ALL';
    const CACHE_TTL_SECONDS = 15; // 15-second cache for high-frequency freshness

    let cachedPayload = null;
    let isHit = false;

    if (env?.MARKET_KV) {
      try {
        const raw = await env.MARKET_KV.get(KV_KEY, { type: 'json' });
        if (raw && raw.timestamp) {
          const ageSeconds = (Date.now() - new Date(raw.timestamp).getTime()) / 1000;
          if (ageSeconds < CACHE_TTL_SECONDS) {
            cachedPayload = raw;
            isHit = true;
          }
        }
      } catch (e) {
        console.warn('KV read warning:', e.message);
      }
    }

    // 4. Fetch or use cache
    let payload = cachedPayload;
    if (!payload) {
      try {
        payload = await aggregateLiveMarketData();
        // Save to KV with 10-minute expiration TTL
        if (env?.MARKET_KV && payload) {
          ctx.waitUntil(
            env.MARKET_KV.put(KV_KEY, JSON.stringify(payload), {
              expirationTtl: 600,
            }).catch(e => console.warn('KV write warning:', e.message))
          );
        }
      } catch (err) {
        // Fallback to previous stale cache if available
        if (cachedPayload) {
          payload = cachedPayload;
        } else {
          return new Response(JSON.stringify({ error: 'Market engine aggregation failed', message: err.message }), {
            status: 502,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          });
        }
      }
    }

    // 5. Single symbol filtering if requested: /api/market/:symbol or ?symbol=SPY
    const symbolParam = url.searchParams.get('symbol') || url.pathname.split('/').filter(Boolean)[2];
    if (symbolParam) {
      const match = Object.values(payload.assets).find(
        a => a.symbol.toUpperCase() === symbolParam.toUpperCase() || a.id.toLowerCase() === symbolParam.toLowerCase()
      );
      if (match) {
        return new Response(JSON.stringify(match), {
          headers: {
            ...CORS_HEADERS,
            'Content-Type': 'application/json',
            'X-Cache': isHit ? 'HIT' : 'MISS',
          },
        });
      }
      return new Response(JSON.stringify({ error: `Asset '${symbolParam}' not found` }), {
        status: 404,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // 6. Return all market data
    return new Response(JSON.stringify(payload), {
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'application/json',
        'X-Cache': isHit ? 'HIT' : 'MISS',
      },
    });
  },

  // Scheduled background tick (keeps KV cache warm if Cron Trigger is configured)
  async scheduled(event, env, ctx) {
    if (env?.MARKET_KV) {
      ctx.waitUntil((async () => {
        try {
          const payload = await aggregateLiveMarketData();
          await env.MARKET_KV.put('MARKET_DATA_ALL', JSON.stringify(payload), {
            expirationTtl: 600,
          });
        } catch (e) {
          console.error('Scheduled aggregation failed:', e);
        }
      })());
    }
  },
};
