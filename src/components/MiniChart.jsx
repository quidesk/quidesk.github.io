import React, { useId } from 'react'
import { ResponsiveContainer, AreaChart, Area, YAxis } from 'recharts'

export default function MiniChart({ data, positive, height = 48, currentPrice = 1 }) {
  // Extract numeric points from data (handles both [{value: N}] and [N] formats)
  const rawValues = (data || []).map(pt => {
    if (typeof pt === 'object' && pt !== null) return pt.value;
    return pt;
  });

  // Sanitize all sparkline history arrays: filter out nulls, undefined, 0, NaNs, and negative spikes
  let validPoints = rawValues.filter(v => typeof v === 'number' && Number.isFinite(v) && v > 0);

  // If fewer than 2 valid points, initialize with [currentPrice, currentPrice]
  const safeCurrent = (typeof currentPrice === 'number' && Number.isFinite(currentPrice) && currentPrice > 0)
    ? currentPrice
    : (validPoints[0] || 1);

  if (validPoints.length < 2) {
    validPoints = [safeCurrent, safeCurrent];
  }

  // Dynamic Y-axis domain locked tightly to the range with padding (never anchored to 0)
  const min = Math.min(...validPoints);
  const max = Math.max(...validPoints);
  const delta = max - min;
  const pad = delta > 0 ? delta * 0.08 : (min * 0.005 || 0.01);
  const yDomain = [min - pad, max + pad];

  const chartData = validPoints.map((val, idx) => ({ idx, value: val }));
  const color = positive ? 'var(--bull)' : 'var(--bear)';
  const baseId = useId().replace(/:/g, '');
  const gradientId = `minichart-grad-${baseId}`;

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
