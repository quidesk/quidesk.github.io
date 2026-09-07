import React, { useMemo } from 'react'
import { ComposableMap, Geographies, Geography, Marker, Line } from 'react-simple-maps'
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
      <h3 style={styles.title}>
        <span style={styles.liveDot} /> LIVE OSINT TRACKER
      </h3>
      <div style={styles.mapWrapper}>
        <ComposableMap projection="geoMercator" projectionConfig={{ scale: 130 }}>
          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies.map((geo) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill="rgba(255,255,255,0.03)"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth={0.5}
                  style={{
                    default: { outline: "none" },
                    hover: { outline: "none", fill: "rgba(255,255,255,0.06)" },
                    pressed: { outline: "none" },
                  }}
                />
              ))
            }
          </Geographies>

          {/* Draw Lines */}
          {links.map(link => (
            <Line
              key={link.id}
              from={link.source}
              to={link.dest}
              stroke={link.color}
              strokeWidth={1.5}
              strokeLinecap="round"
              style={{
                opacity: 0.4,
              }}
            />
          ))}

          {/* Draw Markers */}
          {points.map((pt, i) => (
            <Marker key={i} coordinates={pt.coords}>
              <circle r={3} fill={pt.color} opacity={0.8} />
              <circle r={12} fill={pt.color} opacity={0.2}>
                <animate attributeName="r" from="3" to="18" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" from="0.4" to="0" dur="2s" repeatCount="indefinite" />
              </circle>
              <text 
                textAnchor="middle" 
                y={-8} 
                style={{ 
                  fontFamily: "var(--font-mono)", 
                  fontSize: "8px", 
                  fill: "var(--text-dim)",
                  pointerEvents: "none",
                  fontWeight: 600
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
    background: 'var(--bg-base)',
    borderRadius: '12px',
    overflow: 'hidden',
    position: 'relative',
    border: '1px solid var(--border-subtle)'
  }
}
