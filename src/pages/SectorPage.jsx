import React, { useState } from 'react'
import AssetCard from '../components/AssetCard'
import DetailChart from '../components/DetailChart'
import { formatPrice, formatChange, SECTOR_META } from '../data/markets'
import { selectSectorStats } from '../selectors/marketSelectors'

export default function SectorPage({ sector, assets, watchlistProps, convertPrice, formatLocalPrice, isStale }) {
  const [selected, setSelected] = useState(null);
  const [sort, setSort] = useState('default');
  const meta = SECTOR_META[sector] || { label: sector.toUpperCase(), color: 'var(--accent)', icon: '?' };

  const numOrNull = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

  const sorted = [...assets].sort((a, b) => {
    if (sort === 'price-desc') return (numOrNull(b.price) ?? -Infinity) - (numOrNull(a.price) ?? -Infinity);
    if (sort === 'price-asc')  return (numOrNull(a.price) ?? Infinity) - (numOrNull(b.price) ?? Infinity);
    if (sort === 'gain')       return (numOrNull(b.change) ?? -Infinity) - (numOrNull(a.change) ?? -Infinity);
    if (sort === 'loss')       return (numOrNull(a.change) ?? Infinity) - (numOrNull(b.change) ?? Infinity);
    return 0;
  });

  const stats = selectSectorStats(assets);
  const avgIsFlat = stats.avgChange !== null && Math.abs(stats.avgChange) < 0.005;
  const avgColor = stats.avgChange === null || avgIsFlat
    ? 'var(--text-dim)'
    : stats.avgChange >= 0 ? 'var(--bull)' : 'var(--bear)';

  return (
    <div style={s.page} className='page-wrap'>
      {/* Header */}
      <div className="fade-up" style={s.header}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <span style={{ fontSize:'22px', color: meta.color }}>{meta.icon}</span>
          <h1 style={{ ...s.title, color: meta.color }}>{meta.label}</h1>
          {stats.isClosed && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-dim)' }}>
              last session
            </span>
          )}
        </div>
        <div style={s.statsBar} className="stats-bar">
          {[
            { l:'INSTRUMENTS',  v: stats.totalCount },
            { l:'ADVANCING',    v: stats.advancingCount, c:'var(--bull)' },
            { l:'DECLINING',    v: stats.decliningCount, c:'var(--bear)' },
            { l:'AVG CHANGE',   v: formatChange(stats.avgChange), c: avgColor },
            {
              l: 'TOP GAINER',
              v: stats.topGainer ? `${stats.topGainer.symbol} ${formatChange(stats.topGainer.change)}` : '—',
              c: stats.topGainer ? 'var(--bull)' : 'var(--text-dim)',
            },
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
      <div className="row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-xl-5 g-3 fade-up-2">
        {sorted.map(asset => (
          <div className="col" key={asset.id}>
            <AssetCard asset={asset}
              onClick={setSelected}
              isWatched={watchlistProps?.isWatched(asset.id)}
              onToggleWatch={watchlistProps?.onToggleWatch}
              convertPrice={convertPrice}
              formatLocalPrice={formatLocalPrice}
              isStale={isStale}
            />
          </div>
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
              {sorted.map(a => {
                const chg = a.status === 'unavailable' ? null : (typeof a.change === 'number' && Number.isFinite(a.change) ? a.change : null);
                const isFlat = chg !== null && Math.abs(chg) < 0.005;
                const chgColor = chg === null || isFlat ? 'var(--text-dim)' : (chg >= 0 ? 'var(--bull)' : 'var(--bear)');
                return (
                  <tr key={a.id} style={{ cursor:'pointer', transition:'background 0.1s' }}
                    onClick={() => setSelected(a)}
                    onMouseEnter={e => e.currentTarget.style.background='var(--bg-card-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background='transparent'}
                  >
                    <td style={{ ...s.td, color: meta.color, fontWeight:600 }}>{a.symbol}</td>
                    <td style={s.td}>{a.name}</td>
                    <td style={{ ...s.td, fontFamily:'var(--font-mono)' }}>{formatPrice(a.price, a.symbol, a.sector)}</td>
                    <td style={{ ...s.td, fontFamily:'var(--font-mono)', color: chgColor }}>
                      {chg !== null && !isFlat && <span style={{ marginRight: '3px' }}>{chg >= 0 ? '▲' : '▼'}</span>}
                      {formatChange(chg)}
                    </td>
                    <td style={{ ...s.td, color:'var(--text-secondary)' }}>{a.volume}</td>
                    <td style={{ ...s.td, color:'var(--text-secondary)' }}>{a.marketCap || '—'}</td>
                  </tr>
                );
              })}
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
