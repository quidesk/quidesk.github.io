import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { fetchWorkerQuotes } from '../utils/api';
import { useMarketStore } from '../store/marketStore';
import { STATIC_ASSETS_METADATA, detectHotspots } from '../data/markets';
import { selectGainers, selectLosers } from '../selectors/marketSelectors';

const BASE_POLL_INTERVAL_MS = 20000; // 20s
const MAX_BACKOFF_MS = 60000;        // 60s

/**
 * Creates initial skeleton asset map with zero numbers and status 'unavailable'.
 */
function buildSkeletonMap() {
  const map = {};
  for (const [id, meta] of Object.entries(STATIC_ASSETS_METADATA)) {
    map[id] = {
      ...meta,
      price: null,
      prevClose: null,
      change: null,
      changePercent: null,
      status: 'unavailable',
      session: meta.sector === 'crypto' ? '24x7' : 'regular',
      spark1d: [],
      history: {
        '1H': [],
        '24H': [],
        '1M': [],
        '1Y': [],
      },
      chartData: [],
    };
  }
  return map;
}

/**
 * useMarketData Hook
 * 
 * Exclusively queries the Cloudflare Worker feed (/v1/quotes).
 * Pauses when the tab is hidden or when isLive is toggled off.
 * Implements exponential backoff on errors and AbortController request cancellation.
 */
export function useMarketData() {
  const storeQuotes = useMarketStore((s) => s.quotes);
  const generatedAt = useMarketStore((s) => s.generatedAt);
  const oldestQuoteTs = useMarketStore((s) => s.oldestQuoteTs);
  const sourcesHealth = useMarketStore((s) => s.sourcesHealth);
  const isWorkerOnline = useMarketStore((s) => s.isWorkerOnline);
  const workerError = useMarketStore((s) => s.workerError);
  const applySnapshot = useMarketStore((s) => s.applySnapshot);
  const setWorkerError = useMarketStore((s) => s.setWorkerError);

  const [isLive, setIsLive] = useState(true);
  const [backoffDelay, setBackoffDelay] = useState(BASE_POLL_INTERVAL_MS);
  const abortControllerRef = useRef(null);
  const pollTimerRef = useRef(null);

  // Initialize store with skeleton map if empty
  useEffect(() => {
    if (Object.keys(storeQuotes).length === 0) {
      applySnapshot({ assets: buildSkeletonMap(), generatedAt: null, health: {} });
    }
  }, [applySnapshot, storeQuotes]);

  const executeFetch = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const payload = await fetchWorkerQuotes({ signal: controller.signal });
      if (payload && payload.assets) {
        applySnapshot(payload);
        setBackoffDelay(BASE_POLL_INTERVAL_MS); // Reset backoff on success
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.warn('[useMarketData] Worker feed fetch failed:', err.message);
      setWorkerError(err.message);
      // Exponential backoff
      setBackoffDelay((prev) => Math.min(prev * 2, MAX_BACKOFF_MS));
    }
  }, [applySnapshot, setWorkerError]);

  // Main polling loop
  useEffect(() => {
    if (!isLive) return;

    let isTabVisible = document.visibilityState === 'visible';

    const handleVisibilityChange = () => {
      isTabVisible = document.visibilityState === 'visible';
      if (isTabVisible && isLive) {
        executeFetch();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Initial fetch
    if (isTabVisible) {
      executeFetch();
    }

    // Schedule next poll
    const scheduleNext = () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
      pollTimerRef.current = setTimeout(() => {
        if (isLive && document.visibilityState === 'visible') {
          executeFetch().finally(scheduleNext);
        } else {
          scheduleNext();
        }
      }, backoffDelay);
    };

    scheduleNext();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [isLive, backoffDelay, executeFetch]);

  // Derive consolidated asset list
  const allAssets = useMemo(() => {
    const baseMap = buildSkeletonMap();
    Object.values(storeQuotes).forEach((q) => {
      if (q && q.id && baseMap[q.id.toLowerCase()]) {
        baseMap[q.id.toLowerCase()] = {
          ...baseMap[q.id.toLowerCase()],
          ...q,
          chartData: (q.spark1d || []).map((pt, i) => ({
            time: `${i}:00`,
            value: pt[1],
          })),
        };
      }
    });
    return Object.values(baseMap);
  }, [storeQuotes]);

  // Grouped by sector
  const data = useMemo(() => {
    const grouped = {
      equities: [],
      crypto: [],
      metals: [],
      energy: [],
      forex: [],
    };
    allAssets.forEach((a) => {
      if (grouped[a.sector]) {
        grouped[a.sector].push(a);
      }
    });
    return grouped;
  }, [allAssets]);

  const gainers = useMemo(() => selectGainers(allAssets, 4), [allAssets]);
  const losers = useMemo(() => selectLosers(allAssets, 4), [allAssets]);
  const hotspots = useMemo(() => detectHotspots(allAssets), [allAssets]);

  return {
    data,
    allAssets,
    gainers,
    losers,
    hotspots,
    lastUpdate: generatedAt ? new Date(generatedAt).getTime() : Date.now(),
    generatedAt,
    oldestQuoteTs,
    sourcesHealth,
    isLive,
    setIsLive,
    isWorkerOnline,
    workerError,
    isStale: !isWorkerOnline,
    connectionStatus: isWorkerOnline ? (isLive ? 'connected' : 'paused') : 'disconnected',
  };
}
