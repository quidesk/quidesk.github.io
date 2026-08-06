import React, { useState } from 'react'
import { TrendingUp, TrendingDown, Activity, Zap } from 'lucide-react'
import MarketCard from '../components/MarketCard'
import DetailChart from '../components/DetailChart'
import { formatPrice, formatChange, CATEGORY_META } from '../data/markets'

export default function Dashboard({ data, setActiveTab, watchlistProps }) {
  const [selectedAsset, setSelectedAsset] = useState(null)

  const allAssets = [
    ...(data?.stocks || []),
    ...(data?.crypto || []),
    ...(data?.commodities || []),
  ]

  const gainers = [...allAssets].sort((a, b) => b.change - a.change).slice(0, 3)
  const losers = [...allAssets].sort((a, b) => a.change - b.change).slice(0, 3)

  const overallSentiment = allAssets.length > 0 
    ? allAssets.filter(a => a.change > 0).length / allAssets.length 
    : 0.5

  return (
    <div className="dashboard-container" style={styles.container}>
      {/* Hero header */}
      <div style={styles.heroHeader}>
        <div>
          <h1 style={styles.heroTitle}>
            <span style={styles.heroAccent}>◈</span> MARKET INTELLIGENCE
          </h1>
          <p style={styles.heroSub}>
            Real-time tracking across equities, crypto & commodities
          </p>
        </div>
        <div style={styles.sentimentBox}>
          <div style={styles.sentimentLabel}>MARKET SENTIMENT</div>
          <div style={styles.sentimentBar}>
            <div
              style={{
                ...styles.sentimentFill,
                width: `${overallSentiment * 100}%`,
                background: overallSentiment > 0.5
                  ? 'linear-gradient(90deg, var(--neon-green, #10b981), var(--neon-cyan, #06b6d4))'
                  : 'linear-gradient(90deg, var(--bear, #f43f5e), var(--neon-pink, #ec4899))',
              }}
            />
          </div>
          <div style={styles.sentimentValue}>
            {overallSentiment > 0.6 ? '⬆ BULLISH' : overallSentiment < 0.4 ? '⬇ BEARISH' : '↔ NEUTRAL'}
          </div>
        </div>
      </div>

      {/* Movers Row - Responsive Auto-Fit Grid */}
      <div className="movers-row" style={styles.moversRow}>
        <div style={styles.moverPanel}>
          <div style={styles.moverHeader}>
            <TrendingUp size={14} color="var(--bull, #10b981)" />
            <span style={{ ...styles.moverTitle, color: 'var(--bull, #10b981)' }}>TOP GAINERS</span>
          </div>
          {gainers.map(a => (
            <div key={a.id} style={styles.moverRow} onClick={() => setSelectedAsset(a)}>
              <span style={styles.moverSymbol}>{a.symbol}</span>
              <span style={styles.moverPrice}>{formatPrice(a.price)}</span>
              <span style={{ ...styles.moverChange, color: 'var(--bull, #10b981)' }}>
                +{a.change.toFixed(2)}%
              </span>
            </div>
          ))}
        </div>

        <div style={styles.moverPanel}>
          <div style={styles.moverHeader}>
            <TrendingDown size={14} color="var(--bear, #f43f5e)" />
            <span style={{ ...styles.moverTitle, color: 'var(--bear, #f43f5e)' }}>TOP LOSERS</span>
          </div>
          {losers.map(a => (
            <div key={a.id} style={styles.moverRow} onClick={() => setSelectedAsset(a)}>
              <span style={styles.moverSymbol}>{a.symbol}</span>
              <span style={styles.moverPrice}>{formatPrice(a.price)}</span>
              <span style={{ ...styles.moverChange, color: 'var(--bear, #f43f5e)' }}>
                {a.change.toFixed(2)}%
              </span>
            </div>
          ))}
        </div>

        <div style={styles.moverPanel}>
          <div style={styles.moverHeader}>
            <Activity size={14} color="var(--neon-cyan, #06b6d4)" />
            <span style={{ ...styles.moverTitle, color: 'var(--neon-cyan, #06b6d4)' }}>MARKET OVERVIEW</span>
          </div>
          {[
            { label: 'TOTAL ASSETS', value: allAssets.length },
            { label: 'ADVANCING', value: allAssets.filter(a => a.change > 0).length, color: 'var(--bull, #10b981)' },
            { label: 'DECLINING', value: allAssets.filter(a => a.change < 0).length, color: 'var(--bear, #f43f5e)' },
            { label: 'CATEGORIES', value: '3 ACTIVE' },
          ].map(({ label, value, color }) => (
            <div key={label} style={styles.overviewRow}>
              <span style={styles.overviewLabel}>{label}</span>
              <span style={{ ...styles.overviewVal, color: color || 'var(--text-primary, #fff)' }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Selected detail chart */}
      {selectedAsset && (
        <div style={styles.detailSection}>
          <div style={styles.detailHeader}>
            <span style={styles.detailClose} onClick={() => setSelectedAsset(null)}>✕ CLOSE</span>
          </div>
          <DetailChart asset={selectedAsset} />
        </div>
      )}

      {/* Category sections */}
      {[
        { key: 'stocks', assets: data?.stocks || [] },
        { key: 'crypto', assets: data?.crypto || [] },
        { key: 'commodities', assets: data?.commodities || [] },
      ].map(({ key, assets }) => {
        const meta = CATEGORY_META?.[key] || { label: key.toUpperCase(), color: '#38bdf8', icon: '◈', glow: 'rgba(56,189,248,0.2)' }
        return (
          <section key={key} style={styles.section}>
            <div style={styles.sectionHeader}>
              <div style={styles.sectionTitleRow}>
                <span style={{ ...styles.sectionIcon, color: meta.color }}>{meta.icon}</span>
                <h2 style={{ ...styles.sectionTitle, color: meta.color, textShadow: `0 0 15px ${meta.glow}` }}>
                  {meta.label}
                </h2>
                <div style={{ ...styles.sectionLine, background: meta.color }} />
              </div>
              <button
                style={{ ...styles.viewAllBtn, color: meta.color, borderColor: meta.color }}
                onClick={() => setActiveTab(key)}
              >
                VIEW ALL →
              </button>
            </div>

            {/* Responsive Asset Cards Grid */}
            <div className="asset-category-grid" style={styles.grid}>
              {assets.slice(0, 4).map(asset => (
                <MarketCard
                  key={asset.id}
                  asset={asset}
                  onClick={setSelectedAsset}
                  isWatched={watchlistProps?.isWatched(asset.id)}
                  onToggleWatch={watchlistProps?.onToggleWatch}
                />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}

const styles = {
  container: {
    padding: '20px 16px', // Reduced padding for mobile & desktop
    maxWidth: '1600px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px', // REDUCED GAP: Tighter spacing between sections
  },
  heroHeader: {
    display: 'flex',
    justify: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '16px',
  },
  heroTitle: {
    fontFamily: 'var(--font-display, sans-serif)',
    fontSize: '24px',
    fontWeight: 900,
    letterSpacing: '2px',
    color: 'var(--text-primary, #fff)',
    textShadow: '0 0 30px rgba(0,245,255,0.2)',
    margin: 0,
  },
  heroAccent: {
    color: 'var(--neon-cyan, #06b6d4)',
    textShadow: '0 0 15px var(--neon-cyan-glow, rgba(6,182,212,0.4))',
  },
  heroSub: {
    fontFamily: 'var(--font-body, sans-serif)',
    fontSize: '13px',
    color: 'var(--text-secondary, #94a3b8)',
    marginTop: '4px',
    letterSpacing: '0.5px',
    margin: 0,
  },
  sentimentBox: {
    background: 'var(--bg-card, #11131a)',
    border: '1px solid var(--border-panel, rgba(255,255,255,0.08))',
    borderRadius: '8px',
    padding: '12px 16px',
    minWidth: '180px',
  },
  sentimentLabel: {
    fontFamily: 'var(--font-display, sans-serif)',
    fontSize: '9px',
    color: 'var(--text-dim, #64748b)',
    letterSpacing: '2px',
    marginBottom: '6px',
  },
  sentimentBar: {
    height: '6px',
    background: 'var(--bg-void, #090a0f)',
    borderRadius: '3px',
    overflow: 'hidden',
    marginBottom: '6px',
  },
  sentimentFill: {
    height: '100%',
    borderRadius: '3px',
    transition: 'width 1s ease',
  },
  sentimentValue: {
    fontFamily: 'var(--font-display, sans-serif)',
    fontSize: '11px',
    color: 'var(--text-primary, #fff)',
    letterSpacing: '1px',
  },
  moversRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', // Auto-stacks nicely on mobile
    gap: '12px', // Tighter gap between panels
  },
  moverPanel: {
    background: 'var(--bg-card, #11131a)',
    border: '1px solid var(--border-subtle, rgba(255,255,255,0.05))',
    borderRadius: '8px',
    padding: '14px',
  },
  moverHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '10px',
    paddingBottom: '6px',
    borderBottom: '1px solid var(--border-subtle, rgba(255,255,255,0.05))',
  },
  moverTitle: {
    fontFamily: 'var(--font-display, sans-serif)',
    fontSize: '10px',
    letterSpacing: '1.5px',
    fontWeight: 700,
  },
  moverRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '6px 0',
    cursor: 'pointer',
    borderBottom: '1px solid var(--border-subtle, rgba(255,255,255,0.03))',
    gap: '8px',
  },
  moverSymbol: {
    fontFamily: 'var(--font-display, sans-serif)',
    fontSize: '11px',
    color: 'var(--text-primary, #fff)',
    flex: 1,
    letterSpacing: '0.5px',
  },
  moverPrice: {
    fontFamily: 'var(--font-mono, monospace)',
    fontSize: '11px',
    color: 'var(--text-secondary, #94a3b8)',
  },
  moverChange: {
    fontFamily: 'var(--font-mono, monospace)',
    fontSize: '11px',
    minWidth: '55px',
    textAlign: 'right',
  },
  overviewRow: {
    display: 'flex',
    justify: 'space-between',
    padding: '6px 0',
    borderBottom: '1px solid var(--border-subtle, rgba(255,255,255,0.03))',
  },
  overviewLabel: {
    fontFamily: 'var(--font-display, sans-serif)',
    fontSize: '9px',
    color: 'var(--text-dim, #64748b)',
    letterSpacing: '1px',
  },
  overviewVal: {
    fontFamily: 'var(--font-mono, monospace)',
    fontSize: '12px',
  },
  detailSection: {
    animation: 'fadeInUp 0.3s ease',
  },
  detailHeader: {
    display: 'flex',
    justify: 'flex-end',
    marginBottom: '8px',
  },
  detailClose: {
    fontFamily: 'var(--font-display, sans-serif)',
    fontSize: '10px',
    color: 'var(--text-dim, #64748b)',
    letterSpacing: '1px',
    cursor: 'pointer',
    padding: '4px 8px',
    border: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
    borderRadius: '3px',
    transition: 'all 0.15s',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px', // Tightened space between section title and card grid
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justify: 'space-between',
  },
  sectionTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flex: 1,
  },
  sectionIcon: {
    fontSize: '16px',
  },
  sectionTitle: {
    fontFamily: 'var(--font-display, sans-serif)',
    fontSize: '13px',
    fontWeight: 700,
    letterSpacing: '2px',
    flexShrink: 0,
    margin: 0,
  },
  sectionLine: {
    height: '1px',
    opacity: 0.15,
    flex: 1,
  },
  viewAllBtn: {
    background: 'none',
    border: '1px solid',
    borderRadius: '3px',
    fontFamily: 'var(--font-display, sans-serif)',
    fontSize: '9px',
    letterSpacing: '1.5px',
    padding: '4px 10px',
    cursor: 'pointer',
    opacity: 0.8,
    transition: 'opacity 0.15s',
    flexShrink: 0,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', // Fits mobile screens smoothly
    gap: '12px', // Tighter spacing between individual asset cards
  },
}