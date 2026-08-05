/**
 * Quidesk — API Integration Layer
 *
 * GitHub Secret required:
 *   VITE_FINNHUB_KEY  — finnhub.io (free, 60 req/min, stocks + energy + forex)
 *
 * No key needed:
 *   data-api.binance.vision  — crypto REST (CORS-safe browser endpoint)
 *   wss://stream.binance.com — crypto WebSocket (real-time)
 *   api.gold-api.com         — metals (free, no key)
 *   fawazahmed0/currency-api — exchange rates
 */

const FINNHUB_KEY = import.meta.env.VITE_FINNHUB_KEY

// ─── CRYPTO: Binance CORS-safe REST ──────────────────────────────────────────
// data-api.binance.vision is the official browser-safe mirror of api.binance.com
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

// ─── CRYPTO: Binance WebSocket real-time ticks ───────────────────────────────
export function connectBinanceWS(symbols, onUpdate) {
  const streams = symbols.map(s => `${s.toLowerCase()}usdt@miniTicker`).join('/')
  const ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`)
  ws.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data)
      if (msg.data) {
        const price = parseFloat(msg.data.c)
        onUpdate({ symbol: msg.data.s.replace('USDT', ''), price, change: parseFloat(msg.data.P) })
      }
    } catch {}
  }
  ws.onerror = () => console.warn('Binance WS error')
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

// ─── METALS: api.gold-api.com (free, no key, CORS-safe) ──────────────────────
const METAL_SYMBOLS = { gold:'XAU', silver:'XAG', platinum:'XPT', copper:'XCU' }

export async function fetchMetalPrice(metalId) {
  const symbol = METAL_SYMBOLS[metalId]
  const res    = await fetch(`https://api.gold-api.com/price/${symbol}`)
  if (!res.ok) throw new Error(`gold-api ${res.status}`)
  const json   = await res.json()
  const price  = parseFloat(json.price ?? 0)
  if (!price || isNaN(price)) throw new Error(`Invalid metal price for ${symbol}`)
  return { id: metalId, price: parseFloat(price.toFixed(2)), change: parseFloat((json.chg_24h ?? 0).toFixed(2)) }
}

export async function fetchAllMetals() {
  const results = await Promise.allSettled(Object.keys(METAL_SYMBOLS).map(fetchMetalPrice))
  return results.filter(r => r.status === 'fulfilled').map(r => r.value)
}

// ─── STOCKS + ENERGY: Finnhub (free, 60 req/min, CORS-safe via query param) ──
// Quote endpoint: https://finnhub.io/api/v1/quote?symbol=AAPL&token=KEY
// Returns: { c: currentPrice, d: change, dp: changePercent, h, l, o, pc }

export async function fetchFinnhubQuote(symbol) {
  if (!FINNHUB_KEY) throw new Error('VITE_FINNHUB_KEY not set')
  const res  = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_KEY}`)
  if (!res.ok) throw new Error(`Finnhub ${res.status} for ${symbol}`)
  const json = await res.json()
  // json.c = current price, json.dp = % change, json.d = absolute change
  const price = parseFloat(json.c)
  if (!price || isNaN(price) || price <= 0) throw new Error(`No Finnhub price for ${symbol}`)
  return {
    price,
    change: parseFloat((json.dp ?? 0).toFixed(2)), // percent change
  }
}

// Fetch multiple quotes with small delay to respect 60 req/min
export async function fetchFinnhubBatch(symbolMap, delayMs = 100) {
  const results = {}
  const entries = Object.entries(symbolMap)
  for (let i = 0; i < entries.length; i++) {
    const [id, symbol] = entries[i]
    try {
      results[id] = await fetchFinnhubQuote(symbol)
    } catch(e) {
      console.warn(`Finnhub ${symbol}:`, e.message)
    }
    if (i < entries.length - 1 && delayMs > 0) {
      await new Promise(r => setTimeout(r, delayMs))
    }
  }
  return results
}


// ─── STOCKS + ENERGY: Yahoo Finance via CORS proxy ───────────────────────────
// Yahoo Finance is free, no key, real-time during market hours
// Uses allorigins.win CORS proxy (same one used for news feeds)
// Returns accurate prices for stocks, ETFs, indices and commodity futures

const CORS_PROXY = 'https://api.allorigins.win/get?url='

// Fetch multiple Yahoo Finance quotes in one request
// symbols: array of Yahoo tickers e.g. ['AAPL', 'CL=F', '^GSPC']
export async function fetchYahooQuotes(symbols) {
  const encoded = encodeURIComponent(
    `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols.join(',')}&fields=regularMarketPrice,regularMarketChangePercent,regularMarketVolume`
  )
  const res = await fetch(`${CORS_PROXY}${encoded}`)
  if (!res.ok) throw new Error(`Yahoo proxy failed: ${res.status}`)
  const json = await res.json()
  const data = JSON.parse(json.contents)
  const results = data?.quoteResponse?.result || []
  if (results.length === 0) throw new Error('Yahoo Finance returned no data')
  
  const out = {}
  results.forEach(q => {
    const price = q.regularMarketPrice
    const change = q.regularMarketChangePercent
    if (price && price > 0) {
      out[q.symbol] = {
        price: parseFloat(price.toFixed(q.symbol.includes('=F') ? 2 : 2)),
        change: parseFloat((change ?? 0).toFixed(2)),
        volume: formatLargeNumber(q.regularMarketVolume),
      }
    }
  })
  return out
}

// ─── FOREX: Finnhub OANDA forex pairs ────────────────────────────────────────
// Finnhub forex uses OANDA: prefix for major pairs
const FOREX_SYMBOLS = {
  eurusd: 'OANDA:EUR_USD',
  gbpusd: 'OANDA:GBP_USD',
  usdjpy: 'OANDA:USD_JPY',
  audusd: 'OANDA:AUD_USD',
  usdcad: 'OANDA:USD_CAD',
  usdchf: 'OANDA:USD_CHF',
  eurgbp: 'OANDA:EUR_GBP',
  usdinr: 'OANDA:USD_INR',
}

export async function fetchForexPrices() {
  if (!FINNHUB_KEY) throw new Error('VITE_FINNHUB_KEY not set')
  const results = {}
  const entries = Object.entries(FOREX_SYMBOLS)
  for (let i = 0; i < entries.length; i++) {
    const [id, symbol] = entries[i]
    try {
      const res  = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_KEY}`)
      const json = await res.json()
      const price = parseFloat(json.c)
      if (price && !isNaN(price) && price > 0) {
        results[id] = {
          price: parseFloat(price.toFixed(id === 'usdjpy' || id === 'usdinr' ? 2 : 4)),
          change: parseFloat((json.dp ?? 0).toFixed(3)),
        }
      }
    } catch(e) {
      console.warn(`Forex ${symbol}:`, e.message)
    }
    if (i < entries.length - 1) await new Promise(r => setTimeout(r, 100))
  }
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
