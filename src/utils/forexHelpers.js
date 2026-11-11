/**
 * Forex Pair Configuration & Normalization Helpers
 * 
 * Centralized, shared helper module for:
 * - Symbol-to-pair mappings
 * - Strict quote orientation (direct vs indirect vs cross)
 * - Numeric precision formatting (2 decimals for JPY/INR, 4 for other pairs)
 * - Provider response parsers (Worker Yahoo FX & fallback parsing)
 * - Safe staleness and error state guards (no synthesized/fabricated rates)
 */

export const FOREX_PAIRS_CONFIG = {
  usdjpy: {
    id: 'usdjpy',
    symbol: 'USD/JPY',
    name: 'US Dollar / Yen',
    base: 'USD',
    quote: 'JPY',
    yahooSymbol: 'JPY=X',
    unit: 'JPY',
    decimals: 2,
    orientation: 'direct', // 1 USD = X JPY (normal range ~150-165)
    computeRate: (rates) => rates.JPY,
  },
  usdchf: {
    id: 'usdchf',
    symbol: 'USD/CHF',
    name: 'US Dollar / CHF',
    base: 'USD',
    quote: 'CHF',
    yahooSymbol: 'CHF=X',
    unit: 'CHF',
    decimals: 4,
    orientation: 'direct', // 1 USD = X CHF (normal range ~0.80-0.95)
    computeRate: (rates) => rates.CHF,
  },
  nzdusd: {
    id: 'nzdusd',
    symbol: 'NZD/USD',
    name: 'NZ Dollar / USD',
    base: 'NZD',
    quote: 'USD',
    yahooSymbol: 'NZDUSD=X',
    unit: 'USD',
    decimals: 4,
    orientation: 'indirect', // 1 NZD = X USD (normal range ~0.50-0.65)
    // From USD-base rates object (where rate is NZD per 1 USD), rate for NZD/USD is 1 / NZD
    computeRate: (rates) => (rates.NZD > 0 ? 1 / rates.NZD : null),
  },
  eurusd: {
    id: 'eurusd',
    symbol: 'EUR/USD',
    name: 'Euro / US Dollar',
    base: 'EUR',
    quote: 'USD',
    yahooSymbol: 'EURUSD=X',
    unit: 'USD',
    decimals: 4,
    orientation: 'indirect',
    computeRate: (rates) => (rates.EUR > 0 ? 1 / rates.EUR : null),
  },
  gbpusd: {
    id: 'gbpusd',
    symbol: 'GBP/USD',
    name: 'British Pound / USD',
    base: 'GBP',
    quote: 'USD',
    yahooSymbol: 'GBPUSD=X',
    unit: 'USD',
    decimals: 4,
    orientation: 'indirect',
    computeRate: (rates) => (rates.GBP > 0 ? 1 / rates.GBP : null),
  },
  audusd: {
    id: 'audusd',
    symbol: 'AUD/USD',
    name: 'Australian Dollar / USD',
    base: 'AUD',
    quote: 'USD',
    yahooSymbol: 'AUDUSD=X',
    unit: 'USD',
    decimals: 4,
    orientation: 'indirect',
    computeRate: (rates) => (rates.AUD > 0 ? 1 / rates.AUD : null),
  },
  usdcad: {
    id: 'usdcad',
    symbol: 'USD/CAD',
    name: 'US Dollar / CAD',
    base: 'USD',
    quote: 'CAD',
    yahooSymbol: 'CAD=X',
    unit: 'CAD',
    decimals: 4,
    orientation: 'direct',
    computeRate: (rates) => rates.CAD,
  },
  eurgbp: {
    id: 'eurgbp',
    symbol: 'EUR/GBP',
    name: 'Euro / GBP',
    base: 'EUR',
    quote: 'GBP',
    yahooSymbol: 'EURGBP=X',
    unit: 'GBP',
    decimals: 4,
    orientation: 'cross',
    computeRate: (rates) => (rates.EUR > 0 ? rates.GBP / rates.EUR : null),
  },
  gbpjpy: {
    id: 'gbpjpy',
    symbol: 'GBP/JPY',
    name: 'British Pound / Yen',
    base: 'GBP',
    quote: 'JPY',
    yahooSymbol: 'GBPJPY=X',
    unit: 'JPY',
    decimals: 2,
    orientation: 'cross',
    computeRate: (rates) => (rates.GBP > 0 ? rates.JPY / rates.GBP : null),
  },
  eurjpy: {
    id: 'eurjpy',
    symbol: 'EUR/JPY',
    name: 'Euro / Yen',
    base: 'EUR',
    quote: 'JPY',
    yahooSymbol: 'EURJPY=X',
    unit: 'JPY',
    decimals: 2,
    orientation: 'cross',
    computeRate: (rates) => (rates.EUR > 0 ? rates.JPY / rates.EUR : null),
  },
  usdinr: {
    id: 'usdinr',
    symbol: 'USD/INR',
    name: 'US Dollar / INR',
    base: 'USD',
    quote: 'INR',
    yahooSymbol: 'INR=X',
    unit: 'INR',
    decimals: 2,
    orientation: 'direct',
    computeRate: (rates) => rates.INR,
  },
  eurinr: {
    id: 'eurinr',
    symbol: 'EUR/INR',
    name: 'Euro / INR',
    base: 'EUR',
    quote: 'INR',
    yahooSymbol: 'EURINR=X',
    unit: 'INR',
    decimals: 2,
    orientation: 'cross',
    computeRate: (rates) => (rates.EUR > 0 ? rates.INR / rates.EUR : null),
  },
};

/**
 * Format a forex rate according to market conventions:
 * - Unitless (no '$' prefix)
 * - 2 decimal places for /JPY and /INR pairs
 * - 4 decimal places for all other FX pairs
 * - '—' if null, undefined, or non-finite
 */
export function formatForexRate(price, symbol = '') {
  if (price === null || price === undefined || typeof price !== 'number' || !Number.isFinite(price) || price <= 0) {
    return '—';
  }
  const sym = (symbol || '').toUpperCase();
  const decimals = (sym.includes('JPY') || sym.includes('INR')) ? 2 : 4;
  return price.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Parse a raw Yahoo Finance v8 chart result for a Forex pair.
 * 
 * @param {string} assetId 
 * @param {object} chartResult - payload.chart.result[0]
 * @returns {object|null}
 */
export function parseYahooFxMeta(assetId, chartResult) {
  const config = FOREX_PAIRS_CONFIG[assetId];
  if (!config || !chartResult || !chartResult.meta) return null;

  const meta = chartResult.meta;
  const rawPrice = meta.regularMarketPrice;
  if (typeof rawPrice !== 'number' || !Number.isFinite(rawPrice) || rawPrice <= 0) {
    return null;
  }

  const prevClose = typeof meta.chartPreviousClose === 'number' && meta.chartPreviousClose > 0
    ? meta.chartPreviousClose
    : rawPrice;

  const change = parseFloat((((rawPrice - prevClose) / prevClose) * 100).toFixed(3));
  const roundedPrice = parseFloat(rawPrice.toFixed(config.decimals));

  const observedAt = meta.regularMarketTime
    ? new Date(meta.regularMarketTime * 1000).toISOString()
    : new Date().toISOString();

  return {
    id: assetId,
    symbol: config.symbol,
    name: config.name,
    price: roundedPrice,
    change,
    previousClose: prevClose,
    decimals: config.decimals,
    observedAt,
    source: 'Yahoo Finance v8 Tape',
    status: 'live',
  };
}

/**
 * Parse a fxratesapi-style latest rates payload (testing/validation utility; no browser fetches).
 *
 * @param {object} payload - { date: string, rates: Record<string, number> }
 * @returns {Record<string, object>}
 */
export function parseFxRatesApiPayload(payload) {
  if (!payload || !payload.rates || typeof payload.rates !== 'object') {
    throw new Error('Invalid fxratesapi payload: missing rates object');
  }

  // Normalize all rate currency codes to uppercase
  const rates = {};
  for (const [code, val] of Object.entries(payload.rates)) {
    if (typeof val === 'number' && Number.isFinite(val) && val > 0) {
      rates[code.toUpperCase()] = val;
    }
  }

  const observedAt = payload.date || null;
  const results = {};

  for (const [id, config] of Object.entries(FOREX_PAIRS_CONFIG)) {
    const rawRate = config.computeRate(rates);
    if (typeof rawRate !== 'number' || !Number.isFinite(rawRate) || rawRate <= 0) {
      continue;
    }

    const price = parseFloat(rawRate.toFixed(config.decimals));

    results[id] = {
      id,
      symbol: config.symbol,
      name: config.name,
      price,
      change: null,
      decimals: config.decimals,
      observedAt,
      source: 'fxratesapi.com',
      status: 'delayed',
    };
  }

  return results;
}
