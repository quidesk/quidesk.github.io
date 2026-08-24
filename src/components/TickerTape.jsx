import React from 'react'
import { formatPrice, formatChange } from '../data/markets'

export default function TickerTape({ allAssets }) {
  const items = [...allAssets, ...allAssets];
  return (
    <div style={s.wrap}>
      <div style={s.label}>
        <span style={s.dot} />
        <span style={s.labelText}>LIVE</span>
      </div>
      <div style={s.track}>
        <div style={s.scroll}>
          {items.map((a, i) => {
            const up = a.change >= 0;
            return (
              <span key={`${a.id}-${i}`} style={s.item}>
                <span style={s.sym}>{a.symbol}</span>
                <span style={s.price}>
                  {a.pricePrefix || ''}{formatPrice(a.price).replace('$', a.pricePrefix ? '' : '$')}
                </span>
                <span style={{ ...s.chg, color: up ? 'var(--bull)' : 'var(--bear)' }}>
                  {up ? '▲' : '▼'}{Math.abs(a.change).toFixed(2)}%
                </span>
                <span style={s.sep} />
              </span>
            );
          })}
        </div>
      </div>
      <style>{`@keyframes tickerScroll{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}`}</style>
    </div>
  );
}

const s = {
  wrap: {
    display:'flex', alignItems:'center', height:'30px',
    background:'var(--bg-surface)',
    borderBottom:'1px solid var(--border-subtle)',
    overflow:'hidden',
  },
  label: {
    flexShrink:0, display:'flex', alignItems:'center', gap:'5px',
    padding:'0 14px',
    borderRight:'1px solid var(--border-subtle)',
    height:'100%',
    background:'rgba(34,212,122,0.04)',
  },
  dot: {
    width:'5px', height:'5px', borderRadius:'50%',
    background:'var(--bull)', boxShadow:'0 0 5px var(--bull)',
    animation:'pulseDot 1.6s ease-in-out infinite',
    display:'inline-block',
  },
  labelText: {
    fontFamily:'var(--font-mono)', fontSize:'9px',
    color:'var(--accent)', letterSpacing:'0.15em',
  },
  track: { flex:1, overflow:'hidden' },
  scroll: {
    display:'inline-flex', alignItems:'center',
    animation:'tickerScroll 90s linear infinite',
    whiteSpace:'nowrap',
  },
  item: {
    display:'inline-flex', alignItems:'center', gap:'6px',
    padding:'0 2px',
    flexShrink: 0,
    whiteSpace: 'nowrap',
  },
  sym: {
    fontFamily:'var(--font-mono)', fontSize:'10px', fontWeight:500,
    color:'var(--text-secondary)', letterSpacing:'0.03em',
    flexShrink: 0,
    whiteSpace: 'nowrap',
  },
  price: {
    fontFamily:'var(--font-mono)', fontSize:'11px',
    color:'var(--text-primary)',
    flexShrink: 0,
    whiteSpace: 'nowrap',
  },
  chg: {
    fontFamily:'var(--font-mono)', fontSize:'10px',
    flexShrink: 0,
    whiteSpace: 'nowrap',
  },
  sep: {
    display:'inline-block', width:'1px', height:'12px',
    background:'var(--border-subtle)', margin:'0 10px',
  },
};
