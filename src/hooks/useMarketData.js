import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { MARKET_DATA, detectHotspots } from '../data/markets'
import {
  fetchBinancePrices,
  connectBinanceWS,
  fetchCryptoPrices,
  fetchAllMetals,
  fetchFMPStocks,
  fetchFMPEnergy,
  fetchForexPrices,
} from '../utils/api'
import { validateEnergyPrices } from '../utils/energyValidator'

function appendChartPoint(asset) {
  const val = asset.price;
  const h = asset.history || {};
  
  const updateLast = (arr) => {
    if (!arr || arr.length === 0) return [];
    const copy = [...arr];
    copy[copy.length - 1] = { ...copy[copy.length - 1], value: val };
    return copy;
  };

  const history = {
    '1H': updateLast(h['1H']),
    '24H': updateLast(h['24H']),
    '1M': updateLast(h['1M']),
    '1Y': updateLast(h['1Y'])
  };

  return {
    ...asset,
    history,
    chartData: history['24H']
  }
}

export function useMarketData() {
  const [data, setData]             = useState(MARKET_DATA)
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [isLive, setIsLive]         = useState(true)
  const wsRef = useRef(null)

  // ── STALENESS GUARD ─────────────────────────────────────────────────────
  // Configurable max-age (ms) per sector before a price is flagged as stale
  const STALE_MAX_AGE = {
    equities: 30000,
    crypto:   30000,
    forex:    60000,
    metals:   60000,
    energy:   60000,
  }
  const priceTimestamps = useRef({}) // { [assetId]: number (Date.now()) }

  // Record timestamp for each updated asset
  function stampPrices(assetIds) {
    const now = Date.now()
    assetIds.forEach(id => { priceTimestamps.current[id] = now })
  }

  // Check if a specific asset's price is stale
  function isStale(assetId, sector) {
    const ts = priceTimestamps.current[assetId]
    if (!ts) return false // never fetched yet — show seed price, don't dim on first load
    const maxAge = STALE_MAX_AGE[sector] || 60000
    return (Date.now() - ts) > maxAge
  }

  // ── CRYPTO: Binance REST primary, CoinGecko fallback ────────────────────
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
        stampPrices(prices.map(p => p.id))
        console.info('Crypto ✓ Binance')
      } catch(e) {
        console.warn('Binance failed, trying CoinGecko:', e.message)
        try {
          const prices = await fetchCryptoPrices()
          setData(prev => ({
            ...prev,
            crypto: prev.crypto.map(a => {
              const live = prices.find(p => p.id === a.id)
              return live ? appendChartPoint({ ...a, ...live }) : a
            })
          }))
          stampPrices(prices.map(p => p.id))
          console.info('Crypto ✓ CoinGecko fallback')
        } catch(e2) {
          console.warn('Both crypto APIs failed:', e2.message)
        }
      }
    }
    loadCrypto()
    const id = setInterval(loadCrypto, 30000)
    return () => clearInterval(id)
  }, [])

  // ── CRYPTO: Binance WebSocket real-time ──────────────────────────────────
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
        // Stamp the specific crypto that got a WS update
        const wsAsset = data.crypto?.find(a => a.symbol === symbol)
        if (wsAsset) stampPrices([wsAsset.id])
        setLastUpdate(new Date())
      })
      wsRef.current = ws
    } catch(e) {
      console.warn('Binance WS failed:', e.message)
    }
    return () => { try { ws?.close() } catch {} }
  }, [])

  // ── METALS: gold-api.com ─────────────────────────────────────────────────
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
        stampPrices(metals.map(m => m.id))
        console.info('Metals ✓', metals.map(m => `${m.id}=$${m.price}`).join(' '))
      } catch(e) {
        console.warn('Gold-API failed:', e.message)
      }
    }
    loadMetals()
    const id = setInterval(loadMetals, 60000)
    return () => clearInterval(id)
  }, [])

  // ── STOCKS: FMP (CORS-safe, no proxy needed) ─────────────────────────────
  useEffect(() => {
    if (!import.meta.env.VITE_FMP_KEY) {
      console.warn('VITE_FMP_KEY not set — stocks showing seed prices')
      return
    }
    async function loadStocks() {
      try {
        const results = await fetchFMPStocks()
        const loaded  = Object.entries(results).filter(([, v]) => v?.price > 0)
        if (loaded.length === 0) throw new Error('No valid prices returned')
        console.info('Stocks ✓ FMP:', loaded.map(([id, v]) => `${id}=$${v.price}`).join(' '))
        setData(prev => ({
          ...prev,
          equities: prev.equities.map(a => {
            const q = results[a.id]
            return q ? appendChartPoint({ ...a, price: q.price, change: q.change, volume: q.volume || a.volume }) : a
          })
        }))
        stampPrices(loaded.map(([id]) => id))
      } catch(e) {
        console.warn('FMP stocks failed:', e.message)
      }
    }
    loadStocks()
    const id = setInterval(loadStocks, 60000)
    return () => clearInterval(id)
  }, [])

  // ── ENERGY: FMP (CORS-safe, same key) ───────────────────────────────────
  useEffect(() => {
    if (!import.meta.env.VITE_FMP_KEY) {
      console.warn('VITE_FMP_KEY not set — energy showing seed prices')
      return
    }
    async function loadEnergy() {
      try {
        const results = await fetchFMPEnergy()
        const loaded  = Object.entries(results).filter(([, v]) => v?.price > 0)
        if (loaded.length === 0) throw new Error('No valid energy prices')
        console.info('Energy ✓ FMP:', loaded.map(([id, v]) => `${id}=$${v.price}`).join(' '))
        setData(prev => ({
          ...prev,
          energy: prev.energy.map(a => {
            const q = results[a.id]
            return q ? appendChartPoint({ ...a, price: q.price, change: q.change }) : a
          })
        }))
        stampPrices(loaded.map(([id]) => id))
      } catch(e) {
        console.warn('FMP energy failed:', e.message)
      }

      // ── ENERGY FEED CHECK (Issue #3): cross-validate against independent API ──
      try {
        const currentPrices = {}
        data.energy?.forEach(a => { currentPrices[a.id] = a.price })
        validateEnergyPrices(currentPrices) // fire-and-forget, logs warnings
      } catch (e) { /* non-critical */ }
    }
    loadEnergy()
    const id = setInterval(loadEnergy, 60000)
    return () => clearInterval(id)
  }, [])

  // ── FOREX: fawazahmed0 (free, no key, proven CORS-safe) ─────────────────
  useEffect(() => {
    async function loadForex() {
      try {
        const results = await fetchForexPrices()
        const loaded  = Object.entries(results).filter(([, v]) => v?.price > 0)
        if (loaded.length === 0) throw new Error('No valid forex prices')
        console.info('Forex ✓:', loaded.map(([id, v]) => `${id}=${v.price}`).join(' '))
        setData(prev => ({
          ...prev,
          forex: (prev.forex || []).map(a => {
            const q = results[a.id]
            return q ? appendChartPoint({ ...a, price: q.price, change: q.change }) : a
          })
        }))
        stampPrices(loaded.map(([id]) => id))
      } catch(e) {
        console.warn('Forex failed:', e.message)
      }
    }
    loadForex()
    const id = setInterval(loadForex, 10 * 60 * 1000)
    return () => clearInterval(id)
  }, [])

  // ── Chart tick every 3s — appends history only, never changes price ──────
  const tick = useCallback(() => {
    setData(prev => {
      const next = {
        equities: prev.equities.map(appendChartPoint),
        crypto:   prev.crypto.map(appendChartPoint),
        metals:   prev.metals.map(appendChartPoint),
        energy:   prev.energy.map(appendChartPoint),
        forex:    (prev.forex || []).map(appendChartPoint),
      }
      return next
    })
    setLastUpdate(new Date())
  }, [])

  useEffect(() => {
    if (!isLive) return
    const id = setInterval(tick, 3000)
    return () => clearInterval(id)
  }, [isLive, tick])

  // ── SINGLE SOURCE OF TRUTH: memoize allAssets so all UI surfaces
  //    read the exact same snapshot per render cycle ────────────────────────
  const allAssets = useMemo(() => [
    ...(data.equities || []),
    ...(data.crypto   || []),
    ...(data.metals   || []),
    ...(data.energy   || []),
    ...(data.forex    || []),
  ], [data])

  const hotspots = detectHotspots(allAssets)

  return { data, allAssets, lastUpdate, isLive, setIsLive, hotspots, isStale }
}
