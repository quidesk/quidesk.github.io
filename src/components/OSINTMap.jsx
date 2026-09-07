import React, { useMemo } from 'react'
import { ComposableMap, Geographies, Geography, Marker, Line, Graticule, Sphere } from 'react-simple-maps'
import { getSourceCoords, getAssetCoords } from '../data/geoNodes'

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"

export default function OSINTMap({ news = [] }) {
  // Extract links: source -> asset
  const links = useMemo(() => {
    const arr = []
    // Only process the 15 most recent news to avoid map clutter
    const recentNews = news.slice(0, 15)
    
    recentNews.forEach(item => {
      const srcCoords = getSourceCoords(item.source)
      if (!srcCoords) return
      
      item.mentionedAssets?.forEach(asset => {
        const destCoords = getAssetCoords(asset)
        if (destCoords) {
          arr.push({
            id: `${item.id}-${asset}`,
            source: srcCoords,
            dest: destCoords,
            color: item.color || 'var(--neon-green)',
            sourceName: item.source,
            assetName: asset.toUpperCase()
          })
        }
      })
    })
    return arr
  }, [news])

  // Unique points for glowing markers
  const points = useMemo(() => {
    const pts = new Map()
    links.forEach(l => {
      pts.set(l.source.join(','), { coords: l.source, color: l.color, name: l.sourceName })
      pts.set(l.dest.join(','), { coords: l.dest, color: l.color, name: l.assetName })
    })
    return Array.from(pts.values())
  }, [links])

  return (
    <div style={styles.container}>
      <style>
        {`
          @keyframes march {
            to { stroke-dashoffset: -20; }
          }
          @keyframes radarSweep {
            0% { transform: translateY(-80px); opacity: 0; }
            50% { opacity: 0.15; }
            100% { transform: translateY(680px); opacity: 0; }
          }
        `}
      </style>
      <h3 style={styles.title}>
        <span style={styles.liveDot} /> GLOBAL THREAT & INTELLIGENCE MATRIX
      </h3>
      <div style={styles.mapWrapper}>
        
        {/* Radar Sweep Effect */}
        <div style={styles.scanline} />
        
        {/* Live Intercepts Terminal Overlay */}
        <div style={styles.terminal}>
          <div style={styles.terminalHeader}>LATEST INTERCEPTS</div>
          {news.slice(0, 5).map(n => (
            <div key={n.id} style={{ ...styles.terminalLine, color: n.color || 'var(--text-dim)' }}>
              {'>'} {n.source}: {n.title.length > 50 ? n.title.slice(0,47)+'...' : n.title}
            </div>
          ))}
          {news.length === 0 && <div style={{ color: 'var(--text-dim)' }}>{'>'} AWAITING SIGNAL...</div>}
        </div>

        <ComposableMap projection="geoMercator" width={1200} height={600} projectionConfig={{ scale: 190 }}>
          <Sphere stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
          <Graticule stroke="rgba(255,255,255,0.05)" strokeWidth={0.5} />

          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies.map((geo) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill="rgba(10,15,20,0.8)"
                  stroke="rgba(0,255,204,0.15)"
                  strokeWidth={0.5}
                  style={{
                    default: { outline: "none" },
                    hover: { outline: "none", fill: "rgba(0,255,204,0.05)" },
                    pressed: { outline: "none" },
                  }}
                />
              ))
            }
          </Geographies>

          {/* Draw Animated Tracking Lines */}
          {links.map(link => (
            <Line
              key={link.id}
              from={link.source}
              to={link.dest}
              stroke={link.color}
              strokeWidth={1.5}
              strokeLinecap="round"
              style={{
                opacity: 0.6,
                strokeDasharray: "4 6",
                animation: "march 1s linear infinite"
              }}
            />
          ))}

          {/* Draw Tracking Markers */}
          {points.map((pt, i) => (
            <Marker key={i} coordinates={pt.coords}>
              <circle r={4} fill={pt.color} opacity={0.8} />
              
              {/* Radar Ping Animation */}
              <circle r={14} fill="transparent" stroke={pt.color} strokeWidth={1.5} opacity={0.4}>
                <animate attributeName="r" from="4" to="30" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" from="0.8" to="0" dur="2s" repeatCount="indefinite" />
              </circle>
              
              {/* Target Reticle */}
              <path d="M -8 0 L -3 0 M 8 0 L 3 0 M 0 -8 L 0 -3 M 0 8 L 0 3" stroke={pt.color} strokeWidth={1.5} opacity={0.8} />
              
              <text 
                textAnchor="middle" 
                y={-14} 
                style={{ 
                  fontFamily: "var(--font-mono)", 
                  fontSize: "11px", 
                  fill: "var(--text-primary)",
                  pointerEvents: "none",
                  fontWeight: 700,
                  textShadow: `0 0 6px ${pt.color}, 0 0 6px rgba(0,0,0,1)`
                }}
              >
                {pt.name}
              </text>
            </Marker>
          ))}
        </ComposableMap>
      </div>
    </div>
  )
}

const styles = {
  container: {
    padding: '40px 0 0 0',
    width: '100%',
    marginTop: '40px',
    borderTop: '1px solid var(--border-subtle)',
    background: 'var(--bg-surface)',
  },
  title: {
    fontFamily: 'var(--font-display)',
    fontSize: '14px',
    letterSpacing: '0.1em',
    color: 'var(--text-secondary)',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '20px',
    padding: '0 28px',
    textTransform: 'uppercase',
  },
  liveDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: 'var(--neon-green)',
    boxShadow: '0 0 12px var(--neon-green)',
  },
  mapWrapper: {
    width: '100%',
    height: '600px',
    background: 'radial-gradient(ellipse at center, var(--bg-surface) 0%, var(--bg-base) 100%)',
    position: 'relative',
    borderTop: '1px solid var(--border-subtle)',
    borderBottom: '1px solid var(--border-subtle)',
    overflow: 'hidden',
  },
  scanline: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '60px',
    background: 'linear-gradient(to bottom, transparent, rgba(0, 255, 204, 0.4), transparent)',
    animation: 'radarSweep 4s linear infinite',
    pointerEvents: 'none',
    zIndex: 10,
  },
  terminal: {
    position: 'absolute',
    bottom: '30px',
    left: '30px',
    width: '360px',
    background: 'rgba(10, 10, 10, 0.85)',
    border: '1px solid rgba(0, 255, 204, 0.3)',
    borderRadius: '8px',
    padding: '16px',
    zIndex: 10,
    fontFamily: 'var(--font-mono)',
    fontSize: '11px',
    pointerEvents: 'none',
    backdropFilter: 'blur(8px)',
    boxShadow: '0 8px 24px rgba(0,0,0,0.6)'
  },
  terminalHeader: {
    color: 'var(--neon-green)',
    marginBottom: '10px',
    borderBottom: '1px dashed rgba(0, 255, 204, 0.4)',
    paddingBottom: '6px',
    fontWeight: 700,
    letterSpacing: '0.1em'
  },
  terminalLine: {
    marginBottom: '8px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    lineHeight: 1.5
  }
}
