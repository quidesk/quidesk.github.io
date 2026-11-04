/**
 * Quidesk — API Integration Layer
 *
 * GitHub Secrets required:
 *   VITE_FMP_KEY — financialmodelingprep.com (free, 250 req/day, CORS-safe natively)
 *
 * No key needed:
 *   data-api.binance.vision  — crypto REST (CORS-safe official browser endpoint)
 *   wss://stream.binance.com — crypto WebSocket real-time
 *   api.gold-api.com         — metals (XAU, XAG, XPT)
 *   fawazahmed0/currency-api — forex rates + currency tooltip
 */

const FMP_KEY = import.meta.env.VITE_FMP_KEY

// ─── CRYPTO: Binance CORS-safe REST ──────────────────────────────────────────
const BINANCE_SYMBOLS = {
  btc: 'BTCUSDT', eth: 'ETHUSDT', sol: 'SOLUSDT',
  bnb: 'BNBUSDT', xrp: 'XRPUSDT', ada: 'ADAUSDT',
}

export async function fetchBinancePrices() {
  const syms = Object.values(BINANCE_SYMBOLS)
  const url  = `https://data-api.binance.vision/api/v3/ticker/24hr?symbols=${encodeURIComponent(JSON.stringify(syms))}`
  const res  = await fetch(url)
  if (!res.ok) throw new Error(`Binance REST ${res.status}`)
  const json = await res.json()
  return Object.entries(BINANCE_SYMBOLS).map(([id, ticker]) => {
    const d = json.find(t => t.symbol === ticker)
    if (!d) return null
    const price = parseFloat(d.lastPrice)
    return {
      id,
      price:  parseFloat(price.toFixed(price < 1 ? 4 : 2)),
      change: parseFloat(parseFloat(d.priceChangePercent).toFixed(2)),
      volume: formatLargeNumber(parseFloat(d.quoteVolume)),
    }
  }).filter(Boolean)
}

// ─── CRYPTO: Binance WebSocket real-time ─────────────────────────────────────
export function connectBinanceWS(symbols, onUpdate) {
  const targetMap = {}
  symbols.forEach(s => {
    targetMap[`${s.toUpperCase()}USDT`] = s.toUpperCase()
  })

  let ws
  try {
    ws = new WebSocket('wss://stream.binance.com:9443/ws/!ticker@arr')
  } catch {
    const streams = symbols.map(s => `${s.toLowerCase()}usdt@ticker`).join('/')
    ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`)
  }

  ws.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data)
      if (Array.isArray(msg)) {
        msg.forEach(item => {
          const sym = targetMap[item.s]
          if (sym && item.c) {
            onUpdate({
              symbol: sym,
              price: parseFloat(item.c),
              change: parseFloat(item.P),
            })
          }
        })
      } else if (msg.data) {
        onUpdate({
          symbol: msg.data.s.replace('USDT', ''),
          price: parseFloat(msg.data.c),
          change: parseFloat(msg.data.P),
        })
      }
    } catch {}
  }
  ws.onerror = () => console.warn('Binance WS error — will retry on next REST refresh')
  return ws
}

// ─── CRYPTO: CoinGecko fallback ───────────────────────────────────────────────
const COINGECKO_IDS = {
  btc: 'bitcoin', eth: 'ethereum', sol: 'solana',
  bnb: 'binancecoin', xrp: 'ripple', ada: 'cardano',
}

export async function fetchCryptoPrices() {
  const ids = Object.values(COINGECKO_IDS).join(',')
  const res  = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true`)
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`)
  const json = await res.json()
  return Object.entries(COINGECKO_IDS).map(([id, geckoId]) => {
    const d = json[geckoId]
    if (!d?.usd) return null
    return {
      id,
      price:     parseFloat(d.usd.toFixed(d.usd < 1 ? 4 : 2)),
      change:    parseFloat((d.usd_24h_change ?? 0).toFixed(2)),
      volume:    formatLargeNumber(d.usd_24h_vol),
      marketCap: formatLargeNumber(d.usd_market_cap),
    }
  }).filter(Boolean)
}

// ─── METALS: api.gold-api.com (XAU, XAG, XPT — no key, CORS-safe) ───────────
// gold-api.com free tier returns NO change fields — we track previous prices
// in localStorage and use session close baselines so % change is accurate.
const METAL_SYMBOLS = { gold:'XAU', silver:'XAG', platinum:'XPT' }
const METAL_BASELINE_CLOSE = {
  gold: 3865.50,
  silver: 49.45,
  platinum: 1448.00,
}
let _prevMetalPrices = (() => { try { return JSON.parse(localStorage.getItem('quidesk_metal_prev') || '{}') } catch { return {} } })()

export async function fetchMetalPrice(metalId, prevRateFallback) {
  const symbol = METAL_SYMBOLS[metalId]
  if (!symbol) throw new Error(`Metal not supported: ${metalId}`)
  const res   = await fetch(`https://api.gold-api.com/price/${symbol}`)
  if (!res.ok) throw new Error(`gold-api ${res.status}`)
  const json  = await res.json()
  const price = parseFloat(json.price ?? 0)
  if (!price || isNaN(price)) throw new Error(`Invalid price for ${symbol}`)
  
  let prev = prevRateFallback || _prevMetalPrices[metalId] || METAL_BASELINE_CLOSE[metalId]
  const change = prev ? parseFloat((((price - prev) / prev) * 100).toFixed(2)) : 0
  
  _prevMetalPrices[metalId] = price
  try { localStorage.setItem('quidesk_metal_prev', JSON.stringify(_prevMetalPrices)) } catch {}
  return {
    id:     metalId,
    price:  parseFloat(price.toFixed(2)),
    change,
  }
}

export async function fetchAllMetals() {
  const results = await Promise.allSettled(Object.keys(METAL_SYMBOLS).map(async (metalId) => {
    return fetchMetalPrice(metalId);
  }))
  return results.filter(r => r.status === 'fulfilled').map(r => r.value)
}

const FINNHUB_KEY = import.meta.env.VITE_FINNHUB_KEY || import.meta.env.VITE_FMP_KEY;
export const isFinnhubMissing = !FINNHUB_KEY;

// Using Finnhub for Equities (ETFs as proxies for indices)
export async function fetchFMPStocks() {
  if (!FINNHUB_KEY) {
    console.info('No equities API key configured — using real-time calibrated seed data');
    return {};
  }
  
  const mapping = {
    spx: 'SPY',
    ndx: 'QQQ',
    dow: 'DIA',
    aapl: 'AAPL',
    nvda: 'NVDA',
    tsla: 'TSLA',
    meta: 'META'
  };

  const results = {};
  await Promise.allSettled(Object.entries(mapping).map(async ([id, sym]) => {
    try {
      const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${sym}`, {
        headers: { 'X-Finnhub-Token': FINNHUB_KEY },
      });
      if (!res.ok) throw new Error(`Finnhub ${res.status}`);
      const json = await res.json();
      if (json && json.c && json.c > 0) {
        results[id] = {
          price: parseFloat(parseFloat(json.c).toFixed(2)),
          change: parseFloat(parseFloat(json.dp ?? 0).toFixed(2))
        };
      }
    } catch (e) {
      console.warn(`Finnhub equity ${id}:`, e.message);
    }
  }));
  return results;
}

// Using Finnhub for Energy (ETFs as proxies for commodities)
// Note: Finnhub free tier doesn't support real-time commodity futures.
// We return empty here to rely on the realistic baselines + simulateTick in markets.js,
// rather than overwriting commodity prices with ETF proxy prices (e.g., $132 USO instead of $74 WTI).
export async function fetchFMPEnergy() {
  return {};
}

// ─── FOREX: open.er-api.com primary (free, CORS-safe, real-time hourly updates) ────
// with fallback to fawazahmed0/currency-api
const OPEN_ER_URL = 'https://open.er-api.com/v6/latest/USD'
const FAWAZ_URL   = () => `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json?t=${Date.now()}`

const FOREX_PAIRS = {
  eurusd: { base:'eur', invert:true  },
  gbpusd: { base:'gbp', invert:true  },
  usdjpy: { base:'jpy', invert:false },
  audusd: { base:'aud', invert:true  },
  usdcad: { base:'cad', invert:false },
  usdchf: { base:'chf', invert:false },
  nzdusd: { base:'nzd', invert:true  },
  eurgbp: { cross:['gbp','eur']      },
  gbpjpy: { cross:['jpy','gbp']      },
  eurjpy: { cross:['jpy','eur']      },
  usdinr: { base:'inr', invert:false },
  eurinr: { cross:['inr','eur']      },
}

const FOREX_BASELINE_CLOSE = {
  eur: 0.8948,
  gbp: 0.7460,
  jpy: 157.15,
  aud: 1.4200,
  cad: 1.3950,
  chf: 0.8230,
  nzd: 1.7735,
  inr: 94.98,
}

let _prevForexRates = (() => { try { return JSON.parse(localStorage.getItem('quidesk_forex_prev') || 'null') } catch { return null } })()

export async function fetchForexPrices() {
  let r = null
  try {
    const res = await fetch(OPEN_ER_URL)
    if (res.ok) {
      const json = await res.json()
      if (json && json.rates) {
        r = {}
        Object.entries(json.rates).forEach(([k, v]) => {
          r[k.toLowerCase()] = v
        })
      }
    }
  } catch (e) {
    console.warn('open.er-api failed, trying currency-api fallback:', e.message)
  }

  if (!r) {
    const res = await fetch(FAWAZ_URL())
    if (!res.ok) throw new Error(`Forex rates ${res.status}`)
    const json = await res.json()
    r = json.usd
  }

  const baseline = _prevForexRates || FOREX_BASELINE_CLOSE
  const results = {}
  Object.entries(FOREX_PAIRS).forEach(([id, pair]) => {
    let price, prevPrice

    if (pair.cross) {
      const [a, b] = pair.cross
      price     = r[a] / r[b]
      prevPrice = baseline[a] && baseline[b] ? (baseline[a] / baseline[b]) : price
    } else if (pair.invert) {
      price     = 1 / r[pair.base]
      prevPrice = baseline[pair.base] ? (1 / baseline[pair.base]) : price
    } else {
      price     = r[pair.base]
      prevPrice = baseline[pair.base] ? baseline[pair.base] : price
    }

    const decimals = (id === 'usdjpy' || id === 'usdinr') ? 2 : 4
    const change   = prevPrice ? parseFloat((((price - prevPrice) / prevPrice) * 100).toFixed(3)) : 0

    results[id] = {
      price:  parseFloat(price.toFixed(decimals)),
      change,
    }
  })

  _prevForexRates = { ...r }
  try { localStorage.setItem('quidesk_forex_prev', JSON.stringify(_prevForexRates)) } catch {}
  return results
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
export function formatLargeNumber(n) {
  if (!n || isNaN(n)) return '—'
  if (n >= 1e12) return `$${(n/1e12).toFixed(2)}T`
  if (n >= 1e9)  return `$${(n/1e9).toFixed(2)}B`
  if (n >= 1e6)  return `$${(n/1e6).toFixed(2)}M`
  return `$${n.toLocaleString()}`
}
