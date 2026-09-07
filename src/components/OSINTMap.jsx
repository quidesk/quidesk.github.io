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
            0% { transform: translateY(-50px); opacity: 0; }
            50% { opacity: 0.15; }
            100% { transform: translateY(450px); opacity: 0; }
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
              > {n.source}: {n.title.length > 50 ? n.title.slice(0,47)+'...' : n.title}
            </div>
          ))}
          {news.length === 0 && <div style={{ color: 'var(--text-dim)' }}>> AWAITING SIGNAL...</div>}
        </div>

        <ComposableMap projection="geoMercator" projectionConfig={{ scale: 130 }}>
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
              <circle r={3} fill={pt.color} opacity={0.8} />
              
              {/* Radar Ping Animation */}
              <circle r={12} fill="transparent" stroke={pt.color} strokeWidth={1} opacity={0.4}>
                <animate attributeName="r" from="3" to="24" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" from="0.8" to="0" dur="2s" repeatCount="indefinite" />
              </circle>
              
              {/* Target Reticle */}
              <path d="M -6 0 L -2 0 M 6 0 L 2 0 M 0 -6 L 0 -2 M 0 6 L 0 2" stroke={pt.color} strokeWidth={1} opacity={0.8} />
              
              <text 
                textAnchor="middle" 
                y={-12} 
                style={{ 
                  fontFamily: "var(--font-mono)", 
                  fontSize: "8px", 
                  fill: "var(--text-secondary)",
                  pointerEvents: "none",
                  fontWeight: 600,
                  textShadow: `0 0 4px ${pt.color}, 0 0 4px rgba(0,0,0,0.8)`
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
    padding: '24px 28px',
    maxWidth: '1700px',
    margin: '40px auto 0 auto',
    borderTop: '1px solid var(--border-subtle)',
  },
  title: {
    fontFamily: 'var(--font-display)',
    fontSize: '12px',
    letterSpacing: '0.1em',
    color: 'var(--text-secondary)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '16px',
    textTransform: 'uppercase',
  },
  liveDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: 'var(--neon-green)',
    boxShadow: '0 0 8px var(--neon-green)',
  },
  mapWrapper: {
    width: '100%',
    height: '400px',
    background: 'radial-gradient(circle at center, var(--bg-surface) 0%, var(--bg-base) 100%)',
    borderRadius: '12px',
    overflow: 'hidden',
    position: 'relative',
    border: '1px solid var(--border-subtle)'
  },
  scanline: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40px',
    background: 'linear-gradient(to bottom, transparent, rgba(0, 255, 204, 0.4), transparent)',
    animation: 'radarSweep 3s linear infinite',
    pointerEvents: 'none',
    zIndex: 10,
  },
  terminal: {
    position: 'absolute',
    bottom: '20px',
    left: '20px',
    width: '320px',
    background: 'rgba(10, 10, 10, 0.75)',
    border: '1px solid rgba(0, 255, 204, 0.2)',
    borderRadius: '6px',
    padding: '12px',
    zIndex: 10,
    fontFamily: 'var(--font-mono)',
    fontSize: '10px',
    pointerEvents: 'none',
    backdropFilter: 'blur(4px)',
    boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
  },
  terminalHeader: {
    color: 'var(--neon-green)',
    marginBottom: '8px',
    borderBottom: '1px dashed rgba(0, 255, 204, 0.3)',
    paddingBottom: '4px',
    fontWeight: 600,
    letterSpacing: '0.1em'
  },
  terminalLine: {
    marginBottom: '6px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    lineHeight: 1.4
  }
}
