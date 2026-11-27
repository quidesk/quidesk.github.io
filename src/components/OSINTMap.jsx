import React, { useMemo } from 'react';
import { ComposableMap, Geographies, Geography, Marker, Line, Graticule, Sphere } from 'react-simple-maps';
import { getSourceCoords, getAssetCoords } from '../data/geoNodes';

const geoUrl = 'https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json';

export default function OSINTMap({ news = [] }) {
  const links = useMemo(() => {
    const arr = [];
    const recentNews = news.slice(0, 15);

    recentNews.forEach(item => {
      const srcCoords = getSourceCoords(item.source);
      if (!srcCoords) return;

      item.mentionedAssets?.forEach(asset => {
        const destCoords = getAssetCoords(asset);
        if (destCoords) {
          arr.push({
            id: `${item.id}-${asset}`,
            source: srcCoords,
            dest: destCoords,
            color: item.color || 'var(--bull)',
            sourceName: item.source,
            assetName: asset.toUpperCase(),
          });
        }
      });
    });
    return arr;
  }, [news]);

  const points = useMemo(() => {
    const pts = new Map();
    links.forEach(l => {
      pts.set(l.source.join(','), { coords: l.source, color: l.color, name: l.sourceName });
      pts.set(l.dest.join(','), { coords: l.dest, color: l.color, name: l.assetName });
    });
    return Array.from(pts.values());
  }, [links]);

  return (
    <div style={styles.container}>
      <style>
        {`
          @keyframes march {
            to { stroke-dashoffset: -20; }
          }
          @keyframes radarSweep {
            0% { transform: translateY(-80px); opacity: 0; }
            50% { opacity: 0.14; }
            100% { transform: translateY(620px); opacity: 0; }
          }
          @media (prefers-reduced-motion: reduce) {
            .osint-march, .osint-scanline {
              animation: none !important;
            }
          }
        `}
      </style>
      <h3 style={styles.title}>
        <span style={styles.liveDot} aria-hidden="true" /> GLOBAL THREAT &amp; INTELLIGENCE MATRIX
      </h3>
      <div style={styles.mapWrapper}>
        <div className="osint-scanline" style={styles.scanline} aria-hidden="true" />

        <div style={styles.terminal}>
          <div style={styles.terminalHeader}>LATEST INTERCEPTS</div>
          {news.slice(0, 5).map(n => (
            <div key={n.id} style={{ ...styles.terminalLine, color: n.color || 'var(--text-secondary)' }}>
              {'>'} {n.source}: {n.title.length > 50 ? n.title.slice(0, 47) + '...' : n.title}
            </div>
          ))}
          {news.length === 0 && <div style={{ color: 'var(--text-dim)' }}>{'>'} AWAITING SIGNAL...</div>}
        </div>

        <ComposableMap projection="geoMercator" width={1200} height={600} projectionConfig={{ scale: 190 }}>
          <Sphere stroke="var(--sc-border)" strokeWidth={1} />
          <Graticule stroke="var(--sc-border)" strokeWidth={0.5} />

          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies.map((geo) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill="var(--sc-surface-elevated)"
                  stroke="var(--border-mid)"
                  strokeWidth={0.5}
                  style={{
                    default: { outline: 'none' },
                    hover: { outline: 'none', fill: 'var(--accent-subtle)' },
                    pressed: { outline: 'none' },
                  }}
                />
              ))
            }
          </Geographies>

          {links.map(link => (
            <Line
              key={link.id}
              className="osint-march"
              from={link.source}
              to={link.dest}
              stroke={link.color}
              strokeWidth={1.5}
              strokeLinecap="round"
              style={{
                opacity: 0.65,
                strokeDasharray: '4 6',
                animation: 'march 1s linear infinite',
              }}
            />
          ))}

          {points.map((pt, i) => (
            <Marker key={i} coordinates={pt.coords}>
              <circle r={4} fill={pt.color} opacity={0.85} />
              <circle r={14} fill="transparent" stroke={pt.color} strokeWidth={1.5} opacity={0.4}>
                <animate attributeName="r" from="4" to="30" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" from="0.7" to="0" dur="2s" repeatCount="indefinite" />
              </circle>
              <path d="M -8 0 L -3 0 M 8 0 L 3 0 M 0 -8 L 0 -3 M 0 8 L 0 3" stroke={pt.color} strokeWidth={1.5} opacity={0.85} />
              <text
                textAnchor="middle"
                y={-14}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  fill: 'var(--text-primary)',
                  pointerEvents: 'none',
                  fontWeight: 700,
                }}
              >
                {pt.name}
              </text>
            </Marker>
          ))}
        </ComposableMap>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '20px 0 0 0',
    width: '100%',
    background: 'var(--bg-surface)',
  },
  title: {
    fontFamily: 'var(--font-mono)',
    fontSize: '12px',
    fontWeight: 700,
    letterSpacing: '0.08em',
    color: 'var(--text-secondary)',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '14px',
    padding: '0 20px',
    textTransform: 'uppercase',
  },
  liveDot: {
    width: '7px',
    height: '7px',
    borderRadius: '50%',
    background: 'var(--bull)',
    boxShadow: '0 0 8px var(--bull)',
  },
  mapWrapper: {
    width: '100%',
    height: '540px',
    background: 'var(--bg-base)',
    position: 'relative',
    borderTop: '1px solid var(--border-subtle)',
    overflow: 'hidden',
  },
  scanline: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '48px',
    background: 'linear-gradient(to bottom, transparent, rgba(210, 180, 124, 0.16), transparent)',
    animation: 'radarSweep 4.5s linear infinite',
    pointerEvents: 'none',
    zIndex: 10,
  },
  terminal: {
    position: 'absolute',
    bottom: '20px',
    left: '20px',
    width: 'min(350px, calc(100% - 40px))',
    background: 'var(--bg-overlay)',
    border: '1px solid var(--sc-border-strong)',
    borderRadius: '8px',
    padding: '12px 14px',
    zIndex: 10,
    fontFamily: 'var(--font-mono)',
    fontSize: '11px',
    pointerEvents: 'none',
    backdropFilter: 'blur(12px)',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.28)',
  },
  terminalHeader: {
    color: 'var(--sc-accent)',
    marginBottom: '8px',
    borderBottom: '1px solid var(--border-subtle)',
    paddingBottom: '6px',
    fontWeight: 700,
    fontSize: '10px',
    letterSpacing: '0.08em',
  },
  terminalLine: {
    marginBottom: '6px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    lineHeight: 1.45,
  },
};
