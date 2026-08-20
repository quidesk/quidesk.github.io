import React, { useState } from 'react'
import { TrendingUp, TrendingDown, Activity, Zap } from 'lucide-react'
import MarketCard from '../components/MarketCard'
import DetailChart from '../components/DetailChart'
import { formatPrice, formatChange, CATEGORY_META } from '../data/markets'

export default function Dashboard({ data, setActiveTab, watchlistProps }) {
  const [selectedAsset, setSelectedAsset] = useState(null)

  const allAssets = [
    ...data.stocks,
    ...data.crypto,
    ...data.commodities,
  ]

  const gainers = [...allAssets].sort((a, b) => b.change - a.change).slice(0, 3)
  const losers = [...allAssets].sort((a, b) => a.change - b.change).slice(0, 3)

  const overallSentiment = allAssets.filter(a => a.change > 0).length / allAssets.length

  return (
    <div style={styles.container}>
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
                  ? 'linear-gradient(90deg, var(--neon-green), var(--neon-cyan))'
                  : 'linear-gradient(90deg, var(--bear), var(--neon-pink))',
              }}
            />
          </div>
          <div style={styles.sentimentValue}>
            {overallSentiment > 0.6 ? '⬆ BULLISH' : overallSentiment < 0.4 ? '⬇ BEARISH' : '↔ NEUTRAL'}
          </div>
        </div>
      </div>

      {/* Movers */}
      <div style={styles.moversRow}>
        <div style={styles.moverPanel}>
          <div style={styles.moverHeader}>
            <TrendingUp size={14} color="var(--bull)" />
            <span style={{ ...styles.moverTitle, color: 'var(--bull)' }}>TOP GAINERS</span>
          </div>
          {gainers.map(a => (
            <div key={a.id} style={styles.moverRow} onClick={() => setSelectedAsset(a)}>
              <span style={styles.moverSymbol}>{a.symbol}</span>
              <span style={styles.moverPrice}>{formatPrice(a.price)}</span>
              <span style={{ ...styles.moverChange, color: 'var(--bull)' }}>
                +{a.change.toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
        <div style={styles.moverPanel}>
          <div style={styles.moverHeader}>
            <TrendingDown size={14} color="var(--bear)" />
            <span style={{ ...styles.moverTitle, color: 'var(--bear)' }}>TOP LOSERS</span>
          </div>
          {losers.map(a => (
            <div key={a.id} style={styles.moverRow} onClick={() => setSelectedAsset(a)}>
              <span style={styles.moverSymbol}>{a.symbol}</span>
              <span style={styles.moverPrice}>{formatPrice(a.price)}</span>
              <span style={{ ...styles.moverChange, color: 'var(--bear)' }}>
                {a.change.toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
        <div style={styles.moverPanel}>
          <div style={styles.moverHeader}>
            <Activity size={14} color="var(--neon-cyan)" />
            <span style={{ ...styles.moverTitle, color: 'var(--neon-cyan)' }}>MARKET OVERVIEW</span>
          </div>
          {[
            { label: 'TOTAL ASSETS', value: allAssets.length },
            { label: 'ADVANCING', value: allAssets.filter(a => a.change > 0).length, color: 'var(--bull)' },
            { label: 'DECLINING', value: allAssets.filter(a => a.change < 0).length, color: 'var(--bear)' },
            { label: 'CATEGORIES', value: '3 ACTIVE' },
          ].map(({ label, value, color }) => (
            <div key={label} style={styles.overviewRow}>
              <span style={styles.overviewLabel}>{label}</span>
              <span style={{ ...styles.overviewVal, color: color || 'var(--text-primary)' }}>{value}</span>
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
        { key: 'stocks', assets: data.stocks },
        { key: 'crypto', assets: data.crypto },
        { key: 'commodities', assets: data.commodities },
      ].map(({ key, assets }) => {
        const meta = CATEGORY_META[key]
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
                onClick={() => setActiveTab(key === 'commodities' ? 'commodities' : key)}
              >
                VIEW ALL →
              </button>
            </div>
            <div style={styles.grid}>
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
    padding: '32px 24px',
    maxWidth: '1600px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '40px',
  },
  heroHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '20px',
  },
  heroTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '28px',
    fontWeight: 900,
    letterSpacing: '3px',
    color: 'var(--text-primary)',
    textShadow: '0 0 30px rgba(0,245,255,0.2)',
  },
  heroAccent: {
    color: 'var(--neon-cyan)',
    textShadow: '0 0 15px var(--neon-cyan-glow)',
  },
  heroSub: {
    fontFamily: 'var(--font-body)',
    fontSize: '14px',
    color: 'var(--text-secondary)',
    marginTop: '6px',
    letterSpacing: '0.5px',
  },
  sentimentBox: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-panel)',
    borderRadius: '8px',
    padding: '16px 20px',
    minWidth: '200px',
  },
  sentimentLabel: {
    fontFamily: 'var(--font-display)',
    fontSize: '9px',
    color: 'var(--text-dim)',
    letterSpacing: '2px',
    marginBottom: '8px',
  },
  sentimentBar: {
    height: '6px',
    background: 'var(--bg-void)',
    borderRadius: '3px',
    overflow: 'hidden',
    marginBottom: '8px',
  },
  sentimentFill: {
    height: '100%',
    borderRadius: '3px',
    transition: 'width 1s ease',
  },
  sentimentValue: {
    fontFamily: 'var(--font-display)',
    fontSize: '11px',
    color: 'var(--text-primary)',
    letterSpacing: '1px',
  },
  moversRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
  },
  moverPanel: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '8px',
    padding: '16px',
  },
  moverHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '12px',
    paddingBottom: '8px',
    borderBottom: '1px solid var(--border-subtle)',
  },
  moverTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '10px',
    letterSpacing: '1.5px',
  },
  moverRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '6px 0',
    cursor: 'pointer',
    borderBottom: '1px solid var(--border-subtle)',
    gap: '8px',
  },
  moverSymbol: {
    fontFamily: 'var(--font-display)',
    fontSize: '11px',
    color: 'var(--text-primary)',
    flex: 1,
    letterSpacing: '0.5px',
  },
  moverPrice: {
    fontFamily: 'var(--font-mono)',
    fontSize: '11px',
    color: 'var(--text-secondary)',
  },
  moverChange: {
    fontFamily: 'var(--font-mono)',
    fontSize: '11px',
    minWidth: '55px',
    textAlign: 'right',
  },
  overviewRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '6px 0',
    borderBottom: '1px solid var(--border-subtle)',
  },
  overviewLabel: {
    fontFamily: 'var(--font-display)',
    fontSize: '9px',
    color: 'var(--text-dim)',
    letterSpacing: '1px',
  },
  overviewVal: {
    fontFamily: 'var(--font-mono)',
    fontSize: '12px',
  },
  detailSection: {
    animation: 'fadeInUp 0.3s ease',
  },
  detailHeader: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginBottom: '8px',
  },
  detailClose: {
    fontFamily: 'var(--font-display)',
    fontSize: '10px',
    color: 'var(--text-dim)',
    letterSpacing: '1px',
    cursor: 'pointer',
    padding: '4px 8px',
    border: '1px solid var(--border-subtle)',
    borderRadius: '3px',
    transition: 'all 0.15s',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flex: 1,
  },
  sectionIcon: {
    fontSize: '18px',
  },
  sectionTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '14px',
    fontWeight: 700,
    letterSpacing: '3px',
    flexShrink: 0,
  },
  sectionLine: {
    height: '1px',
    opacity: 0.2,
    flex: 1,
  },
  viewAllBtn: {
    background: 'none',
    border: '1px solid',
    borderRadius: '3px',
    fontFamily: 'var(--font-display)',
    fontSize: '9px',
    letterSpacing: '1.5px',
    padding: '5px 12px',
    cursor: 'pointer',
    opacity: 0.7,
    transition: 'opacity 0.15s',
    flexShrink: 0,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '14px',
  },
}
