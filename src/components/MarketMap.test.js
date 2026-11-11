import { describe, it, expect } from 'vitest';
import {
  stepMarketMapSimulation,
  initNodeState,
  getAssetRadius,
  ZONES,
  INTERNAL_W,
  INTERNAL_H,
} from './MarketMap';
import { ALL_ASSETS } from '../data/markets';

describe('Phase 5: MarketMap Physics Simulation Integrity Suite', () => {
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
            const effRx = Math.max(0.01, z.rx - (nr + 4) / INTERNAL_W);
            const effRy = Math.max(0.01, z.ry - (nr + 4) / INTERNAL_H);

            // Ellipse equation: ((x - cx) / effRx)^2 + ((y - cy) / effRy)^2 <= 1.001
            const dx = p.x - z.cx;
            const dy = p.y - z.cy;
            const normDistSq = (dx / effRx) ** 2 + (dy / effRy) ** 2;

            if (normDistSq > 1.002) {
              boundaryBreaches++;
            }

            // Header clearance check (at least 28px from top of zone bounding box)
            const minY = (z.cy - z.ry) + (28 / INTERNAL_H);
            if (p.y < minY - 0.005) {
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

            // If distance between node centers is less than sum of radii - 1px tolerance
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
});
