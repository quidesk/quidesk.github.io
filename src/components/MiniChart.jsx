import React, { useId } from 'react';
import { ResponsiveContainer, AreaChart, Area, YAxis, ReferenceLine } from 'recharts';
import { fetchWorkerHistory } from '../utils/api';

export const MIN_REAL_CHART_POINTS = 10;

export const RANGE_TO_WORKER = {
  '1H': '1H',
  '24H': '1D',
  '1M': '1M',
  '1Y': '1Y',
};

const historyCache = new Map();
const inFlightHistory = new Map();

/**
 * Normalizes Worker /v1/history points for UI range pills ('1H', '24H', '1M', '1Y').
 * Fixes ms-vs-sec timestamps and slices '1H' cleanly to the trailing 60 minutes.
 */
export function normalizeWorkerHistoryPoints(res, range = '24H') {
  if (!res || !Array.isArray(res.points) || res.points.length === 0) {
    return { points: [], previousClose: res?.previousClose ?? null };
  }

  let rawPoints = res.points.filter((p) => {
    const val = Array.isArray(p) ? p[1] : (typeof p?.close === 'number' ? p.close : p?.value);
    return typeof val === 'number' && Number.isFinite(val) && val > 0;
  });

  const toMs = (t) => (typeof t === 'number' && Number.isFinite(t) ? (t > 1e12 ? t : t * 1000) : NaN);

  if (range === '1H' && rawPoints.length > 0) {
    let latestMs = -Infinity;
    for (const p of rawPoints) {
      const rawT = Array.isArray(p) ? p[0] : p.time;
      const ms = toMs(rawT);
      if (Number.isFinite(ms) && ms > latestMs) latestMs = ms;
    }
    if (Number.isFinite(latestMs)) {
      const cutoff = latestMs - 3600000;
      const sliced = rawPoints.filter((p) => {
        const rawT = Array.isArray(p) ? p[0] : p.time;
        const ms = toMs(rawT);
        return Number.isFinite(ms) && ms >= cutoff;
      });
      if (sliced.length >= 2) {
        rawPoints = sliced;
      }
    }
  }

  const isMultiDay = range === '1M' || range === '1Y';
  const points = rawPoints.map((p) => {
    const rawT = Array.isArray(p) ? p[0] : (p.t ?? p.time);
    const val = Array.isArray(p) ? p[1] : (typeof p.close === 'number' ? p.close : (p.value ?? p.v));
    const ms = toMs(rawT);
    let label = '';
    if (Number.isFinite(ms)) {
      const d = new Date(ms);
      label = isMultiDay
        ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...(range === '1Y' ? { year: '2-digit' } : {}) })
        : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return {
      t: Number.isFinite(ms) ? ms : null,
      v: val,
      time: label,
      value: val,
      close: val,
      ts: Number.isFinite(ms) ? ms : null,
    };
  });

  const prev = typeof res.previousClose === 'number' && Number.isFinite(res.previousClose) && res.previousClose > 0
    ? res.previousClose
    : null;

  return { points, previousClose: prev };
}

/**
 * Cached Worker history loader shared between AssetCard and DetailChart.
 */
export async function fetchCachedRangeHistory(assetId, range = '24H') {
  if (!assetId) return { points: [], previousClose: null };
  const key = `${assetId.toLowerCase()}-${range}`;
  if (historyCache.has(key)) {
    return historyCache.get(key);
  }
  if (inFlightHistory.has(key)) {
    return inFlightHistory.get(key);
  }

  const workerRange = RANGE_TO_WORKER[range] || '1D';
  const promise = fetchWorkerHistory(assetId, workerRange)
    .then((res) => {
      const normalized = normalizeWorkerHistoryPoints(res, range);
      if (normalized.points.length > 0) {
        historyCache.set(key, normalized);
      }
      return normalized;
    })
    .catch(() => ({ points: [], previousClose: null }))
    .finally(() => {
      inFlightHistory.delete(key);
    });

  inFlightHistory.set(key, promise);
  return promise;
}

/**
 * Pure series builder:
 * - Supports numbers, { time, value } objects, and [timestamp, close] tuples.
 * - Requires at least `minRealPoints` (default 10) real positive data points.
 */
export function buildChartSeries({
  data,
  prevClose,
  currentPrice,
  includePrevClose = true,
  minRealPoints = MIN_REAL_CHART_POINTS,
}) {
  const realPoints = [];
  if (Array.isArray(data)) {
    for (let i = 0; i < data.length; i++) {
      const pt = data[i];
      let rawVal;
      let label = `${i}`;
      if (Array.isArray(pt)) {
        rawVal = pt[1];
        if (typeof pt[0] === 'number' && pt[0] > 1e9) {
          label = new Date(pt[0] > 1e12 ? pt[0] : pt[0] * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (pt[0] !== undefined) {
          label = String(pt[0]);
        }
      } else if (typeof pt === 'object' && pt !== null) {
        rawVal = pt.value ?? pt.close ?? pt.price;
        if (pt.time) label = String(pt.time);
      } else {
        rawVal = pt;
      }

      if (typeof rawVal === 'number' && Number.isFinite(rawVal) && rawVal > 0) {
        realPoints.push({ time: label, value: rawVal });
      }
    }
  }

  if (realPoints.length < minRealPoints) {
    return {
      valid: false,
      points: [],
      values: [],
      min: null,
      max: null,
      prevClose: null,
    };
  }

  const points = [];
  for (let i = 0; i < realPoints.length; i++) {
    points.push({ idx: i, time: realPoints[i].time, value: realPoints[i].value });
  }

  const hasPrev = typeof prevClose === 'number' && Number.isFinite(prevClose) && prevClose > 0;
  const values = points.map((p) => p.value);
  const min = hasPrev ? Math.min(...values, prevClose) : Math.min(...values);
  const max = hasPrev ? Math.max(...values, prevClose) : Math.max(...values);

  return {
    valid: true,
    points,
    values,
    min,
    max,
    prevClose: hasPrev ? prevClose : null,
  };
}

export default function MiniChart({
  data,
  change,
  height = 48,
  currentPrice,
  prevClose,
  includePrevClose = true,
  width,
}) {
  const baseId = useId().replace(/:/g, '');
  const gradientId = `minichart-grad-${baseId}`;

  const series = buildChartSeries({
    data,
    prevClose,
    currentPrice,
    includePrevClose,
    minRealPoints: MIN_REAL_CHART_POINTS,
  });

  if (!series.valid) {
    return (
      <div
        className="minichart-empty"
        style={{
          width: '100%',
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        <svg width="100%" height={height} style={{ position: 'absolute', top: 0, left: 0 }}>
          <line
            x1="0"
            y1={height / 2}
            x2="100%"
            y2={height / 2}
            stroke="var(--border-subtle, rgba(255, 255, 255, 0.15))"
            strokeDasharray="4 4"
            strokeWidth="1"
          />
        </svg>
        <span
          style={{
            fontFamily: 'var(--font-mono, monospace)',
            fontSize: '9px',
            color: 'var(--text-dim, #8b949e)',
            position: 'relative',
            zIndex: 1,
            background: 'var(--bg-card, #0f172a)',
            padding: '0 4px',
          }}
        >
          no chart data
        </span>
      </div>
    );
  }

  const delta = series.max - series.min;
  const pad = delta > 0 ? delta * 0.08 : (series.min * 0.005 || 0.01);
  const yDomain = [series.min - pad, series.max + pad];

  const hasChange = typeof change === 'number' && Number.isFinite(change);
  const isFlat = hasChange && Math.abs(change) < 0.005;
  const color = (!hasChange || isFlat)
    ? 'var(--text-dim, #8b949e)'
    : (change > 0 ? 'var(--bull, #22d47a)' : 'var(--bear, #f04060)');

  const chartEl = (
    <AreaChart
      data={series.points}
      width={typeof width === 'number' ? width : undefined}
      height={typeof width === 'number' ? height : undefined}
      margin={{ top: 2, right: 0, left: 0, bottom: 2 }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor={color} stopOpacity={0.25} />
          <stop offset="95%" stopColor={color} stopOpacity={0.0} />
        </linearGradient>
      </defs>
      <YAxis hide domain={yDomain} />
      {series.prevClose !== null && (
        <ReferenceLine
          y={series.prevClose}
          stroke="var(--text-dim, #8b949e)"
          strokeDasharray="3 3"
          strokeOpacity={0.55}
        />
      )}
      <Area
        type="monotone"
        dataKey="value"
        stroke={color}
        strokeWidth={1.5}
        fill={`url(#${gradientId})`}
        dot={false}
        activeDot={false}
        isAnimationActive={false}
      />
    </AreaChart>
  );

  if (typeof width === 'number') {
    return chartEl;
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      {chartEl}
    </ResponsiveContainer>
  );
}
