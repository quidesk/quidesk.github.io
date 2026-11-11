import React, { useState } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine
} from 'recharts';
import { formatPrice, SECTOR_META } from '../data/markets';
import PriceDisplay from './PriceDisplay';
import TimeRangeToggles from './TimeRangeToggles';

const Tip = ({ active, payload, label, symbol, sector }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background:'var(--bg-panel)', border:'1px solid var(--border-mid)',
      borderRadius:'6px', padding:'8px 12px',
      fontFamily:'var(--font-mono)', boxShadow:'0 8px 32px rgba(0,0,0,0.5)',
    }}>
      <div style={{ fontSize:'9px', color:'var(--text-dim)', marginBottom:'2px' }}>{label}</div>
      <div style={{ fontSize:'14px', color:'var(--text-primary)' }}>{formatPrice(payload[0].value, symbol, sector)}</div>
    </div>
  );
};

export default function DetailChart({ asset, onClose }) {
  const [range, setRange] = useState('24H');
  if (!asset) return null;
  const meta = SECTOR_META[asset.sector] || {};
  const isUp = asset.change >= 0;
  const color = isUp ? 'var(--bull)' : 'var(--bear)';
  const gid = `dc-${asset.id}`;
  
  // Hook up the range to the history object
  const data = asset.history && asset.history[range] ? asset.history[range] : (asset.chartData || []);
  const values = data.map(d => (typeof d === 'number' ? d : d.value)).filter(v => typeof v === 'number' && !isNaN(v));
  const min = values.length ? Math.min(...values) : (asset.price * 0.95);
  const max = values.length ? Math.max(...values) : (asset.price * 1.05);

  const formattedData = data.map((d, i) => {
    if (typeof d === 'number') {
      return { time: `${i}:00`, value: d };
    }
    return d;
  });

  const isForex = asset.sector === 'forex' || (
    asset.symbol && asset.symbol.includes('/') &&
    !asset.symbol.startsWith('XAU') && !asset.symbol.startsWith('XAG') && !asset.symbol.startsWith('XPT')
  );

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
          <div style={{ ...s.price, color }}>
            <PriceDisplay
              value={asset.price}
              prefix={isForex ? '' : '$'}
              precision={isForex ? (asset.symbol?.includes('JPY') || asset.symbol?.includes('INR') ? 2 : 4) : (asset.price < 1 ? 4 : 2)}
            />
            {asset.unit && <span style={{ fontSize: '12px', color: 'var(--text-dim)', marginLeft: '3px' }}>/{asset.unit}</span>}
          </div>
          <div style={{ ...s.change, color }}>
            {isUp ? '▲' : '▼'} {formatPrice(Math.abs(asset.price * asset.change / 100), asset.symbol, asset.sector)} ({isUp ? '+' : ''}{asset.change.toFixed(2)}%)
          </div>
        </div>
        {onClose && (
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        )}
      </div>

      {/* Range pills and Trade Action */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom:'14px', flexWrap: 'wrap', gap: '10px' }}>
        <TimeRangeToggles
          selected={range}
          onChange={(newR) => setRange(newR)}
          accentColor={meta.color}
        />
        
        {asset.sector === 'crypto' && (
          <a
            href="https://www.binance.com/register?ref=1067434967"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${meta.color || 'var(--accent)'}60`,
              borderRadius: '4px',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              letterSpacing: '0.04em',
              padding: '4px 10px',
              textDecoration: 'none',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              boxShadow: `0 0 10px ${meta.color || 'var(--accent)'}15`
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = `${meta.color || 'var(--accent)'}20`;
              e.currentTarget.style.borderColor = meta.color || 'var(--accent)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.borderColor = `${meta.color || 'var(--accent)'}60`;
            }}
          >
            Trade {asset.symbol} ↗
          </a>
        )}
      </div>

      {/* Recharts Area */}
      <div style={s.chartArea}>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={formattedData} margin={{ top:8, right:8, left:0, bottom:0 }}>
            <defs>
              <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.28} />
                <stop offset="85%" stopColor={color} stopOpacity={0.02} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="time" hide />
            <YAxis
              domain={[min - (max - min) * 0.05, max + (max - min) * 0.05]}
              orientation="right"
              tick={{ fill:'var(--text-dim)', fontSize:9, fontFamily:'var(--font-mono)' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={v => formatPrice(v, asset.symbol, asset.sector)}
              width={65}
            />
            <Tooltip content={<Tip symbol={asset.symbol} sector={asset.sector} />} />
            <ReferenceLine y={asset.price} stroke={color} strokeDasharray="2 2" strokeOpacity={0.4} />
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={1.8}
              fill={`url(#${gid})`}
              dot={false}
              activeDot={{ r:4, fill:color, stroke:'var(--bg-void)', strokeWidth:2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Stats bar */}
      <div style={s.statsBar}>
        <div style={s.stat}>
          <div style={s.statLabel}>24H LOW</div>
          <div style={s.statVal}>{formatPrice(min, asset.symbol, asset.sector)}</div>
        </div>
        <div style={s.stat}>
          <div style={s.statLabel}>24H HIGH</div>
          <div style={s.statVal}>{formatPrice(max, asset.symbol, asset.sector)}</div>
        </div>
        <div style={s.stat}>
          <div style={s.statLabel}>VOLUME</div>
          <div style={s.statVal}>{asset.volume || '—'}</div>
        </div>
        {asset.marketCap && (
          <div style={s.stat}>
            <div style={s.statLabel}>MARKET CAP</div>
            <div style={s.statVal}>{asset.marketCap}</div>
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  wrap: {
    background:'var(--bg-panel)', border:'1px solid var(--border-mid)',
    borderRadius:'10px', padding:'20px 24px',
    boxShadow:'0 16px 48px rgba(0,0,0,0.5)',
  },
  header: {
    display:'flex', justifyContent:'space-between', alignItems:'flex-start',
    marginBottom:'16px',
  },
  titleGroup: { display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap' },
  symbol: { fontFamily:'var(--font-display)', fontSize:'20px', fontWeight:700, color:'var(--text-primary)' },
  sectorTag: {
    fontFamily:'var(--font-mono)', fontSize:'9px', borderRadius:'3px',
    padding:'2px 7px', letterSpacing:'0.06em',
  },
  name: { fontFamily:'var(--font-body)', fontSize:'12px', color:'var(--text-dim)' },
  priceGroup: { textAlign:'right' },
  price: { fontFamily:'var(--font-mono)', fontSize:'22px', fontWeight:500, letterSpacing:'0.02em' },
  change: { fontFamily:'var(--font-mono)', fontSize:'11px', marginTop:'2px' },
  closeBtn: {
    background:'transparent', border:'none', color:'var(--text-dim)',
    cursor:'pointer', fontSize:'14px', padding:'2px 6px', marginLeft:'12px',
  },
  chartArea: { width:'100%', marginBottom:'14px' },
  statsBar: {
    display:'flex', gap:'24px', paddingTop:'12px',
    borderTop:'1px solid var(--border-subtle)', flexWrap:'wrap',
  },
  stat: { fontFamily:'var(--font-mono)' },
  statLabel: { fontSize:'8px', color:'var(--text-dim)', letterSpacing:'0.08em', marginBottom:'2px' },
  statVal: { fontSize:'12px', color:'var(--text-secondary)' },
};
