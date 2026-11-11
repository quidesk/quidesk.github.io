import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import useSWR from 'swr';
import { MARKET_DATA, detectHotspots, generateDeterministicSparkline } from '../data/markets';
import { connectBinanceWS, fetchBinancePrices, fetchCryptoPrices, fetchAllMetals, fetchForexPrices } from '../utils/api';
import { useMarketStore, syncAllUI } from '../store/marketStore';
import { getFreshnessLevel } from '../lib/freshness';
import { fetchMarketStream } from '../services/marketStream';

const POLL_INTERVAL_MS = 5000;

function sanitizeHistoryPoints(arr, fallbackPrice) {
  const safe = (arr || []).filter(v => typeof v === 'number' && Number.isFinite(v) && v > 0);
  if (safe.length < 2) return [fallbackPrice, fallbackPrice];
  return safe;
}

function appendChartPoint(asset) {
  const val = asset.price;
  const chg = asset.changePercent ?? asset.change ?? 0;
  const h = asset.history;

  let points;
  if (h && h['24H'] && h['24H'].length > 2) {
    const safe = sanitizeHistoryPoints(h['24H'], val);
    points = [...safe];
    points[points.length - 1] = val;
  } else {
    points = generateDeterministicSparkline(asset.symbol || asset.id, val, chg, 48);
  }

  const history = {
    '1H': points.slice(-12),
    '24H': points,
    '1M': points,
    '1Y': points,
  };

  const chartData = points.map((v, i) => ({ time: `${i}:00`, value: v }));

  return {
    ...asset,
    history,
    chartData,
  };
}

// Build initial flat normalized map from MARKET_DATA
function buildInitialMap() {
  const map = {};
  const now = Date.now();
  Object.values(MARKET_DATA).flat().forEach(asset => {
    map[asset.id] = {
      ...asset,
      changePercent: asset.change,
      timestamp: now,
      source: 'cache',
    };
  });
  return map;
}

/**
 * Universal Market Data Fetcher for Static Frontend Architecture.
 *
 * In a static SPA deployed on GitHub Pages, market quotes are fetched from
 * /market-snapshot.json (populated with verified live Yahoo Finance, Binance,
 * and Gold-API rates) with fallback to live client-side third-party APIs.
 */
async function fetchMarketSnapshot() {
  // 1. Primary: Query Cloudflare Worker edge aggregator if online
  try {
    const workerQuotes = await fetchMarketStream();
    if (workerQuotes && Object.keys(workerQuotes).length >= 28) {
      return workerQuotes;
    }
  } catch (err) {
    console.warn('[useMarketData] Edge worker query notice:', err.message);
  }

  // 2. Secondary: Query pre-hydrated static snapshot
  const base = import.meta.env?.BASE_URL || '/';
  const snapshotUrl = `${base.replace(/\/$/, '')}/market-snapshot.json?_t=${Date.now()}`;

  try {
    const res = await fetch(snapshotUrl, { cache: 'no-cache' });
    if (res.ok) {
      const json = await res.json();
      if (json && json.assets) {
        const snapTs = json.timestamp ? Date.parse(json.timestamp) : Date.now();
        const quoteMap = {};

        Object.entries(json.assets).forEach(([id, a]) => {
          const obsTs = a.observedAt ? Date.parse(a.observedAt) : snapTs;
          const isFallback = a.source?.toLowerCase().includes('fallback');
          quoteMap[id] = {
            ...a,
            id,
            changePercent: a.change,
            timestamp: isNaN(obsTs) ? Date.now() : obsTs,
            source: isFallback ? 'fallback' : 'rest',
          };
        });
        return quoteMap;
      }
    }
  } catch (err) {
    console.warn('[useMarketData] Static snapshot fetch notice:', err.message);
  }

  // Fallback: If snapshot is unavailable, query live client-side feeds
  const [crypto, metals, forex] = await Promise.allSettled([
    fetchBinancePrices().catch(() => fetchCryptoPrices()),
    fetchAllMetals(),
    fetchForexPrices(),
  ]);

  const fallbackMap = {};
  const now = Date.now();

  if (crypto.status === 'fulfilled' && Array.isArray(crypto.value)) {
    crypto.value.forEach(c => {
      fallbackMap[c.id] = { ...c, timestamp: c.timestamp || now, source: c.source || 'rest' };
    });
  }
  if (metals.status === 'fulfilled' && Array.isArray(metals.value)) {
    metals.value.forEach(m => {
      fallbackMap[m.id] = { ...m, timestamp: m.timestamp || now, source: m.source || 'rest' };
    });
  }
  if (forex.status === 'fulfilled' && forex.value) {
    Object.entries(forex.value).forEach(([id, f]) => {
      fallbackMap[id] = { ...f, timestamp: f.timestamp || now, source: f.source || 'fallback' };
    });
  }

  return fallbackMap;
}

/**
 * useMarketData Hook
 *
 * Can be called:
 * 1. Without arguments: returns full dashboard market state, synchronized across all cards.
 * 2. With symbol argument (e.g. useMarketData('SPY') or useMarketData('btc')):
 *    returns { data: Quote, error, isLoading, isValidating }
 */
export function useMarketData(assetSymbol) {
  const storeQuotes = useMarketStore((s) => s.quotes);
  const lastSync = useMarketStore((s) => s.lastSync);
  const isSyncing = useMarketStore((s) => s.isSyncing);
  const applySnapshot = useMarketStore((s) => s.applySnapshot);
  const applyTick = useMarketStore((s) => s.applyTick);

  const [isLive, setIsLive] = useState(true);
  const wsRef = useRef(null);

  // Initialize store with baseline data if empty
  useEffect(() => {
    if (Object.keys(storeQuotes).length === 0) {
      applySnapshot(buildInitialMap());
    }
  }, [applySnapshot, storeQuotes]);

  // SWR Polling Strategy: Refreshes atomically every 5 seconds
  const { data: swrData, error, isValidating, mutate } = useSWR(
    'market-snapshot-feed',
    fetchMarketSnapshot,
    {
      refreshInterval: POLL_INTERVAL_MS,
      refreshWhenHidden: false,
      refreshWhenOffline: false,
      revalidateOnFocus: true,
      focusThrottleInterval: 5000,
      keepPreviousData: true,
      dedupingInterval: 2000,
      onSuccess: (newQuotes) => {
        if (newQuotes && Object.keys(newQuotes).length > 0) {
          applySnapshot(newQuotes);
        }
      },
    }
  );

  // Binance Real-Time WebSocket for Crypto Ticks
  useEffect(() => {
    const symbols = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA'];
    let ws;
    try {
      ws = connectBinanceWS(symbols, ({ symbol, price, change, timestamp, source }) => {
        const id = symbol.toLowerCase();
        applyTick(id, {
          id,
          symbol,
          price,
          change,
          changePercent: change,
          timestamp: timestamp || Date.now(),
          source: source || 'websocket',
        });
      });
      wsRef.current = ws;
    } catch (e) {
      console.warn('[useMarketData] Binance WS error:', e.message);
    }

    return () => {
      try { ws?.close(); } catch {}
    };
  }, [applyTick]);

  // ── Global Dashboard Selectors (unconditional for React Hooks rules) ─────
  const allAssets = useMemo(() => {
    const baseMap = buildInitialMap();
    const uniqueMap = {};
    Object.values(baseMap).forEach(a => {
      uniqueMap[a.id] = a;
    });

    Object.values(storeQuotes).forEach(q => {
      if (q && q.id && uniqueMap[q.id]) {
        uniqueMap[q.id] = { ...uniqueMap[q.id], ...q };
      }
    });

    return Object.values(uniqueMap).map(a => appendChartPoint(a));
  }, [storeQuotes]);

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

  const isStale = useCallback((assetId, sector) => {
    const quote = storeQuotes[assetId.toLowerCase()] || storeQuotes[assetId];
    if (!quote) return false;
    return getFreshnessLevel(quote) !== 'fresh';
  }, [storeQuotes]);

  const connectionStatus = error ? 'reconnecting' : (isValidating || isSyncing ? 'connecting' : 'live');

  // If a specific asset symbol is requested, return the single-asset SWR shape
  if (assetSymbol) {
    const key = assetSymbol.toLowerCase();
    const quote = storeQuotes[key] || storeQuotes[assetSymbol] || null;
    return {
      data: quote,
      error,
      isLoading: !quote,
      isValidating,
      mutate,
    };
  }

  return {
    data,
    allAssets,
    gainers,
    losers,
    hotspots,
    lastUpdate: lastSync ? new Date(lastSync) : new Date(),
    isLive,
    setIsLive,
    isStale,
    connectionStatus,
    refresh: mutate,
  };
}

export default useMarketData;
