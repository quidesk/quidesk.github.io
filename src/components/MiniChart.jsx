import React from 'react'
import { ResponsiveContainer, AreaChart, Area, YAxis } from 'recharts'

export default function MiniChart({ data, positive, height = 48 }) {
  // Forward-fill to prevent missing data points from plotting as 0 on y-axis
  const filledData = [];
  let lastValid = null;
  (data || []).forEach(pt => {
    if (pt.value === null || pt.value === undefined || pt.value === 0) {
      if (lastValid !== null) filledData.push({ ...pt, value: lastValid });
    } else {
      lastValid = pt.value;
      filledData.push(pt);
    }
  });

  const color = positive ? 'var(--bull)' : 'var(--bear)';
  const id = `mg-${Math.random().toString(36).slice(2,7)}`;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={filledData} margin={{ top:2, right:0, left:0, bottom:2 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={color} stopOpacity={0.25}/>
            <stop offset="95%" stopColor={color} stopOpacity={0}/>
          </linearGradient>
        </defs>
        <YAxis hide domain={['dataMin', 'dataMax']} />
        <Area type="monotone" dataKey="value"
          stroke={color} strokeWidth={1.5}
          fill={`url(#${id})`} dot={false} activeDot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
