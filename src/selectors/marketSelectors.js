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
 * Returns valid numerical change for an active/non-unavailable asset.
 * @param {object} asset
 * @returns {number|null}
 */
function getValidChange(asset) {
  if (!asset || asset.status === 'unavailable') return null;
  const chg = typeof asset.changePercent === 'number' ? asset.changePercent : asset.change;
  return typeof chg === 'number' && Number.isFinite(chg) ? chg : null;
}

/**
 * Returns top gainers sorted descending by percentage change.
 * Flat (|change| < 0.005), unavailable, or missing changes are excluded.
 * @param {Record<string, any>|Array<any>} quotes
 * @param {number} [limit=4]
 * @returns {Array<object>}
 */
export function selectGainers(quotes, limit = 4) {
  const assets = toAssetArray(quotes);
  return assets
    .filter(a => {
      const c = getValidChange(a);
      return c !== null && c >= 0.005;
    })
    .sort((a, b) => getValidChange(b) - getValidChange(a))
    .slice(0, limit);
}

/**
 * Returns top losers sorted ascending by percentage change.
 * Flat (|change| < 0.005), unavailable, or missing changes are excluded.
 * @param {Record<string, any>|Array<any>} quotes
 * @param {number} [limit=4]
 * @returns {Array<object>}
 */
export function selectLosers(quotes, limit = 4) {
  const assets = toAssetArray(quotes);
  return assets
    .filter(a => {
      const c = getValidChange(a);
      return c !== null && c <= -0.005;
    })
    .sort((a, b) => getValidChange(a) - getValidChange(b))
    .slice(0, limit);
}

/**
 * Splits equities into Indices (SPY, QQQ, DIA) and Individual Stocks (AAPL, TSLA, META, NVDA)
 * to avoid constituent double-counting in sector averages.
 * Excludes null/unavailable and computes median plus index/stock averages.
 * @param {Record<string, any>|Array<any>} quotes
 * @returns {{ indices: object[], stocks: object[], combinedMedian: number|null, indicesAvg: number|null, stocksAvg: number|null, isClosed: boolean }}
 */
export function selectEquitiesIndexVsStocks(quotes) {
  const assets = toAssetArray(quotes).filter(a => a.sector === 'equities');
  const INDEX_SYMBOLS = new Set(['SPY', 'QQQ', 'DIA']);

  const indices = assets.filter(a => INDEX_SYMBOLS.has(a.symbol));
  const stocks = assets.filter(a => !INDEX_SYMBOLS.has(a.symbol));

  const validAssets = assets.filter(a => getValidChange(a) !== null);
  const allChanges = validAssets
    .map(getValidChange)
    .sort((a, b) => a - b);

  const nonFlatChanges = allChanges.filter(c => Math.abs(c) >= 0.005);
  const medianPool = nonFlatChanges.length > 0 ? nonFlatChanges : allChanges;

  let combinedMedian = null;
  if (medianPool.length > 0) {
    const mid = Math.floor(medianPool.length / 2);
    const raw = medianPool.length % 2 !== 0
      ? medianPool[mid]
      : (medianPool[mid - 1] + medianPool[mid]) / 2;
    combinedMedian = parseFloat(raw.toFixed(2));
  }

  const meanFor = (list) => {
    const vals = list.map(getValidChange).filter(c => c !== null && Math.abs(c) >= 0.005);
    const pool = vals.length > 0 ? vals : list.map(getValidChange).filter(c => c !== null);
    if (pool.length === 0) return null;
    return parseFloat((pool.reduce((acc, v) => acc + v, 0) / pool.length).toFixed(2));
  };

  const isClosed = validAssets.length > 0 && validAssets.every(a => a.status === 'closed' || a.tradingPeriod === 'closed');

  return {
    indices,
    stocks,
    combinedMedian,
    indicesAvg: meanFor(indices),
    stocksAvg: meanFor(stocks),
    isClosed,
  };
}

/**
 * Calculates sector percentage change averages.
 * Excludes null/unavailable changes and flat moves (< 0.005%) from sector direction averages
 * (if all valid assets in a sector are flat, returns avgChange: 0 so UI displays neutral 0.00%).
 * For equities, uses median to avoid index and stock constituent double-counting.
 * @param {Record<string, any>|Array<any>} quotes
 * @returns {Record<string, { avgChange: number|null, count: number, advancingCount: number, decliningCount: number, flatCount: number, isClosed: boolean, method: string }>}
 */
export function selectSectorAverages(quotes) {
  const assets = toAssetArray(quotes);
  const sectors = ['equities', 'crypto', 'metals', 'energy', 'forex'];
  const summary = {};

  sectors.forEach(sec => {
    const secAssets = assets.filter(a => a.sector === sec);
    const validAssets = secAssets.filter(a => getValidChange(a) !== null);
    const validChanges = validAssets.map(getValidChange);
    const nonFlatChanges = validChanges.filter(c => Math.abs(c) >= 0.005);

    const count = validChanges.length;
    const pool = nonFlatChanges.length > 0 ? nonFlatChanges : validChanges;
    let avg = null;
    if (pool.length > 0) {
      if (sec === 'equities') {
        const sorted = [...pool].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        avg = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
      } else {
        avg = pool.reduce((acc, v) => acc + v, 0) / pool.length;
      }
      avg = parseFloat(avg.toFixed(2));
    }

    const advancingCount = validChanges.filter(c => c >= 0.005).length;
    const decliningCount = validChanges.filter(c => c <= -0.005).length;
    const flatCount = validChanges.length - advancingCount - decliningCount;
    const isClosed = validAssets.length > 0 && validAssets.every(a => a.status === 'closed' || a.tradingPeriod === 'closed');

    summary[sec] = {
      avgChange: avg,
      count,
      advancingCount,
      decliningCount,
      flatCount,
      isClosed,
      method: sec === 'equities' ? 'median' : 'mean',
    };
  });

  return summary;
}

/**
 * Computes sector summary metrics (count, advancing, declining, avgChange, topGainer, topLoser, isClosed)
 * for any filtered asset subset so pages/cards do not re-implement local averages or extrema.
 * @param {Array<object>} assets
 * @returns {object}
 */
export function selectSectorStats(assets = []) {
  const list = toAssetArray(assets);
  const valid = list.filter(a => getValidChange(a) !== null);
  const changes = valid.map(getValidChange);
  const nonFlat = changes.filter(c => Math.abs(c) >= 0.005);
  const pool = nonFlat.length > 0 ? nonFlat : changes;
  const isEquities = list.some(a => a.sector === 'equities');

  let avgChange = null;
  if (pool.length > 0) {
    if (isEquities) {
      const sorted = [...pool].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      avgChange = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    } else {
      avgChange = pool.reduce((acc, v) => acc + v, 0) / pool.length;
    }
    avgChange = parseFloat(avgChange.toFixed(2));
  }

  return {
    totalCount: list.length,
    validCount: valid.length,
    advancingCount: changes.filter(c => c >= 0.005).length,
    decliningCount: changes.filter(c => c <= -0.005).length,
    flatCount: changes.filter(c => Math.abs(c) < 0.005).length,
    avgChange,
    topGainer: selectGainers(list, 1)[0] || null,
    topLoser: selectLosers(list, 1)[0] || null,
    isClosed: valid.length > 0 && valid.every(a => a.status === 'closed' || a.tradingPeriod === 'closed'),
  };
}

/**
 * Computes global market breadth, advancing percentage, leading and lagging sectors.
 * Unavailable / null quotes are excluded; flat assets (|change| < 0.005) are neutral, NOT advancing.
 * @param {Record<string, any>|Array<any>} quotes
 * @returns {object}
 */
export function selectMarketPulse(quotes) {
  const assets = toAssetArray(quotes);
  const valid = assets.filter(a => getValidChange(a) !== null);

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
    const chg = getValidChange(a);
    if (chg >= 0.005) advancing++;
    else if (chg <= -0.005) declining++;
    else flat++;
  });

  const total = valid.length;
  const advancePercent = Math.round((advancing / total) * 100);

  // Sector leaderboard
  const secAverages = selectSectorAverages(quotes);
  const sortedSectors = Object.entries(secAverages)
    .filter(([, data]) => data.count > 0 && typeof data.avgChange === 'number')
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
