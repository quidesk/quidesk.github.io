/**
 * Quidesk Market Engine — Metals Spot Cross-Check Provider (Gold-API)
 * 
 * Ingests physical bullion spot quotes from api.gold-api.com.
 * Uses GET https://api.gold-api.com/symbols for symbol discovery and active quote verification.
 * Compares continuous COMEX/NYMEX futures prices against physical spot.
 * If divergence exceeds 0.50%, flags the quote with 'spot_futures_basis'.
 */

const SPOT_SYMBOLS = {
  gold: { id: 'gold', spotCode: 'XAU' },
  silver: { id: 'silver', spotCode: 'XAG' },
  platinum: { id: 'platinum', spotCode: 'XPT' },
};

/**
 * Fetches available spot symbols from api.gold-api.com/symbols
 * @param {string} [apiKey=null]
 * @param {number} [timeoutMs=6000]
 * @returns {Promise<Array<{ name: string, symbol: string }>>}
 */
export async function fetchGoldApiSymbols(apiKey = null, timeoutMs = 6000) {
  const headers = { 'Accept': 'application/json' };
  if (apiKey) {
    headers['x-api-key'] = apiKey;
  }

  const res = await fetch('https://api.gold-api.com/symbols', {
    headers,
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`Gold-API symbols HTTP ${res.status}`);
  return await res.json();
}

/**
 * Fetches spot quotes from api.gold-api.com.
 * Discovers active symbols via GET https://api.gold-api.com/symbols and passes x-api-key if provisioned.
 * @param {string} [apiKey=null]
 * @param {number} [timeoutMs=6000]
 * @returns {Promise<Record<string, number>>}
 */
export async function fetchSpotMetals(apiKey = null, timeoutMs = 6000) {
  const spotRates = {};
  const headers = { 'Accept': 'application/json' };
  if (apiKey) {
    headers['x-api-key'] = apiKey;
  }

  // Active symbol discovery via /symbols
  let activeCodes = new Set(['XAU', 'XAG', 'XPT']);
  try {
    const symbolsList = await fetchGoldApiSymbols(apiKey, timeoutMs);
    if (Array.isArray(symbolsList) && symbolsList.length > 0) {
      activeCodes = new Set(symbolsList.map(s => s.symbol));
    }
  } catch {
    // Fall back to default spot codes
  }

  await Promise.allSettled(
    Object.entries(SPOT_SYMBOLS).map(async ([id, cfg]) => {
      if (!activeCodes.has(cfg.spotCode)) return;
      try {
        const res = await fetch(`https://api.gold-api.com/price/${cfg.spotCode}`, {
          headers,
          signal: AbortSignal.timeout(timeoutMs),
        });
        if (!res.ok) return;
        const json = await res.json();
        const price = parseFloat(json.price);
        if (Number.isFinite(price) && price > 0) {
          spotRates[id] = price;
        }
      } catch {
        // continue
      }
    })
  );

  return spotRates;
}

/**
 * Cross-checks a metal futures price against spot.
 * @param {number} futuresPrice
 * @param {number} spotPrice
 * @returns {{ flags: string[], spotPrice: number|null, basisDivergence: number|null }}
 */
export function checkMetalsBasis(futuresPrice, spotPrice) {
  if (!spotPrice || !futuresPrice || spotPrice <= 0 || futuresPrice <= 0) {
    return { flags: [], spotPrice: null, basisDivergence: null };
  }

  const diffPct = Math.abs((futuresPrice - spotPrice) / spotPrice) * 100;
  const flags = [];

  if (diffPct > 0.50) {
    flags.push('spot_futures_basis');
  }

  return {
    flags,
    spotPrice: parseFloat(spotPrice.toFixed(2)),
    basisDivergence: parseFloat(diffPct.toFixed(2)),
  };
}
