import React, { useState } from 'react'
import AssetCard from '../components/AssetCard'
import DetailChart from '../components/DetailChart'
import { formatPrice, SECTOR_META } from '../data/markets'

export default function SectorPage({ sector, assets, watchlistProps, convertPrice }) {
  const [selected, setSelected] = useState(null);
  const [sort, setSort] = useState('default');
  const meta = SECTOR_META[sector] || {};

  const sorted = [...assets].sort((a, b) => {
    if (sort === 'price-desc') return b.price - a.price;
    if (sort === 'price-asc')  return a.price - b.price;
    if (sort === 'gain')       return b.change - a.change;
    if (sort === 'loss')       return a.change - b.change;
    return 0;
  });

  const advancing = assets.filter(a => a.change > 0).length;
  const avgChg = (assets.reduce((s,a) => s+a.change, 0) / assets.length).toFixed(2);

  return (
    <div style={s.page} className='page-wrap'>
      {/* Header */}
      <div className="fade-up" style={s.header}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <span style={{ fontSize:'22px', color: meta.color }}>{meta.icon}</span>
          <h1 style={{ ...s.title, color: meta.color }}>{meta.label}</h1>
        </div>
        <div style={s.statsBar} className="stats-bar">
          {[
            { l:'INSTRUMENTS',  v: assets.length },
            { l:'ADVANCING',    v: advancing, c:'var(--bull)' },
            { l:'DECLINING',    v: assets.length - advancing, c:'var(--bear)' },
            { l:'AVG CHANGE',   v: `${parseFloat(avgChg)>=0?'+':''}${avgChg}%`, c: parseFloat(avgChg)>=0 ? 'var(--bull)' : 'var(--bear)' },
            { l:'TOP GAINER',   v: `${[...assets].sort((a,b)=>b.change-a.change)[0]?.symbol} +${Math.max(...assets.map(a=>a.change)).toFixed(2)}%`, c:'var(--bull)' },
          ].map(({ l, v, c }) => (
            <div key={l} style={s.statItem}>
              <div style={s.statL}>{l}</div>
              <div style={{ ...s.statV, ...(c ? { color: c } : {}) }}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Sort */}
      <div className="fade-up-1" style={s.sortRow}>
        <span style={{ fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--text-dim)', letterSpacing:'0.1em' }}>SORT</span>
        {[
          { k:'default', l:'Default' },
          { k:'gain',    l:'Gainers ↑' },
          { k:'loss',    l:'Losers ↑' },
          { k:'price-desc', l:'Price ↓' },
          { k:'price-asc',  l:'Price ↑' },
        ].map(({ k, l }) => (
          <button key={k}
            style={{ ...s.sortBtn, ...(sort===k ? { borderColor: meta.color, color: meta.color, background:`${meta.color}10` } : {}) }}
            onClick={() => setSort(k)}
          >{l}</button>
        ))}
      </div>

      {/* Selected detail chart */}
      {selected && (
        <div className="fade-up" style={{ marginBottom:'24px' }}>
          <DetailChart asset={assets.find(a => a.id === selected.id) || selected} onClose={() => setSelected(null)} />
        </div>
      )}

      {/* Cards grid */}
      <div className="fade-up-2 asset-grid" style={s.grid}>
        {sorted.map(asset => (
          <AssetCard key={asset.id} asset={asset}
            onClick={setSelected}
            isWatched={watchlistProps?.isWatched(asset.id)}
            onToggleWatch={watchlistProps?.onToggleWatch}
            convertPrice={convertPrice}
          />
        ))}
      </div>

      {/* Table */}
      <div className="fade-up-3" style={s.table}>
        <div style={s.tableTitle}>Full Data Table</div>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', minWidth:'600px' }}>
            <thead>
              <tr>
                {['Symbol','Name','Price','24H Change','Volume','Mkt Cap'].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map(a => (
                <tr key={a.id} style={{ cursor:'pointer', transition:'background 0.1s' }}
                  onClick={() => setSelected(a)}
                  onMouseEnter={e => e.currentTarget.style.background='var(--bg-card-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background='transparent'}
                >
                  <td style={{ ...s.td, color: meta.color, fontWeight:600 }}>{a.symbol}</td>
                  <td style={s.td}>{a.name}</td>
                  <td style={{ ...s.td, fontFamily:'var(--font-mono)' }}>{formatPrice(a.price)}</td>
                  <td style={{ ...s.td, fontFamily:'var(--font-mono)', color: a.change>=0?'var(--bull)':'var(--bear)' }}>
                    {a.change>=0?'▲':'▼'} {Math.abs(a.change).toFixed(2)}%
                  </td>
                  <td style={{ ...s.td, color:'var(--text-secondary)' }}>{a.volume}</td>
                  <td style={{ ...s.td, color:'var(--text-secondary)' }}>{a.marketCap || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const s = {
  page: { padding:'24px 28px', maxWidth:'1700px', margin:'0 auto', display:'flex', flexDirection:'column', gap:'20px' },
  header: {},
  title: {
    fontFamily:'var(--font-display)', fontSize:'26px', fontWeight:800,
    letterSpacing:'0.06em',
  },
  statsBar: {
    display:'grid', gridTemplateColumns:'repeat(5, 1fr)',
    gap:'1px', background:'var(--border-subtle)',
    border:'1px solid var(--border-subtle)', borderRadius:'8px',
    overflow:'hidden', marginTop:'14px',
  },
  statItem: { background:'var(--bg-card)', padding:'12px 16px' },
  statL: { fontFamily:'var(--font-mono)', fontSize:'8px', color:'var(--text-dim)', letterSpacing:'0.12em', marginBottom:'4px' },
  statV: { fontFamily:'var(--font-mono)', fontSize:'14px', color:'var(--text-primary)' },
  sortRow: { display:'flex', alignItems:'center', gap:'6px', flexWrap:'wrap' },
  sortBtn: {
    background:'none', border:'1px solid var(--border-subtle)',
    borderRadius:'5px', color:'var(--text-dim)',
    fontFamily:'var(--font-body)', fontSize:'11px', fontWeight:500,
    padding:'4px 12px', cursor:'pointer', transition:'all 0.12s',
  },
  grid: { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:'12px' },
  table: {
    background:'var(--bg-card)', border:'1px solid var(--border-subtle)', borderRadius:'10px', overflow:'hidden',
  },
  tableTitle: {
    fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--text-dim)',
    letterSpacing:'0.12em', padding:'12px 16px',
    borderBottom:'1px solid var(--border-subtle)', background:'var(--bg-surface)',
  },
  th: {
    fontFamily:'var(--font-mono)', fontSize:'9px', color:'var(--text-dim)',
    letterSpacing:'0.1em', padding:'9px 14px', textAlign:'left',
    borderBottom:'1px solid var(--border-subtle)', background:'var(--bg-surface)',
    fontWeight:400,
  },
  td: {
    fontFamily:'var(--font-body)', fontSize:'13px', color:'var(--text-primary)',
    padding:'10px 14px', borderBottom:'1px solid var(--border-subtle)',
  },
};
