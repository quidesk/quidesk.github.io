import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { fetchWorkerQuotes, fetchWorkerHealth } from '../utils/api';
import { useMarketStore } from '../store/marketStore';
import { STATIC_ASSETS_METADATA, detectHotspots } from '../data/markets';
import { selectGainers, selectLosers } from '../selectors/marketSelectors';

const BASE_POLL_INTERVAL_MS = 20000; // 20s
const MAX_BACKOFF_MS = 60000;        // 60s

/**
 * Creates initial skeleton asset map with null numbers and status 'unavailable'.
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
  const setHealth = useMarketStore((s) => s.setHealth);

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
        setBackoffDelay(BASE_POLL_INTERVAL_MS);
      }
      if (typeof fetchWorkerHealth === 'function') {
        fetchWorkerHealth()
          .then((h) => {
            if (h) setHealth(h);
          })
          .catch(() => null);
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.warn('[useMarketData] Worker feed fetch failed:', err.message);
      setWorkerError(err.message);
      if (typeof fetchWorkerHealth === 'function') {
        fetchWorkerHealth()
          .then((h) => {
            if (h) setHealth(h);
          })
          .catch(() => null);
      }
      setBackoffDelay((prev) => Math.min(prev * 2, MAX_BACKOFF_MS));
    }
  }, [applySnapshot, setWorkerError, setHealth]);

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

    if (isTabVisible) {
      executeFetch();
    }

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

  // Derive consolidated asset list with hydrated chartData and 24H history
  const allAssets = useMemo(() => {
    const baseMap = buildSkeletonMap();
    Object.values(storeQuotes).forEach((q) => {
      if (q && q.id && baseMap[q.id.toLowerCase()]) {
        const key = q.id.toLowerCase();
        const ts = typeof q.quoteTs === 'number' && Number.isFinite(q.quoteTs)
          ? q.quoteTs
          : (typeof q.timestamp === 'number' && Number.isFinite(q.timestamp) ? q.timestamp : null);

        const spark = Array.isArray(q.spark1d) ? q.spark1d : [];
        const chartData = spark
          .map((pt, idx) => {
            if (Array.isArray(pt)) {
              const rawTime = pt[0];
              const label = typeof rawTime === 'number' && rawTime > 1e9
                ? new Date(rawTime > 1e12 ? rawTime : rawTime * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : String(rawTime ?? idx);
              return { time: label, value: pt[1], ts: typeof rawTime === 'number' ? rawTime : null };
            }
            if (pt && typeof pt === 'object') {
              return { time: pt.time ?? String(idx), value: pt.value ?? pt.close ?? pt.price };
            }
            return { time: String(idx), value: Number(pt) };
          })
          .filter((pt) => typeof pt.value === 'number' && Number.isFinite(pt.value) && pt.value > 0);

        const existingHist = q.history && typeof q.history === 'object' && !Array.isArray(q.history)
          ? q.history
          : baseMap[key].history;

        baseMap[key] = {
          ...baseMap[key],
          ...q,
          timestamp: ts,
          chartData,
          history: {
            ...existingHist,
            '24H': Array.isArray(existingHist?.['24H']) && existingHist['24H'].length > 0
              ? existingHist['24H']
              : chartData,
          },
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
  const hotspots = useMemo(() => {
    const refMs = generatedAt ? Date.parse(generatedAt) : NaN;
    return detectHotspots(allAssets, Number.isFinite(refMs) ? refMs : Date.now());
  }, [allAssets, generatedAt]);

  const isStaleFn = useCallback((id) => {
    if (!isWorkerOnline) return true;
    const key = typeof id === 'string' ? id.toLowerCase() : '';
    const q = key ? storeQuotes[key] : null;
    if (!q) return false;
    return q.status === 'stale' || q.status === 'unavailable';
  }, [isWorkerOnline, storeQuotes]);

  return {
    data,
    allAssets,
    gainers,
    losers,
    hotspots,
    lastUpdate: generatedAt ? new Date(generatedAt).getTime() : null,
    generatedAt,
    oldestQuoteTs,
    sourcesHealth,
    isLive,
    setIsLive,
    isWorkerOnline,
    workerError,
    isStale: isStaleFn,
    connectionStatus: isWorkerOnline ? (isLive ? 'connected' : 'paused') : 'disconnected',
  };
}
