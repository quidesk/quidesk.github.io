import {
  FOREX_PAIRS_CONFIG,
  parseFxRatesApiPayload,
  parseOpenErApiPayload,
  fetchFrankfurterForex
} from './forexHelpers'

/**
 * Quidesk — API Integration Layer
 *
 * All API adapters return consistent Quote shapes:
 * { id, symbol, price, change, changePercent, timestamp, source, volume, marketCap }
 *
 * Sources:
 * - 'websocket': real-time Binance socket stream
 * - 'rest': primary authoritative REST endpoints (Binance Vision, Gold-API, Yahoo/Snapshot)
 * - 'fallback': secondary/tertiary fallback endpoints (CoinGecko, open.er-api)
 * - 'cache': pre-hydrated local cache
 */

const FMP_KEY = import.meta.env.VITE_FMP_KEY
const FINNHUB_KEY = import.meta.env.VITE_FINNHUB_KEY || import.meta.env.VITE_FMP_KEY;
export const isFinnhubMissing = !FINNHUB_KEY;

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
  const now = Date.now()
  return Object.entries(BINANCE_SYMBOLS).map(([id, ticker]) => {
    const d = json.find(t => t.symbol === ticker)
    if (!d) return null
    const price = parseFloat(d.lastPrice)
    const chg = parseFloat(parseFloat(d.priceChangePercent).toFixed(2))
    const ts = typeof d.closeTime === 'number' && d.closeTime > 0 ? d.closeTime : now
    return {
      id,
      symbol: id.toUpperCase(),
      price:  parseFloat(price.toFixed(price < 1 ? 4 : 2)),
      change: chg,
      changePercent: chg,
      volume: formatLargeNumber(parseFloat(d.quoteVolume)),
      timestamp: ts,
      source: 'rest',
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
      const now = Date.now()
      if (Array.isArray(msg)) {
        msg.forEach(item => {
          const sym = targetMap[item.s]
          if (sym && item.c) {
            const chg = parseFloat(item.P)
            onUpdate({
              symbol: sym,
              id: sym.toLowerCase(),
              price: parseFloat(item.c),
              change: chg,
              changePercent: chg,
              timestamp: item.E || now,
              source: 'websocket',
            })
          }
        })
      } else if (msg.data) {
        const sym = msg.data.s.replace('USDT', '')
        const chg = parseFloat(msg.data.P)
        onUpdate({
          symbol: sym,
          id: sym.toLowerCase(),
          price: parseFloat(msg.data.c),
          change: chg,
          changePercent: chg,
          timestamp: msg.data.E || now,
          source: 'websocket',
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
  const now = Date.now()
  return Object.entries(COINGECKO_IDS).map(([id, geckoId]) => {
    const d = json[geckoId]
    if (!d?.usd) return null
    const chg = parseFloat((d.usd_24h_change ?? 0).toFixed(2))
    return {
      id,
      symbol: id.toUpperCase(),
      price:     parseFloat(d.usd.toFixed(d.usd < 1 ? 4 : 2)),
      change:    chg,
      changePercent: chg,
      volume:    formatLargeNumber(d.usd_24h_vol),
      marketCap: formatLargeNumber(d.usd_market_cap),
      timestamp: now,
      source: 'fallback',
    }
  }).filter(Boolean)
}

// ─── METALS: api.gold-api.com (XAU, XAG, XPT) ───────────────────────────────
const METAL_SYMBOLS = { gold:'XAU', silver:'XAG', platinum:'XPT' }
const METAL_BASELINE_CLOSE = {
  gold: 4113.50,
  silver: 52.23,
  platinum: 1524.40,
}
let _metalPrevClose = (() => {
  try { return JSON.parse(localStorage.getItem('quidesk_metal_prevclose') || '{}') } catch { return {} }
})()

export function setMetalPreviousClose(metalId, prevClose) {
  if (prevClose && prevClose > 0) {
    _metalPrevClose[metalId] = prevClose;
    try { localStorage.setItem('quidesk_metal_prevclose', JSON.stringify(_metalPrevClose)) } catch {}
  }
}

export async function fetchMetalPrice(metalId, prevRateFallback) {
  const symbol = METAL_SYMBOLS[metalId]
  if (!symbol) throw new Error(`Metal not supported: ${metalId}`)
  const res   = await fetch(`https://api.gold-api.com/price/${symbol}`)
  if (!res.ok) throw new Error(`gold-api ${res.status}`)
  const json  = await res.json()
  const price = parseFloat(json.price ?? 0)
  if (!price || isNaN(price)) throw new Error(`Invalid price for ${symbol}`)
  
  // Strict 24h calculation against baseline previous close:
  // NEVER overwrite prev with current tick!
  let prev = prevRateFallback || _metalPrevClose[metalId] || METAL_BASELINE_CLOSE[metalId]
  const change = prev ? parseFloat((((price - prev) / prev) * 100).toFixed(2)) : 0
  
  const timestamp = json.updatedAt ? Date.parse(json.updatedAt) : Date.now()
  return {
    id:     metalId,
    price:  parseFloat(price.toFixed(2)),
    change,
    changePercent: change,
    previousClose: prev,
    timestamp: isNaN(timestamp) ? Date.now() : timestamp,
    source: 'rest',
  }
}

export async function fetchAllMetals() {
  const results = await Promise.allSettled(Object.keys(METAL_SYMBOLS).map(async (metalId) => {
    return fetchMetalPrice(metalId);
  }))
  return results.filter(r => r.status === 'fulfilled').map(r => r.value)
}

// ─── EQUITIES: Finnhub / FMP live quotes ───────────────────────────────────────
export async function fetchFMPStocks() {
  if (!FINNHUB_KEY) {
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
        const chg = parseFloat(parseFloat(json.dp ?? 0).toFixed(2))
        const ts = json.t ? json.t * 1000 : Date.now()
        results[id] = {
          id,
          symbol: sym,
          price: parseFloat(parseFloat(json.c).toFixed(2)),
          change: chg,
          changePercent: chg,
          timestamp: ts,
          source: 'rest',
        };
      }
    } catch (e) {
      console.warn(`Finnhub equity ${id}:`, e.message);
    }
  }));
  return results;
}

export async function fetchFMPEnergy() {
  return {};
}

// ─── FOREX: Multi-source Live Interbank poller ────────────────────────────────
const FX_RATES_API_URL = 'https://api.fxratesapi.com/latest'
const OPEN_ER_URL      = 'https://open.er-api.com/v6/latest/USD'

const FOREX_BASELINE_CLOSE = {
  eurusd: 1.1193,
  gbpusd: 1.3416,
  usdjpy: 157.95,
  audusd: 0.6894,
  usdcad: 1.4103,
  usdchf: 0.8187,
  nzdusd: 0.5613,
  eurgbp: 0.8343,
  gbpjpy: 211.91,
  eurjpy: 176.79,
  usdinr: 93.93,
  eurinr: 105.14,
}

let _prevForexRates = (() => { try { return JSON.parse(localStorage.getItem('quidesk_forex_prev') || 'null') } catch { return null } })()

export async function fetchForexPrices() {
  const baseline = _prevForexRates || FOREX_BASELINE_CLOSE

  // 1. Primary: Fast local/remote snapshot /market-snapshot.json
  try {
    const base = import.meta.env?.BASE_URL || '/'
    const snapshotUrl = `${base.replace(/\/$/, '')}/market-snapshot.json`
    const res = await fetch(snapshotUrl, { cache: 'no-cache' })
    if (res.ok) {
      const json = await res.json()
      if (json && json.assets) {
        const results = {}
        const snapTs = json.timestamp ? Date.parse(json.timestamp) : Date.now()
        let nonZeroCount = 0
        Object.entries(FOREX_PAIRS_CONFIG).forEach(([id, cfg]) => {
          const a = json.assets[id]
          if (a && typeof a.price === 'number' && a.price > 0) {
            const chg = a.change ?? 0
            if (chg !== 0) nonZeroCount++
            const obsTs = a.observedAt ? Date.parse(a.observedAt) : snapTs
            results[id] = {
              id,
              symbol: cfg.symbol,
              name: cfg.name,
              price: a.price,
              change: chg,
              changePercent: chg,
              decimals: cfg.decimals,
              timestamp: isNaN(obsTs) ? Date.now() : obsTs,
              source: 'rest',
              status: 'live',
            }
          }
        })
        if (Object.keys(results).length === Object.keys(FOREX_PAIRS_CONFIG).length && nonZeroCount > 0) {
          _prevForexRates = { ...results }
          try { localStorage.setItem('quidesk_forex_prev', JSON.stringify(_prevForexRates)) } catch {}
          return results
        }
      }
    }
  } catch (e) {
    console.warn('market-snapshot.json forex primary failed, trying frankfurter:', e.message)
  }

  // 2. Secondary: Live rolling 24h close via Frankfurter ECB Tape
  try {
    const results = await fetchFrankfurterForex()
    if (results && Object.keys(results).length >= 10) {
      _prevForexRates = { ...results }
      try { localStorage.setItem('quidesk_forex_prev', JSON.stringify(_prevForexRates)) } catch {}
      return results
    }
  } catch (e) {
    console.warn('Frankfurter ECB feed failed, trying fxratesapi:', e.message)
  }

  // 3. Tertiary: Live Interbank rates via api.fxratesapi.com
  try {
    const res = await fetch(FX_RATES_API_URL)
    if (res.ok) {
      const json = await res.json()
      if (json && json.rates) {
        const results = parseFxRatesApiPayload(json, baseline)
        if (results && Object.keys(results).length >= 10) {
          const parsedTs = json.date ? Date.parse(json.date) : Date.now()
          Object.values(results).forEach(r => {
            r.timestamp = isNaN(parsedTs) ? Date.now() : parsedTs
            r.source = 'rest'
            r.changePercent = r.change
          })
          _prevForexRates = { ...results }
          try { localStorage.setItem('quidesk_forex_prev', JSON.stringify(_prevForexRates)) } catch {}
          return results
        }
      }
    }
  } catch (e) {
    console.warn('fxratesapi.com live stream failed, trying open.er-api fallback:', e.message)
  }

  // 4. Quaternary fallback: open.er-api.com (daily reference)
  try {
    const res = await fetch(OPEN_ER_URL)
    if (res.ok) {
      const json = await res.json()
      if (json && json.rates) {
        const results = parseOpenErApiPayload(json, baseline)
        const parsedTs = json.time_last_update_unix ? json.time_last_update_unix * 1000 : Date.now()
        Object.values(results).forEach(r => {
          r.timestamp = parsedTs
          r.source = 'fallback'
          r.changePercent = r.change
        })
        _prevForexRates = { ...results }
        try { localStorage.setItem('quidesk_forex_prev', JSON.stringify(_prevForexRates)) } catch {}
        return results
      }
    }
  } catch (e) {
    console.warn('open.er-api daily fallback failed:', e.message)
  }

  throw new Error('All live Forex sources failed and no fallback snapshot was accessible.')
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
export function formatLargeNumber(n) {
  if (!n || isNaN(n)) return '—'
  if (n >= 1e12) return `$${(n/1e12).toFixed(2)}T`
  if (n >= 1e9)  return `$${(n/1e9).toFixed(2)}B`
  if (n >= 1e6)  return `$${(n/1e6).toFixed(2)}M`
  return `$${n.toLocaleString()}`
}
