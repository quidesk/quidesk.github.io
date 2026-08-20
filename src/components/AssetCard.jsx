import React, { useState, useEffect, useRef } from 'react'
import { Star } from 'lucide-react'
import { formatPrice, formatChange, SECTOR_META } from '../data/markets'
import MiniChart from './MiniChart'
import CurrencyTooltip from './CurrencyTooltip'

export default function AssetCard({ asset, onClick, isWatched, onToggleWatch, compact, convertPrice }) {
  const [flash, setFlash]           = useState(null)
  const [prev, setPrev]             = useState(asset.price)
  const [tooltip, setTooltip]       = useState({ visible:false, x:0, y:0 })
  const [conversions, setConversions] = useState([])
  const cardRef    = useRef(null)
  const timerRef   = useRef(null)

  useEffect(() => {
    if (asset.price !== prev) {
      setFlash(asset.price > prev ? 'up' : 'down')
      setPrev(asset.price)
      const t = setTimeout(() => setFlash(null), 500)
      return () => clearTimeout(t)
    }
  }, [asset.price])

  const isUp = asset.change >= 0
  const meta = SECTOR_META[asset.sector] || {}

  function showTooltip() {
    if (convertPrice) {
      setConversions(convertPrice(asset.price))
    }
    timerRef.current = setTimeout(() => {
      const rect = cardRef.current && cardRef.current.getBoundingClientRect()
      if (!rect) return
      const tipX = (rect.right + 8 > window.innerWidth - 300)
        ? rect.left - 296
        : rect.right + 8
      const tipY = Math.min(rect.top, window.innerHeight - 340)
      setTooltip({ visible:true, x:tipX, y:tipY })
    }, 400)
  }

  function hideTooltip() {
    clearTimeout(timerRef.current)
    setTooltip({ visible:false, x:0, y:0 })
  }

  const bg = flash === 'up'
    ? 'rgba(34,212,122,0.08)'
    : flash === 'down'
    ? 'rgba(240,64,96,0.08)'
    : 'var(--bg-card)'

  return (
    <div style={{ position:'relative' }}>
      <div
        ref={cardRef}
        className="card"
        style={{
          padding: compact ? '12px' : '16px',
          cursor: 'pointer',
          background: bg,
          transition: 'background 0.4s ease, border-color 0.15s, transform 0.15s, box-shadow 0.15s',
        }}
        onClick={function() { if (onClick) onClick(asset) }}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
      >
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom: compact ? '6px' : '10px' }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
              <span style={{ fontFamily:'var(--font-display)', fontSize:'12px', fontWeight:700, color: meta.color || 'var(--text-primary)', letterSpacing:'0.04em' }}>
                {asset.symbol}
              </span>
              {!compact && (
                <span style={{ fontFamily:'var(--font-mono)', fontSize:'8px', color: meta.color || 'var(--accent)', background: (meta.color || '#f0a500') + '14', border: '1px solid ' + (meta.color || '#f0a500') + '30', borderRadius:'3px', padding:'0 5px', lineHeight:'14px' }}>
                  {meta.label}
                </span>
              )}
            </div>
            {!compact && (
              <div style={{ fontFamily:'var(--font-body)', fontSize:'10px', color:'var(--text-dim)', marginTop:'1px' }}>
                {asset.name}
              </div>
            )}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
            <span className={isUp ? 'badge badge-bull' : 'badge badge-bear'}>
              {isUp ? '▲' : '▼'} {formatChange(asset.change)}
            </span>
            {onToggleWatch && (
              <button
                style={{ background:'none', border:'none', cursor:'pointer', padding:'2px', display:'flex', alignItems:'center', lineHeight:1 }}
                onClick={function(e) { e.stopPropagation(); onToggleWatch(asset.id) }}
              >
                <Star size={12} color={isWatched ? 'var(--accent)' : 'var(--text-dim)'} fill={isWatched ? 'var(--accent)' : 'none'} />
              </button>
            )}
          </div>
        </div>

        <div style={{ fontFamily:'var(--font-mono)', fontSize: compact ? '16px' : '20px', fontWeight:500, color: isUp ? 'var(--bull)' : 'var(--bear)', marginBottom: compact ? '6px' : '10px', letterSpacing:'0.02em' }}>
          {asset.pricePrefix ? `${asset.pricePrefix}${asset.price.toLocaleString('en-US', {minimumFractionDigits:2,maximumFractionDigits:asset.price > 100 ? 2 : 4})}` : formatPrice(asset.price)}
          {asset.unit && (
            <span style={{ fontSize:'11px', color:'var(--text-dim)', marginLeft:'3px' }}>
              /{asset.unit}
            </span>
          )}
        </div>

        <MiniChart data={asset.chartData} positive={isUp} height={compact ? 36 : 48} />

        {!compact && (
          <div style={{ display:'flex', gap:'14px', marginTop:'8px', paddingTop:'8px', borderTop:'1px solid var(--border-subtle)' }}>
            <div>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:'8px', color:'var(--text-dim)', letterSpacing:'0.08em' }}>VOL</div>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:'11px', color:'var(--text-secondary)' }}>{asset.volume}</div>
            </div>
            {asset.marketCap && asset.marketCap !== '—' && (
              <div>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:'8px', color:'var(--text-dim)', letterSpacing:'0.08em' }}>MCAP</div>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:'11px', color:'var(--text-secondary)' }}>{asset.marketCap}</div>
              </div>
            )}
            <div style={{ marginLeft:'auto', display:'flex', alignItems:'center' }}>
              <div style={{ width:'6px', height:'6px', borderRadius:'50%', background: isUp ? 'var(--bull)' : 'var(--bear)', boxShadow: isUp ? '0 0 5px var(--bull)' : '0 0 5px var(--bear)' }} />
            </div>
          </div>
        )}
      </div>

      <CurrencyTooltip
        conversions={conversions}
        visible={tooltip.visible}
        x={tooltip.x}
        y={tooltip.y}
      />
    </div>
  )
}
