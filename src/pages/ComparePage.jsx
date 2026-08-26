import React, { useState, useMemo } from 'react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine, Legend
} from 'recharts'
import { SECTOR_META, formatPrice } from '../data/markets'

const COMPARE_COLORS = ['#f0a500','#4d9eff','#22d47a','#a78bfa'];

function normalize(data) {
  if (!data.length) return data;
  const base = data[0].value;
  return data.map(d => ({ ...d, value: parseFloat(((d.value - base) / base * 100).toFixed(3)) }));
}

function buildOverlay(assets) {
  if (!assets.length) return [];
  const maxLen = Math.max(...assets.map(a => a.chartData.length));
  return Array.from({ length: maxLen }, (_, i) => {
    const point = { time: assets[0].chartData[i]?.time || '' };
    assets.forEach(a => {
      const base = a.chartData[0]?.value || 1;
      const val  = a.chartData[i]?.value ?? base;
      point[a.id] = parseFloat(((val - base) / base * 100).toFixed(3));
    });
    return point;
  });
}

const CustomTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background:'var(--bg-panel)', border:'1px solid var(--border-mid)',
      borderRadius:'6px', padding:'10px 14px',
      fontFamily:'var(--font-mono)', fontSize:'11px',
      boxShadow:'0 8px 32px rgba(0,0,0,0.5)',
    }}>
      <div style={{ color:'var(--text-dim)', fontSize:'9px', marginBottom:'6px' }}>{label}</div>
      {payload.map((p,i) => (
        <div key={i} style={{ color:p.color, marginBottom:'2px' }}>
          {p.name}: {p.value > 0 ? '+' : ''}{p.value?.toFixed(3)}%
        </div>
      ))}
    </div>
  );
};

export default function ComparePage({ data }) {
  const allAssets = useMemo(() => Object.values(data).flat(), [data]);
  const [selected, setSelected] = useState(['btc','gold']);
  const [search, setSearch] = useState('');

  const filteredAssets = useMemo(() =>
    allAssets.filter(a =>
      !selected.includes(a.id) &&
      (a.symbol.toLowerCase().includes(search.toLowerCase()) ||
       a.name.toLowerCase().includes(search.toLowerCase()))
    ), [allAssets, search, selected]);

  const selectedAssets = selected.map(id => allAssets.find(a => a.id === id)).filter(Boolean);
  const overlayData = useMemo(() => buildOverlay(selectedAssets), [selectedAssets]);

  const addAsset = (id) => {
    if (selected.length < 4 && !selected.includes(id)) setSelected(p => [...p, id]);
  };
  const removeAsset = (id) => setSelected(p => p.filter(x => x !== id));

  return (
    <div style={s.page} className='page-wrap'>
      <div className="fade-up" style={s.header}>
        <div>
          <h1 style={s.title}>Compare Assets</h1>
          <p style={s.sub}>Overlay any two to four assets on a normalized scale · Spot divergence, correlation and relative strength</p>
        </div>
      </div>

      <div className="row g-4">
        {/* Left: selector */}
        <div className="col-12 col-xl-3 fade-up-1" style={s.selector}>
          <div style={s.selectorHeader}>
            <span style={s.selectorTitle}>Select Assets</span>
            <span style={{ fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--text-dim)' }}>
              {selected.length}/4
            </span>
          </div>

          {/* Chips */}
          <div style={s.chips}>
            {selectedAssets.map((a, i) => {
              const meta = SECTOR_META[a.sector];
              return (
                <div key={a.id} style={{ ...s.chip, borderColor: COMPARE_COLORS[i] + '60', background: COMPARE_COLORS[i] + '12' }}>
                  <span style={{ width:'8px', height:'8px', borderRadius:'50%', background: COMPARE_COLORS[i], display:'inline-block', flexShrink:0 }} />
                  <span style={{ fontFamily:'var(--font-mono)', fontSize:'11px', color:'var(--text-primary)' }}>{a.symbol}</span>
                  <button style={s.chipRemove} onClick={() => removeAsset(a.id)}>×</button>
                </div>
              );
            })}
          </div>

          {selected.length < 4 && (
            <>
              <input
                style={s.search}
                placeholder="Search asset..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <div style={s.assetList}>
                {filteredAssets.slice(0, 16).map(a => {
                  const meta = SECTOR_META[a.sector];
                  return (
                    <div key={a.id} style={s.assetRow}
                      onClick={() => addAsset(a.id)}
                      onMouseEnter={e => e.currentTarget.style.background='var(--bg-card-hover)'}
                      onMouseLeave={e => e.currentTarget.style.background='transparent'}
                    >
                      <span style={{ fontFamily:'var(--font-mono)', fontSize:'11px', color: meta?.color || 'var(--text-primary)', fontWeight:500 }}>{a.symbol}</span>
                      <span style={{ fontFamily:'var(--font-body)', fontSize:'10px', color:'var(--text-dim)', flex:1 }}>{a.name}</span>
                      <span style={{ fontFamily:'var(--font-mono)', fontSize:'10px', color: a.change>=0 ? 'var(--bull)' : 'var(--bear)' }}>
                        {a.change >= 0 ? '+' : ''}{a.change.toFixed(2)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Right: chart area */}
        <div className="col-12 col-xl-9" style={s.chartArea}>
          {selectedAssets.length < 2 ? (
            <div style={s.empty}>
              <div style={s.emptyIcon}>◎</div>
              <div style={s.emptyText}>Select at least 2 assets to compare</div>
            </div>
          ) : (
            <>
              {/* Relative performance chart */}
              <div className="fade-up-2" style={s.chartCard}>
                <div style={s.chartCardHeader}>
                  <div style={s.chartCardTitle}>Relative Performance</div>
                  <div style={s.chartCardSub}>% change from session open · normalized to same base</div>
                </div>
                <div style={{ height:280 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={overlayData} margin={{top:8,right:8,left:0,bottom:0}}>
                      <CartesianGrid stroke="rgba(255,255,255,0.03)" strokeDasharray="4 4"/>
                      <XAxis dataKey="time"
                        tick={{ fill:'var(--text-dim)', fontSize:9, fontFamily:'var(--font-mono)' }}
                        axisLine={{ stroke:'var(--border-subtle)' }} tickLine={false}
                        interval={Math.floor(overlayData.length/5)}
                      />
                      <YAxis
                        domain={['auto', 'auto']}
                        tick={{ fill:'var(--text-dim)', fontSize:9, fontFamily:'var(--font-mono)' }}
                        axisLine={false} tickLine={false}
                        tickFormatter={v => `${v > 0 ? '+' : ''}${v.toFixed(1)}%`}
                        width={52}
                      />
                      <Tooltip content={<CustomTip/>}/>
                      <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" strokeDasharray="3 2"/>
                      {selectedAssets.map((a, i) => (
                        <Line key={a.id} type="monotone" dataKey={a.id}
                          name={a.symbol}
                          stroke={COMPARE_COLORS[i]} strokeWidth={2} dot={false}
                          activeDot={{ r:4, fill:COMPARE_COLORS[i], stroke:'var(--bg-card)', strokeWidth:2 }}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Side-by-side stat cards */}
              <div className="fade-up-3" style={s.statGrid}>
                {selectedAssets.map((a, i) => {
                  const meta = SECTOR_META[a.sector];
                  const isUp = a.change >= 0;
                  const firstVal = a.chartData[0]?.value || a.price;
                  const sessionChg = ((a.price - firstVal) / firstVal * 100).toFixed(2);
                  return (
                    <div key={a.id} style={{ ...s.statCard, borderTopColor: COMPARE_COLORS[i] }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'12px' }}>
                        <span style={{ width:'10px', height:'10px', borderRadius:'50%', background: COMPARE_COLORS[i], display:'inline-block' }} />
                        <span style={{ fontFamily:'var(--font-display)', fontSize:'14px', fontWeight:700, color:'var(--text-primary)' }}>{a.symbol}</span>
                        <span style={{ fontFamily:'var(--font-mono)', fontSize:'9px', color: meta?.color, background:`${meta?.color}15`, border:`1px solid ${meta?.color}30`, borderRadius:'3px', padding:'0 5px', lineHeight:'15px' }}>{meta?.label}</span>
                      </div>
                      <div style={{ fontFamily:'var(--font-mono)', fontSize:'22px', color: isUp ? 'var(--bull)' : 'var(--bear)', marginBottom:'4px' }}>
                        {formatPrice(a.price)}
                      </div>
                      <div style={{ display:'flex', gap:'16px', flexWrap:'wrap' }}>
                        {[
                          { l:'24H', v:`${a.change >= 0 ? '+' : ''}${a.change.toFixed(2)}%`, c: isUp ? 'var(--bull)' : 'var(--bear)' },
                          { l:'SESSION', v:`${parseFloat(sessionChg) >= 0 ? '+' : ''}${sessionChg}%` },
                          { l:'VOLUME', v: a.volume },
                          { l:'MKT CAP', v: a.marketCap },
                        ].filter(x => x.v && x.v !== '—').map(({ l, v, c }) => (
                          <div key={l}>
                            <div style={{ fontFamily:'var(--font-mono)', fontSize:'8px', color:'var(--text-dim)', letterSpacing:'0.08em' }}>{l}</div>
                            <div style={{ fontFamily:'var(--font-mono)', fontSize:'12px', color: c || 'var(--text-secondary)' }}>{v}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Divergence insight */}
              {selectedAssets.length === 2 && (() => {
                const [a, b] = selectedAssets;
                const diff = Math.abs(a.change - b.change).toFixed(2);
                const leader = a.change > b.change ? a : b;
                const lagger = a.change > b.change ? b : a;
                return (
                  <div className="fade-up-4" style={s.insightCard}>
                    <span style={s.insightEye}>DIVERGENCE INSIGHT</span>
                    <span style={s.insightText}>
                      {leader.symbol} outperforming {lagger.symbol} by <strong style={{ color:'var(--accent)' }}>{diff}%</strong> over this session.
                      {Math.abs(parseFloat(diff)) > 3 ? ' High divergence — potential mean reversion opportunity.' : ' Within normal correlated range.'}
                    </span>
                  </div>
                );
              })()}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const s = {
  page: { padding:'24px 28px', maxWidth:'1700px', margin:'0 auto' },
  header: { marginBottom:'24px' },
  title: {
    fontFamily:'var(--font-display)', fontSize:'22px', fontWeight:700,
    color:'var(--text-primary)', letterSpacing:'0.04em',
  },
  sub: {
    fontFamily:'var(--font-body)', fontSize:'12px', color:'var(--text-secondary)', marginTop:'4px',
  },
  layout: {
    display:'grid', gridTemplateColumns:'260px 1fr', gap:'16px', alignItems:'start',
  },
  selector: {
    background:'var(--bg-card)', border:'1px solid var(--border-subtle)',
    borderRadius:'10px', overflow:'hidden',
  },
  selectorHeader: {
    display:'flex', justifyContent:'space-between', alignItems:'center',
    padding:'12px 14px', borderBottom:'1px solid var(--border-subtle)',
    background:'var(--bg-surface)',
  },
  selectorTitle: {
    fontFamily:'var(--font-display)', fontSize:'11px', fontWeight:600,
    color:'var(--text-primary)', letterSpacing:'0.05em',
  },
  chips: { display:'flex', flexDirection:'column', gap:'6px', padding:'10px 12px' },
  chip: {
    display:'flex', alignItems:'center', gap:'7px',
    border:'1px solid', borderRadius:'5px', padding:'6px 9px',
  },
  chipRemove: {
    background:'none', border:'none', color:'var(--text-dim)',
    cursor:'pointer', fontSize:'14px', marginLeft:'auto', lineHeight:1, padding:0,
  },
  search: {
    width:'100%', background:'var(--bg-surface)',
    border:'none', borderTop:'1px solid var(--border-subtle)',
    borderBottom:'1px solid var(--border-subtle)',
    color:'var(--text-primary)', fontFamily:'var(--font-mono)',
    fontSize:'11px', padding:'8px 12px', outline:'none',
  },
  assetList: { maxHeight:'320px', overflowY:'auto' },
  assetRow: {
    display:'flex', alignItems:'center', gap:'8px',
    padding:'8px 12px', cursor:'pointer', transition:'background 0.1s',
    borderBottom:'1px solid var(--border-subtle)',
  },
  chartArea: { display:'flex', flexDirection:'column', gap:'14px' },
  empty: {
    display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
    padding:'60px', gap:'10px',
    background:'var(--bg-card)', border:'1px solid var(--border-subtle)', borderRadius:'10px',
  },
  emptyIcon: { fontSize:'28px', color:'var(--text-dim)' },
  emptyText: { fontFamily:'var(--font-body)', fontSize:'13px', color:'var(--text-secondary)' },
  chartCard: {
    background:'var(--bg-card)', border:'1px solid var(--border-subtle)',
    borderRadius:'10px', padding:'20px',
  },
  chartCardHeader: { marginBottom:'16px' },
  chartCardTitle: {
    fontFamily:'var(--font-display)', fontSize:'13px', fontWeight:600,
    color:'var(--text-primary)', letterSpacing:'0.04em',
  },
  chartCardSub: {
    fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--text-dim)', marginTop:'3px',
  },
  statGrid: {
    display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px,1fr))', gap:'12px',
  },
  statCard: {
    background:'var(--bg-card)', border:'1px solid var(--border-subtle)',
    borderTop:'2px solid', borderRadius:'10px', padding:'16px',
  },
  insightCard: {
    display:'flex', gap:'12px', alignItems:'flex-start',
    background:'rgba(240,165,0,0.05)', border:'1px solid rgba(240,165,0,0.2)',
    borderRadius:'8px', padding:'14px 16px',
  },
  insightEye: {
    fontFamily:'var(--font-mono)', fontSize:'9px', color:'var(--accent)',
    letterSpacing:'0.12em', flexShrink:0, paddingTop:'1px',
  },
  insightText: {
    fontFamily:'var(--font-body)', fontSize:'12px', color:'var(--text-secondary)', lineHeight:1.5,
  },
};
