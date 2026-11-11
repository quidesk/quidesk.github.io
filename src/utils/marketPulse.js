/**
 * computeMarketPulse — Pure function that derives Market Pulse stats
 * from the same allAssets array used by all UI surfaces.
 *
 * This ensures the "X% of assets advancing" text is always consistent
 * with the actual tiles rendered below the banner.
 *
 * Redundant individual asset signal text (e.g. "TSLA showing 10.70% drop")
 * has been removed from Market Pulse so that Trade Signals serves as the
 * single actionable source of truth for individual asset alerts.
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

  const risingCount = allAssets.filter(a => (a.changePercent ?? a.change) > 0).length;
  const fallingCount = allAssets.filter(a => (a.changePercent ?? a.change) < 0).length;
  const advancingPct = Math.round((risingCount / total) * 100);

  const topGainer = [...allAssets].sort((a, b) => (b.changePercent ?? b.change) - (a.changePercent ?? a.change))[0];
  const topLoser = [...allAssets].sort((a, b) => (a.changePercent ?? a.change) - (b.changePercent ?? b.change))[0];

  let narrative = `${advancingPct}% of assets advancing · `;
  if (hotspots.length > 0) {
    narrative += `${hotspots.length} signal${hotspots.length > 1 ? 's' : ''} detected`;
    // NOTE: Redundant individual asset alert (e.g. "TSLA showing 10.70% drop")
    // is intentionally kept exclusively in Trade Signals to maintain a single source of truth.
  } else {
    narrative += `markets within normal volatility ranges`;
  }
  if (topGainer && topLoser) {
    const gChg = topGainer.changePercent ?? topGainer.change;
    const lChg = topLoser.changePercent ?? topLoser.change;
    narrative += ` · ${topGainer.symbol} leading (+${gChg.toFixed(2)}%), ${topLoser.symbol} lagging (${lChg.toFixed(2)}%)`;
  }

  return { advancingPct, risingCount, fallingCount, total, narrative };
}
