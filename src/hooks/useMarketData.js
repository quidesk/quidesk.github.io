import { useState, useEffect, useRef, useCallback } from 'react'
import { MARKET_DATA, detectHotspots } from '../data/markets'
import {
  fetchBinancePrices,
  connectBinanceWS,
  fetchCryptoPrices,
  fetchAllMetals,
  fetchFinnhubBatch,
  fetchForexPrices,
  fetchYahooQuotes,
} from '../utils/api'

// Yahoo Finance ticker symbols
const STOCK_YAHOO = {
  spx:  '^GSPC',   // S&P 500 actual index
  ndx:  '^IXIC',   // NASDAQ Composite actual index
  dow:  '^DJI',    // Dow Jones actual index
  aapl: 'AAPL',
  nvda: 'NVDA',
  tsla: 'TSLA',
}
const STOCK_SYMBOLS = STOCK_YAHOO

// Finnhub energy symbols — OANDA:USOIL etc. are standard Finnhub commodity codes
// Yahoo Finance futures symbols — =F suffix denotes continuous futures
const ENERGY_YAHOO = {
  wti:   'CL=F',   // WTI Crude Oil futures
  brent: 'BZ=F',   // Brent Crude futures
  ng:    'NG=F',   // Natural Gas futures
  rbob:  'RB=F',   // RBOB Gasoline futures
}
const ENERGY_SYMBOLS = ENERGY_YAHOO

function appendChartPoint(asset) {
  return {
    ...asset,
    chartData: [
      ...(asset.chartData || []).slice(-79),
      { time: new Date().toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' }), value: asset.price }
    ]
  }
}

export function useMarketData() {
  const [data, setData]             = useState(MARKET_DATA)
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [isLive, setIsLive]         = useState(true)
  const [hotspots, setHotspots]     = useState([])
  const wsRef = useRef(null)

  // ── CRYPTO: Binance CORS-safe REST, refresh every 30s ───────────────────
  useEffect(() => {
    async function loadCrypto() {
      try {
        const prices = await fetchBinancePrices()
        setData(prev => ({
          ...prev,
          crypto: prev.crypto.map(a => {
            const live = prices.find(p => p.id === a.id)
            return live ? appendChartPoint({ ...a, ...live }) : a
          })
        }))
      } catch(e) {
        console.warn('Binance REST failed, trying CoinGecko:', e.message)
        try {
          const prices = await fetchCryptoPrices()
          setData(prev => ({
            ...prev,
            crypto: prev.crypto.map(a => {
              const live = prices.find(p => p.id === a.id)
              return live ? appendChartPoint({ ...a, ...live }) : a
            })
          }))
        } catch(e2) {
          console.warn('CoinGecko also failed:', e2.message)
        }
      }
    }
    loadCrypto()
    const id = setInterval(loadCrypto, 30000)
    return () => clearInterval(id)
  }, [])

  // ── CRYPTO: Binance WebSocket real-time ticks ────────────────────────────
  useEffect(() => {
    const symbols = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA']
    let ws
    try {
      ws = connectBinanceWS(symbols, ({ symbol, price, change }) => {
        setData(prev => ({
          ...prev,
          crypto: prev.crypto.map(a => {
            if (a.symbol !== symbol) return a
            return appendChartPoint({ ...a, price, change })
          })
        }))
        setLastUpdate(new Date())
      })
      wsRef.current = ws
    } catch(e) {
      console.warn('Binance WS failed:', e.message)
    }
    return () => { try { ws?.close() } catch {} }
  }, [])

  // ── METALS: gold-api.com every 60s ──────────────────────────────────────
  useEffect(() => {
    async function loadMetals() {
      try {
        const metals = await fetchAllMetals()
        setData(prev => ({
          ...prev,
          metals: prev.metals.map(a => {
            const live = metals.find(m => m.id === a.id)
            return live ? appendChartPoint({ ...a, price: live.price, change: live.change }) : a
          })
        }))
      } catch(e) {
        console.warn('Gold-API failed:', e.message)
      }
    }
    loadMetals()
    const id = setInterval(loadMetals, 60000)
    return () => clearInterval(id)
  }, [])

  // ── STOCKS: Finnhub (60 req/min, fast, CORS-safe) ───────────────────────
  useEffect(() => {
    if (!import.meta.env.VITE_FINNHUB_KEY) {
      console.warn('VITE_FINNHUB_KEY not set — stocks on seed prices')
      return
    }
    async function loadStocks() {
      try {
        // Use Yahoo Finance — real-time, no key, actual index values
        const yahooSymbols = Object.values(STOCK_YAHOO)
        const quotes = await fetchYahooQuotes(yahooSymbols)
        
        // Map Yahoo symbols back to our asset ids
        const results = {}
        Object.entries(STOCK_YAHOO).forEach(([id, sym]) => {
          if (quotes[sym]) results[id] = quotes[sym]
        })
        
        const loaded = Object.entries(results).filter(([,v]) => v?.price > 0)
        if (loaded.length > 0) console.info('Stocks (Yahoo):', loaded.map(([id, v]) => `${id}=$${v.price}`).join(', '))
        
        setData(prev => ({
          ...prev,
          equities: prev.equities.map(a => {
            const q = results[a.id]
            return q ? appendChartPoint({ ...a, price: q.price, change: q.change, volume: q.volume || a.volume }) : a
          })
        }))
      } catch(e) {
        console.warn('Yahoo stocks failed:', e.message)
        // Fallback to Finnhub
        try {
          const results = await fetchFinnhubBatch({ spx:'SPY', ndx:'QQQ', dow:'DIA', aapl:'AAPL', nvda:'NVDA', tsla:'TSLA' }, 100)
          setData(prev => ({
            ...prev,
            equities: prev.equities.map(a => {
              const q = results[a.id]
              return q ? appendChartPoint({ ...a, price: q.price, change: q.change }) : a
            })
          }))
          console.info('Stocks (Finnhub fallback) loaded')
        } catch(e2) {
          console.warn('Finnhub fallback also failed:', e2.message)
        }
      }
    }
    loadStocks()
    // Refresh every 30s — well within 60 req/min limit (6 stocks = 6 req)
    const id = setInterval(loadStocks, 30000)
    return () => clearInterval(id)
  }, [])

  // ── ENERGY: Finnhub OANDA symbols ───────────────────────────────────────
  useEffect(() => {
    if (!import.meta.env.VITE_FINNHUB_KEY) {
      console.warn('VITE_FINNHUB_KEY not set — energy on seed prices')
      return
    }
    async function loadEnergy() {
      try {
        // Use Yahoo Finance — commodity futures, real-time, no key
        const yahooSymbols = Object.values(ENERGY_YAHOO)
        const quotes = await fetchYahooQuotes(yahooSymbols)
        
        // Map Yahoo symbols back to our asset ids
        const results = {}
        Object.entries(ENERGY_YAHOO).forEach(([id, sym]) => {
          if (quotes[sym]) results[id] = quotes[sym]
        })
        
        const loaded = Object.entries(results).filter(([,v]) => v?.price > 0)
        if (loaded.length > 0) console.info('Energy (Yahoo):', loaded.map(([id, v]) => `${id}=$${v.price}`).join(', '))
        
        setData(prev => ({
          ...prev,
          energy: prev.energy.map(a => {
            const q = results[a.id]
            return q ? appendChartPoint({ ...a, price: q.price, change: q.change }) : a
          })
        }))
      } catch(e) {
        console.warn('Yahoo energy failed:', e.message)
        // Fallback to Finnhub
        try {
          const results = await fetchFinnhubBatch({ wti:'OANDA:XTI_USD', brent:'OANDA:XBR_USD', ng:'OANDA:NATGAS_USD', rbob:'OANDA:GASOLINE_USD' }, 100)
          setData(prev => ({
            ...prev,
            energy: prev.energy.map(a => {
              const q = results[a.id]
              return q ? appendChartPoint({ ...a, price: q.price, change: q.change }) : a
            })
          }))
          console.info('Energy (Finnhub fallback) loaded')
        } catch(e2) {
          console.warn('Finnhub energy fallback also failed:', e2.message)
        }
      }
    }
    loadEnergy()
    const id = setInterval(loadEnergy, 30000)
    return () => clearInterval(id)
  }, [])

  // ── FOREX: Finnhub every 30s ────────────────────────────────────────────────
  useEffect(() => {
    if (!import.meta.env.VITE_FINNHUB_KEY) {
      console.warn('VITE_FINNHUB_KEY not set — forex on seed prices')
      return
    }
    async function loadForex() {
      try {
        const results = await fetchForexPrices()
        setData(prev => ({
          ...prev,
          forex: (prev.forex || []).map(a => {
            const q = results[a.id]
            return q ? appendChartPoint({ ...a, price: q.price, change: q.change }) : a
          })
        }))
      } catch(e) {
        console.warn('Forex load failed:', e.message)
      }
    }
    loadForex()
    const id = setInterval(loadForex, 30000)
    return () => clearInterval(id)
  }, [])

  // ── Chart tick every 3s — never changes price ────────────────────────────
  const tick = useCallback(() => {
    setData(prev => {
      const next = {
        equities: prev.equities.map(appendChartPoint),
        crypto:   prev.crypto.map(appendChartPoint),
        metals:   prev.metals.map(appendChartPoint),
        energy:   prev.energy.map(appendChartPoint),
        forex:    (prev.forex || []).map(appendChartPoint),
      }
      setHotspots(detectHotspots(Object.values(next).flat()))
      return next
    })
    setLastUpdate(new Date())
  }, [])

  useEffect(() => {
    if (!isLive) return
    const id = setInterval(tick, 3000)
    return () => clearInterval(id)
  }, [isLive, tick])

  useEffect(() => {
    setHotspots(detectHotspots(Object.values(data).flat()))
  }, [])

  const allAssets = [
    ...(data.equities || []),
    ...(data.crypto   || []),
    ...(data.metals   || []),
    ...(data.energy   || []),
    ...(data.forex    || []),
  ]

  return { data, allAssets, lastUpdate, isLive, setIsLive, hotspots }
}
