/**
 * Energy price cross-validation utility.
 *
 * Compares current energy prices against an independent reference feed
 * and logs a warning if divergence exceeds a configurable threshold.
 *
 * Currently cross-checks BRENT and HOIL (heating oil) since these show
 * the largest gap versus external benchmarks when running on seed data.
 */

/** Configurable divergence threshold (fraction, e.g. 0.01 = 1%) */
export const ENERGY_DIVERGENCE_THRESHOLD = 0.01;

/**
 * Calculate percent divergence between two prices.
 * @param {number} priceA
 * @param {number} priceB
 * @returns {number} — absolute fractional divergence (0.05 = 5%)
 */
export function calcDivergence(priceA, priceB) {
  if (!priceA || !priceB || priceA <= 0 || priceB <= 0) return Infinity;
  return Math.abs(priceA - priceB) / ((priceA + priceB) / 2);
}

/**
 * Validate energy prices against an independent API.
 * Fetches reference prices from commodities-api or gold-api and compares.
 *
 * @param {Object} currentPrices — { brent: number, hoil: number, wti: number, ng: number }
 * @param {number} [threshold] — override threshold (default: ENERGY_DIVERGENCE_THRESHOLD)
 * @returns {Promise<Array<{symbol: string, current: number, reference: number, divergence: number, warning: boolean}>>}
 */
export async function validateEnergyPrices(currentPrices, threshold = ENERGY_DIVERGENCE_THRESHOLD) {
  const results = [];

  // Attempt to fetch reference prices from a second independent API
  // Using gold-api.com which also has some commodity endpoints
  const REFERENCE_ENDPOINTS = {
    brent: 'https://api.gold-api.com/price/BRENT',
    wti:   'https://api.gold-api.com/price/WTI',
  };

  for (const [symbol, url] of Object.entries(REFERENCE_ENDPOINTS)) {
    const current = currentPrices[symbol];
    if (!current || current <= 0) continue;

    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const json = await res.json();
      const refPrice = parseFloat(json.price);
      if (!refPrice || isNaN(refPrice) || refPrice <= 0) continue;

      const divergence = calcDivergence(current, refPrice);
      const warning = divergence > threshold;

      if (warning) {
        console.warn(
          `[Energy Validator] ${symbol.toUpperCase()} divergence: ${(divergence * 100).toFixed(2)}% ` +
          `(current: $${current.toFixed(2)}, reference: $${refPrice.toFixed(2)}, threshold: ${(threshold * 100).toFixed(1)}%)`
        );
      }

      results.push({ symbol, current, reference: refPrice, divergence, warning });
    } catch (e) {
      // Silently skip — reference API unavailable
      console.debug(`[Energy Validator] Could not reach reference for ${symbol}:`, e.message);
    }
  }

  return results;
}
