import React, { useState, useRef, useEffect, useCallback } from 'react';
import { formatPrice, CORRELATIONS, SECTOR_META, formatChangeBubble } from '../data/markets';
import CurrencyTooltip from './CurrencyTooltip';

// Fixed internal SVG coordinate system — CSS width:100% + height:auto scales it
export const INTERNAL_W = 900;
export const INTERNAL_H = 504;

// Initial positions as fractions of canvas
export const INITIAL_POSITIONS = {
  spx:      { x:0.10, y:0.14 },
  ndx:      { x:0.20, y:0.09 },
  dow:      { x:0.07, y:0.26 },
  aapl:     { x:0.24, y:0.20 },
  nvda:     { x:0.14, y:0.34 },
  tsla:     { x:0.08, y:0.42 },
  meta:     { x:0.25, y:0.38 },
  btc:      { x:0.76, y:0.12 },
  eth:      { x:0.86, y:0.22 },
  sol:      { x:0.90, y:0.12 },
  bnb:      { x:0.80, y:0.34 },
  xrp:      { x:0.70, y:0.26 },
  ada:      { x:0.91, y:0.38 },
  gold:     { x:0.12, y:0.69 },
  silver:   { x:0.22, y:0.81 },
  platinum: { x:0.08, y:0.82 },
  wti:      { x:0.68, y:0.68 },
  brent:    { x:0.78, y:0.79 },
  ng:       { x:0.86, y:0.68 },
  hoil:     { x:0.61, y:0.79 },
  // Forex — center horizontal band
  eurusd:   { x:0.38, y:0.46 },
  gbpusd:   { x:0.46, y:0.42 },
  usdjpy:   { x:0.56, y:0.46 },
  audusd:   { x:0.38, y:0.55 },
  usdcad:   { x:0.50, y:0.55 },
  usdchf:   { x:0.60, y:0.42 },
  nzdusd:   { x:0.34, y:0.54 },
  eurgbp:   { x:0.43, y:0.50 },
  gbpjpy:   { x:0.49, y:0.39 },
  eurjpy:   { x:0.53, y:0.44 },
  usdinr:   { x:0.57, y:0.55 },
  eurinr:   { x:0.61, y:0.52 },
};

export const ZONES = [
  { id:'equities', label:'EQUITIES', cx:0.17, cy:0.26, rx:0.20, ry:0.26, color:'#4d9eff' },
  { id:'crypto',   label:'CRYPTO',   cx:0.81, cy:0.26, rx:0.20, ry:0.26, color:'#a78bfa' },
  { id:'metals',   label:'METALS',   cx:0.17, cy:0.76, rx:0.20, ry:0.18, color:'#f0a500' },
  { id:'energy',   label:'ENERGY',   cx:0.75, cy:0.76, rx:0.22, ry:0.18, color:'#f97316' },
  { id:'forex',    label:'FOREX',    cx:0.50, cy:0.50, rx:0.16, ry:0.12, color:'#22d3ee' },
];

export const ZONE_HOME = {
  equities: { x:0.17, y:0.26 },
  crypto:   { x:0.81, y:0.26 },
  metals:   { x:0.17, y:0.76 },
  energy:   { x:0.75, y:0.76 },
  forex:    { x:0.50, y:0.50 },
};

export function getAssetRadius(asset) {
  const baseR = 19;
  const extraR = Math.min(3.5, Math.abs(asset?.change || 0) * 0.4);
  return baseR + extraR;
}

export function initNodeState(allAssets) {
  const state = {};
  allAssets.forEach(asset => {
    const p = INITIAL_POSITIONS[asset.id] || { x: 0.5, y: 0.5 };
    state[asset.id] = {
      x: p.x,
      y: p.y,
      vx: 0,
      vy: 0,
    };
  });
  return state;
}

/**
 * Pure physics simulation step function.
 * Implements true ellipse containment clamping: ((x - cx)/effRx)^2 + ((y - cy)/effRy)^2 <= 1.0
 * with node radius padding and 30px header clearance, plus iterative collision resolution.
 */
export function stepMarketMapSimulation(pos, assets, zones = ZONES, internalW = INTERNAL_W, internalH = INTERNAL_H, options = {}) {
  const next = {};
  const getRadius = options.getAssetRadius || getAssetRadius;

  assets.forEach(asset => {
    const p = pos[asset.id];
    if (!p) return;

    let fx = 0;
    let fy = 0;

    // 1. Home zone attraction
    const home = ZONE_HOME[asset.sector] || { x: 0.5, y: 0.5 };
    const hdx = home.x - p.x;
    const hdy = home.y - p.y;
    fx += hdx * 0.0008;
    fy += hdy * 0.0008;

    // 2. Intra-zone collision avoidance
    assets.forEach(other => {
      if (other.id === asset.id || other.sector !== asset.sector) return;
      const op = pos[other.id];
      if (!op) return;
      const dx = (op.x - p.x) * internalW;
      const dy = (op.y - p.y) * internalH;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const minDist = getRadius(asset) + getRadius(other) + 6;
      if (dist < minDist) {
        const overlap = (minDist - dist) / minDist;
        fx -= (dx / dist) * overlap * 0.003;
        fy -= (dy / dist) * overlap * 0.003;
      }
    });

    // 3. Damping and velocity
    const damping = 0.80;
    const nvx = (p.vx + fx) * damping;
    const nvy = (p.vy + fy) * damping;

    let nx = p.x + nvx;
    let ny = p.y + nvy;

    // 4. True Ellipse Clamping with 30px Header Clearance
    const z = zones.find(zone => zone.id === asset.sector);
    if (z) {
      const nr = getRadius(asset);
      const padX = (nr + 4) / internalW;
      const padY = (nr + 4) / internalH;
      const effRx = Math.max(0.01, z.rx - padX);
      const effRy = Math.max(0.01, z.ry - padY);
      const headerClearance = (30 + nr) / internalH;
      const minY = (z.cy - z.ry) + headerClearance;
      const maxY = (z.cy + z.ry) - padY;

      // Vertical bounds
      ny = Math.max(minY, Math.min(maxY, ny));

      // Ellipse formula: ((x - cx) / effRx)^2 + ((y - cy) / effRy)^2 <= 1.0
      const dx = nx - z.cx;
      const dy = ny - z.cy;
      const normDistSq = ((dx / effRx) ** 2) + ((dy / effRy) ** 2);

      if (normDistSq > 1.0) {
        const scale = 1.0 / Math.sqrt(normDistSq);
        nx = z.cx + dx * scale;
        ny = z.cy + dy * scale;

        // If radial scale brought ny above minY, re-clamp ny and solve for max allowable dx
        if (ny < minY) {
          ny = minY;
          const dySlice = Math.abs(minY - z.cy);
          const yRatio = Math.min(1.0, dySlice / effRy);
          const maxDx = effRx * Math.sqrt(Math.max(0, 1.0 - yRatio * yRatio));
          nx = Math.max(z.cx - maxDx, Math.min(z.cx + maxDx, nx));
        }
      }
    } else {
      const pad = 0.06;
      nx = Math.max(pad, Math.min(1 - pad, nx));
      ny = Math.max(pad, Math.min(1 - pad, ny));
    }

    next[asset.id] = { x: nx, y: ny, vx: nvx, vy: nvy };
  });

  // Collision separation pass to guarantee 0 overlaps
  for (let iter = 0; iter < 2; iter++) {
    for (let i = 0; i < assets.length; i++) {
      const a1 = assets[i];
      const p1 = next[a1.id];
      if (!p1) continue;
      for (let j = i + 1; j < assets.length; j++) {
        const a2 = assets[j];
        if (a1.sector !== a2.sector) continue;
        const p2 = next[a2.id];
        if (!p2) continue;

        const dx = (p2.x - p1.x) * internalW;
        const dy = (p2.y - p1.y) * internalH;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const minDist = getRadius(a1) + getRadius(a2) + 2;

        if (dist < minDist) {
          const overlap = minDist - dist;
          const sepX = (dx / dist) * (overlap * 0.5) / internalW;
          const sepY = (dy / dist) * (overlap * 0.5) / internalH;
          p1.x -= sepX;
          p1.y -= sepY;
          p2.x += sepX;
          p2.y += sepY;

          // Re-clamp both to ellipse
          [a1, a2].forEach(a => {
            const z = zones.find(zone => zone.id === a.sector);
            if (!z) return;
            const p = next[a.id];
            const nr = getRadius(a);
            const effRx = Math.max(0.01, z.rx - (nr + 4) / internalW);
            const effRy = Math.max(0.01, z.ry - (nr + 4) / internalH);
            const minY = (z.cy - z.ry) + ((30 + nr) / internalH);
            const maxY = (z.cy + z.ry) - ((nr + 4) / internalH);
            p.y = Math.max(minY, Math.min(maxY, p.y));
            const edx = p.x - z.cx;
            const edy = p.y - z.cy;
            const ndSq = ((edx / effRx) ** 2) + ((edy / effRy) ** 2);
            if (ndSq > 1.0) {
              const s = 1.0 / Math.sqrt(ndSq);
              p.x = z.cx + edx * s;
              p.y = z.cy + edy * s;
              if (p.y < minY) {
                p.y = minY;
                const dySlice = Math.abs(minY - z.cy);
                const yRatio = Math.min(1.0, dySlice / effRy);
                const maxDx = effRx * Math.sqrt(Math.max(0, 1.0 - yRatio * yRatio));
                p.x = Math.max(z.cx - maxDx, Math.min(z.cx + maxDx, p.x));
              }
            }
          });
        }
      }
    }
  }

  return next;
}

export default function MarketMap({ allAssets, hotspots = [], onSelectAsset, convertPrice, newsCorrelations, isStale }) {
  const [hovered, setHovered] = useState(null);
  const [selected, setSelected] = useState(null);
  const [, setContainerW] = useState(900);
  const [nodePositions, setNodePositions] = useState({});
  const [currencyPos, setCurrencyPos] = useState({ x: 0, y: 0 });
  const [conversions, setConversions] = useState([]);
  const [showCurrency, setShowCurrency] = useState(false);

  const containerRef = useRef(null);
  const animFrameRef = useRef(null);
  const positionsRef = useRef({});
  const assetsRef = useRef(allAssets);
  const currTimerRef = useRef(null);

  useEffect(() => { assetsRef.current = allAssets; }, [allAssets]);

  // Init node positions
  useEffect(() => {
    if (allAssets.length && Object.keys(positionsRef.current).length === 0) {
      const init = initNodeState(allAssets);
      positionsRef.current = init;
      setNodePositions({ ...init });
    }
  }, [allAssets]);

  // Resize observer
  useEffect(() => {
    const ro = new ResizeObserver(entries => {
      const e = entries[0];
      if (e) {
        setContainerW(e.contentRect.width);
      }
    });
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Physics animation loop throttled to <= 30fps
  useEffect(() => {
    if (!allAssets.length) return;

    let lastTime = 0;
    const FRAME_MS = 33; // ~30 fps cap to minimize main thread overhead

    function animate(now) {
      if (now - lastTime >= FRAME_MS) {
        lastTime = now;
        const assets = assetsRef.current;
        const pos = positionsRef.current;
        if (assets.length && Object.keys(pos).length) {
          const next = stepMarketMapSimulation(pos, assets, ZONES, INTERNAL_W, INTERNAL_H, { getAssetRadius });
          positionsRef.current = next;
          setNodePositions(next);
        }
      }
      animFrameRef.current = requestAnimationFrame(animate);
    }

    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [allAssets.length]);

  const activeId = hovered || selected;
  const hotspotIds = new Set(hotspots.map(h => h.assetId));

  const visibleCorrs = CORRELATIONS.filter(c => {
    if (activeId) return c.a === activeId || c.b === activeId;
    return Math.abs(c.r) > 0.85;
  });

  function getPos(id) {
    const p = nodePositions[id];
    if (!p) return null;
    return { x: p.x * INTERNAL_W, y: p.y * INTERNAL_H };
  }

  function handleNodeEnter(asset) {
    setHovered(asset.id);
    clearTimeout(currTimerRef.current);
    const hasPrice = asset.status !== 'unavailable' && typeof asset.price === 'number' && Number.isFinite(asset.price) && asset.price > 0;
    if (convertPrice && hasPrice) setConversions(convertPrice(asset));
    else setConversions([]);

    currTimerRef.current = setTimeout(() => {
      const pos = nodePositions[asset.id];
      if (!pos || !containerRef.current || !hasPrice) return;
      const rect = containerRef.current.getBoundingClientRect();
      const scale = INTERNAL_W > 0 ? rect.width / INTERNAL_W : 1;
      const absX = rect.left + pos.x * INTERNAL_W * scale;
      const absY = rect.top + pos.y * INTERNAL_H * scale;
      
      const nr = getAssetRadius(asset);
      const tipX = absX + nr * scale + 8 > window.innerWidth - 300
        ? absX - 296
        : absX + nr * scale + 8;
      const tipY = Math.min(absY - 10, window.innerHeight - 340);
      setCurrencyPos({ x: tipX, y: tipY });
      setShowCurrency(true);
    }, 400);
  }

  function handleNodeLeave() {
    setHovered(null);
    clearTimeout(currTimerRef.current);
    setShowCurrency(false);
  }

  return (
    <div ref={containerRef} style={s.wrap}>
      <svg
        viewBox={`0 0 ${INTERNAL_W} ${INTERNAL_H}`}
        style={s.svg}
      >
        <defs>
          <radialGradient id="orbHighlight" cx="35%" cy="30%" r="60%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.35)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0.08)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>

          <radialGradient id="orbDepth" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(0,0,0,0)" />
            <stop offset="75%" stopColor="rgba(0,0,0,0)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.25)" />
          </radialGradient>

          <filter id="ringGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur"/>
            <feMerge>
              <feMergeNode in="blur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>

          <path id="liquidWave" d="M -90 0 C -75 -6, -60 -6, -45 0 C -30 6, -15 6, 0 0 C 15 -6, 30 -6, 45 0 C 60 6, 75 6, 90 0 V 60 H -90 Z" />
        </defs>

        {/* Zone boundaries — rounded category containers */}
        {ZONES.map(z => {
          const x = (z.cx - z.rx) * INTERNAL_W;
          const y = (z.cy - z.ry) * INTERNAL_H;
          const w = z.rx * 2 * INTERNAL_W;
          const h = z.ry * 2 * INTERNAL_H;
          return (
            <g key={z.id}>
              <rect
                x={x} y={y} width={w} height={h}
                rx="14" ry="14"
                fill="none"
                stroke={z.color}
                strokeWidth="0.6"
                opacity="0.22"
                strokeDasharray="4 3"
              />
              <text
                x={x + 12} y={y + 16}
                fontSize="9" fontFamily="var(--font-mono)" fontWeight="600"
                fill={z.color} opacity="0.6"
                letterSpacing="0.08em"
              >
                {z.label}
              </text>
            </g>
          );
        })}

        {/* Correlation lines — labeled illustrative */}
        {visibleCorrs.map((c, i) => {
          const pa = getPos(c.a);
          const pb = getPos(c.b);
          if (!pa || !pb) return null;
          const isActive = activeId && (c.a === activeId || c.b === activeId);
          const color = c.r > 0.6
            ? 'rgba(34,212,122,0.5)'
            : c.r < 0
            ? 'rgba(240,64,96,0.5)'
            : 'rgba(100,116,139,0.25)';
          return (
            <line key={`corr-${i}`}
              x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y}
              stroke={color}
              strokeWidth={isActive ? Math.abs(c.r) * 2.5 : 0.7}
              opacity={isActive ? Math.abs(c.r) * 0.9 : 0.3}
            >
              <title>{`Illustrative Correlation: ${c.a.toUpperCase()} ↔ ${c.b.toUpperCase()} (r=${c.r})`}</title>
            </line>
          );
        })}

        {/* News-driven correlation lines */}
        {(newsCorrelations || []).map((c, i) => {
          const pa = getPos(c.a);
          const pb = getPos(c.b);
          if (!pa || !pb) return null;
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
          );
        })}

        {/* Asset nodes — Frosted Glass Orbs */}
        {allAssets.map(asset => {
          const pos = getPos(asset.id);
          if (!pos) return null;
          
          const nr = getAssetRadius(asset);
          const meta = SECTOR_META[asset.sector] || {};
          const isUp = asset.change >= 0;
          const isHot = hotspotIds.has(asset.id);
          const isAct = activeId === asset.id;
          const absChg = Math.abs(asset.change);
          const intensity = Math.min(1, absChg / 8);

          // Sentiment ring color
          const ringColor = isUp
            ? `rgba(52,211,153,${0.5 + intensity * 0.5})`
            : `rgba(248,113,113,${0.5 + intensity * 0.5})`;
          const ringWidth = 1.5 + intensity * 2.5;
          const sectorColor = meta.color || '#6b7280';

          // Forex nodes show full pair (e.g. EUR/USD, USD/JPY) at 8.5px font
          const isForexNode = (asset.sector || '').toLowerCase() === 'forex';
          let dSym = asset.symbol || '';
          if (isForexNode) {
            dSym = asset.symbol;
          } else if (asset.sector === 'metals' || asset.sector === 'crypto') {
            dSym = dSym.replace('/USD', '').replace('USDT', '').replace('USD', '');
          } else {
            if (dSym.includes('/')) dSym = dSym.split('/')[0];
            if (dSym.endsWith('USDT')) dSym = dSym.replace('USDT', '');
          }
          if (!isForexNode && dSym.length > 5) dSym = dSym.substring(0, 5);

          const stale = isStale && isStale(asset.id, asset.sector);
          const staleOpacity = stale ? 0.3 : 1;

          return (
            <g key={asset.id}
              transform={`translate(${pos.x},${pos.y})`}
              style={{ cursor:'pointer', opacity: staleOpacity, transition: 'opacity 0.4s' }}
              onMouseEnter={() => handleNodeEnter(asset)}
              onMouseLeave={handleNodeLeave}
              onClick={() => {
                setSelected(p => p === asset.id ? null : asset.id);
                if (onSelectAsset) onSelectAsset(asset);
              }}
            >
              {/* Hotspot pulse ring */}
              {isHot && (
                <circle r={nr + 3} fill="none"
                  stroke={ringColor}
                  strokeWidth="1" opacity="0.6">
                  <animate attributeName="r"
                    from={nr + 2} to={nr + 7} dur="2s" repeatCount="indefinite"/>
                  <animate attributeName="opacity"
                    from="0.6" to="0" dur="2s" repeatCount="indefinite"/>
                </circle>
              )}

              {/* Sentiment glow ring */}
              <circle r={nr + 2} fill="none"
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

              {/* Orb body */}
              <circle r={nr}
                fill={`color-mix(in srgb, ${sectorColor} 20%, #1a1d23 80%)`}
                stroke="rgba(255,255,255,0.08)"
                strokeWidth="0.5"
              />

              {/* Liquid wave fill */}
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

              {/* Sector accent */}
              <circle r={nr - 3} fill="none"
                stroke={sectorColor}
                strokeWidth="0.6" opacity="0.3"
              />

              {/* Specular highlight */}
              <circle r={nr} fill="url(#orbHighlight)" pointerEvents="none" />

              {/* Edge depth shadow */}
              <circle r={nr} fill="url(#orbDepth)" pointerEvents="none" />

              {/* Active selection ring */}
              {isAct && (
                <circle r={nr + 1} fill="none"
                  stroke="rgba(255,255,255,0.3)" strokeWidth="1"
                  strokeDasharray="3 2" opacity="0.8">
                  <animateTransform attributeName="transform" type="rotate"
                    from="0" to="360" dur="8s" repeatCount="indefinite"/>
                </circle>
              )}

              {/* Text: Symbol */}
              <text textAnchor="middle" dominantBaseline="central" y={-nr * 0.2}
                fontSize={isForexNode ? 8.5 : (dSym.length > 4 ? Math.max(7, nr / 3.4) : Math.max(9, nr / 2.6))}
                fontFamily="var(--font-mono)" fontWeight="700"
                fill="rgba(255,255,255,0.95)"
                letterSpacing="0.02em"
              >
                {dSym}
              </text>

              {/* Text: Change % */}
              <text textAnchor="middle" dominantBaseline="central" y={nr * 0.35}
                fontSize={Math.max(8, nr / 2.8)}
                fontFamily="var(--font-mono)" fontWeight="600"
                fill={isUp ? 'var(--bull)' : 'var(--bear)'}
              >
                {formatChangeBubble(asset.change)}
              </text>
            </g>
          );
        })}
      </svg>

      <CurrencyTooltip
        conversions={conversions}
        visible={showCurrency}
        x={currencyPos.x}
        y={currencyPos.y}
      />
    </div>
  );
}

const s = {
  wrap: {
    position: 'relative',
    width: '100%',
    background: 'var(--bg-card)',
    borderRadius: '12px',
    border: '1px solid var(--border-subtle)',
    overflow: 'hidden',
  },
  svg: {
    display: 'block',
    width: '100%',
    height: 'auto',
  },
};
