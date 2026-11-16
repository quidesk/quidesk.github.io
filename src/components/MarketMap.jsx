import React, { useState, useRef, useEffect } from 'react';
import { formatPrice, formatChange, CORRELATIONS, SECTOR_META, formatChangeBubble } from '../data/markets';
import CurrencyTooltip from './CurrencyTooltip';

// Fixed internal SVG coordinate system — CSS width:100% + height:auto scales it
export const INTERNAL_W = 1000;
export const INTERNAL_H = 500;

// Golden angle constant for sunflower / deterministic spiral distribution
export const GOLDEN_ANGLE = 2.399963229728653; // pi * (3 - sqrt(5))

export const ZONES = [
  { id:'equities', label:'EQUITIES', cx:0.19, cy:0.31, r:135, rx:0.22, ry:0.27, color:'#4d9eff' },
  { id:'crypto',   label:'CRYPTO',   cx:0.81, cy:0.31, r:135, rx:0.22, ry:0.27, color:'#a78bfa' },
  { id:'metals',   label:'METALS',   cx:0.19, cy:0.79, r:105, rx:0.21, ry:0.20, color:'#f0a500' },
  { id:'energy',   label:'ENERGY',   cx:0.81, cy:0.79, r:110, rx:0.23, ry:0.21, color:'#f97316' },
  { id:'forex',    label:'FOREX',    cx:0.50, cy:0.50, r:165, rx:0.24, ry:0.22, color:'#22d3ee' },
];

export const ZONE_HOME = {
  equities: { x:0.19, y:0.31 },
  crypto:   { x:0.81, y:0.31 },
  metals:   { x:0.19, y:0.79 },
  energy:   { x:0.81, y:0.79 },
  forex:    { x:0.50, y:0.50 },
};

/**
 * Computes deterministic golden-angle spiral initial positions from zone centers
 * scaled to ~0.6x radius so nodes start spread, not stacked. (Requirement 4b)
 */
export function computeGoldenSpiralPositions(assets, zones = ZONES) {
  const zoneMap = new Map(zones.map(z => [z.id, z]));
  const sectorGroups = {};
  assets.forEach(a => {
    if (!sectorGroups[a.sector]) sectorGroups[a.sector] = [];
    sectorGroups[a.sector].push(a);
  });

  const positions = {};
  for (const [sector, items] of Object.entries(sectorGroups)) {
    const z = zoneMap.get(sector);
    if (!z) continue;
    const n = items.length;
    items.forEach((item, i) => {
      if (n === 1) {
        positions[item.id] = { x: z.cx, y: z.cy };
        return;
      }
      const angle = i * GOLDEN_ANGLE;
      const rFrac = 0.6 * Math.sqrt((i + 0.5) / n);
      const effRx = z.rx * 0.85;
      const effRy = z.ry * 0.85;
      const px = z.cx + rFrac * effRx * Math.cos(angle);
      const py = z.cy + rFrac * effRy * Math.cos(angle - Math.PI / 2);
      positions[item.id] = { x: px, y: py };
    });
  }

  return positions;
}

// Fallback initial positions map
export const INITIAL_POSITIONS = {
  spx:      { x:0.13, y:0.23 },
  ndx:      { x:0.23, y:0.21 },
  dow:      { x:0.11, y:0.34 },
  aapl:     { x:0.24, y:0.29 },
  nvda:     { x:0.18, y:0.36 },
  tsla:     { x:0.12, y:0.41 },
  meta:     { x:0.25, y:0.39 },
  btc:      { x:0.76, y:0.22 },
  eth:      { x:0.86, y:0.25 },
  sol:      { x:0.88, y:0.19 },
  bnb:      { x:0.80, y:0.35 },
  xrp:      { x:0.74, y:0.31 },
  ada:      { x:0.87, y:0.37 },
  gold:     { x:0.14, y:0.76 },
  silver:   { x:0.23, y:0.81 },
  platinum: { x:0.15, y:0.83 },
  wti:      { x:0.76, y:0.76 },
  brent:    { x:0.85, y:0.81 },
  ng:       { x:0.86, y:0.73 },
  hoil:     { x:0.76, y:0.83 },
  eurusd:   { x:0.45, y:0.43 },
  gbpusd:   { x:0.55, y:0.43 },
  usdjpy:   { x:0.50, y:0.37 },
  audusd:   { x:0.42, y:0.51 },
  usdcad:   { x:0.58, y:0.51 },
  usdchf:   { x:0.50, y:0.58 },
  nzdusd:   { x:0.38, y:0.46 },
  eurgbp:   { x:0.62, y:0.46 },
  gbpjpy:   { x:0.44, y:0.35 },
  eurjpy:   { x:0.56, y:0.35 },
  usdinr:   { x:0.44, y:0.61 },
  eurinr:   { x:0.56, y:0.61 },
};

const METAL_BASE_LABELS = {
  gold: 'XAU',
  silver: 'XAG',
  platinum: 'XPT',
};

export function getAssetRadius(asset) {
  const isFx = (asset?.sector || '').toLowerCase() === 'forex';
  const baseR = isFx ? 15 : 19;
  const maxExtra = isFx ? 2.0 : 3.5;
  const extraR = Math.min(maxExtra, Math.abs(asset?.change || 0) * 0.4);
  return baseR + extraR;
}

export function getMapNodeLabel(asset) {
  const sec = (asset?.sector || '').toLowerCase();
  let dSym = asset?.symbol || '';
  if (sec === 'forex') {
    return dSym; // Full pair e.g. "EUR/USD" at 8-9px (Requirement 4d)
  }
  if (sec === 'metals') {
    if (asset?.id && METAL_BASE_LABELS[asset.id]) return METAL_BASE_LABELS[asset.id];
    const clean = dSym.replace('/USD', '').replace('USD', '').trim().toUpperCase();
    return METAL_BASE_LABELS[clean.toLowerCase()] || clean.slice(0, 5);
  }
  if (sec === 'crypto') {
    dSym = dSym.replace('/USD', '').replace('USDT', '').replace('USD', '');
  } else {
    if (dSym.includes('/')) dSym = dSym.split('/')[0];
    if (dSym.endsWith('USDT')) dSym = dSym.replace('USDT', '');
  }
  return dSym.length > 5 ? dSym.substring(0, 5) : dSym;
}

export function formatAssetTooltipMeta(asset) {
  const priceDisplay = typeof asset?.price === 'number' && Number.isFinite(asset.price)
    ? formatPrice(asset.price, asset.symbol, asset.sector)
    : '—';
  const changeDisplay = typeof asset?.change === 'number' && Number.isFinite(asset.change)
    ? formatChange(asset.change)
    : '—';
  const source = asset?.source || 'Yahoo Finance';
  const ts = asset?.quoteTs || asset?.timestamp;
  const asOf = ts ? new Date(ts).toLocaleTimeString('en-US', { timeZone: 'UTC', timeZoneName: 'short' }) : 'live';
  return {
    symbol: asset?.symbol || '',
    priceDisplay,
    changeDisplay,
    source,
    asOf,
  };
}

/**
 * Projects a node inside its assigned zone ellipse with 30px header clearance
 * and halves velocity components when clamped at the boundary. (Requirement 4c)
 */
export function clampNodeToEllipse(xPx, yPx, vx, vy, zone, nr, internalW = INTERNAL_W, internalH = INTERNAL_H) {
  if (!zone) {
    const pad = nr + 6;
    const clampedX = Math.max(pad, Math.min(internalW - pad, xPx));
    const clampedY = Math.max(pad, Math.min(internalH - pad, yPx));
    return {
      x: clampedX / internalW,
      y: clampedY / internalH,
      vx: clampedX !== xPx ? vx * 0.5 : vx,
      vy: clampedY !== yPx ? vy * 0.5 : vy,
    };
  }

  const cxPx = zone.cx * internalW;
  const cyPx = zone.cy * internalH;
  const rxp = Math.max(10, zone.rx * internalW - nr - 6);
  const ryp = Math.max(10, zone.ry * internalH - nr - 6);
  const minYPx = (zone.cy - zone.ry) * internalH + 30 + nr;

  let nx = xPx;
  let ny = yPx;
  let nvx = vx;
  let nvy = vy;

  // 1. Header clearance (30px clear at top for the zone header title)
  if (ny < minYPx) {
    ny = minYPx;
    nvy *= 0.5;
  }

  // 2. Exact ellipse boundary clamping
  const dx = nx - cxPx;
  const dy = ny - cyPx;
  const d = Math.hypot(dx / rxp, dy / ryp);
  if (d > 1) {
    nx = cxPx + dx / d;
    ny = cyPx + dy / d;
    nvx *= 0.5;
    nvy *= 0.5;

    // If normalized point violates header clearance, clamp y and find ellipse max dx
    if (ny < minYPx) {
      ny = minYPx;
      const dySlice = ny - cyPx;
      const yFrac = Math.min(1, Math.abs(dySlice) / ryp);
      const maxDx = rxp * Math.sqrt(Math.max(0, 1 - yFrac * yFrac));
      nx = Math.max(cxPx - maxDx, Math.min(cxPx + maxDx, nx));
      nvy *= 0.5;
    }
  }

  return {
    x: nx / internalW,
    y: ny / internalH,
    vx: nvx,
    vy: nvy,
  };
}

/**
 * Circle-packing repulsion + radial clamping loop inside category circles.
 */
export function packCategoryNodes(pos, assets, zones = ZONES, internalW = INTERNAL_W, internalH = INTERNAL_H) {
  const result = {};
  assets.forEach(a => {
    const p = pos[a.id] || INITIAL_POSITIONS[a.id] || { x: 0.5, y: 0.5 };
    result[a.id] = {
      x: p.x * internalW,
      y: p.y * internalH,
      vx: 0,
      vy: 0,
    };
  });

  const zoneMap = new Map(zones.map(z => [z.id, z]));

  for (let iter = 0; iter < 50; iter++) {
    // 1. Repulsion between nodes in the same category
    for (let i = 0; i < assets.length; i++) {
      const a1 = assets[i];
      const p1 = result[a1.id];
      if (!p1) continue;
      const r1 = getAssetRadius(a1);

      for (let j = i + 1; j < assets.length; j++) {
        const a2 = assets[j];
        if (a1.sector !== a2.sector) continue;
        const p2 = result[a2.id];
        if (!p2) continue;
        const r2 = getAssetRadius(a2);

        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.hypot(dx, dy) || 0.1;
        // Metals XAG and XPT: minimum center distance = r1 + r2 + 4 (Requirement 4d)
        const isMetals = a1.sector === 'metals';
        const targetDist = isMetals ? r1 + r2 + 4 : r1 + r2 + 3;

        if (dist < targetDist) {
          const overlap = (targetDist - dist) * 0.5;
          const nx = (dx / dist) * overlap;
          const ny = (dy / dist) * overlap;
          p1.x -= nx;
          p1.y -= ny;
          p2.x += nx;
          p2.y += ny;
        }
      }
    }

    // 2. Ellipse containment clamping
    assets.forEach(asset => {
      const p = result[asset.id];
      const z = zoneMap.get(asset.sector);
      if (!p || !z) return;
      const nr = getAssetRadius(asset);
      const clamped = clampNodeToEllipse(p.x, p.y, p.vx, p.vy, z, nr, internalW, internalH);
      p.x = clamped.x * internalW;
      p.y = clamped.y * internalH;
    });
  }

  // Convert back to fractions
  const normalized = {};
  assets.forEach(a => {
    const p = result[a.id];
    normalized[a.id] = {
      x: p.x / internalW,
      y: p.y / internalH,
      vx: 0,
      vy: 0,
    };
  });
  return normalized;
}

export function initNodeState(allAssets) {
  const spiralPositions = computeGoldenSpiralPositions(allAssets, ZONES);
  return packCategoryNodes(spiralPositions, allAssets, ZONES, INTERNAL_W, INTERNAL_H);
}

/**
 * Pure physics simulation step function.
 * Implements:
 * - 4c Ellipse clamping after physics step
 * - 4d Collision separation pass runs AFTER clamp (Metals XAG/XPT: r1 + r2 + 4)
 * - Boundary containment verification
 */
export function stepMarketMapSimulation(pos, assets, zones = ZONES, internalW = INTERNAL_W, internalH = INTERNAL_H, options = {}) {
  const next = {};
  const getRadius = options.getAssetRadius || getAssetRadius;
  const zoneById = new Map(zones.map((z) => [z.id, z]));

  // Step 1: Physics velocity integration & initial clamp to ellipse (Requirement 4c)
  assets.forEach(asset => {
    const p = pos[asset.id];
    if (!p) return;

    let fx = 0;
    let fy = 0;

    // Home anchor attraction
    const home = INITIAL_POSITIONS[asset.id] || ZONE_HOME[asset.sector] || { x: 0.5, y: 0.5 };
    fx += (home.x - p.x) * 0.0009;
    fy += (home.y - p.y) * 0.0009;

    // Damping and velocity
    const damping = 0.80;
    const nvx = (p.vx + fx) * damping;
    const nvy = (p.vy + fy) * damping;

    const nxPx = (p.x + nvx) * internalW;
    const nyPx = (p.y + nvy) * internalH;

    const z = zoneById.get(asset.sector);
    const nr = getRadius(asset);
    next[asset.id] = clampNodeToEllipse(nxPx, nyPx, nvx, nvy, z, nr, internalW, internalH);
  });

  // Step 2: Collision separation pass runs AFTER clamp (Requirement 4d)
  for (let iter = 0; iter < 3; iter++) {
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
        // Metals XAG and XPT: minimum center distance = r1 + r2 + 4
        const isMetals = a1.sector === 'metals';
        const minDist = isMetals ? getRadius(a1) + getRadius(a2) + 4 : getRadius(a1) + getRadius(a2) + 2.5;

        if (dist < minDist) {
          const overlap = minDist - dist;
          const sepX = (dx / dist) * (overlap * 0.5);
          const sepY = (dy / dist) * (overlap * 0.5);

          next[a1.id] = clampNodeToEllipse(
            p1.x * internalW - sepX,
            p1.y * internalH - sepY,
            p1.vx,
            p1.vy,
            zoneById.get(a1.sector),
            getRadius(a1),
            internalW,
            internalH
          );
          next[a2.id] = clampNodeToEllipse(
            p2.x * internalW + sepX,
            p2.y * internalH + sepY,
            p2.vx,
            p2.vy,
            zoneById.get(a2.sector),
            getRadius(a2),
            internalW,
            internalH
          );
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
  const [currencyPos, setCurrencyPos] = useState({ x: 0, y: 0 });
  const [conversions, setConversions] = useState([]);
  const [assetTooltipInfo, setAssetTooltipInfo] = useState(null);
  const [showCurrency, setShowCurrency] = useState(false);

  const containerRef = useRef(null);
  const positionsRef = useRef(initNodeState(allAssets || []));
  const nodeGRefs = useRef({});
  const corrLineRefs = useRef({});
  const newsLineRefs = useRef({});
  const animFrameRef = useRef(null);
  const assetsRef = useRef(allAssets || []);
  assetsRef.current = allAssets || [];

  useEffect(() => {
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setContainerW(entry.contentRect.width);
        }
      }
    });
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const activeId = hovered || selected;
  const hotspotIds = new Set(hotspots.map(h => h.assetId));

  // Requirement 4f: Remove static correlation line if either asset is missing or has null/non-positive price
  const assetMap = new Map((allAssets || []).map(a => [a.id, a]));
  const visibleCorrs = CORRELATIONS.filter(c => {
    const assetA = assetMap.get(c.a);
    const assetB = assetMap.get(c.b);
    if (!assetA || !assetB || assetA.status === 'unavailable' || assetB.status === 'unavailable' ||
        typeof assetA.price !== 'number' || assetA.price <= 0 ||
        typeof assetB.price !== 'number' || assetB.price <= 0) {
      return false;
    }
    if (activeId) return c.a === activeId || c.b === activeId;
    return Math.abs(c.r) > 0.85;
  });

  const visibleCorrsRef = useRef(visibleCorrs);
  visibleCorrsRef.current = visibleCorrs;
  const newsCorrsRef = useRef(newsCorrelations || []);
  newsCorrsRef.current = newsCorrelations || [];

  // Physics animation loop throttled to <= 30fps using direct SVG DOM attribute mutations
  useEffect(() => {
    if (!allAssets.length) return;

    let lastTime = 0;
    const FRAME_MS = 33;

    function animate(now) {
      if (now - lastTime >= FRAME_MS) {
        lastTime = now;
        const assets = assetsRef.current;
        const pos = positionsRef.current;
        const nextPos = stepMarketMapSimulation(pos, assets, ZONES, INTERNAL_W, INTERNAL_H);
        positionsRef.current = nextPos;

        for (let i = 0; i < assets.length; i++) {
          const a = assets[i];
          const el = nodeGRefs.current[a.id];
          const np = nextPos[a.id];
          if (el && np) {
            el.setAttribute('transform', `translate(${(np.x * INTERNAL_W).toFixed(1)}, ${(np.y * INTERNAL_H).toFixed(1)})`);
          }
        }

        const corrs = visibleCorrsRef.current;
        for (let i = 0; i < corrs.length; i++) {
          const c = corrs[i];
          const k = `${c.a}-${c.b}`;
          const lineEl = corrLineRefs.current[k];
          const pa = nextPos[c.a];
          const pb = nextPos[c.b];
          if (lineEl && pa && pb) {
            lineEl.setAttribute('x1', (pa.x * INTERNAL_W).toFixed(1));
            lineEl.setAttribute('y1', (pa.y * INTERNAL_H).toFixed(1));
            lineEl.setAttribute('x2', (pb.x * INTERNAL_W).toFixed(1));
            lineEl.setAttribute('y2', (pb.y * INTERNAL_H).toFixed(1));
          }
        }

        const newsCorrs = newsCorrsRef.current;
        for (let i = 0; i < newsCorrs.length; i++) {
          const c = newsCorrs[i];
          const k = `news-${i}`;
          const lineEl = newsLineRefs.current[k];
          const pa = nextPos[c.a];
          const pb = nextPos[c.b];
          if (lineEl && pa && pb) {
            lineEl.setAttribute('x1', (pa.x * INTERNAL_W).toFixed(1));
            lineEl.setAttribute('y1', (pa.y * INTERNAL_H).toFixed(1));
            lineEl.setAttribute('x2', (pb.x * INTERNAL_W).toFixed(1));
            lineEl.setAttribute('y2', (pb.y * INTERNAL_H).toFixed(1));
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(animate);
    }

    animFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [allAssets.length]);

  const getPos = (id) => {
    const p = positionsRef.current[id] || INITIAL_POSITIONS[id];
    return p ? { x: p.x * INTERNAL_W, y: p.y * INTERNAL_H } : null;
  };

  const handleNodeMouseEnter = (e, asset) => {
    setHovered(asset.id);
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setCurrencyPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      const convs = convertPrice ? convertPrice(asset.price, asset.symbol, asset.sector) : [];
      setConversions(convs);
      setAssetTooltipInfo({
        symbol: asset.symbol,
        name: asset.name,
        price: asset.price,
        change: asset.change,
        sector: asset.sector,
        source: asset.source || 'Yahoo Finance',
        quoteTs: asset.quoteTs || asset.timestamp,
        status: asset.status,
      });
      setShowCurrency(true);
    }
  };

  const handleNodeMouseMove = (e) => {
    if (containerRef.current && showCurrency) {
      const rect = containerRef.current.getBoundingClientRect();
      setCurrencyPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  const handleNodeMouseLeave = () => {
    setHovered(null);
    setShowCurrency(false);
  };

  const handleNodeClick = (asset) => {
    setSelected(prev => prev === asset.id ? null : asset.id);
    if (onSelectAsset) onSelectAsset(asset);
  };

  return (
    <div style={s.wrap} ref={containerRef}>
      <svg
        viewBox={`0 0 ${INTERNAL_W} ${INTERNAL_H}`}
        style={s.svg}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* Liquid Glass Wave Filter & Geometry */}
          <path id="liquidWave" d="M 0 0 Q 22.5 -8 45 0 T 90 0 T 135 0 T 180 0 V 45 H 0 Z" />

          {/* Spherical specular highlight */}
          <radialGradient id="orbHighlight" cx="32%" cy="28%" r="65%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
            <stop offset="30%" stopColor="#ffffff" stopOpacity="0.15" />
            <stop offset="60%" stopColor="#ffffff" stopOpacity="0.0" />
          </radialGradient>

          {/* Rim depth shadow */}
          <radialGradient id="orbDepth" cx="50%" cy="50%" r="50%">
            <stop offset="75%" stopColor="#000000" stopOpacity="0" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.55" />
          </radialGradient>

          {/* Node clip paths */}
          {allAssets.map(asset => {
            const nr = getAssetRadius(asset);
            return (
              <clipPath key={`clip-${asset.id}`} id={`clip-${asset.id}`}>
                <circle r={nr} cx="0" cy="0" />
              </clipPath>
            );
          })}
        </defs>

        {/* Category Zones (<ellipse>) */}
        {ZONES.map(z => {
          const sec = SECTOR_META[z.id] || {};
          const cx = z.cx * INTERNAL_W;
          const cy = z.cy * INTERNAL_H;
          const rx = z.rx * INTERNAL_W;
          const ry = z.ry * INTERNAL_H;

          return (
            <g key={z.id}>
              <ellipse
                cx={cx} cy={cy} rx={rx} ry={ry}
                fill="rgba(255,255,255,0.015)"
                stroke={sec.color || z.color}
                strokeWidth="1"
                strokeDasharray="4 4"
                opacity="0.35"
              />
              <text
                x={cx}
                y={cy - ry + 18}
                textAnchor="middle"
                fontFamily="var(--font-mono)"
                fontSize="9"
                fontWeight="700"
                fill={sec.color || z.color}
                letterSpacing="0.12em"
                opacity="0.75"
              >
                {z.label}
              </text>
            </g>
          );
        })}

        {/* Correlation lines — labeled illustrative (Requirement 4f) */}
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
              ref={el => {
                const k = `${c.a}-${c.b}`;
                if (el) corrLineRefs.current[k] = el;
                else delete corrLineRefs.current[k];
              }}
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
                ref={el => {
                  const k = `news-${i}`;
                  if (el) newsLineRefs.current[k] = el;
                  else delete newsLineRefs.current[k];
                }}
                x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y}
                stroke={c.color || 'var(--accent)'}
                strokeWidth="1.2"
                strokeDasharray="4 3"
                opacity={Math.min(0.7, c.strength * 0.8)}
              />
            </g>
          );
        })}

        {/* Asset Nodes */}
        {allAssets.map(asset => {
          const nr = getAssetRadius(asset);
          const initP = positionsRef.current[asset.id] || INITIAL_POSITIONS[asset.id] || { x: 0.5, y: 0.5 };
          const isHov = hovered === asset.id;
          const isSel = selected === asset.id;
          const isAct = isHov || isSel;
          const isHot = hotspotIds.has(asset.id);
          const stale = (typeof isStale === 'function' ? isStale(asset.id, asset.sector) : Boolean(isStale))
            || asset.status === 'stale'
            || asset.status === 'unavailable';

          const hasPrice = asset.status !== 'unavailable' && typeof asset.price === 'number' && Number.isFinite(asset.price) && asset.price > 0;
          const rawChg = asset.changePercent ?? asset.change;
          const hasChg = hasPrice && typeof rawChg === 'number' && Number.isFinite(rawChg);
          const isFlat = hasChg && Math.abs(rawChg) < 0.005;
          const isUp = hasChg && rawChg > 0;

          // Requirement 4e: Muted node when price or change is null/unavailable
          const isMuted = !hasPrice;

          const baseColor = (!hasChg || isFlat)
            ? 'var(--color-stone, #639CC5)'
            : (isUp ? '#10b981' : 'var(--accent-scarlet, #EB2F33)');

          const waveBright = (!hasChg || isFlat)
            ? 'rgba(99,156,197,0.30)'
            : (isUp ? 'rgba(16,185,129,0.38)' : 'rgba(235,47,51,0.38)');

          const waveSoft = (!hasChg || isFlat)
            ? 'rgba(100,116,139,0.18)'
            : (isUp ? 'rgba(16,185,129,0.20)' : 'rgba(239,68,68,0.20)');

          const sectorColor = SECTOR_META[asset.sector]?.color || '#4d9eff';
          const dSym = getMapNodeLabel(asset);
          const isForexNode = (asset.sector || '').toLowerCase() === 'forex';
          const tipMeta = formatAssetTooltipMeta(asset);

          return (
            <g
              key={asset.id}
              ref={el => {
                if (el) nodeGRefs.current[asset.id] = el;
                else delete nodeGRefs.current[asset.id];
              }}
              transform={`translate(${(initP.x * INTERNAL_W).toFixed(1)}, ${(initP.y * INTERNAL_H).toFixed(1)})`}
              style={{
                cursor: 'pointer',
                opacity: isMuted ? 0.35 : (stale ? 0.55 : 1),
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={(e) => handleNodeMouseEnter(e, asset)}
              onMouseMove={handleNodeMouseMove}
              onMouseLeave={handleNodeMouseLeave}
              onClick={() => handleNodeClick(asset)}
            >
              <title>{`${tipMeta.symbol} · ${tipMeta.priceDisplay} (${tipMeta.changeDisplay}) · ${tipMeta.source} · As of ${tipMeta.asOf}`}</title>
              {/* Hotspot radar pulse */}
              {isHot && (
                <circle r={nr + 8} fill="none"
                  stroke="var(--accent)" strokeWidth="1.2"
                  strokeDasharray="4 2" opacity="0.7">
                  <animate attributeName="r" values={`${nr + 4};${nr + 14};${nr + 4}`} dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.7;0;0.7" dur="2s" repeatCount="indefinite" />
                </circle>
              )}

              {/* Outer boundary ring */}
              <circle r={nr}
                fill="var(--bg-card, #0f172a)"
                stroke={isAct ? '#ffffff' : (stale ? 'var(--text-dim)' : baseColor)}
                strokeWidth={isAct ? '2' : '1'}
                style={{ filter: isAct ? `drop-shadow(0 0 8px ${baseColor})` : 'none' }}
              />

              {/* Glass base reflection */}
              <circle r={nr - 1} fill="rgba(255,255,255,0.04)"
                stroke="rgba(255,255,255,0.12)"
                strokeWidth="0.5"
              />

              {/* Liquid wave fill */}
              <g clipPath={`url(#clip-${asset.id})`}>
                <use href="#liquidWave" fill={waveBright} y={nr * 0.05}>
                  <animateTransform attributeName="transform" type="translate"
                    from="0 0" to="-90 0" dur="3s" repeatCount="indefinite" />
                </use>
                <use href="#liquidWave" fill={waveSoft} y={nr * -0.15}>
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

              {/* Text: Change % — Requirement 4e: shows % when non-null; null shows "—" */}
              <text textAnchor="middle" dominantBaseline="central" y={nr * 0.35}
                fontSize={Math.max(8, nr / 2.8)}
                fontFamily="var(--font-mono)" fontWeight="600"
                fill={!hasChg || isFlat ? 'var(--text-dim)' : (isUp ? 'var(--bull)' : 'var(--bear)')}
              >
                {hasChg ? formatChangeBubble(rawChg) : '—'}
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
        assetInfo={assetTooltipInfo}
      />
    </div>
  );
}

const s = {
  wrap: {
    position: 'relative',
    width: '100%',
    background: 'var(--bg-egyptian, #032035)',
    borderRadius: '12px',
    border: '1px solid var(--border-stone, #639CC5)',
    overflow: 'hidden',
    boxShadow: '0 8px 32px rgba(2, 24, 39, 0.60)',
  },
  svg: {
    display: 'block',
    width: '100%',
    height: 'auto',
  },
};
