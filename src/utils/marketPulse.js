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
import { selectGainers, selectLosers } from '../selectors/marketSelectors';

/**
 * computeMarketPulse — Pure function that derives Market Pulse stats
 * from the same allAssets array used by all UI surfaces.
 *
 * Excludes unavailable/null quotes and flat (< 0.005%) moves from advancing/movers counts.
 * Appends "(last session)" when all available assets are in closed session state.
 *
 * @param {Array} allAssets — flat array of asset objects with `.change` field
 * @param {Array} hotspots — array of hotspot objects from detectHotspots()
 * @returns {{ advancingPct: number, risingCount: number, fallingCount: number, total: number, isClosed: boolean, narrative: string }}
 */
export function computeMarketPulse(allAssets = [], hotspots = []) {
  const available = (allAssets || []).filter((a) => {
    if (!a || a.status === 'unavailable') return false;
    const chg = typeof a.changePercent === 'number' ? a.changePercent : a.change;
    return typeof chg === 'number' && Number.isFinite(chg);
  });

  const total = available.length;
  if (total === 0) {
    return {
      advancingPct: 0,
      risingCount: 0,
      fallingCount: 0,
      total: 0,
      isClosed: false,
      narrative: 'No market data available',
    };
  }

  const getChg = (a) => (typeof a.changePercent === 'number' ? a.changePercent : a.change);
  const risingCount = available.filter((a) => getChg(a) >= 0.005).length;
  const fallingCount = available.filter((a) => getChg(a) <= -0.005).length;
  const advancingPct = Math.round((risingCount / total) * 100);
  const isClosed = available.every((a) => a.status === 'closed' || a.tradingPeriod === 'closed');

  const topGainer = selectGainers(available, 1)[0] || null;
  const topLoser = selectLosers(available, 1)[0] || null;

  let narrative = `${advancingPct}% of assets advancing${isClosed ? ' (last session)' : ''} · `;
  if (hotspots.length > 0) {
    narrative += `${hotspots.length} signal${hotspots.length > 1 ? 's' : ''} detected`;
  } else if (isClosed) {
    narrative += 'markets closed · showing last official session';
  } else {
    narrative += 'markets within normal volatility ranges';
  }

  const parts = [];
  if (topGainer) {
    const gChg = getChg(topGainer);
    parts.push(`${topGainer.symbol} leading (+${gChg.toFixed(2)}%)`);
  }
  if (topLoser) {
    const lChg = getChg(topLoser);
    parts.push(`${topLoser.symbol} lagging (${lChg.toFixed(2)}%)`);
  }
  if (parts.length > 0) {
    narrative += ` · ${parts.join(', ')}`;
  }

  return { advancingPct, risingCount, fallingCount, total, isClosed, narrative };
}
