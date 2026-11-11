import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine
} from 'recharts';
import { formatPrice, SECTOR_META } from '../data/markets';
import { formatChangePercentage, formatCardUnitSuffix, getAssetPrecision } from '../utils/formatters';
import { buildChartSeries, fetchCachedRangeHistory, MIN_REAL_CHART_POINTS } from './MiniChart';
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

  useEffect(() => {
    if (!asset || !asset.id) return;
    const cacheKey = `${asset.id}-${range}`;

    if (asset.history?.[range]?.length >= MIN_REAL_CHART_POINTS) {
      return;
    }
    if (historyCache[cacheKey]) {
      return;
    }

    let isMounted = true;
    setLoading(true);

    fetchCachedRangeHistory(asset.id, range)
      .then((res) => {
        if (!isMounted) return;
        setHistoryCache((prev) => ({ ...prev, [cacheKey]: res }));
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, [asset?.id, range, historyCache, asset?.history]);

  if (!asset) return null;
  const meta = SECTOR_META[asset.sector] || {};

  const hasPrice = asset.status !== 'unavailable' && typeof asset.price === 'number' && Number.isFinite(asset.price);
  const rawChange = asset.changePercent ?? asset.change;
  const changeVal = asset.status !== 'unavailable' && typeof rawChange === 'number' && Number.isFinite(rawChange)
    ? rawChange
    : null;
  const isFlat = changeVal !== null && Math.abs(changeVal) < 0.005;
  const isUp = changeVal !== null && changeVal > 0;
  const color = (changeVal === null || isFlat)
    ? 'var(--text-dim, #8b949e)'
    : (isUp ? 'var(--bull)' : 'var(--bear)');
  const gid = `dc-${asset.id}`;

  const cacheKey = `${asset.id}-${range}`;
  const cachedEntry = historyCache[cacheKey];
  const rawData = asset.history?.[range]
    || cachedEntry?.points
    || (range === '24H' ? (asset.chartData || asset.spark1d || []) : []);

  const includePrevClose = range === '24H';
  const refPrevClose = includePrevClose ? asset.prevClose : (cachedEntry?.previousClose ?? null);
  const series = buildChartSeries({
    data: rawData,
    prevClose: refPrevClose,
    currentPrice: asset.price,
    includePrevClose,
    minRealPoints: MIN_REAL_CHART_POINTS,
  });

  const delta = series.valid ? (series.max - series.min) : 0;
  const pad = delta > 0 ? delta * 0.08 : (series.min ? series.min * 0.005 : 0.01);

  const isForex = (asset.sector || '').toLowerCase() === 'forex' || (
    asset.symbol && asset.symbol.includes('/') &&
    !asset.symbol.startsWith('XAU') && !asset.symbol.startsWith('XAG') && !asset.symbol.startsWith('XPT')
  );
  const isForexInr = isForex && (asset.symbol?.endsWith('/INR') || asset.symbol?.endsWith('INR'));
  const pricePrefix = isForexInr ? '₹' : (isForex ? '' : '$');
  const unitSuffix = hasPrice ? formatCardUnitSuffix(asset.sector, asset.unit, asset.symbol) : '';
  const precision = getAssetPrecision(asset.symbol, asset.sector, asset.price);

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
          <div style={{ ...s.price, color: changeVal === null || isFlat ? 'var(--text-primary)' : color }}>
            <PriceDisplay
              value={hasPrice ? asset.price : null}
              prefix={pricePrefix}
              precision={precision}
            />
            {unitSuffix && <span style={{ fontSize: '12px', color: 'var(--text-dim)', marginLeft: '3px' }}>{unitSuffix}</span>}
          </div>
          <div style={{ ...s.change, color }}>
            {changeVal === null ? '—' : isFlat ? '0.00%' : `${isUp ? '▲' : '▼'} ${formatChangePercentage(changeVal)}`}
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
        {series.valid ? (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={series.points} margin={{ top:8, right:8, left:0, bottom:0 }}>
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
                domain={[series.min - pad, series.max + pad]}
                orientation="right"
                tick={{ fill:'var(--text-dim)', fontSize:9, fontFamily:'var(--font-mono)' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={v => formatPrice(v, asset.symbol, asset.sector)}
                width={65}
              />
              <Tooltip content={<Tip symbol={asset.symbol} sector={asset.sector} />} />
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
          <div style={s.statLabel}>{range} LOW</div>
          <div style={s.statVal}>{series.min !== null ? formatPrice(series.min, asset.symbol, asset.sector) : '—'}</div>
        </div>
        <div style={s.stat}>
          <div style={s.statLabel}>{range} HIGH</div>
          <div style={s.statVal}>{series.max !== null ? formatPrice(series.max, asset.symbol, asset.sector) : '—'}</div>
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
