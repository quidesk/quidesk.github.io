/**
 * computeMarketPulse — Pure function that derives Market Pulse stats
 * from the same allAssets array used by all UI surfaces.
 *
 * This ensures the "X% of assets advancing" text is always consistent
 * with the actual tiles rendered below the banner.
 *
 * @param {Array} allAssets — flat array of asset objects with `.change` field
 * @param {Array} hotspots — array of hotspot objects from detectHotspots()
 * @returns {{ advancingPct: number, risingCount: number, fallingCount: number, total: number, narrative: string }}
 */
export function computeMarketPulse(allAssets, hotspots = []) {
  const total = allAssets.length;
  if (total === 0) {
    return {
      advancingPct: 0,
      risingCount: 0,
      fallingCount: 0,
      total: 0,
      narrative: 'No market data available',
    };
  }

  const risingCount = allAssets.filter(a => a.change > 0).length;
  const fallingCount = allAssets.filter(a => a.change < 0).length;
  const advancingPct = Math.round((risingCount / total) * 100);

  const topGainer = [...allAssets].sort((a, b) => b.change - a.change)[0];
  const topLoser = [...allAssets].sort((a, b) => a.change - b.change)[0];
  const highHot = hotspots.filter(h => h.severity === 'high');

  let narrative = `${advancingPct}% of assets advancing · `;
  if (hotspots.length > 0) {
    narrative += `${hotspots.length} signal${hotspots.length > 1 ? 's' : ''} detected`;
    if (highHot.length > 0) narrative += ` · ${highHot[0].symbol} showing ${highHot[0].signal}`;
  } else {
    narrative += `markets within normal volatility ranges`;
  }
  if (topGainer && topLoser) {
    narrative += ` · ${topGainer.symbol} leading (+${topGainer.change.toFixed(2)}%), ${topLoser.symbol} lagging (${topLoser.change.toFixed(2)}%)`;
  }

  return { advancingPct, risingCount, fallingCount, total, narrative };
}
