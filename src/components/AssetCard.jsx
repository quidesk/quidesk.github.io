import React, { useState, useEffect, useRef } from 'react'
import { Star, Share2 } from 'lucide-react'
import { formatPrice, formatChange, SECTOR_META } from '../data/markets'
import MiniChart from './MiniChart'
import CurrencyTooltip from './CurrencyTooltip'
import ShareModal from './ShareModal'

export default function AssetCard({ asset, onClick, isWatched, onToggleWatch, compact, convertPrice }) {
  const [tf, setTf]                 = useState('24H')
  const [flash, setFlash]           = useState(null)
  const [prev, setPrev]             = useState(asset.price)
  const [tooltip, setTooltip]       = useState({ visible:false, x:0, y:0 })
  const [conversions, setConversions] = useState([])
  const [shareOpen, setShareOpen]     = useState(false)
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
    if (shareOpen) return // Don't show tooltip while sharing
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

  const handleShareClick = (e) => {
    e.stopPropagation()
    hideTooltip()
    setShareOpen(true)
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
            <button
              style={{
                background: 'var(--bg-surface)', 
                border: '1px solid var(--border-subtle)', 
                borderRadius: '4px',
                cursor: 'pointer', 
                padding: '3px 6px', 
                display: 'flex', 
                alignItems: 'center', 
                color: 'var(--text-secondary)',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--accent)'
                e.currentTarget.style.color = 'var(--accent)'
                e.currentTarget.style.background = 'var(--accent-dim)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border-subtle)'
                e.currentTarget.style.color = 'var(--text-secondary)'
                e.currentTarget.style.background = 'var(--bg-surface)'
              }}
              onClick={handleShareClick}
              title="Share insight card"
            >
              <Share2 size={13} style={{ color: 'inherit' }} />
            </button>
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

        <div style={{ display:'flex', gap:'4px', marginBottom: compact ? '2px' : '6px', justifyContent:'flex-end' }}>
          {['1H','24H','1M','1Y'].map(t => (
            <span
              key={t}
              onClick={(e) => { e.stopPropagation(); setTf(t); }}
              style={{
                fontSize:'9px', fontFamily:'var(--font-mono)', cursor:'pointer',
                color: tf === t ? 'var(--text-primary)' : 'var(--text-dim)',
                background: tf === t ? 'var(--bg-surface)' : 'transparent',
                padding: '2px 5px', borderRadius: '4px',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => {
                if (tf !== t) e.currentTarget.style.color = 'var(--text-primary)'
              }}
              onMouseLeave={e => {
                if (tf !== t) e.currentTarget.style.color = 'var(--text-dim)'
              }}
            >
              {t}
            </span>
          ))}
        </div>
        <MiniChart data={asset.history ? asset.history[tf] : asset.chartData} positive={isUp} height={compact ? 36 : 48} />

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
      <ShareModal 
        isOpen={shareOpen} 
        onClose={() => setShareOpen(false)} 
        data={{ type: 'asset', asset: { ...asset, chartData: asset.history ? asset.history[tf] : asset.chartData } }} 
      />
    </div>
  )
}
