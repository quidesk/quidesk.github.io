import React, { useState, useEffect } from 'react'
import { Star } from 'lucide-react'
import { formatPrice, formatChange } from '../data/markets'
import MiniChart from './MiniChart'

export default function MarketCard({ asset, onClick, isWatched, onToggleWatch }) {
  const isPositive = asset.change >= 0
  const [flash, setFlash] = useState(null)
  const [prevPrice, setPrevPrice] = useState(asset.price)

  useEffect(() => {
    if (asset.price !== prevPrice) {
      setFlash(asset.price > prevPrice ? 'up' : 'down')
      setPrevPrice(asset.price)
      const t = setTimeout(() => setFlash(null), 400)
      return () => clearTimeout(t)
    }
  }, [asset.price])

  const flashColor = flash === 'up'
    ? 'rgba(0,255,157,0.15)'
    : flash === 'down'
    ? 'rgba(255,45,107,0.15)'
    : 'transparent'

  return (
    <div
      style={{
        ...styles.card,
        background: flash ? flashColor : styles.card.background,
        transition: 'background 0.3s ease, border-color 0.3s ease',
      }}
      onClick={() => onClick && onClick(asset)}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'var(--border-glow)'
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,245,255,0.1)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--border-subtle)'
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      {/* Header */}
      <div style={styles.header}>
        <div>
          <div style={styles.symbol}>{asset.symbol}</div>
          <div style={styles.name}>{asset.name}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {onToggleWatch && (
            <button
              style={styles.starBtn}
              onClick={e => { e.stopPropagation(); onToggleWatch(asset.id) }}
              title={isWatched ? 'Remove from watchlist' : 'Add to watchlist'}
            >
              <Star
                size={13}
                color={isWatched ? 'var(--neon-yellow)' : 'var(--text-dim)'}
                fill={isWatched ? 'var(--neon-yellow)' : 'none'}
              />
            </button>
          )}
        <div style={{
          ...styles.badge,
          color: isPositive ? 'var(--bull)' : 'var(--bear)',
          background: isPositive ? 'var(--neon-green-dim)' : 'var(--neon-pink-dim)',
          borderColor: isPositive ? 'var(--bull)' : 'var(--bear)',
        }}>
          {isPositive ? '▲' : '▼'} {formatChange(asset.change)}
        </div>
        </div>
      </div>

      {/* Price */}
      <div style={styles.price}>
        {formatPrice(asset.price, asset.symbol)}
        {asset.unit && <span style={styles.unit}>/{asset.unit}</span>}
      </div>

      {/* Mini chart */}
      <div style={styles.chartWrap}>
        <MiniChart data={asset.chartData} positive={isPositive} />
      </div>

      {/* Footer stats */}
      <div style={styles.footer}>
        <div style={styles.stat}>
          <span style={styles.statLabel}>VOL</span>
          <span style={styles.statValue}>{asset.volume}</span>
        </div>
        {asset.marketCap && asset.marketCap !== '—' && (
          <div style={styles.stat}>
            <span style={styles.statLabel}>MCAP</span>
            <span style={styles.statValue}>{asset.marketCap}</span>
          </div>
        )}
        <div style={styles.indicator}>
          <div style={{
            ...styles.dot,
            background: isPositive ? 'var(--bull)' : 'var(--bear)',
            boxShadow: `0 0 6px ${isPositive ? 'var(--bull)' : 'var(--bear)'}`,
          }} />
        </div>
      </div>
    </div>
  )
}

const styles = {
  card: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '8px',
    padding: '16px',
    cursor: 'pointer',
    transition: 'all 0.25s ease',
    position: 'relative',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '8px',
  },
  symbol: {
    fontFamily: 'var(--font-display)',
    fontSize: '13px',
    fontWeight: 700,
    color: 'var(--neon-cyan)',
    letterSpacing: '1px',
  },
  name: {
    fontFamily: 'var(--font-body)',
    fontSize: '11px',
    color: 'var(--text-dim)',
    marginTop: '2px',
  },
  badge: {
    fontFamily: 'var(--font-mono)',
    fontSize: '10px',
    padding: '3px 8px',
    borderRadius: '3px',
    border: '1px solid',
    letterSpacing: '0.5px',
    flexShrink: 0,
  },
  price: {
    fontFamily: 'var(--font-mono)',
    fontSize: '20px',
    color: 'var(--text-primary)',
    letterSpacing: '0.5px',
    marginBottom: '12px',
    fontWeight: 500,
  },
  unit: {
    fontSize: '12px',
    color: 'var(--text-dim)',
    marginLeft: '2px',
  },
  chartWrap: {
    height: '50px',
    marginBottom: '10px',
    marginLeft: '-4px',
    marginRight: '-4px',
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  stat: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
  },
  statLabel: {
    fontFamily: 'var(--font-display)',
    fontSize: '8px',
    color: 'var(--text-dim)',
    letterSpacing: '1px',
  },
  statValue: {
    fontFamily: 'var(--font-mono)',
    fontSize: '11px',
    color: 'var(--text-secondary)',
  },
  indicator: {
    marginLeft: 'auto',
  },
  dot: {
    width: '7px',
    height: '7px',
    borderRadius: '50%',
  },
  starBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '2px',
    display: 'flex',
    alignItems: 'center',
    opacity: 0.8,
  },
}
