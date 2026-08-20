import React, { useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { Plus, Trash2 } from 'lucide-react'
import { formatPrice, SECTOR_META } from '../data/markets'

const SLICE_COLORS = ['#f0a500','#4d9eff','#22d47a','#a78bfa','#f97316','#e2e8f0','#f04060','#64748b']

const TipStyle = {
  background:'var(--bg-panel)', border:'1px solid var(--border-mid)',
  borderRadius:'6px', fontFamily:'var(--font-mono)', fontSize:'11px',
  boxShadow:'0 8px 32px rgba(0,0,0,0.5)',
}

export default function PortfolioPage({ portfolio, allAssets }) {
  const { holdings, totalValue, totalCost, totalPnl, totalPnlPct, addHolding, removeHolding } = portfolio
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ assetId:'', qty:'', avgCost:'' })
  const [formError, setFormError] = useState('')

  const knownAssets = allAssets || []

  const pieData = holdings.map((h,i) => ({
    name: h.symbol, value: parseFloat(h.currentValue.toFixed(2)),
    color: SLICE_COLORS[i % SLICE_COLORS.length],
  }))

  const barData = holdings.map((h,i) => ({
    symbol: h.symbol, pnl: parseFloat(h.pnl.toFixed(2)),
    fill: h.pnl >= 0 ? '#22d47a' : '#f04060',
  }))

  const handleAdd = () => {
    setFormError('')
    const asset = knownAssets.find(a => a.id === form.assetId)
    if (!asset)                                            return setFormError('Select a valid asset')
    if (!form.qty   || isNaN(form.qty)   || +form.qty   <= 0) return setFormError('Enter a valid quantity')
    if (!form.avgCost || isNaN(form.avgCost) || +form.avgCost <= 0) return setFormError('Enter a valid avg cost')
    addHolding({ id:asset.id, symbol:asset.symbol, name:asset.name, qty:+form.qty, avgCost:+form.avgCost, sector:asset.sector })
    setForm({ assetId:'', qty:'', avgCost:'' })
    setShowForm(false)
  }

  const sectorGroups = {}
  holdings.forEach(h => {
    const s = h.sector || 'other'
    if (!sectorGroups[s]) sectorGroups[s] = 0
    sectorGroups[s] += h.currentValue
  })

  return (
    <div style={s.page} className='page-wrap'>

      {/* Header */}
      <div className="fade-up" style={s.header}>
        <div>
          <h1 style={s.title}>Portfolio</h1>
          <p style={s.sub}>Live P&L across all positions</p>
        </div>
        <button style={s.addBtn} onClick={() => setShowForm(v => !v)}>
          <Plus size={14}/> Add Position
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="fade-up" style={s.addForm}>
          <div style={s.addFormTitle}>NEW POSITION</div>
          <div style={s.formRow}>
            <div style={s.field}>
              <label style={s.fieldLabel}>ASSET</label>
              <select style={s.select} value={form.assetId} onChange={e => setForm(f=>({...f,assetId:e.target.value}))}>
                <option value="">Select...</option>
                {Object.entries(SECTOR_META).map(([sec, meta]) => (
                  <optgroup key={sec} label={meta.label}>
                    {knownAssets.filter(a => a.sector===sec).map(a => (
                      <option key={a.id} value={a.id}>{a.symbol} — {a.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div style={s.field}>
              <label style={s.fieldLabel}>QUANTITY</label>
              <input style={s.input} type="number" placeholder="0.00" value={form.qty} onChange={e=>setForm(f=>({...f,qty:e.target.value}))}/>
            </div>
            <div style={s.field}>
              <label style={s.fieldLabel}>AVG COST (USD)</label>
              <input style={s.input} type="number" placeholder="0.00" value={form.avgCost} onChange={e=>setForm(f=>({...f,avgCost:e.target.value}))}/>
            </div>
            <button style={s.confirmBtn} onClick={handleAdd}>Confirm</button>
          </div>
          {formError && <div style={s.formError}>{formError}</div>}
        </div>
      )}

      {/* Summary strip */}
      <div className="fade-up-1" style={s.summaryStrip}>
        {[
          { l:'TOTAL VALUE',   v:`$${totalValue.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`,  c:'var(--text-primary)', large:true },
          { l:'TOTAL COST',    v:`$${totalCost.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`,   c:'var(--text-secondary)' },
          { l:'UNREALIZED P&L',v:`${totalPnl>=0?'+':''}$${Math.abs(totalPnl).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`, c:totalPnl>=0?'var(--bull)':'var(--bear)', large:true },
          { l:'TOTAL RETURN',  v:`${totalPnlPct>=0?'+':''}${totalPnlPct.toFixed(2)}%`, c:totalPnlPct>=0?'var(--bull)':'var(--bear)' },
          { l:'POSITIONS',     v:holdings.length,                                        c:'var(--text-primary)' },
        ].map(({ l, v, c, large }) => (
          <div key={l} style={s.summaryCard}>
            <div style={s.summaryLabel}>{l}</div>
            <div style={{ ...s.summaryValue, color:c, fontSize: large?'20px':'16px' }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="fade-up-2" style={s.chartsRow}>

        {/* Allocation pie */}
        <div style={s.chartCard}>
          <div style={s.chartTitle}>Allocation</div>
          <div style={{ height:220, position:'relative' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={58} outerRadius={90}
                  paddingAngle={3} dataKey="value">
                  {pieData.map((e,i) => (
                    <Cell key={i} fill={e.color} stroke="var(--bg-card)" strokeWidth={2}/>
                  ))}
                </Pie>
                <Tooltip contentStyle={TipStyle} formatter={v=>[`$${v.toLocaleString()}`,'Value']}/>
              </PieChart>
            </ResponsiveContainer>
            <div style={s.pieCenter}>
              <div style={s.pieCenterVal}>${(totalValue/1000).toFixed(1)}K</div>
              <div style={s.pieCenterLabel}>TOTAL</div>
            </div>
          </div>
          <div style={s.pieLegend}>
            {pieData.map((d,i) => (
              <div key={i} style={s.pieLegendRow}>
                <span style={{ width:'8px', height:'8px', borderRadius:'50%', background:d.color, display:'inline-block', flexShrink:0 }}/>
                <span style={{ fontFamily:'var(--font-display)', fontSize:'9px', color:'var(--text-secondary)', flex:1, letterSpacing:'0.04em' }}>{d.name}</span>
                <span style={{ fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--text-dim)' }}>
                  {totalValue > 0 ? ((d.value/totalValue)*100).toFixed(1) : '0'}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* P&L bar chart */}
        <div style={{ ...s.chartCard, flex:2 }}>
          <div style={s.chartTitle}>Unrealized P&L by Position</div>
          <div style={{ height:260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{top:8,right:8,left:0,bottom:0}}>
                <CartesianGrid stroke="rgba(255,255,255,0.03)" strokeDasharray="4 4" vertical={false}/>
                <XAxis dataKey="symbol"
                  tick={{ fill:'var(--text-dim)', fontSize:10, fontFamily:'var(--font-mono)' }}
                  axisLine={{ stroke:'var(--border-subtle)' }} tickLine={false}
                />
                <YAxis
                  tick={{ fill:'var(--text-dim)', fontSize:9, fontFamily:'var(--font-mono)' }}
                  axisLine={false} tickLine={false}
                  tickFormatter={v=>`${v>=0?'+':''}$${Math.abs(v).toFixed(0)}`} width={68}
                />
                <Tooltip contentStyle={TipStyle} formatter={v=>[`${v>=0?'+':''}$${v.toFixed(2)}`,'P&L']}/>
                <Bar dataKey="pnl" radius={[3,3,0,0]}>
                  {barData.map((e,i) => <Cell key={i} fill={e.fill}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sector breakdown */}
        <div style={s.chartCard}>
          <div style={s.chartTitle}>By Sector</div>
          {Object.entries(sectorGroups).map(([sec, val]) => {
            const meta = SECTOR_META[sec] || { label: sec, color:'var(--text-secondary)' }
            const pct = totalValue > 0 ? (val/totalValue)*100 : 0
            return (
              <div key={sec} style={s.sectorRow}>
                <div style={s.sectorRowTop}>
                  <span style={{ fontFamily:'var(--font-display)', fontSize:'10px', color:meta.color, letterSpacing:'0.04em' }}>{meta.label}</span>
                  <span style={{ fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--text-secondary)' }}>{pct.toFixed(1)}%</span>
                </div>
                <div style={s.sectorBar}>
                  <div style={{ ...s.sectorBarFill, width:`${pct}%`, background:meta.color }}/>
                </div>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--text-dim)' }}>
                  ${val.toLocaleString('en-US',{maximumFractionDigits:0})}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Holdings table */}
      <div className="fade-up-3" style={s.tableWrap}>
        <div style={s.tableHeader}>Holdings Detail</div>
        <div style={{ overflowX:'auto' }} className='table-scroll'>
          <table style={{ width:'100%', borderCollapse:'collapse', minWidth:'820px' }}>
            <thead>
              <tr>
                {['Asset','Sector','Qty','Avg Cost','Current Price','24H','Value','P&L','Return',''].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {holdings.map((h,i) => {
                const meta = SECTOR_META[h.sector] || {}
                return (
                  <tr key={h.id}
                    onMouseEnter={e => e.currentTarget.style.background='var(--bg-card-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background='transparent'}
                    style={{ transition:'background 0.1s' }}
                  >
                    <td style={s.td}>
                      <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                        <span style={{ width:'8px', height:'8px', borderRadius:'50%', background:SLICE_COLORS[i%SLICE_COLORS.length], display:'inline-block', flexShrink:0 }}/>
                        <span style={{ fontFamily:'var(--font-mono)', fontSize:'12px', fontWeight:500, color:meta.color||'var(--text-primary)' }}>{h.symbol}</span>
                      </div>
                    </td>
                    <td style={s.td}>
                      <span style={{ fontFamily:'var(--font-mono)', fontSize:'9px', color:meta.color, background:`${meta.color||'#fff'}15`, border:`1px solid ${meta.color||'#fff'}30`, borderRadius:'3px', padding:'1px 6px' }}>
                        {meta.label || h.sector}
                      </span>
                    </td>
                    <td style={{ ...s.td, fontFamily:'var(--font-mono)' }}>{h.qty}</td>
                    <td style={{ ...s.td, fontFamily:'var(--font-mono)' }}>{formatPrice(h.avgCost)}</td>
                    <td style={{ ...s.td, fontFamily:'var(--font-mono)' }}>{formatPrice(h.currentPrice)}</td>
                    <td style={{ ...s.td, fontFamily:'var(--font-mono)', color:h.change24h>=0?'var(--bull)':'var(--bear)' }}>
                      {h.change24h>=0?'+':''}{h.change24h.toFixed(2)}%
                    </td>
                    <td style={{ ...s.td, fontFamily:'var(--font-mono)', fontWeight:500, color:'var(--text-primary)' }}>
                      ${h.currentValue.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}
                    </td>
                    <td style={{ ...s.td, fontFamily:'var(--font-mono)', color:h.pnl>=0?'var(--bull)':'var(--bear)' }}>
                      {h.pnl>=0?'+':''}${h.pnl.toFixed(2)}
                    </td>
                    <td style={{ ...s.td, fontFamily:'var(--font-mono)', color:h.pnlPct>=0?'var(--bull)':'var(--bear)' }}>
                      {h.pnlPct>=0?'▲':'▼'} {Math.abs(h.pnlPct).toFixed(2)}%
                    </td>
                    <td style={s.td}>
                      <button style={s.removeBtn} onClick={() => removeHolding(h.id)}>
                        <Trash2 size={11}/>
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}

const s = {
  page: { padding:'24px 28px', maxWidth:'1700px', margin:'0 auto', display:'flex', flexDirection:'column', gap:'20px' },
  header: { display:'flex', justifyContent:'space-between', alignItems:'center' },
  title: { fontFamily:'var(--font-display)', fontSize:'22px', fontWeight:700, color:'var(--text-primary)', letterSpacing:'0.04em' },
  sub: { fontFamily:'var(--font-body)', fontSize:'12px', color:'var(--text-secondary)', marginTop:'3px' },
  addBtn: {
    display:'flex', alignItems:'center', gap:'6px',
    background:'rgba(34,212,122,0.08)', border:'1px solid rgba(34,212,122,0.25)',
    borderRadius:'6px', color:'var(--bull)', fontFamily:'var(--font-body)',
    fontSize:'12px', fontWeight:500, padding:'8px 16px', cursor:'pointer',
  },
  addForm: {
    background:'var(--bg-card)', border:'1px solid var(--border-mid)',
    borderRadius:'10px', padding:'18px',
  },
  addFormTitle: { fontFamily:'var(--font-mono)', fontSize:'9px', color:'var(--text-dim)', letterSpacing:'0.14em', marginBottom:'12px' },
  formRow: { display:'flex', gap:'10px', flexWrap:'wrap', alignItems:'flex-end' },
  field: { display:'flex', flexDirection:'column', gap:'5px', flex:'1 1 140px' },
  fieldLabel: { fontFamily:'var(--font-mono)', fontSize:'8px', color:'var(--text-dim)', letterSpacing:'0.12em' },
  select: {
    background:'var(--bg-panel)', border:'1px solid var(--border-mid)', borderRadius:'5px',
    color:'var(--text-primary)', fontFamily:'var(--font-mono)', fontSize:'12px',
    padding:'8px 10px', outline:'none',
  },
  input: {
    background:'var(--bg-panel)', border:'1px solid var(--border-mid)', borderRadius:'5px',
    color:'var(--text-primary)', fontFamily:'var(--font-mono)', fontSize:'14px',
    padding:'8px 10px', outline:'none',
  },
  confirmBtn: {
    background:'var(--accent-dim)', border:'1px solid var(--border-accent)', borderRadius:'5px',
    color:'var(--accent)', fontFamily:'var(--font-display)', fontSize:'11px', fontWeight:600,
    letterSpacing:'0.05em', padding:'8px 20px', cursor:'pointer', alignSelf:'flex-end', flexShrink:0,
  },
  formError: { fontFamily:'var(--font-mono)', fontSize:'11px', color:'var(--bear)', marginTop:'8px' },
  summaryStrip: {
    display:'grid', gridTemplateColumns:'repeat(5,1fr)',
    gap:'1px', background:'var(--border-subtle)',
    border:'1px solid var(--border-subtle)', borderRadius:'10px', overflow:'hidden',
  },
  summaryCard: { background:'var(--bg-card)', padding:'14px 18px' },
  summaryLabel: { fontFamily:'var(--font-mono)', fontSize:'8px', color:'var(--text-dim)', letterSpacing:'0.12em', marginBottom:'5px' },
  summaryValue: { fontFamily:'var(--font-mono)', fontWeight:500 },
  chartsRow: { display:'flex', gap:'14px', flexWrap:'wrap', alignItems:'stretch' },
  chartCard: {
    flex:1, minWidth:'220px', background:'var(--bg-card)',
    border:'1px solid var(--border-subtle)', borderRadius:'10px', padding:'18px',
    position:'relative',
  },
  chartTitle: { fontFamily:'var(--font-display)', fontSize:'11px', fontWeight:600, color:'var(--text-primary)', letterSpacing:'0.05em', marginBottom:'14px' },
  pieCenter: {
    position:'absolute', top:'50%', left:'50%',
    transform:'translate(-50%,-16%)', textAlign:'center', pointerEvents:'none',
  },
  pieCenterVal: { fontFamily:'var(--font-mono)', fontSize:'17px', color:'var(--text-primary)', fontWeight:500 },
  pieCenterLabel: { fontFamily:'var(--font-mono)', fontSize:'8px', color:'var(--text-dim)', letterSpacing:'0.12em' },
  pieLegend: { display:'flex', flexDirection:'column', gap:'6px', marginTop:'10px' },
  pieLegendRow: { display:'flex', alignItems:'center', gap:'7px' },
  sectorRow: { marginBottom:'14px' },
  sectorRowTop: { display:'flex', justifyContent:'space-between', marginBottom:'5px' },
  sectorBar: { height:'4px', background:'var(--border-subtle)', borderRadius:'2px', overflow:'hidden', marginBottom:'3px' },
  sectorBarFill: { height:'100%', borderRadius:'2px', transition:'width 0.8s ease' },
  tableWrap: { background:'var(--bg-card)', border:'1px solid var(--border-subtle)', borderRadius:'10px', overflow:'hidden' },
  tableHeader: { fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--text-dim)', letterSpacing:'0.12em', padding:'12px 16px', borderBottom:'1px solid var(--border-subtle)', background:'var(--bg-surface)' },
  th: { fontFamily:'var(--font-mono)', fontSize:'8px', color:'var(--text-dim)', letterSpacing:'0.1em', padding:'9px 14px', textAlign:'left', borderBottom:'1px solid var(--border-subtle)', background:'var(--bg-surface)', fontWeight:400, whiteSpace:'nowrap' },
  td: { fontFamily:'var(--font-body)', fontSize:'13px', color:'var(--text-primary)', padding:'10px 14px', borderBottom:'1px solid var(--border-subtle)', whiteSpace:'nowrap' },
  removeBtn: { background:'none', border:'1px solid var(--border-subtle)', borderRadius:'3px', color:'var(--text-dim)', cursor:'pointer', padding:'4px 6px', display:'flex', alignItems:'center', transition:'all 0.12s' },
}
