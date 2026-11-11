import React, { useId } from 'react';
import { ResponsiveContainer, AreaChart, Area, YAxis } from 'recharts';

/**
 * MiniChart — High-precision sparkline renderer driven exclusively by authentic Worker series.
 *
 * Rules:
 * - If fewer than 2 valid points exist: Renders a dashed "no chart data" baseline.
 * - Zero synthetic random/sin/cos curve generators.
 * - Unrounded floats are preserved to eliminate staircase plateaus on energy assets (NG, HOIL).
 * - Stroke color matches sign of change: neutral grey if flat (|c| < 0.005), green if up, red if down.
 * - If currentPrice is provided, locks the terminal point to live price.
 * - If prevClose is provided, locks the initial point to session close.
 */
export default function MiniChart({
  data,
  positive,
  change,
  height = 48,
  currentPrice,
  prevClose,
}) {
  const baseId = useId().replace(/:/g, '');
  const gradientId = `minichart-grad-${baseId}`;

  // Extract numeric points from data (handles both [{value: N}], [{price: N}], and [N] formats)
  const rawValues = (data || []).map(pt => {
    if (typeof pt === 'object' && pt !== null) {
      return pt.value ?? pt.price ?? pt.close;
    }
    return pt;
  });

  // Filter out non-numeric and non-finite values (keep exact unrounded floats)
  let validPoints = rawValues.filter(v => typeof v === 'number' && Number.isFinite(v) && v > 0);

  // If live price is provided and different from last point, align last point
  if (typeof currentPrice === 'number' && Number.isFinite(currentPrice) && currentPrice > 0) {
    if (validPoints.length > 0) {
      validPoints[validPoints.length - 1] = currentPrice;
    }
  }

  // If prevClose is provided, align first point
  if (typeof prevClose === 'number' && Number.isFinite(prevClose) && prevClose > 0 && validPoints.length > 1) {
    validPoints[0] = prevClose;
  }

  // If fewer than 2 valid points, render dashed "no chart data" baseline
  if (validPoints.length < 2) {
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

  // Dynamic Y-axis domain locked tightly to the range with padding (never anchored to 0)
  const min = Math.min(...validPoints);
  const max = Math.max(...validPoints);
  const delta = max - min;
  const pad = delta > 0 ? delta * 0.08 : (min * 0.005 || 0.01);
  const yDomain = [min - pad, max + pad];

  const chartData = validPoints.map((val, idx) => ({ idx, value: val }));

  // Color derived from sign of displayed change: neutral grey if flat
  const isFlat = typeof change === 'number' ? Math.abs(change) < 0.005 : false;
  const isBull = typeof change === 'number' ? change > 0 : Boolean(positive);
  const color = isFlat ? 'var(--text-dim, #8b949e)' : (isBull ? 'var(--bull, #22d47a)' : 'var(--bear, #f04060)');

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.25} />
            <stop offset="95%" stopColor={color} stopOpacity={0.0} />
          </linearGradient>
        </defs>
        <YAxis hide domain={yDomain} />
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
    </ResponsiveContainer>
  );
}
