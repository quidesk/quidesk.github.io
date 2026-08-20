import React from 'react'
import { formatPrice } from '../data/markets'

const TYPE_LABELS = {
  breakout:   { label:'BREAKOUT',   color:'var(--bull)' },
  breakdown:  { label:'BREAKDOWN',  color:'var(--bear)' },
  divergence: { label:'DIVERGENCE', color:'#a78bfa' },
};

const SEV_COLORS = { high:'var(--bear)', medium:'var(--amber)', low:'var(--text-secondary)' };

export default function HotspotPanel({ hotspots, allAssets, onSelect }) {
  const assetMap = {};
  allAssets.forEach(a => { assetMap[a.id] = a; });

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
        const typeInfo = TYPE_LABELS[h.type] || { label: h.type.toUpperCase(), color: 'var(--accent)' };
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
              </div>
              <div style={s.signal}>{h.signal}</div>
            </div>
            {asset && (
              <div style={s.itemRight}>
                <div style={{
                  fontFamily:'var(--font-mono)', fontSize:'11px',
                  color: asset.change >= 0 ? 'var(--bull)' : 'var(--bear)',
                }}>
                  {asset.change >= 0 ? '+' : ''}{asset.change.toFixed(2)}%
                </div>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--text-dim)' }}>
                  {formatPrice(asset.price)}
                </div>
              </div>
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
    display:'flex', alignItems:'center', gap:'10px',
    padding:'10px 14px', cursor:'pointer',
    borderBottom:'1px solid var(--border-subtle)',
    transition:'background 0.1s ease', position:'relative',
  },
  sevBar: {
    width:'3px', height:'32px', borderRadius:'2px', flexShrink:0,
  },
  itemBody: { flex:1, minWidth:0 },
  itemTop: {
    display:'flex', alignItems:'center', gap:'7px', marginBottom:'2px',
  },
  symbol: {
    fontFamily:'var(--font-mono)', fontSize:'11px', fontWeight:500,
    color:'var(--text-primary)',
  },
  typeBadge: {
    fontFamily:'var(--font-mono)', fontSize:'8px', letterSpacing:'0.08em',
    border:'1px solid', borderRadius:'2px', padding:'0 5px', lineHeight:'14px',
  },
  signal: {
    fontFamily:'var(--font-body)', fontSize:'11px',
    color:'var(--text-secondary)', whiteSpace:'nowrap',
    overflow:'hidden', textOverflow:'ellipsis',
  },
  itemRight: { textAlign:'right', flexShrink:0 },
  empty: {
    display:'flex', flexDirection:'column', alignItems:'center',
    justifyContent:'center', padding:'32px 16px', gap:'6px',
  },
  emptyIcon: {
    fontSize:'24px', color:'var(--text-dim)', lineHeight:1,
  },
  emptyText: {
    fontFamily:'var(--font-mono)', fontSize:'11px', color:'var(--text-secondary)',
  },
  emptySub: {
    fontFamily:'var(--font-body)', fontSize:'11px', color:'var(--text-dim)',
  },
};
