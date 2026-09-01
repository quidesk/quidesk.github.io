import React, { useState, useRef, useEffect, useCallback } from 'react'
import { formatPrice, CORRELATIONS, SECTOR_META, formatChangeBubble } from '../data/markets'
import CurrencyTooltip from './CurrencyTooltip'

// Fixed internal SVG coordinate system — CSS width:100% + height:auto scales it
const INTERNAL_W = 900
const INTERNAL_H = 504

// Initial positions as fractions of canvas
const INITIAL_POSITIONS = {
  spx:      { x:0.10, y:0.14 },
  ndx:      { x:0.20, y:0.07 },
  dow:      { x:0.05, y:0.26 },
  aapl:     { x:0.24, y:0.20 },
  nvda:     { x:0.14, y:0.34 },
  tsla:     { x:0.06, y:0.42 },
  btc:      { x:0.76, y:0.10 },
  eth:      { x:0.86, y:0.22 },
  sol:      { x:0.90, y:0.10 },
  bnb:      { x:0.80, y:0.34 },
  xrp:      { x:0.70, y:0.26 },
  ada:      { x:0.92, y:0.38 },
  gold:     { x:0.12, y:0.68 },
  silver:   { x:0.22, y:0.80 },
  platinum: { x:0.06, y:0.80 },
  wti:      { x:0.68, y:0.68 },
  brent:    { x:0.78, y:0.78 },
  ng:       { x:0.86, y:0.68 },
  rbob:     { x:0.60, y:0.78 },
  // Forex — center horizontal band
  eurusd:   { x:0.35, y:0.48 },
  gbpusd:   { x:0.45, y:0.42 },
  usdjpy:   { x:0.55, y:0.48 },
  audusd:   { x:0.38, y:0.56 },
  usdcad:   { x:0.50, y:0.56 },
  usdchf:   { x:0.60, y:0.42 },
  eurgbp:   { x:0.42, y:0.50 },
  usdinr:   { x:0.55, y:0.55 },
}

const ZONES = [
  { id:'equities', label:'EQUITIES', cx:0.17, cy:0.26, rx:0.20, ry:0.26, color:'#4d9eff' },
  { id:'crypto',   label:'CRYPTO',   cx:0.81, cy:0.26, rx:0.20, ry:0.26, color:'#a78bfa' },
  { id:'metals',   label:'METALS',   cx:0.17, cy:0.76, rx:0.20, ry:0.18, color:'#f0a500' },
  { id:'energy',   label:'ENERGY',   cx:0.75, cy:0.76, rx:0.22, ry:0.18, color:'#f97316' },
  { id:'forex',    label:'FOREX',    cx:0.50, cy:0.50, rx:0.16, ry:0.12, color:'#22d3ee' },
]

const ZONE_HOME = {
  equities: { x:0.17, y:0.26 },
  crypto:   { x:0.81, y:0.26 },
  metals:   { x:0.17, y:0.76 },
  energy:   { x:0.75, y:0.76 },
}

function getSectorAvg(assets, sector) {
  const s = assets.filter(a => a.sector === sector)
  if (!s.length) return 0
  return s.reduce((acc, a) => acc + a.change, 0) / s.length
}

function initNodeState(allAssets) {
  const state = {}
  allAssets.forEach(a => {
    const p = INITIAL_POSITIONS[a.id] || { x: Math.random()*0.8+0.1, y: Math.random()*0.8+0.1 }
    state[a.id] = {
      x: p.x, y: p.y,
      vx: (Math.random()-0.5)*0.001,
      vy: (Math.random()-0.5)*0.001,
    }
  })
  return state
}

export default function MarketMap({ allAssets, hotspots, onSelectAsset, convertPrice, newsCorrelations, isStale }) {
  const [hovered, setHovered]           = useState(null)
  const [selected, setSelected]         = useState(null)
  const [containerW, setContainerW]     = useState(900) // only for tooltip pixel positioning
  const [nodePositions, setNodePositions] = useState({})
  const [currencyPos, setCurrencyPos]   = useState({ x:0, y:0 })
  const [conversions, setConversions]   = useState([])
  const [showCurrency, setShowCurrency] = useState(false)
  const containerRef  = useRef(null)
  const animFrameRef  = useRef(null)
  const positionsRef  = useRef({})
  const assetsRef     = useRef(allAssets)
  const currTimerRef  = useRef(null)
  const hoveredRef    = useRef(null)

  // Keep refs in sync
  useEffect(() => { assetsRef.current = allAssets }, [allAssets])
  useEffect(() => { hoveredRef.current = hovered }, [hovered])

  // Init node positions
  useEffect(() => {
    if (allAssets.length && Object.keys(positionsRef.current).length === 0) {
      const init = initNodeState(allAssets)
      positionsRef.current = init
      setNodePositions({ ...init })
    }
  }, [allAssets])

  // Resize observer — only tracks container pixel width for tooltip positioning
  useEffect(() => {
    const ro = new ResizeObserver(entries => {
      const e = entries[0]
      if (e) {
        setContainerW(e.contentRect.width)
      }
    })
    if (containerRef.current) ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  // Physics animation loop
  useEffect(() => {
    if (!allAssets.length) return

    function animate() {
      const assets = assetsRef.current
      const pos    = positionsRef.current
      if (!assets.length || !Object.keys(pos).length) {
        animFrameRef.current = requestAnimationFrame(animate)
        return
      }

      const next = {}
      const hov  = hoveredRef.current

      assets.forEach(asset => {
        const p = pos[asset.id]
        if (!p) return

        let fx = 0
        let fy = 0
        const isUp = asset.change >= 0

        // 1. HOME ZONE ATTRACTION — pull toward sector home
        const home = ZONE_HOME[asset.sector] || { x:0.5, y:0.5 }
        const hdx  = home.x - p.x
        const hdy  = home.y - p.y
        fx += hdx * 0.0008
        fy += hdy * 0.0008

        // 2. BULL/BEAR CLUSTER ATTRACTION — same sentiment pulls together
        assets.forEach(other => {
          if (other.id === asset.id) return
          const op = pos[other.id]
          if (!op) return
          const otherUp = other.change >= 0
          if (otherUp !== isUp) return // only same sentiment
          const dx   = op.x - p.x
          const dy   = op.y - p.y
          const dist = Math.sqrt(dx*dx + dy*dy) || 0.001
          if (dist > 0.35) {
            // attract if far
            fx += (dx / dist) * 0.0001
            fy += (dy / dist) * 0.0001
          } else if (dist < 0.08) {
            // repel if too close
            fx -= (dx / dist) * 0.0003
            fy -= (dy / dist) * 0.0003
          }
        })

        // 3. REPULSION from opposite sentiment
        assets.forEach(other => {
          if (other.id === asset.id) return
          const op = pos[other.id]
          if (!op) return
          const otherUp = other.change >= 0
          if (otherUp === isUp) return
          const dx   = op.x - p.x
          const dy   = op.y - p.y
          const dist = Math.sqrt(dx*dx + dy*dy) || 0.001
          if (dist < 0.20) {
            fx -= (dx / dist) * 0.0002
            fy -= (dy / dist) * 0.0002
          }
        })

        // 4. MOMENTUM — stronger movers drift more
        const momentum = Math.min(0.0005, Math.abs(asset.change) * 0.00002)
        fx += (Math.random()-0.5) * momentum
        fy += (Math.random()-0.5) * momentum

        // 5. DAMPING
        const damping = 0.82
        const nvx = (p.vx + fx) * damping
        const nvy = (p.vy + fy) * damping

        // 6. BOUNDARY — keep within canvas with padding
        const pad = 0.06
        let nx = p.x + nvx
        let ny = p.y + nvy
        if (nx < pad)      { nx = pad;      }
        if (nx > 1 - pad)  { nx = 1 - pad;  }
        if (ny < pad)      { ny = pad;      }
        if (ny > 1 - pad)  { ny = 1 - pad;  }

        next[asset.id] = { x: nx, y: ny, vx: nvx, vy: nvy }
      })

      positionsRef.current = next
      setNodePositions({ ...next })
      animFrameRef.current = requestAnimationFrame(animate)
    }

    animFrameRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [allAssets.length])

  // Circle radius helper - scale dynamically based on absolute percentage change
  const getAssetRadius = useCallback((asset) => {
    const baseR = Math.max(16, Math.min(24, INTERNAL_W * 0.022))
    const extraR = Math.min(28, Math.abs(asset.change) * 4) // +0 to 28px depending on volatility
    return baseR + extraR
  }, [])

  const activeId   = hovered || selected
  const hotspotIds = new Set(hotspots.map(h => h.assetId))

  const visibleCorrs = CORRELATIONS.filter(c => {
    if (activeId) return c.a === activeId || c.b === activeId
    return Math.abs(c.r) > 0.85
  })

  function getPos(id) {
    const p = nodePositions[id]
    if (!p) return null
    return { x: p.x * INTERNAL_W, y: p.y * INTERNAL_H }
  }

  function handleNodeEnter(asset) {
    setHovered(asset.id)
    clearTimeout(currTimerRef.current)
    if (convertPrice) setConversions(convertPrice(asset.price))
    currTimerRef.current = setTimeout(() => {
      const pos = nodePositions[asset.id]
      if (!pos || !containerRef.current) return
      const rect  = containerRef.current.getBoundingClientRect()
      // Use containerW (actual pixel width) for tooltip screen positioning
      const scale = INTERNAL_W > 0 ? rect.width / INTERNAL_W : 1
      const absX  = rect.left + pos.x * INTERNAL_W * scale
      const absY  = rect.top  + pos.y * INTERNAL_H * scale
      
      const nr = getAssetRadius(asset)
      
      const tipX  = absX + nr * scale + 8 > window.innerWidth - 300
        ? absX - 296
        : absX + nr * scale + 8
      const tipY  = Math.min(absY - 10, window.innerHeight - 340)
      setCurrencyPos({ x: tipX, y: tipY })
      setShowCurrency(true)
    }, 400)
  }

  function handleNodeLeave() {
    setHovered(null)
    clearTimeout(currTimerRef.current)
    setShowCurrency(false)
  }

  return (
    <div ref={containerRef} style={s.wrap}>
      <svg
        viewBox={`0 0 ${INTERNAL_W} ${INTERNAL_H}`}
        style={s.svg}
      >
        <defs>
          {/* Frosted glass highlight — top-left specular */}
          <radialGradient id="orbHighlight" cx="35%" cy="30%" r="60%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.35)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0.08)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>

          {/* Soft edge darkening for depth */}
          <radialGradient id="orbDepth" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(0,0,0,0)" />
            <stop offset="75%" stopColor="rgba(0,0,0,0)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.25)" />
          </radialGradient>

          {/* Glow filter for sentiment rings */}
          <filter id="ringGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur"/>
            <feMerge>
              <feMergeNode in="blur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>

          {/* Liquid wave path for bull/bear fill */}
          <path id="liquidWave" d="M -90 0 C -75 -6, -60 -6, -45 0 C -30 6, -15 6, 0 0 C 15 -6, 30 -6, 45 0 C 60 6, 75 6, 90 0 V 60 H -90 Z" />
        </defs>

        {/* Zone boundaries — light rounded rects with sector tags */}
        {ZONES.map(z => {
          const x = (z.cx - z.rx) * INTERNAL_W
          const y = (z.cy - z.ry) * INTERNAL_H
          const w = z.rx * 2 * INTERNAL_W
          const h = z.ry * 2 * INTERNAL_H
          return (
            <g key={z.id}>
              <rect
                x={x} y={y} width={w} height={h}
                rx="12" ry="12"
                fill="none"
                stroke={z.color}
                strokeWidth="0.6"
                opacity="0.2"
                strokeDasharray="4 3"
              />
              <text
                x={x + 10} y={y + 14}
                fontSize="9" fontFamily="var(--font-mono)" fontWeight="600"
                fill={z.color} opacity="0.5"
                letterSpacing="0.06em"
              >
                {z.label}
              </text>
            </g>
          )
        })}

        {/* Correlation lines */}
        {visibleCorrs.map((c, i) => {
          const pa = getPos(c.a)
          const pb = getPos(c.b)
          if (!pa || !pb) return null
          const isActive = activeId && (c.a===activeId || c.b===activeId)
          const color = c.r > 0.6
            ? 'rgba(34,212,122,0.5)'
            : c.r < 0
            ? 'rgba(240,64,96,0.5)'
            : 'rgba(100,116,139,0.25)'
          return (
            <line key={i}
              x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y}
              stroke={color}
              strokeWidth={isActive ? Math.abs(c.r)*2.5 : 0.7}
              opacity={isActive ? Math.abs(c.r)*0.9 : 0.3}
            />
          )
        })}


        {/* News-driven correlation lines — OSINT signals */}
        {(newsCorrelations || []).map((c, i) => {
          const pa = getPos(c.a)
          const pb = getPos(c.b)
          if (!pa || !pb) return null
          return (
            <g key={`news-${i}`}>
              <line
                x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y}
                stroke={c.color || 'var(--accent)'}
                strokeWidth="1.2"
                strokeDasharray="4 3"
                opacity={Math.min(0.7, c.strength * 0.8)}
              />
            </g>
          )
        })}

        {/* Asset nodes — Frosted Glass Orbs */}
        {allAssets.map(asset => {
          const pos = getPos(asset.id)
          if (!pos) return null
          
          const nr        = getAssetRadius(asset)
          const meta      = SECTOR_META[asset.sector] || {}
          const isUp      = asset.change >= 0
          const isHot     = hotspotIds.has(asset.id)
          const isAct     = activeId === asset.id
          const absChg    = Math.abs(asset.change)
          const intensity = Math.min(1, absChg / 8)

          // Sentiment ring color
          const ringColor = isUp
            ? `rgba(52,211,153,${0.5 + intensity*0.5})`
            : `rgba(248,113,113,${0.5 + intensity*0.5})`
          // Ring thickness scales with volatility
          const ringWidth = 1.5 + intensity * 2.5
          // Sector tint for orb interior
          const sectorColor = meta.color || '#6b7280'

          // Clean symbol to first word / base asset
          let dSym = asset.symbol;
          if (dSym.includes('/')) dSym = dSym.split('/')[0];
          else if (dSym.endsWith('USDT')) dSym = dSym.replace('USDT', '');
          else if (dSym.endsWith('USD')) dSym = dSym.replace('USD', '');
          if (dSym.length > 5) dSym = dSym.substring(0, 5);

          const stale = isStale && isStale(asset.id, asset.sector);
          const staleOpacity = stale ? 0.3 : 1;

          return (
            <g key={asset.id}
              transform={`translate(${pos.x},${pos.y})`}
              style={{ cursor:'pointer', opacity: staleOpacity, transition: 'opacity 0.4s' }}
              onMouseEnter={() => handleNodeEnter(asset)}
              onMouseLeave={handleNodeLeave}
              onClick={() => {
                setSelected(p => p===asset.id ? null : asset.id)
                if (onSelectAsset) onSelectAsset(asset)
              }}
            >
              {/* Hotspot pulse ring */}
              {isHot && (
                <circle r={nr+6} fill="none"
                  stroke={ringColor}
                  strokeWidth="1" opacity="0.6">
                  <animate attributeName="r"
                    from={nr+4} to={nr+18} dur="2s" repeatCount="indefinite"/>
                  <animate attributeName="opacity"
                    from="0.6" to="0" dur="2s" repeatCount="indefinite"/>
                </circle>
              )}

              {/* Sentiment glow ring — thicker = more volatile */}
              <circle r={nr+2} fill="none"
                stroke={ringColor}
                strokeWidth={ringWidth}
                opacity={isAct ? 1 : 0.7}
                filter={isAct || isHot ? 'url(#ringGlow)' : 'none'}
              >
                <animate attributeName="opacity"
                  values={isAct ? '1;0.8;1' : '0.7;0.4;0.7'}
                  dur="3s" repeatCount="indefinite"/>
              </circle>

              <clipPath id={`clip-${asset.id}`}>
                <circle r={nr} />
              </clipPath>

              {/* Orb body — dark frosted glass with sector tint */}
              <circle r={nr}
                fill={`color-mix(in srgb, ${sectorColor} 20%, #1a1d23 80%)`}
                stroke="rgba(255,255,255,0.08)"
                strokeWidth="0.5"
              />

              {/* Liquid wave fill — bull green / bear red */}
              <g clipPath={`url(#clip-${asset.id})`}>
                <use href="#liquidWave" fill={isUp ? 'rgba(52,211,153,0.55)' : 'rgba(248,113,113,0.55)'} y={nr * 0.05}>
                  <animateTransform attributeName="transform" type="translate"
                    from="0 0" to="-90 0" dur="3s" repeatCount="indefinite" />
                </use>
                <use href="#liquidWave" fill={isUp ? 'rgba(52,211,153,0.3)' : 'rgba(248,113,113,0.3)'} y={nr * -0.15}>
                  <animateTransform attributeName="transform" type="translate"
                    from="-45 0" to="-135 0" dur="4s" repeatCount="indefinite" />
                </use>
              </g>

              {/* Sector accent — subtle inner ring */}
              <circle r={nr-3} fill="none"
                stroke={sectorColor}
                strokeWidth="0.6" opacity="0.3"
              />

              {/* Glass specular highlight overlay */}
              <circle r={nr} fill="url(#orbHighlight)" pointerEvents="none" />

              {/* Edge depth shadow */}
              <circle r={nr} fill="url(#orbDepth)" pointerEvents="none" />

              {/* Active selection ring */}
              {isAct && (
                <circle r={nr+1} fill="none"
                  stroke="rgba(255,255,255,0.3)" strokeWidth="1"
                  strokeDasharray="3 2" opacity="0.8">
                  <animateTransform attributeName="transform" type="rotate"
                    from="0" to="360" dur="8s" repeatCount="indefinite"/>
                </circle>
              )}

              {/* Text: Symbol */}
              <text textAnchor="middle" dominantBaseline="central" y={-nr*0.2}
                fontSize={dSym.length>4 ? Math.max(6.5, nr/3.4) : Math.max(8.5, nr/2.6)}
                fontFamily="var(--font-mono)" fontWeight="700"
                fill="rgba(255,255,255,0.95)"
                style={{ userSelect:'none' }}
              >
                {dSym}
              </text>

              {/* Text: Change % */}
              <text y={nr*0.32} textAnchor="middle" dominantBaseline="central"
                fontSize={Math.max(6.5, nr/3.2)} fontFamily="var(--font-mono)" fontWeight="700"
                fill={isUp ? 'rgba(52,211,153,0.95)' : 'rgba(248,113,113,0.95)'}
                style={{ userSelect:'none' }}
              >
                {formatChangeBubble(asset.change)}
              </text>
            </g>
          )
        })}
      </svg>

      {/* Legend */}
      <div style={s.legend}>
        <div style={s.legendItem}>
          <span style={{ ...s.legendDot, background:'rgba(30,180,80,0.8)' }}/>
          <span style={s.legendLabel}>Bullish ↑</span>
        </div>
        <div style={s.legendItem}>
          <span style={{ ...s.legendDot, background:'rgba(200,40,60,0.8)' }}/>
          <span style={s.legendLabel}>Bearish ↓</span>
        </div>
        <div style={s.legendItem}>
          <span style={{ ...s.legendLine, background:'rgba(34,212,122,0.6)' }}/>
          <span style={s.legendLabel}>Correlated</span>
        </div>
        <div style={s.legendItem}>
          <span style={{ ...s.legendLine, background:'rgba(240,64,96,0.6)' }}/>
          <span style={s.legendLabel}>Inverse</span>
        </div>
      </div>

      {/* 8-currency tooltip */}
      <CurrencyTooltip
        conversions={conversions}
        visible={showCurrency}
        x={currencyPos.x}
        y={currencyPos.y}
      />
    </div>
  )
}

const s = {
  wrap: {
    position:'relative', width:'100%', borderRadius:'12px',
    background:'var(--bg-card)', border:'1px solid var(--border-subtle)',
    overflow:'hidden',
  },
  svg: { display:'block', width:'100%', height:'auto' },
  legend: {
    position:'absolute', bottom:'10px', left:'12px',
    display:'flex', gap:'12px', flexWrap:'wrap',
  },
  legendItem: { display:'flex', alignItems:'center', gap:'5px' },
  legendDot:  { width:'8px', height:'8px', borderRadius:'50%' },
  legendLine: { width:'16px', height:'2px', borderRadius:'1px' },
  legendLabel: {
    fontFamily:'var(--font-mono)', fontSize:'9px',
    color:'var(--text-dim)', letterSpacing:'0.06em',
  },
}
