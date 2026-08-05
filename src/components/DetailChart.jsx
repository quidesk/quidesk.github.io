import React, { useState } from 'react'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine
} from 'recharts'
import { formatPrice, SECTOR_META } from '../data/markets'

const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background:'var(--bg-panel)', border:'1px solid var(--border-mid)',
      borderRadius:'6px', padding:'8px 12px',
      fontFamily:'var(--font-mono)', boxShadow:'0 8px 32px rgba(0,0,0,0.5)',
    }}>
      <div style={{ fontSize:'9px', color:'var(--text-dim)', marginBottom:'2px' }}>{label}</div>
      <div style={{ fontSize:'14px', color:'var(--text-primary)' }}>{formatPrice(payload[0].value)}</div>
    </div>
  );
};

export default function DetailChart({ asset, onClose }) {
  const [range, setRange] = useState('1D');
  if (!asset) return null;
  const meta = SECTOR_META[asset.sector] || {};
  const isUp = asset.change >= 0;
  const color = isUp ? 'var(--bull)' : 'var(--bear)';
  const gid = `dc-${asset.id}`;
  const data = asset.chartData;
  const min = Math.min(...data.map(d=>d.value));
  const max = Math.max(...data.map(d=>d.value));

  return (
    <div style={s.wrap}>
      {/* Header */}
      <div style={s.header}>
        <div style={s.titleGroup}>
          <div style={s.symbol}>{asset.symbol}</div>
          <div style={{ ...s.sectorTag, color: meta.color, background:`${meta.color}15`, border:`1px solid ${meta.color}30` }}>
            {meta.label}
          </div>
          <div style={s.name}>{asset.name}</div>
        </div>
        <div style={s.priceGroup}>
          <div style={{ ...s.price, color }}>{formatPrice(asset.price)}</div>
          <div style={{ ...s.change, color }}>{isUp?'▲':'▼'} {formatPrice(Math.abs(asset.price * asset.change / 100))} ({isUp?'+':''}{asset.change.toFixed(2)}%)</div>
        </div>
        {onClose && (
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        )}
      </div>

      {/* Range pills */}
      <div style={s.ranges}>
        {['1H','1D','1W','1M','3M','YTD','1Y'].map(r => (
          <button
            key={r}
            style={{ ...s.range, ...(range===r ? { ...s.rangeOn, color: meta.color || 'var(--accent)', borderColor: meta.color || 'var(--accent)', background:`${meta.color||'#f0a500'}12` } : {}) }}
            onClick={() => setRange(r)}
          >{r}</button>
        ))}
      </div>

      {/* Chart */}
      <div style={{ height:200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{top:8,right:8,left:0,bottom:0}}>
            <defs>
              <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={color} stopOpacity={0.2}/>
                <stop offset="95%" stopColor={color} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.03)" strokeDasharray="4 4"/>
            <XAxis dataKey="time"
              tick={{ fill:'var(--text-dim)', fontSize:9, fontFamily:'var(--font-mono)' }}
              axisLine={{ stroke:'var(--border-subtle)' }} tickLine={false}
              interval={Math.floor(data.length/5)}
            />
            <YAxis
              domain={[min*0.998, max*1.002]}
              tick={{ fill:'var(--text-dim)', fontSize:9, fontFamily:'var(--font-mono)' }}
              axisLine={false} tickLine={false}
              tickFormatter={v => formatPrice(v)} width={68}
            />
            <Tooltip content={<Tip/>}/>
            <ReferenceLine y={data[0]?.value} stroke="rgba(255,255,255,0.08)" strokeDasharray="3 2"/>
            <Area type="monotone" dataKey="value"
              stroke={color} strokeWidth={2}
              fill={`url(#${gid})`} dot={false}
              activeDot={{ r:4, fill:color, stroke:'var(--bg-card)', strokeWidth:2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Stats */}
      <div style={s.stats}>
        {[
          { l:'HIGH',   v: formatPrice(max) },
          { l:'LOW',    v: formatPrice(min) },
          { l:'VOLUME', v: asset.volume },
          { l:'MKT CAP',v: asset.marketCap },
          { l:'CHANGE', v: `${asset.change>=0?'+':''}${asset.change.toFixed(2)}%`, c: color },
        ].filter(x => x.v && x.v !== '—').map(({ l, v, c }) => (
          <div key={l} style={s.stat}>
            <div style={s.statL}>{l}</div>
            <div style={{ ...s.statV, ...(c ? { color: c } : {}) }}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const s = {
  wrap: {
    background:'var(--bg-card)', border:'1px solid var(--border-subtle)',
    borderRadius:'10px', padding:'20px',
  },
  header: {
    display:'flex', alignItems:'flex-start', gap:'12px', marginBottom:'14px', flexWrap:'wrap',
  },
  titleGroup: { flex:1, display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap' },
  symbol: {
    fontFamily:'var(--font-display)', fontSize:'18px', fontWeight:700,
    color:'var(--text-primary)', letterSpacing:'0.05em',
  },
  sectorTag: {
    fontFamily:'var(--font-mono)', fontSize:'9px', letterSpacing:'0.08em',
    padding:'2px 7px', borderRadius:'3px',
  },
  name: {
    fontFamily:'var(--font-body)', fontSize:'11px', color:'var(--text-dim)',
  },
  priceGroup: { textAlign:'right' },
  price: {
    fontFamily:'var(--font-mono)', fontSize:'22px', fontWeight:500,
  },
  change: {
    fontFamily:'var(--font-mono)', fontSize:'11px', marginTop:'2px',
  },
  closeBtn: {
    background:'none', border:'1px solid var(--border-subtle)', borderRadius:'4px',
    color:'var(--text-dim)', cursor:'pointer', padding:'4px 8px',
    fontFamily:'var(--font-mono)', fontSize:'11px', flexShrink:0,
  },
  ranges: { display:'flex', gap:'4px', marginBottom:'14px', flexWrap:'wrap' },
  range: {
    background:'none', border:'1px solid var(--border-subtle)', borderRadius:'4px',
    color:'var(--text-dim)', fontFamily:'var(--font-mono)', fontSize:'9px',
    letterSpacing:'0.05em', padding:'3px 9px', cursor:'pointer', transition:'all 0.12s',
  },
  rangeOn: { fontWeight:500 },
  stats: {
    display:'flex', gap:'20px', flexWrap:'wrap',
    paddingTop:'12px', marginTop:'12px', borderTop:'1px solid var(--border-subtle)',
  },
  stat: {},
  statL: { fontFamily:'var(--font-mono)', fontSize:'8px', color:'var(--text-dim)', letterSpacing:'0.1em', marginBottom:'2px' },
  statV: { fontFamily:'var(--font-mono)', fontSize:'13px', color:'var(--text-primary)' },
};
