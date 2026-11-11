import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine
} from 'recharts';
import { formatPrice, SECTOR_META } from '../data/markets';
import { formatChangePercentage } from '../utils/formatters';
import { fetchWorkerHistory } from '../utils/api';
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
  const [historyCache, setHistoryCache] = useState({});
  const [loading, setLoading] = useState(false);

  // Range mapping between UI pills ('1H', '24H', '1M', '1Y') and Worker API ('1D', '5D', '1M', '1Y')
  const rangeMap = {
    '1H': '1D',
    '24H': '1D',
    '1M': '1M',
    '1Y': '1Y',
  };

  useEffect(() => {
    if (!asset || !asset.id) return;
    const workerRange = rangeMap[range] || '1D';
    const cacheKey = `${asset.id}-${range}`;

    // If already in asset.history or local cache, skip fetching
    if (asset.history && asset.history[range] && asset.history[range].length > 1) {
      return;
    }
    if (historyCache[cacheKey]) {
      return;
    }

    let isMounted = true;
    setLoading(true);

    fetchWorkerHistory(asset.id, workerRange)
      .then(res => {
        if (!isMounted) return;
        if (res && Array.isArray(res.points) && res.points.length > 0) {
          const pts = res.points.map(p => ({
            time: p.time ? new Date(p.time * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
            value: typeof p.close === 'number' ? p.close : p.value,
          }));
          setHistoryCache(prev => ({ ...prev, [cacheKey]: pts }));
        }
      })
      .catch(() => {
        // Fallback gracefully — renders dashed baseline
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, [asset?.id, range]);

  if (!asset) return null;
  const meta = SECTOR_META[asset.sector] || {};
  
  const changeVal = typeof asset.changePercent === 'number' ? asset.changePercent : (asset.change ?? 0);
  const isFlat = Math.abs(changeVal) < 0.005;
  const isUp = changeVal >= 0;
  const color = isFlat ? 'var(--text-dim, #8b949e)' : (isUp ? 'var(--bull)' : 'var(--bear)');
  const gid = `dc-${asset.id}`;

  const cacheKey = `${asset.id}-${range}`;
  const rawData = (asset.history && asset.history[range] && asset.history[range].length > 1)
    ? asset.history[range]
    : (historyCache[cacheKey] || asset.chartData || []);

  const values = rawData
    .map(d => (typeof d === 'number' ? d : d?.value))
    .filter(v => typeof v === 'number' && Number.isFinite(v) && v > 0);

  // Sync terminal points with real live prices
  if (values.length > 0 && typeof asset.price === 'number') {
    values[values.length - 1] = asset.price;
  }
  if (values.length > 1 && (range === '24H' || range === '1H') && typeof asset.prevClose === 'number' && asset.prevClose > 0) {
    values[0] = asset.prevClose;
  }

  const hasChartData = values.length >= 2;
  const min = hasChartData ? Math.min(...values) : null;
  const max = hasChartData ? Math.max(...values) : null;

  const formattedData = rawData.map((d, i) => {
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
            {isFlat ? '0.00%' : `${isUp ? '▲' : '▼'} ${formatChangePercentage(changeVal)}`}
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

      {/* Recharts Area or Dashed Baseline */}
      <div style={s.chartArea}>
        {hasChartData ? (
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
        ) : (
          <div style={{
            height: 200,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px dashed var(--border-subtle, rgba(255,255,255,0.1))',
            borderRadius: '6px',
            color: 'var(--text-dim)',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            gap: '6px',
          }}>
            <span>{loading ? 'Loading authentic market series...' : '— no chart data available for this timeframe —'}</span>
          </div>
        )}
      </div>

      {/* Stats bar */}
      <div style={s.statsBar}>
        <div style={s.stat}>
          <div style={s.statLabel}>24H LOW</div>
          <div style={s.statVal}>{min !== null ? formatPrice(min, asset.symbol, asset.sector) : '—'}</div>
        </div>
        <div style={s.stat}>
          <div style={s.statLabel}>24H HIGH</div>
          <div style={s.statVal}>{max !== null ? formatPrice(max, asset.symbol, asset.sector) : '—'}</div>
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
