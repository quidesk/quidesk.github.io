/**
 * Quidesk — Centralized Reactive Market Selectors
 * 
 * Single source of truth module for computing:
 * - Gainers & Losers (filtered by polarity, flat assets excluded)
 * - Sector averages (unbiased, indices separated)
 * - Market Pulse narrative & advance/decline metrics
 * 
 * Used uniformly across MapPage, Navbar, TickerTape, MarketMap, and Dashboard.
 */

/**
 * Normalizes an input quote collection into an array of valid asset objects.
 * @param {Record<string, any>|Array<any>} quotes
 * @returns {Array<object>}
 */
export function toAssetArray(quotes) {
  if (!quotes) return [];
  if (Array.isArray(quotes)) return quotes.filter(a => a && typeof a === 'object');
  // If map keyed by symbol or id, deduplicate by canonical id
  const map = {};
  for (const item of Object.values(quotes)) {
    if (item && item.id) {
      map[item.id.toLowerCase()] = item;
    }
  }
  return Object.values(map);
}

/**
 * Returns top gainers sorted descending by percentage change.
 * Flat (|change| < 0.005) or missing changes are excluded.
 * @param {Record<string, any>|Array<any>} quotes
 * @param {number} [limit=4]
 * @returns {Array<object>}
 */
export function selectGainers(quotes, limit = 4) {
  const assets = toAssetArray(quotes);
  return assets
    .filter(a => typeof a.change === 'number' && Number.isFinite(a.change) && a.change >= 0.005)
    .sort((a, b) => b.change - a.change)
    .slice(0, limit);
}

/**
 * Returns top losers sorted ascending by percentage change.
 * Flat (|change| < 0.005) or missing changes are excluded.
 * @param {Record<string, any>|Array<any>} quotes
 * @param {number} [limit=4]
 * @returns {Array<object>}
 */
export function selectLosers(quotes, limit = 4) {
  const assets = toAssetArray(quotes);
  return assets
    .filter(a => typeof a.change === 'number' && Number.isFinite(a.change) && a.change <= -0.005)
    .sort((a, b) => a.change - b.change)
    .slice(0, limit);
}

/**
 * Splits equities into Indices (SPY, QQQ, DIA) and Individual Stocks (AAPL, TSLA, META, NVDA)
 * to avoid constituent double-counting in sector averages.
 * @param {Record<string, any>|Array<any>} quotes
 * @returns {{ indices: object[], stocks: object[], combinedMedian: number }}
 */
export function selectEquitiesIndexVsStocks(quotes) {
  const assets = toAssetArray(quotes).filter(a => a.sector === 'equities');
  const INDEX_SYMBOLS = new Set(['SPY', 'QQQ', 'DIA']);

  const indices = assets.filter(a => INDEX_SYMBOLS.has(a.symbol));
  const stocks = assets.filter(a => !INDEX_SYMBOLS.has(a.symbol));

  const allChanges = assets
    .map(a => a.change)
    .filter(c => typeof c === 'number' && Number.isFinite(c))
    .sort((a, b) => a - b);

  let combinedMedian = 0;
  if (allChanges.length > 0) {
    const mid = Math.floor(allChanges.length / 2);
    combinedMedian = allChanges.length % 2 !== 0
      ? allChanges[mid]
      : (allChanges[mid - 1] + allChanges[mid]) / 2;
  }

  return {
    indices,
    stocks,
    combinedMedian: parseFloat(combinedMedian.toFixed(2)),
  };
}

/**
 * Calculates sector percentage change averages.
 * For equities, uses median of combined or averages indices to avoid double counting.
 * @param {Record<string, any>|Array<any>} quotes
 * @returns {Record<string, { avgChange: number, count: number, advancingCount: number }>}
 */
export function selectSectorAverages(quotes) {
  const assets = toAssetArray(quotes);
  const sectors = ['equities', 'crypto', 'metals', 'energy', 'forex'];
  const summary = {};

  sectors.forEach(sec => {
    const secAssets = assets.filter(a => a.sector === sec);
    const validChanges = secAssets
      .map(a => a.change)
      .filter(c => typeof c === 'number' && Number.isFinite(c));

    const count = validChanges.length;
    let avg = 0;
    if (count > 0) {
      if (sec === 'equities') {
        // Use median to avoid index and stock constituent double counting
        const sorted = [...validChanges].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        avg = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
      } else {
        const sum = validChanges.reduce((acc, v) => acc + v, 0);
        avg = sum / count;
      }
    }

    const advancingCount = validChanges.filter(c => c >= 0.005).length;
    summary[sec] = {
      avgChange: parseFloat(avg.toFixed(2)),
      count,
      advancingCount,
    };
  });

  return summary;
}

/**
 * Computes global market breadth, advancing percentage, leading and lagging sectors.
 * Flat assets (|change| < 0.005) are counted as neutral, NOT advancing.
 * @param {Record<string, any>|Array<any>} quotes
 * @returns {object}
 */
export function selectMarketPulse(quotes) {
  const assets = toAssetArray(quotes);
  const valid = assets.filter(a => typeof a.change === 'number' && Number.isFinite(a.change));

  if (valid.length === 0) {
    return {
      advancePercent: 0,
      advancingCount: 0,
      decliningCount: 0,
      flatCount: 0,
      totalCount: 0,
      leadingSector: null,
      laggingSector: null,
      sentiment: 'neutral',
      narrative: 'Awaiting market feed initialization...',
    };
  }

  let advancing = 0;
  let declining = 0;
  let flat = 0;

  valid.forEach(a => {
    if (a.change >= 0.005) advancing++;
    else if (a.change <= -0.005) declining++;
    else flat++;
  });

  const total = valid.length;
  const advancePercent = Math.round((advancing / total) * 100);

  // Sector leaderboard
  const secAverages = selectSectorAverages(quotes);
  const sortedSectors = Object.entries(secAverages)
    .filter(([, data]) => data.count > 0)
    .sort((a, b) => b[1].avgChange - a[1].avgChange);

  const leadingSector = sortedSectors.length > 0 ? { name: sortedSectors[0][0], avgChange: sortedSectors[0][1].avgChange } : null;
  const laggingSector = sortedSectors.length > 1 ? { name: sortedSectors[sortedSectors.length - 1][0], avgChange: sortedSectors[sortedSectors.length - 1][1].avgChange } : null;

  let sentiment = 'neutral';
  if (advancePercent >= 60) sentiment = 'bullish';
  else if (advancePercent <= 40) sentiment = 'bearish';

  return {
    advancePercent,
    advancingCount: advancing,
    decliningCount: declining,
    flatCount: flat,
    totalCount: total,
    leadingSector,
    laggingSector,
    sentiment,
    sectorAverages: secAverages,
  };
}
