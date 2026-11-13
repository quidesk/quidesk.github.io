import React, { useState, useRef, useEffect } from 'react';
import { formatPrice, formatChange, CORRELATIONS, SECTOR_META, formatChangeBubble } from '../data/markets';
import CurrencyTooltip from './CurrencyTooltip';

// Fixed internal SVG coordinate system — CSS width:100% + height:auto scales it
export const INTERNAL_W = 1000;
export const INTERNAL_H = 500;

// Initial positions as fractions of canvas
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
  // Forex — 12 pairs distributed evenly across the FOREX circle (center: 0.50, 0.50, r: 155)
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

export const ZONES = [
  { id:'equities', label:'EQUITIES', cx:0.19, cy:0.31, r:135, rx:0.22, ry:0.27, color:'#4d9eff' },
  { id:'crypto',   label:'CRYPTO',   cx:0.81, cy:0.31, r:135, rx:0.22, ry:0.27, color:'#a78bfa' },
  { id:'metals',   label:'METALS',   cx:0.19, cy:0.79, r:90,  rx:0.20, ry:0.18, color:'#f0a500' },
  { id:'energy',   label:'ENERGY',   cx:0.81, cy:0.79, r:95,  rx:0.22, ry:0.19, color:'#f97316' },
  { id:'forex',    label:'FOREX',    cx:0.50, cy:0.50, r:155, rx:0.22, ry:0.20, color:'#22d3ee' },
];

export const ZONE_HOME = {
  equities: { x:0.19, y:0.31 },
  crypto:   { x:0.81, y:0.31 },
  metals:   { x:0.19, y:0.79 },
  energy:   { x:0.81, y:0.79 },
  forex:    { x:0.50, y:0.50 },
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
    return dSym;
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

/**
 * Projects a node inside its assigned zone circle/ellipse with 30px header clearance
 * and halves velocity components when clamped at the boundary.
 */
export function clampNodeToEllipse(xPx, yPx, vx, vy, zone, nr, internalW = INTERNAL_W, internalH = INTERNAL_H) {
  if (!zone) {
    const padX = (nr + 6);
    const padY = (nr + 6);
    const clampedX = Math.max(padX, Math.min(internalW - padX, xPx));
    const clampedY = Math.max(padY, Math.min(internalH - padY, yPx));
    return {
      x: clampedX / internalW,
      y: clampedY / internalH,
      vx: clampedX !== xPx ? vx * 0.5 : vx,
      vy: clampedY !== yPx ? vy * 0.5 : vy,
    };
  }

  const cxPx = zone.cx * internalW;
  const cyPx = zone.cy * internalH;
  const rxp = Math.max(1, zone.rx * internalW - nr - 6);
  const ryp = Math.max(1, zone.ry * internalH - nr - 6);
  const minYPx = (zone.cy - zone.ry) * internalH + 30 + nr;

  let nx = xPx;
  let ny = yPx;
  let nvx = vx;
  let nvy = vy;

  if (zone.r) {
    const maxR = Math.max(10, zone.r - nr - 8);
    const cdist = Math.hypot(nx - cxPx, ny - cyPx);
    if (cdist > maxR) {
      nx = cxPx + ((nx - cxPx) / cdist) * maxR;
      ny = cyPx + ((ny - cyPx) / cdist) * maxR;
      nvx *= 0.5;
      nvy *= 0.5;
    }
  }

  const dx = nx - cxPx;
  const dy = ny - cyPx;
  const d = Math.hypot(dx / rxp, dy / ryp);
  if (d > 1) {
    nx = cxPx + dx / d;
    ny = cyPx + dy / d;
    nvx *= 0.5;
    nvy *= 0.5;
  }

  if (ny < minYPx) {
    ny = minYPx;
    const dySlice = ny - cyPx;
    const yFrac = Math.min(1, Math.abs(dySlice) / ryp);
    const maxDx = rxp * Math.sqrt(Math.max(0, 1 - yFrac * yFrac));
    nx = Math.max(cxPx - maxDx, Math.min(cxPx + maxDx, nx));
    nvy *= 0.5;
  }

  return {
    x: nx / internalW,
    y: ny / internalH,
    vx: nvx,
    vy: nvy,
  };
}

/**
 * 50-iteration circle-packing repulsion + radial clamping loop
 * (dist <= zone.r - node.r - 8) so nodes distribute evenly inside category circles.
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
        const targetDist = r1 + r2 + 4;

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

    // 2. Radial clamping: dist <= zone.r - node.r - 8
    assets.forEach(asset => {
      const p = result[asset.id];
      const z = zoneMap.get(asset.sector);
      if (!p || !z) return;
      const nr = getAssetRadius(asset);
      const cxPx = z.cx * internalW;
      const cyPx = z.cy * internalH;
      const maxR = Math.max(10, (z.r || 100) - nr - 8);

      const dx = p.x - cxPx;
      const dy = p.y - cyPx;
      const dist = Math.hypot(dx, dy);
      if (dist > maxR) {
        p.x = cxPx + (dx / dist) * maxR;
        p.y = cyPx + (dy / dist) * maxR;
      }
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
  return packCategoryNodes(state, allAssets, ZONES, INTERNAL_W, INTERNAL_H);
}

/**
 * Pure physics simulation step function.
 * Implements exact ellipse containment projection, weakened cross-zone sentiment,
 * 30px header clearance, halved boundary velocity, and collision resolution.
 */
export function stepMarketMapSimulation(pos, assets, zones = ZONES, internalW = INTERNAL_W, internalH = INTERNAL_H, options = {}) {
  const next = {};
  const getRadius = options.getAssetRadius || getAssetRadius;
  const zoneById = new Map(zones.map((z) => [z.id, z]));

  assets.forEach(asset => {
    const p = pos[asset.id];
    if (!p) return;

    let fx = 0;
    let fy = 0;

    // 1. Home anchor attraction (weakened cross-zone sentiment attraction keeps zones clean)
    const home = INITIAL_POSITIONS[asset.id] || ZONE_HOME[asset.sector] || { x: 0.5, y: 0.5 };
    fx += (home.x - p.x) * 0.0009;
    fy += (home.y - p.y) * 0.0009;

    // Very weak same-sign sentiment cohesion within sector only
    const hasChg = typeof asset.change === 'number' && Number.isFinite(asset.change);
    assets.forEach(other => {
      if (other.id === asset.id) return;
      const op = pos[other.id];
      if (!op) return;

      if (other.sector === asset.sector) {
        const dx = (op.x - p.x) * internalW;
        const dy = (op.y - p.y) * internalH;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const minDist = getRadius(asset) + getRadius(other) + 6;
        if (dist < minDist) {
          const overlap = (minDist - dist) / minDist;
          fx -= (dx / dist) * overlap * 0.003;
          fy -= (dy / dist) * overlap * 0.003;
        }
      } else if (hasChg && typeof other.change === 'number' && Math.sign(other.change) === Math.sign(asset.change)) {
        // Negligible cross-zone sentiment pull so nodes stay cleanly inside own ellipse
        fx += (op.x - p.x) * 0.000015;
        fy += (op.y - p.y) * 0.000015;
      }
    });

    // 2. Damping and velocity
    const damping = 0.80;
    const nvx = (p.vx + fx) * damping;
    const nvy = (p.vy + fy) * damping;

    const nxPx = (p.x + nvx) * internalW;
    const nyPx = (p.y + nvy) * internalH;

    // 3. Project inside zone ellipse with 30px header clearance (halves velocity on clamp)
    const z = zoneById.get(asset.sector);
    const nr = getRadius(asset);
    next[asset.id] = clampNodeToEllipse(nxPx, nyPx, nvx, nvy, z, nr, internalW, internalH);
  });

  // 4. Collision separation pass + ellipse re-projection
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
        const minDist = getRadius(a1) + getRadius(a2) + 2;

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
  const animFrameRef = useRef(null);
  const positionsRef = useRef({});
  const nodeGroupRefs = useRef({});
  const corrLineRefs = useRef({});
  const newsLineRefs = useRef({});
  const assetsRef = useRef(allAssets);
  const currTimerRef = useRef(null);

  useEffect(() => { assetsRef.current = allAssets; }, [allAssets]);

  // Ensure every asset has an initial node position without per-frame React state
  if (allAssets.length && Object.keys(positionsRef.current).length === 0) {
    positionsRef.current = initNodeState(allAssets);
  }
  useEffect(() => {
    if (!allAssets.length) return;
    const cur = { ...positionsRef.current };
    let changed = false;
    allAssets.forEach((asset) => {
      if (!cur[asset.id]) {
        const init = INITIAL_POSITIONS[asset.id] || { x: 0.5, y: 0.5 };
        cur[asset.id] = { x: init.x, y: init.y, vx: 0, vy: 0 };
        changed = true;
      }
    });
    if (changed) positionsRef.current = cur;
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

  const activeId = hovered || selected;
  const hotspotIds = new Set(hotspots.map(h => h.assetId));

  const visibleCorrs = CORRELATIONS.filter(c => {
    if (activeId) return c.a === activeId || c.b === activeId;
    return Math.abs(c.r) > 0.85;
  });

  const visibleCorrsRef = useRef(visibleCorrs);
  visibleCorrsRef.current = visibleCorrs;
  const newsCorrsRef = useRef(newsCorrelations || []);
  newsCorrsRef.current = newsCorrelations || [];

  // Physics animation loop throttled to <= 30fps using direct SVG DOM attribute mutations (no setState per frame)
  useEffect(() => {
    if (!allAssets.length) return;

    let lastTime = 0;
    const FRAME_MS = 33;

    function animate(now) {
      if (now - lastTime >= FRAME_MS) {
        lastTime = now;
        const assets = assetsRef.current;
        const pos = positionsRef.current;
        if (assets.length && Object.keys(pos).length) {
          const next = stepMarketMapSimulation(pos, assets, ZONES, INTERNAL_W, INTERNAL_H, { getAssetRadius });
          positionsRef.current = next;

          for (const asset of assets) {
            const p = next[asset.id];
            const el = nodeGroupRefs.current[asset.id];
            if (p && el) {
              el.setAttribute(
                'transform',
                `translate(${(p.x * INTERNAL_W).toFixed(2)},${(p.y * INTERNAL_H).toFixed(2)})`
              );
            }
          }

          for (const c of visibleCorrsRef.current) {
            const pa = next[c.a];
            const pb = next[c.b];
            const lineEl = corrLineRefs.current[`${c.a}-${c.b}`];
            if (pa && pb && lineEl) {
              lineEl.setAttribute('x1', (pa.x * INTERNAL_W).toFixed(2));
              lineEl.setAttribute('y1', (pa.y * INTERNAL_H).toFixed(2));
              lineEl.setAttribute('x2', (pb.x * INTERNAL_W).toFixed(2));
              lineEl.setAttribute('y2', (pb.y * INTERNAL_H).toFixed(2));
            }
          }

          newsCorrsRef.current.forEach((c, idx) => {
            const pa = next[c.a];
            const pb = next[c.b];
            const lineEl = newsLineRefs.current[`news-${idx}`];
            if (pa && pb && lineEl) {
              lineEl.setAttribute('x1', (pa.x * INTERNAL_W).toFixed(2));
              lineEl.setAttribute('y1', (pa.y * INTERNAL_H).toFixed(2));
              lineEl.setAttribute('x2', (pb.x * INTERNAL_W).toFixed(2));
              lineEl.setAttribute('y2', (pb.y * INTERNAL_H).toFixed(2));
            }
          });
        }
      }
      animFrameRef.current = requestAnimationFrame(animate);
    }

    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [allAssets.length]);

  function getPos(id) {
    const p = positionsRef.current[id] || INITIAL_POSITIONS[id];
    if (!p) return null;
    return { x: p.x * INTERNAL_W, y: p.y * INTERNAL_H };
  }

  function formatAssetTooltipMeta(asset) {
    const hasPrice = asset.status !== 'unavailable' && typeof asset.price === 'number' && Number.isFinite(asset.price);
    const rawChg = asset.changePercent ?? asset.change;
    const chg = asset.status !== 'unavailable' && typeof rawChg === 'number' && Number.isFinite(rawChg) ? rawChg : null;
    const ts = typeof asset.quoteTs === 'number' && Number.isFinite(asset.quoteTs)
      ? asset.quoteTs
      : (typeof asset.timestamp === 'number' && Number.isFinite(asset.timestamp) ? asset.timestamp : null);
    const asOf = ts
      ? new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short' })
      : '—';
    const isFxInr = (asset.sector || '').toLowerCase() === 'forex' && (
      asset.symbol?.endsWith('/INR') || asset.symbol?.endsWith('INR')
    );
    const formattedPrice = formatPrice(asset.price, asset.symbol, asset.sector);
    return {
      symbol: asset.symbol,
      priceDisplay: hasPrice ? (isFxInr ? `₹${formattedPrice}` : formattedPrice) : '—',
      changeDisplay: chg === null ? '—' : formatChange(chg),
      source: asset.source || 'Worker',
      asOf,
    };
  }

  function handleNodeEnter(asset) {
    setHovered(asset.id);
    clearTimeout(currTimerRef.current);
    const hasPrice = asset.status !== 'unavailable' && typeof asset.price === 'number' && Number.isFinite(asset.price) && asset.price > 0;
    if (convertPrice && hasPrice) setConversions(convertPrice(asset));
    else setConversions([]);
    setAssetTooltipInfo(formatAssetTooltipMeta(asset));

    currTimerRef.current = setTimeout(() => {
      const pos = positionsRef.current[asset.id] || INITIAL_POSITIONS[asset.id];
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
    }, 250);
  }

  function handleNodeLeave() {
    setHovered(null);
    clearTimeout(currTimerRef.current);
    setShowCurrency(false);
    setAssetTooltipInfo(null);
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

        {/* Zone boundaries — 5-zone category circles inside viewBox="0 0 1000 500" */}
        {ZONES.map(z => {
          const cx = z.cx * INTERNAL_W;
          const cy = z.cy * INTERNAL_H;
          const r = z.r;
          return (
            <g key={z.id}>
              <ellipse
                cx={cx} cy={cy} rx={r} ry={r}
                fill="none"
                stroke={z.color}
                strokeWidth="0.8"
                opacity="0.25"
                strokeDasharray="4 3"
              />
              <text
                x={cx} y={cy - r + 18}
                textAnchor="middle"
                fontSize="10" fontFamily="var(--font-mono)" fontWeight="700"
                fill={z.color} opacity="0.75"
                letterSpacing="0.1em"
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

        {/* Asset nodes — Frosted Glass Orbs */}
        {allAssets.map(asset => {
          const pos = getPos(asset.id);
          if (!pos) return null;
          
          const nr = getAssetRadius(asset);
          const meta = SECTOR_META[asset.sector] || {};
          const rawChg = asset.changePercent ?? asset.change;
          const hasChg = asset.status !== 'unavailable' && typeof rawChg === 'number' && Number.isFinite(rawChg);
          const isFlat = hasChg && Math.abs(rawChg) < 0.005;
          const isUp = hasChg && rawChg >= 0;
          const isHot = hotspotIds.has(asset.id);
          const isAct = activeId === asset.id;
          const absChg = hasChg ? Math.abs(rawChg) : 0;
          const intensity = Math.min(1, absChg / 8);

          // Sentiment ring color
          const ringColor = (!hasChg || isFlat)
            ? 'rgba(139,148,158,0.45)'
            : isUp
            ? `rgba(52,211,153,${0.5 + intensity * 0.5})`
            : `rgba(248,113,113,${0.5 + intensity * 0.5})`;
          const waveBright = (!hasChg || isFlat)
            ? 'rgba(139,148,158,0.35)'
            : (isUp ? 'rgba(52,211,153,0.55)' : 'rgba(248,113,113,0.55)');
          const waveSoft = (!hasChg || isFlat)
            ? 'rgba(139,148,158,0.18)'
            : (isUp ? 'rgba(52,211,153,0.3)' : 'rgba(248,113,113,0.3)');
          const ringWidth = (!hasChg || isFlat) ? 1.2 : (1.5 + intensity * 2.5);
          const sectorColor = meta.color || '#6b7280';

          const isForexNode = (asset.sector || '').toLowerCase() === 'forex';
          const dSym = getMapNodeLabel(asset);
          const tipMeta = formatAssetTooltipMeta(asset);

          const stale = (isStale && isStale(asset.id, asset.sector)) || asset.status === 'stale' || asset.status === 'unavailable';
          const staleOpacity = stale ? 0.35 : 1;

          return (
            <g key={asset.id}
              ref={el => {
                if (el) nodeGroupRefs.current[asset.id] = el;
                else delete nodeGroupRefs.current[asset.id];
              }}
              transform={`translate(${pos.x},${pos.y})`}
              style={{ cursor:'pointer', opacity: staleOpacity, transition: 'opacity 0.4s' }}
              onMouseEnter={() => handleNodeEnter(asset)}
              onMouseLeave={handleNodeLeave}
              onClick={() => {
                setSelected(p => p === asset.id ? null : asset.id);
                if (onSelectAsset) onSelectAsset(asset);
              }}
            >
              <title>{`${tipMeta.symbol} · ${tipMeta.priceDisplay} (${tipMeta.changeDisplay}) · ${tipMeta.source} · As of ${tipMeta.asOf}`}</title>
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

              {/* Text: Change % */}
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
