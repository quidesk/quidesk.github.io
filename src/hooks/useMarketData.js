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

function sanitizeHistoryPoints(arr, fallbackPrice) {
  const safe = (arr || []).filter(v => typeof v === 'number' && Number.isFinite(v) && v > 0);
  if (safe.length < 2) return [fallbackPrice, fallbackPrice];
  return safe;
}

function appendChartPoint(asset) {
  const val = asset.price;
  const h = asset.history || {};
  
  const updateArr = (arr) => {
    const safe = sanitizeHistoryPoints(arr, val);
    const copy = [...safe];
    copy[copy.length - 1] = val;
    return copy;
  };

  const history = {
    '1H': updateArr(h['1H']),
    '24H': updateArr(h['24H']),
    '1M': updateArr(h['1M']),
    '1Y': updateArr(h['1Y']),
  };

  const chartData = history['24H'].map((v, i) => ({ time: `${i}:00`, value: v }));

  return {
    ...asset,
    history,
    chartData,
  };
}

// Build initial flat normalized map from MARKET_DATA
function buildInitialMap() {
  const map = {};
  Object.values(MARKET_DATA).flat().forEach(asset => {
    map[asset.id] = asset;
  });
  return map;
}

export function useMarketData() {
  // Single normalized store: Record<TickerSymbol, MarketAsset>
  const [assetMap, setAssetMap] = useState(buildInitialMap)
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [isLive, setIsLive] = useState(true)
  const [connectionStatus, setConnectionStatus] = useState('connecting') // 'live' | 'connecting' | 'reconnecting'
  const wsRef = useRef(null)

  // ── STALENESS GUARD ─────────────────────────────────────────────────────
  const STALE_MAX_AGE = {
    equities: 30000,
    crypto:   30000,
    forex:    60000,
    metals:   60000,
    energy:   60000,
  }
  const priceTimestamps = useRef({}) // { [assetId]: number (Date.now()) }

  function stampPrices(assetIds) {
    const now = Date.now()
    assetIds.forEach(id => { priceTimestamps.current[id] = now })
  }

  function isStale(assetId, sector) {
    const ts = priceTimestamps.current[assetId]
    if (!ts) return false
    const maxAge = STALE_MAX_AGE[sector] || 60000
    return (Date.now() - ts) > maxAge
  }

  // Atomic bulk updater for normalized state
  const updateAssets = useCallback((updates) => {
    if (!updates || !updates.length) return;
    setAssetMap(prev => {
      let changed = false;
      const next = { ...prev };
      updates.forEach(u => {
        if (!u || !u.id) return;
        const current = next[u.id];
        if (!current) return;

        // Verify if price or change meaningfully shifted
        const priceDiff = typeof u.price === 'number' && u.price !== current.price;
        const changeDiff = typeof u.change === 'number' && u.change !== current.change;

        if (priceDiff || changeDiff || u.volume) {
          changed = true;
          const merged = {
            ...current,
            ...u,
            price: typeof u.price === 'number' ? u.price : current.price,
            change: typeof u.change === 'number' ? u.change : current.change,
          };
          next[u.id] = appendChartPoint(merged);
        }
      });
      return changed ? next : prev;
    });
    setLastUpdate(new Date());
    setConnectionStatus('live');
  }, []);

  // ── 1. PRE-HYDRATION LAYER (Static Snapshot on boot) ───────────────────
  useEffect(() => {
    async function preHydrate() {
      try {
        const base = import.meta.env.BASE_URL || '/'
        const snapshotUrl = `${base.replace(/\/$/, '')}/market-snapshot.json`
        const res = await fetch(snapshotUrl, { cache: 'no-cache' })
        if (res.ok) {
          const snapshot = await res.json()
          if (snapshot && snapshot.assets) {
            setAssetMap(prev => {
              const next = { ...prev };
              Object.entries(snapshot.assets).forEach(([id, snapAsset]) => {
                if (next[id]) {
                  next[id] = {
                    ...next[id],
                    ...snapAsset,
                    history: snapAsset.history || next[id].history,
                    chartData: snapAsset.chartData || next[id].chartData,
                  };
                } else {
                  next[id] = snapAsset;
                }
              });
              return next;
            });
            if (snapshot.timestamp) {
              setLastUpdate(new Date(snapshot.timestamp));
            }
            stampPrices(Object.keys(snapshot.assets));
            console.info('[Hydration] ✓ Pre-hydrated state from market-snapshot.json');
          }
        }
      } catch (e) {
        console.info('[Hydration] Static snapshot bypassed, connecting live feeds:', e.message);
      }
    }
    preHydrate();
  }, []);

  // ── 2. CRYPTO: Binance WebSocket (!ticker@arr) + REST fallback ────────
  useEffect(() => {
    const symbols = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA']
    let ws
    try {
      ws = connectBinanceWS(symbols, ({ symbol, price, change }) => {
        const id = symbol.toLowerCase()
        updateAssets([{ id, price, change }])
        stampPrices([id])
      })
      wsRef.current = ws
    } catch (e) {
      console.warn('Binance WS connection error:', e.message)
      setConnectionStatus('reconnecting')
    }

    // Polling REST fallback every 30s
    async function loadCryptoRest() {
      try {
        const prices = await fetchBinancePrices()
        updateAssets(prices)
        stampPrices(prices.map(p => p.id))
      } catch (e) {
        try {
          const prices = await fetchCryptoPrices()
          updateAssets(prices)
          stampPrices(prices.map(p => p.id))
        } catch (e2) {
          console.warn('All crypto APIs failed:', e2.message)
          setConnectionStatus('reconnecting')
        }
      }
    }
    loadCryptoRest()
    const id = setInterval(loadCryptoRest, 30000)

    return () => {
      clearInterval(id)
      try { ws?.close() } catch {}
    }
  }, [updateAssets])

  // ── 3. METALS: gold-api.com live 30s poller ───────────────────────────
  useEffect(() => {
    async function loadMetals() {
      try {
        const metals = await fetchAllMetals()
        if (metals && metals.length) {
          updateAssets(metals)
          stampPrices(metals.map(m => m.id))
        }
      } catch (e) {
        console.warn('Metals feed failed:', e.message)
      }
    }
    loadMetals()
    const id = setInterval(loadMetals, 30000)
    return () => clearInterval(id)
  }, [updateAssets])

  // ── 4. EQUITIES: Finnhub / FMP live quotes ─────────────────────────────
  useEffect(() => {
    const hasKey = import.meta.env.VITE_FINNHUB_KEY || import.meta.env.VITE_FMP_KEY
    if (!hasKey) return

    async function loadStocks() {
      try {
        const results = await fetchFMPStocks()
        const updates = Object.entries(results).map(([id, val]) => ({
          id,
          price: val.price,
          change: val.change,
          volume: val.volume,
        })).filter(u => u.price > 0)

        if (updates.length > 0) {
          updateAssets(updates)
          stampPrices(updates.map(u => u.id))
        }
      } catch (e) {
        console.warn('Equities poller error:', e.message)
      }
    }
    loadStocks()
    const id = setInterval(loadStocks, 60000)
    return () => clearInterval(id)
  }, [updateAssets])

  // ── 5. ENERGY: Live Energy / Futures poller ───────────────────────────
  useEffect(() => {
    const hasKey = import.meta.env.VITE_FINNHUB_KEY || import.meta.env.VITE_FMP_KEY
    if (!hasKey) return

    async function loadEnergy() {
      try {
        const results = await fetchFMPEnergy()
        const updates = Object.entries(results).map(([id, val]) => ({
          id,
          price: val.price,
          change: val.change,
        })).filter(u => u.price > 0)

        if (updates.length > 0) {
          updateAssets(updates)
          stampPrices(updates.map(u => u.id))
        }
      } catch (e) {
        console.warn('Energy poller error:', e.message)
      }
    }
    loadEnergy()
    const id = setInterval(loadEnergy, 60000)
    return () => clearInterval(id)
  }, [updateAssets])

  // ── 6. FOREX: Live 60s poller (open.er-api / frankfurter) ──────────────
  useEffect(() => {
    async function loadForex() {
      try {
        const results = await fetchForexPrices()
        const updates = Object.entries(results).map(([id, val]) => ({
          id,
          price: val.price,
          change: val.change,
        })).filter(u => u.price > 0)

        if (updates.length > 0) {
          updateAssets(updates)
          stampPrices(updates.map(u => u.id))
        }
      } catch (e) {
        console.warn('Forex poller error:', e.message)
      }
    }
    loadForex()
    const id = setInterval(loadForex, 60000) // 60s polling interval
    return () => clearInterval(id)
  }, [updateAssets])

  // ── 7. MEMOIZED SINGLE SOURCE OF TRUTH SELECTORS ───────────────────────
  const allAssets = useMemo(() => {
    return Object.values(assetMap);
  }, [assetMap]);

  const data = useMemo(() => {
    const grouped = {
      equities: [],
      crypto:   [],
      metals:   [],
      energy:   [],
      forex:    [],
    };
    allAssets.forEach(a => {
      if (grouped[a.sector]) {
        grouped[a.sector].push(a);
      }
    });
    return grouped;
  }, [allAssets]);

  const gainers = useMemo(() => {
    return allAssets
      .filter(a => typeof a.change === 'number' && a.change > 0)
      .sort((a, b) => b.change - a.change)
      .slice(0, 4);
  }, [allAssets]);

  const losers = useMemo(() => {
    return allAssets
      .filter(a => typeof a.change === 'number' && a.change < 0)
      .sort((a, b) => a.change - b.change)
      .slice(0, 4);
  }, [allAssets]);

  const hotspots = useMemo(() => {
    return detectHotspots(allAssets);
  }, [allAssets]);

  return {
    data,
    allAssets,
    gainers,
    losers,
    hotspots,
    lastUpdate,
    isLive,
    setIsLive,
    isStale,
    connectionStatus,
  };
}
