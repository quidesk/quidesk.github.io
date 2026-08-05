import React, { useState } from 'react'
import MarketCard from '../components/MarketCard'
import DetailChart from '../components/DetailChart'
import { formatPrice, formatChange, CATEGORY_META } from '../data/markets'

export default function MarketPage({ category, assets, watchlistProps }) {
  const [selectedAsset, setSelectedAsset] = useState(null)
  const [sortKey, setSortKey] = useState('default')
  const meta = CATEGORY_META[category]

  const sorted = [...assets].sort((a, b) => {
    if (sortKey === 'price-asc') return a.price - b.price
    if (sortKey === 'price-desc') return b.price - a.price
    if (sortKey === 'change-asc') return a.change - b.change
    if (sortKey === 'change-desc') return b.change - a.change
    return 0
  })

  return (
    <div style={styles.container}>
      {/* Page header */}
      <div style={styles.pageHeader}>
        <div>
          <div style={styles.categoryBadge}>
            <span style={{ color: meta.color }}>{meta.icon}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-dim)', letterSpacing: '2px' }}>
              MARKET
            </span>
          </div>
          <h1 style={{ ...styles.pageTitle, color: meta.color, textShadow: `0 0 20px ${meta.glow}` }}>
            {meta.label}
          </h1>
          <p style={styles.pageSub}>{assets.length} instruments tracked</p>
        </div>

        {/* Sort controls */}
        <div style={styles.sortRow}>
          <span style={styles.sortLabel}>SORT:</span>
          {[
            { key: 'default', label: 'DEFAULT' },
            { key: 'price-desc', label: 'PRICE ↓' },
            { key: 'price-asc', label: 'PRICE ↑' },
            { key: 'change-desc', label: 'GAIN ↓' },
            { key: 'change-asc', label: 'LOSS ↓' },
          ].map(s => (
            <button
              key={s.key}
              style={{
                ...styles.sortBtn,
                ...(sortKey === s.key ? { ...styles.sortBtnActive, borderColor: meta.color, color: meta.color } : {})
              }}
              onClick={() => setSortKey(s.key)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats bar */}
      <div style={styles.statsBar}>
        {[
          { label: 'ADVANCING', value: assets.filter(a => a.change > 0).length, color: 'var(--bull)' },
          { label: 'DECLINING', value: assets.filter(a => a.change < 0).length, color: 'var(--bear)' },
          {
            label: 'AVG CHANGE',
            value: `${(assets.reduce((s, a) => s + a.change, 0) / assets.length).toFixed(2)}%`,
            color: assets.reduce((s, a) => s + a.change, 0) >= 0 ? 'var(--bull)' : 'var(--bear)'
          },
          {
            label: 'TOP GAINER',
            value: `${[...assets].sort((a, b) => b.change - a.change)[0]?.symbol} +${Math.max(...assets.map(a => a.change)).toFixed(2)}%`,
            color: 'var(--bull)'
          },
          {
            label: 'TOP LOSER',
            value: `${[...assets].sort((a, b) => a.change - b.change)[0]?.symbol} ${Math.min(...assets.map(a => a.change)).toFixed(2)}%`,
            color: 'var(--bear)'
          },
        ].map(({ label, value, color }) => (
          <div key={label} style={styles.statItem}>
            <div style={styles.statLabel}>{label}</div>
            <div style={{ ...styles.statValue, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Detail chart */}
      {selectedAsset && (
        <div style={styles.detailWrap}>
          <div style={styles.detailClose}>
            <button style={styles.closeBtn} onClick={() => setSelectedAsset(null)}>
              ✕ CLOSE CHART
            </button>
          </div>
          <DetailChart asset={selectedAsset} />
        </div>
      )}

      {/* Cards grid */}
      <div style={styles.grid}>
        {sorted.map(asset => (
          <MarketCard
            key={asset.id}
            asset={asset}
            onClick={setSelectedAsset}
          />
        ))}
      </div>

      {/* Table view */}
      <div style={styles.tableSection}>
        <div style={styles.tableTitle}>DETAILED VIEW</div>
        <div style={styles.table}>
          <div style={styles.tableHead}>
            {['SYMBOL', 'NAME', 'PRICE', '24H CHANGE', 'VOLUME', 'MKT CAP'].map(col => (
              <div key={col} style={styles.th}>{col}</div>
            ))}
          </div>
          {sorted.map(asset => (
            <div
              key={asset.id}
              style={styles.tableRow}
              onClick={() => setSelectedAsset(asset)}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={styles.tdSymbol}>{asset.symbol}</div>
              <div style={styles.td}>{asset.name}</div>
              <div style={{ ...styles.td, fontFamily: 'var(--font-mono)' }}>{formatPrice(asset.price)}</div>
              <div style={{
                ...styles.td,
                fontFamily: 'var(--font-mono)',
                color: asset.change >= 0 ? 'var(--bull)' : 'var(--bear)',
              }}>
                {asset.change >= 0 ? '▲' : '▼'} {Math.abs(asset.change).toFixed(2)}%
              </div>
              <div style={{ ...styles.td, color: 'var(--text-secondary)' }}>{asset.volume}</div>
              <div style={{ ...styles.td, color: 'var(--text-secondary)' }}>{asset.marketCap}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const styles = {
  container: {
    padding: '32px 24px',
    maxWidth: '1600px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '32px',
  },
  pageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
    gap: '20px',
  },
  categoryBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '4px',
  },
  pageTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '32px',
    fontWeight: 900,
    letterSpacing: '4px',
  },
  pageSub: {
    fontFamily: 'var(--font-mono)',
    fontSize: '11px',
    color: 'var(--text-dim)',
    marginTop: '4px',
    letterSpacing: '1px',
  },
  sortRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexWrap: 'wrap',
  },
  sortLabel: {
    fontFamily: 'var(--font-display)',
    fontSize: '9px',
    color: 'var(--text-dim)',
    letterSpacing: '2px',
  },
  sortBtn: {
    background: 'none',
    border: '1px solid var(--border-subtle)',
    borderRadius: '3px',
    color: 'var(--text-dim)',
    fontFamily: 'var(--font-display)',
    fontSize: '9px',
    letterSpacing: '0.5px',
    padding: '4px 10px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  sortBtnActive: {
    background: 'rgba(0,245,255,0.08)',
  },
  statsBar: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '1px',
    background: 'var(--border-subtle)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  statItem: {
    background: 'var(--bg-card)',
    padding: '14px 16px',
  },
  statLabel: {
    fontFamily: 'var(--font-display)',
    fontSize: '8px',
    color: 'var(--text-dim)',
    letterSpacing: '1.5px',
    marginBottom: '4px',
  },
  statValue: {
    fontFamily: 'var(--font-mono)',
    fontSize: '13px',
  },
  detailWrap: {
    animation: 'fadeInUp 0.3s ease',
  },
  detailClose: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginBottom: '8px',
  },
  closeBtn: {
    background: 'none',
    border: '1px solid var(--border-subtle)',
    borderRadius: '3px',
    color: 'var(--text-dim)',
    fontFamily: 'var(--font-display)',
    fontSize: '10px',
    letterSpacing: '1px',
    padding: '4px 10px',
    cursor: 'pointer',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '14px',
  },
  tableSection: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  tableTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '10px',
    color: 'var(--text-dim)',
    letterSpacing: '2px',
    padding: '12px 16px',
    borderBottom: '1px solid var(--border-subtle)',
    background: 'var(--bg-panel)',
  },
  table: {
    width: '100%',
    overflowX: 'auto',
  },
  tableHead: {
    display: 'grid',
    gridTemplateColumns: '120px 1fr 130px 130px 100px 120px',
    padding: '8px 16px',
    background: 'var(--bg-panel)',
    borderBottom: '1px solid var(--border-subtle)',
  },
  th: {
    fontFamily: 'var(--font-display)',
    fontSize: '8px',
    color: 'var(--text-dim)',
    letterSpacing: '1.5px',
  },
  tableRow: {
    display: 'grid',
    gridTemplateColumns: '120px 1fr 130px 130px 100px 120px',
    padding: '10px 16px',
    borderBottom: '1px solid var(--border-subtle)',
    cursor: 'pointer',
    transition: 'background 0.15s ease',
    alignItems: 'center',
  },
  tdSymbol: {
    fontFamily: 'var(--font-display)',
    fontSize: '12px',
    color: 'var(--neon-cyan)',
    letterSpacing: '0.5px',
  },
  td: {
    fontFamily: 'var(--font-body)',
    fontSize: '13px',
    color: 'var(--text-primary)',
  },
}
