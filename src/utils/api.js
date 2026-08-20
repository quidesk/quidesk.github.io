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
  const streams = symbols.map(s => `${s.toLowerCase()}usdt@miniTicker`).join('/')
  const ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`)
  ws.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data)
      if (msg.data) {
        onUpdate({
          symbol: msg.data.s.replace('USDT', ''),
          price:  parseFloat(msg.data.c),
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
// in localStorage so % change persists across page reloads.
const METAL_SYMBOLS = { gold:'XAU', silver:'XAG', platinum:'XPT' }
let _prevMetalPrices = (() => { try { return JSON.parse(localStorage.getItem('quidesk_metal_prev') || '{}') } catch { return {} } })()

export async function fetchMetalPrice(metalId) {
  const symbol = METAL_SYMBOLS[metalId]
  if (!symbol) throw new Error(`Metal not supported: ${metalId}`)
  const res   = await fetch(`https://api.gold-api.com/price/${symbol}`)
  if (!res.ok) throw new Error(`gold-api ${res.status}`)
  const json  = await res.json()
  const price = parseFloat(json.price ?? 0)
  if (!price || isNaN(price)) throw new Error(`Invalid price for ${symbol}`)
  const prev   = _prevMetalPrices[metalId]
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
  const results = await Promise.allSettled(Object.keys(METAL_SYMBOLS).map(fetchMetalPrice))
  return results.filter(r => r.status === 'fulfilled').map(r => r.value)
}

// ─── STOCKS: Financial Modeling Prep (FMP) ───────────────────────────────────
// FMP is natively CORS-safe — no proxy needed
// Free tier: 250 req/day. Batch: all 6 stocks in ONE request = very efficient
// Get free key at: https://financialmodelingprep.com/developer/docs
//
// FMP returns actual index values for ^GSPC, ^IXIC, ^DJI
// Endpoint: https://financialmodelingprep.com/api/v3/quote/AAPL,^GSPC?apikey=KEY

// ─── STOCKS: Stooq for indices + FMP for individual stocks ──────────────────
// Stooq is free, no key, CORS-safe, returns live index values
// FMP free tier /quotes/index returns stale 2024 data — do not use

const STOOQ_INDICES = {
  spx: '%5Espx',   // ^SPX = S&P 500
  ndx: '%5Eixic',  // ^IXIC = NASDAQ Composite
  dow: '%5Edji',   // ^DJI = Dow Jones
}

const STOCK_FMP_EQUITIES = { aapl:'AAPL', nvda:'NVDA', tsla:'TSLA' }

export async function fetchFMPStocks() {
  if (!FMP_KEY) throw new Error('VITE_FMP_KEY not set')
  const results = {}

  // Fetch S&P 500, NASDAQ, DOW from Stooq (real-time, free, no key)
  await Promise.allSettled(Object.entries(STOOQ_INDICES).map(async ([id, sym]) => {
    try {
      const res = await fetch(`https://stooq.com/q/l/?s=${sym}&f=sd2t2ohlcv&e=json`)
      if (!res.ok) throw new Error(`Stooq ${res.status}`)
      const json = await res.json()
      const quote = json?.symbols?.[0]
      if (!quote?.close || quote.close <= 0) throw new Error('No close price')
      const price  = parseFloat(quote.close)
      const open   = parseFloat(quote.open || price)
      const change = parseFloat((((price - open) / open) * 100).toFixed(2))
      results[id]  = { price: parseFloat(price.toFixed(2)), change }
    } catch(e) {
      console.warn(`Stooq ${id}:`, e.message)
    }
  }))

  // Fetch AAPL, NVDA, TSLA from FMP (works fine for individual stocks)
  try {
    const syms = Object.values(STOCK_FMP_EQUITIES).join(',')
    const res  = await fetch(`https://financialmodelingprep.com/api/v3/quote/${syms}?apikey=${FMP_KEY}`)
    if (res.ok) {
      const json = await res.json()
      if (Array.isArray(json)) {
        const rev = { AAPL:'aapl', NVDA:'nvda', TSLA:'tsla' }
        json.forEach(q => {
          const id = rev[q.symbol]
          if (!id || !q.price || q.price <= 0) return
          results[id] = {
            price:  parseFloat(parseFloat(q.price).toFixed(2)),
            change: parseFloat((q.changesPercentage ?? 0).toFixed(2)),
            volume: formatLargeNumber(q.volume),
          }
        })
      }
    }
  } catch(e) {
    console.warn('FMP equities:', e.message)
  }

  return results
}

// ─── ENERGY: Financial Modeling Prep (FMP) ───────────────────────────────────
// FMP commodity CFD symbols — free tier supports these
// CLUSD = WTI Crude, BZUSD = Brent, NGUSD = Natural Gas, RBUSD = RBOB Gasoline

const ENERGY_FMP = {
  wti:   'CLUSD',
  brent: 'BZUSD',
  ng:    'NGUSD',
  rbob:  'RBUSD',
}

export async function fetchFMPEnergy() {
  const results = {}
  // Stooq commodity symbols — free, no key, real-time futures prices
  const stooqEnergy = {
    wti:   'cl.f',   // WTI Crude futures
    brent: 'bz.f',   // Brent Crude futures
    ng:    'ng.f',   // Natural Gas futures
    rbob:  'rb.f',   // RBOB Gasoline futures
  }

  await Promise.allSettled(Object.entries(stooqEnergy).map(async ([id, sym]) => {
    try {
      const res = await fetch(`https://stooq.com/q/l/?s=${sym}&f=sd2t2ohlcv&e=json`)
      if (!res.ok) throw new Error(`Stooq energy ${res.status}`)
      const json  = await res.json()
      const quote = json?.symbols?.[0]
      if (!quote?.close || quote.close <= 0) throw new Error('No close')
      const price  = parseFloat(quote.close)
      const open   = parseFloat(quote.open || price)
      const change = parseFloat((((price - open) / open) * 100).toFixed(2))
      results[id]  = { price: parseFloat(price.toFixed(2)), change }
    } catch(e) {
      console.warn(`Stooq energy ${id}:`, e.message)
    }
  }))

  // Fallback to FMP commodity endpoint if Stooq fails
  if (Object.keys(results).length === 0 && FMP_KEY) {
    try {
      const res  = await fetch(`https://financialmodelingprep.com/api/v3/quotes/commodity?apikey=${FMP_KEY}`)
      if (res.ok) {
        const json = await res.json()
        const nameMap = { 'Crude Oil WTI':'wti','WTI':'wti','Brent':'brent','Crude Oil Brent':'brent','Natural Gas':'ng','RBOB Gasoline':'rbob' }
        json.forEach(q => {
          const id = nameMap[q.name]
          if (!id || results[id] || !q.price || q.price <= 0) return
          results[id] = { price: parseFloat(parseFloat(q.price).toFixed(2)), change: parseFloat((q.changesPercentage ?? 0).toFixed(2)) }
        })
      }
    } catch(e) { console.warn('FMP energy fallback:', e.message) }
  }

  return results
}

// ─── FOREX: fawazahmed0 (free, no key, proven CORS-safe) ─────────────────────
// Same API used for the 8-currency tooltip — confirmed working
// Rates update every few hours. We compute % change by tracking previous values.

// Cache-busting ensures we always get fresh rates, not CDN-cached stale data
const FOREX_URL = () => `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json?t=${Date.now()}`

const FOREX_PAIRS = {
  eurusd: { base:'eur', invert:true  },
  gbpusd: { base:'gbp', invert:true  },
  usdjpy: { base:'jpy', invert:false },
  audusd: { base:'aud', invert:true  },
  usdcad: { base:'cad', invert:false },
  usdchf: { base:'chf', invert:false },
  eurgbp: { cross:['gbp','eur']      },
  usdinr: { base:'inr', invert:false },
}

let _prevForexRates = (() => { try { return JSON.parse(localStorage.getItem('quidesk_forex_prev') || 'null') } catch { return null } })()

export async function fetchForexPrices() {
  const res = await fetch(FOREX_URL())
  if (!res.ok) throw new Error(`Forex rates ${res.status}`)
  const json = await res.json()
  const r    = json.usd

  const results = {}
  Object.entries(FOREX_PAIRS).forEach(([id, pair]) => {
    let price, prevPrice

    if (pair.cross) {
      const [a, b] = pair.cross
      price     = r[a] / r[b]
      prevPrice = _prevForexRates ? (_prevForexRates[a] / _prevForexRates[b]) : price
    } else if (pair.invert) {
      price     = 1 / r[pair.base]
      prevPrice = _prevForexRates ? (1 / _prevForexRates[pair.base]) : price
    } else {
      price     = r[pair.base]
      prevPrice = _prevForexRates ? _prevForexRates[pair.base] : price
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
