import React from 'react'
import { formatPrice } from '../data/markets'

const TYPE_LABELS = {
  breakout:           { label:'BREAKOUT',   color:'var(--bull)' },
  breakdown:          { label:'BREAKDOWN',  color:'var(--bear)' },
  bullish_breakout:   { label:'BREAKOUT',   color:'var(--bull)' },
  bearish_reversal:   { label:'BREAKDOWN',  color:'var(--bear)' },
  divergence:         { label:'DIVERGENCE', color:'#a78bfa' },
};

const SEV_COLORS = { high:'var(--bear)', medium:'var(--amber)', low:'var(--text-secondary)' };

export default function HotspotPanel({ hotspots = [], allAssets = [], onSelect }) {
  const assetMap = {};
  allAssets.forEach(a => { if (a && a.id) assetMap[a.id] = a; });

  if (!hotspots.length) return (
    <div style={s.empty}>
      <div style={s.emptyIcon}>◎</div>
      <div style={s.emptyText}>No hotspots detected</div>
      <div style={s.emptySub}>All sectors within normal ranges</div>
    </div>
  );

  return (
    <div style={s.list}>
      {hotspots.slice(0, 8).map((h, i) => {
        const asset = assetMap[h.assetId];
        const rawType = h.type || h.signal || 'ALERT';
        const typeInfo = TYPE_LABELS[rawType] || { label: String(rawType).toUpperCase(), color: 'var(--accent)' };
        return (
          <div
            key={i} style={s.item}
            onClick={() => asset && onSelect && onSelect(asset)}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <div style={{ ...s.sevBar, background: SEV_COLORS[h.severity] || 'var(--text-dim)' }} />
            <div style={s.itemBody}>
              <div style={s.itemTop}>
                <span style={s.symbol}>{h.symbol}</span>
                <span style={{ ...s.typeBadge, color: typeInfo.color, borderColor: typeInfo.color + '40' }}>
                  {typeInfo.label}
                </span>
                {h.timestamp && (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-dim)', marginLeft: 'auto' }}>
                    {new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                )}
              </div>
              <div style={s.itemDesc}>
                {h.desc || `${h.symbol} ${h.change >= 0 ? '+' : ''}${typeof h.change === 'number' ? h.change.toFixed(2) : h.change}% 24H move`}
              </div>
            </div>
            {asset && (
              <span style={s.itemPrice}>
                {formatPrice(asset.price, asset.symbol, asset.sector)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

const s = {
  list: { display:'flex', flexDirection:'column' },
  item: {
    display:'flex', alignItems:'center', gap:'12px',
    padding:'10px 16px',
    borderBottom:'1px solid var(--border-subtle)',
    cursor:'pointer', transition:'background 0.15s',
  },
  sevBar: { width:'3px', height:'28px', borderRadius:'2px', flexShrink:0 },
  itemBody: { flex:1, minWidth:0 },
  itemTop: { display:'flex', alignItems:'center', gap:'6px' },
  symbol: { fontFamily:'var(--font-mono)', fontSize:'12px', fontWeight:600, color:'var(--text-primary)' },
  typeBadge: {
    fontFamily:'var(--font-mono)', fontSize:'8px', fontWeight:600,
    letterSpacing:'0.06em', padding:'1px 5px', borderRadius:'3px',
    border:'1px solid',
  },
  itemDesc: {
    fontFamily:'var(--font-body)', fontSize:'11px', color:'var(--text-secondary)',
    marginTop:'2px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
  },
  itemPrice: {
    fontFamily:'var(--font-mono)', fontSize:'11px', color:'var(--text-dim)',
    flexShrink:0,
  },
  empty: {
    display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
    padding:'32px 16px', gap:'6px',
  },
  emptyIcon: { fontSize:'24px', color:'var(--text-dim)' },
  emptyText: { fontFamily:'var(--font-body)', fontSize:'13px', color:'var(--text-dim)' },
  emptySub: { fontFamily:'var(--font-body)', fontSize:'11px', color:'var(--text-dim)' },
};
