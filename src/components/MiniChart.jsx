import React, { useId } from 'react';
import { ResponsiveContainer, AreaChart, Area, YAxis, ReferenceLine } from 'recharts';
import { fetchWorkerHistory } from '../utils/api';

export const MIN_REAL_CHART_POINTS = 10;

export const RANGE_TO_WORKER = {
  '1H': '1H',
  '24H': '24H',
  '1M': '1M',
  '1Y': '1Y',
};

const historyCache = new Map();
const inFlightHistory = new Map();

/**
 * Normalizes Worker /v1/history points for UI range pills ('1H', '24H', '1M', '1Y').
 * Fixes ms-vs-sec timestamps and maps to clean { time, value, t, v } records.
 */
export function normalizeWorkerHistoryPoints(res, range = '24H') {
  if (!res || !Array.isArray(res.points) || res.points.length === 0) {
    return { points: [], previousClose: res?.previousClose ?? null, granularity: res?.granularity ?? null, source: res?.source ?? null };
  }

  let rawPoints = res.points
    .map((p) => {
      const val = typeof p?.close === 'number' ? p.close : (typeof p?.value === 'number' ? p.value : (p?.v ?? (typeof p === 'number' ? p : null)));
      const rawT = p?.time ?? p?.t;
      const t = typeof rawT === 'number' && Number.isFinite(rawT) ? (rawT > 1e12 ? rawT : rawT * 1000) : null;
      return { val, t };
    })
    .filter((p) => typeof p.val === 'number' && Number.isFinite(p.val) && p.val > 0);

  const toMs = (t) => (typeof t === 'number' && Number.isFinite(t) ? (t > 1e12 ? t : t * 1000) : NaN);

  if (range === '1H' && rawPoints.length > 0) {
    let latestMs = -Infinity;
    for (const p of rawPoints) {
      const ms = toMs(p.t);
      if (Number.isFinite(ms) && ms > latestMs) latestMs = ms;
    }
    if (Number.isFinite(latestMs)) {
      const cutoff = latestMs - 3600000;
      rawPoints = rawPoints.filter((p) => {
        const ms = toMs(p.t);
        return Number.isFinite(ms) && ms >= cutoff;
      });
    }
  }

  const isMultiDay = range === '1M' || range === '1Y';
  const points = rawPoints.map((p, idx) => {
    const ms = toMs(p.t);
    let label = '';
    if (Number.isFinite(ms)) {
      const d = new Date(ms);
      label = isMultiDay
        ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...(range === '1Y' ? { year: '2-digit' } : {}) })
        : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      label = `${idx}`;
    }
    return {
      time: label,
      value: p.val,
      t: Number.isFinite(ms) ? ms : null,
      v: p.val,
    };
  });

  const prev = typeof res.previousClose === 'number' && Number.isFinite(res.previousClose) && res.previousClose > 0
    ? res.previousClose
    : null;

  return { points, previousClose: prev, granularity: res?.granularity ?? null, source: res?.source ?? null };
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

  const workerRange = RANGE_TO_WORKER[range] || '24H';
  const promise = fetchWorkerHistory(assetId, workerRange)
    .then((res) => {
      const normalized = normalizeWorkerHistoryPoints(res, range);
      historyCache.set(key, normalized);
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
 * - Requires at least `minRealPoints` (default 10) real positive data points.
 * - Constructs points ONLY from real points: no synthetic prevClose or live price prepended/appended.
 * - If prevClose is provided, exposes it as `prevClose` for rendering as a dashed horizontal reference line.
 * - Unrounded floats are preserved.
 */
export function buildChartSeries({
  data,
  prevClose,
  minRealPoints = MIN_REAL_CHART_POINTS,
}) {
  const realPoints = [];
  if (Array.isArray(data)) {
    for (let i = 0; i < data.length; i++) {
      const pt = data[i];
      const rawVal = typeof pt === 'object' && pt !== null
        ? (pt.v ?? pt.value ?? pt.close ?? pt.price)
        : pt;
      if (typeof rawVal === 'number' && Number.isFinite(rawVal) && rawVal > 0) {
        const label = typeof pt === 'object' && pt !== null && (pt.time || pt.t) ? (pt.time || pt.t) : `${i}`;
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

  const points = realPoints.map((p, idx) => ({
    idx,
    time: p.time,
    value: p.value,
  }));

  const values = points.map((p) => p.value);
  const validPrevClose = typeof prevClose === 'number' && Number.isFinite(prevClose) && prevClose > 0
    ? prevClose
    : null;

  const min = validPrevClose !== null ? Math.min(...values, validPrevClose) : Math.min(...values);
  const max = validPrevClose !== null ? Math.max(...values, validPrevClose) : Math.max(...values);

  return {
    valid: true,
    points,
    values,
    min,
    max,
    prevClose: validPrevClose,
  };
}

/**
 * MiniChart — High-precision sparkline renderer driven exclusively by authentic Worker series.
 *
 * Rules:
 * - If fewer than 10 real points exist: Renders a dashed "no chart data" baseline.
 * - Zero synthetic random/sin/cos curve generators.
 * - Unrounded floats are preserved to eliminate staircase plateaus on energy assets (NG, HOIL).
 * - Series = real points only. prevClose is drawn as a dashed horizontal reference line.
 * - Stroke color matches displayed change sign (grey if flat/null).
 */
export default function MiniChart({
  data,
  change,
  height = 48,
  prevClose,
  width,
}) {
  const baseId = useId().replace(/:/g, '');
  const gradientId = `minichart-grad-${baseId}`;

  const series = buildChartSeries({
    data,
    prevClose,
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

  // Color strictly derived from displayed change sign (neutral grey if flat or null)
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
