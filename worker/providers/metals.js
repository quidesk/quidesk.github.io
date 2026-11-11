/**
 * Quidesk Market Engine — Metals Spot Cross-Check Provider (Gold-API)
 * 
 * Compares continuous COMEX/NYMEX futures prices against physical spot.
 * If divergence exceeds 0.50%, flags the quote with 'spot_futures_basis'.
 */

const SPOT_SYMBOLS = {
  gold: { id: 'gold', spotCode: 'XAU' },
  silver: { id: 'silver', spotCode: 'XAG' },
  platinum: { id: 'platinum', spotCode: 'XPT' },
};

/**
 * Fetches spot quotes from api.gold-api.com.
 * @param {number} [timeoutMs=6000]
 * @returns {Promise<Record<string, number>>}
 */
export async function fetchSpotMetals(timeoutMs = 6000) {
  const spotRates = {};

  await Promise.allSettled(
    Object.entries(SPOT_SYMBOLS).map(async ([id, cfg]) => {
      try {
        const res = await fetch(`https://api.gold-api.com/price/${cfg.spotCode}`, {
          headers: { 'Accept': 'application/json' },
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
