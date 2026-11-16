import { useState, useEffect } from 'react';
import { fetchWorkerHistory } from '../utils/api';

export const MIN_CHART_POINTS = 10;

/**
 * useMarketHistory(id, range)
 * 
 * Fetches real historical market series directly and exclusively from the Cloudflare Worker.
 * 
 * Hard Rules & Acceptance Criteria:
 * - The Worker is the ONLY market-data feed.
 * - If points < 10 => returns valid: false, causing chart to render dashed "no chart data" line.
 * - Points only: no synthetic prevClose prepended, no fake live price appended.
 * - Granularity, source, and previousClose are honest and accurately reported.
 * 
 * @param {string} id - Asset ID (e.g. 'spx', 'btc')
 * @param {string} [range='24H'] - '1H' | '24H' | '1M' | '1Y'
 * @returns {{ points: Array<{t: number, v: number}>, granularity: string|null, source: string|null, previousClose: number|null, loading: boolean, error: string|null, valid: boolean }}
 */
export function useMarketHistory(id, range = '24H') {
  const [state, setState] = useState({
    points: [],
    granularity: null,
    source: null,
    previousClose: null,
    loading: true,
    error: null,
    valid: false,
  });

  useEffect(() => {
    if (!id) {
      setState({
        points: [],
        granularity: null,
        source: null,
        previousClose: null,
        loading: false,
        error: null,
        valid: false,
      });
      return;
    }

    let isMounted = true;
    setState((prev) => ({ ...prev, loading: true, error: null }));

    fetchWorkerHistory(id, range)
      .then((res) => {
        if (!isMounted) return;
        const rawPoints = Array.isArray(res?.points) ? res.points : [];
        const cleanPoints = rawPoints
          .map((p) => {
            const rawT = p.t ?? p.time;
            const rawV = p.v ?? p.close ?? p.value;
            const t = typeof rawT === 'number' && Number.isFinite(rawT)
              ? (rawT > 1e12 ? rawT : rawT * 1000)
              : null;
            const v = typeof rawV === 'number' && Number.isFinite(rawV) && rawV > 0
              ? rawV
              : null;
            return { t, v };
          })
          .filter((p) => p.t !== null && p.v !== null);

        const prevClose = typeof res?.previousClose === 'number' && Number.isFinite(res.previousClose) && res.previousClose > 0
          ? res.previousClose
          : null;

        const isValid = cleanPoints.length >= MIN_CHART_POINTS;

        setState({
          points: isValid ? cleanPoints : [],
          granularity: res?.granularity || null,
          source: res?.source || null,
          previousClose: prevClose,
          loading: false,
          error: null,
          valid: isValid,
        });
      })
      .catch((err) => {
        if (!isMounted) return;
        setState({
          points: [],
          granularity: null,
          source: null,
          previousClose: null,
          loading: false,
          error: err.message,
          valid: false,
        });
      });

    return () => {
      isMounted = false;
    };
  }, [id, range]);

  return state;
}

export default useMarketHistory;
