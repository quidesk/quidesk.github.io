import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import MarketMap, {
  stepMarketMapSimulation,
  initNodeState,
  getAssetRadius,
  getMapNodeLabel,
  ZONES,
  ZONE_HOME,
  INITIAL_POSITIONS,
  INTERNAL_W,
  INTERNAL_H,
} from './MarketMap';
import TickerTape from './TickerTape';
import { ALL_ASSETS } from '../data/markets';

describe('Phase 6: MarketMap Physics, Ellipse Geometry & TickerTape Suite', () => {
  it('includes forex in ZONE_HOME, hoil in INITIAL_POSITIONS, no rbob/copper, and <= 55% forex packing', () => {
    expect(ZONE_HOME.forex).toBeDefined();
    expect(INITIAL_POSITIONS.hoil).toBeDefined();
    expect(INITIAL_POSITIONS.rbob).toBeUndefined();
    expect(INITIAL_POSITIONS.copper).toBeUndefined();
    expect(ALL_ASSETS.some((a) => a.id === 'rbob' || a.id === 'copper')).toBe(false);

    const fxZone = ZONES.find((z) => z.id === 'forex');
    expect(fxZone.rx).toBeGreaterThanOrEqual(0.22);
    expect(fxZone.ry).toBeGreaterThanOrEqual(0.16);

    const fxAssets = ALL_ASSETS.filter((a) => a.sector === 'forex');
    const fxRadii = fxAssets.map((a) => getAssetRadius({ ...a, change: 1.0 }));
    fxRadii.forEach((r) => expect(r).toBeLessThanOrEqual(17.5));

    const circlesArea = fxRadii.reduce((acc, r) => acc + Math.PI * r * r, 0);
    const ellipseArea = Math.PI * (fxZone.rx * INTERNAL_W) * (fxZone.ry * INTERNAL_H);
    expect(circlesArea / ellipseArea).toBeLessThanOrEqual(0.55);
  });

  it('executes 1,000 simulation ticks with 0 boundary breaches and 0 overlaps', () => {
    expect(ALL_ASSETS.length).toBeGreaterThanOrEqual(32);

    let positions = initNodeState(ALL_ASSETS);
    let boundaryBreaches = 0;
    let overlaps = 0;

    for (let tick = 1; tick <= 1000; tick++) {
      positions = stepMarketMapSimulation(
        positions,
        ALL_ASSETS,
        ZONES,
        INTERNAL_W,
        INTERNAL_H,
        { getAssetRadius }
      );

      // Verify boundary containment every 10 ticks and on tick 1,000
      if (tick % 10 === 0 || tick === 1000) {
        ALL_ASSETS.forEach(asset => {
          const p = positions[asset.id];
          expect(p, `Missing position for ${asset.id}`).toBeDefined();
          expect(Number.isFinite(p.x)).toBe(true);
          expect(Number.isFinite(p.y)).toBe(true);

          const z = ZONES.find(zone => zone.id === asset.sector);
          if (z) {
            const nr = getAssetRadius(asset);
            const effRx = Math.max(0.01, z.rx - (nr + 6) / INTERNAL_W);
            const effRy = Math.max(0.01, z.ry - (nr + 6) / INTERNAL_H);

            // Ellipse equation: ((x - cx) / effRx)^2 + ((y - cy) / effRy)^2 <= 1.002
            const dx = p.x - z.cx;
            const dy = p.y - z.cy;
            const normDistSq = (dx / effRx) ** 2 + (dy / effRy) ** 2;

            if (normDistSq > 1.002) {
              boundaryBreaches++;
            }

            // Header clearance check (30px from top of zone bounding box)
            const minY = (z.cy - z.ry) + ((30 + nr) / INTERNAL_H);
            if (p.y < minY - 0.002) {
              boundaryBreaches++;
            }
          }
        });

        // Check for node collisions / overlaps within the same sector
        for (let i = 0; i < ALL_ASSETS.length; i++) {
          const a1 = ALL_ASSETS[i];
          const p1 = positions[a1.id];
          if (!p1) continue;

          for (let j = i + 1; j < ALL_ASSETS.length; j++) {
            const a2 = ALL_ASSETS[j];
            if (a1.sector !== a2.sector) continue;
            const p2 = positions[a2.id];
            if (!p2) continue;

            const dx = (p2.x - p1.x) * INTERNAL_W;
            const dy = (p2.y - p1.y) * INTERNAL_H;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const minAllowedDist = getAssetRadius(a1) + getAssetRadius(a2);

            if (dist < minAllowedDist - 1.5) {
              overlaps++;
            }
          }
        }
      }
    }

    expect(boundaryBreaches, 'Boundary breaches detected across simulation').toBe(0);
    expect(overlaps, 'Overlapping nodes detected across simulation').toBe(0);
  });

  it('renders <ellipse> zone boundaries, base-only metals labels (XAU), full forex pairs at 8.5px, and full tooltip metadata', () => {
    expect(getMapNodeLabel({ id: 'gold', symbol: 'XAU/USD', sector: 'metals' })).toBe('XAU');
    expect(getMapNodeLabel({ id: 'silver', symbol: 'XAG/USD', sector: 'metals' })).toBe('XAG');
    expect(getMapNodeLabel({ id: 'platinum', symbol: 'XPT/USD', sector: 'metals' })).toBe('XPT');
    expect(getMapNodeLabel({ id: 'eurusd', symbol: 'EUR/USD', sector: 'forex' })).toBe('EUR/USD');

    const sampleAssets = [
      { id: 'gold', symbol: 'XAU/USD', name: 'Gold (fut.)', sector: 'metals', price: 3000.5, change: 1.25, source: 'Yahoo Finance', quoteTs: Date.UTC(2026, 4, 1, 14, 0, 0) },
      { id: 'eurusd', symbol: 'EUR/USD', name: 'Euro / US Dollar', sector: 'forex', price: 1.1187, change: -0.42, source: 'Yahoo Finance', quoteTs: Date.UTC(2026, 4, 1, 14, 0, 0) },
    ];
    const html = renderToStaticMarkup(React.createElement(MarketMap, { allAssets: sampleAssets }));
    expect(html).toContain('<ellipse');
    expect(html).not.toContain('<rect');
    expect(html).toContain('>XAU<');
    expect(html).toContain('>EUR/USD<');
    expect(html).toContain('font-size="8.5"');
    expect(html).toContain('Yahoo Finance');
    expect(html).toContain('As of');
    expect(html).toContain('$3,000.50');
  });

  it('renders TickerTape items with non-overlapping SVG delta icons, flex gap, edge mask, hover pause, and reduced-motion', () => {
    const assets = [
      { id: 'usdinr', symbol: 'USD/INR', sector: 'forex', price: 93.96, change: 0.1 },
      { id: 'eurinr', symbol: 'EUR/INR', sector: 'forex', price: 105.10, change: -0.45 },
    ];
    const html = renderToStaticMarkup(React.createElement(TickerTape, { allAssets: assets }));
    expect(html).toContain('₹105.10');
    expect(html).toContain('($1.12)');
    expect(html).toContain('display:inline-flex;align-items:center;gap:6px');
    expect(html).toContain('margin-left:8px');
    expect(html).toContain('<polygon');
    expect(html).not.toContain('▼');
    expect(html).toContain('mask-image:linear-gradient');
    expect(html).toContain('.ticker-track:hover .ticker-scroll');
    expect(html).toContain('prefers-reduced-motion');
  });
});
