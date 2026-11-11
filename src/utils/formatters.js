// src/utils/formatters.js

/**
 * getAssetPrecision — Canonical decimal precision rules:
 * - Forex: 2 decimals for JPY and INR pairs, 4 decimals for all other Forex pairs.
 * - Energy: 3 decimals for Natural Gas (NG) and Heating Oil (HOIL), 2 decimals for crude (WTI, Brent).
 * - Metals: 2 decimals.
 * - Crypto: 4 decimals for sub-$2 crypto (e.g. ADA, sub-dollar), 2 decimals for standard crypto.
 * - Equities: 2 decimals.
 * - Default: 4 decimals for assets < 1, 2 decimals for assets >= 1.
 */
export const getAssetPrecision = (symbol = '', sector = '', price = null) => {
  const sec = (sector || '').toLowerCase();
  const sym = (symbol || '').toUpperCase();

  if (sec === 'metals' || sym.startsWith('XAU') || sym.startsWith('XAG') || sym.startsWith('XPT')) {
    return 2;
  }
  if (sec === 'energy') {
    if (sym === 'NG' || sym === 'HOIL' || sym.includes('NATURAL') || sym.includes('HEATING')) return 3;
    return 2;
  }
  if (sec === 'crypto') {
    if (typeof price === 'number' && price > 0 && price < 1) return 4;
    return 2;
  }
  if (sec === 'equities') {
    return 2;
  }

  if (sec === 'forex' || sym.includes('/')) {
    if (sym.includes('JPY') || sym.includes('INR')) return 2;
    return 4;
  }

  if (typeof price === 'number' && price > 0 && price < 1) return 4;
  return 2;
};

/**
 * formatAssetPrice — Formats numerical asset prices according to financial rules:
 * - Forex pairs: Unitless (no '$' prefix)
 * - Equities, Crypto, Metals, Energy: Preceded by '$'
 * - Precision: Derived via getAssetPrecision
 */
export const formatAssetPrice = (price, symbol = '', sector = '') => {
  if (price === null || price === undefined || typeof price !== 'number' || isNaN(price)) return '—';

  const sec = (sector || '').toLowerCase();
  const sym = (symbol || '').toUpperCase();
  const decimals = getAssetPrecision(sym, sec, price);

  const isForex = sec === 'forex' || (
    sec !== 'metals' && sec !== 'energy' && sec !== 'crypto' && sec !== 'equities' &&
    !sym.startsWith('XAU') && !sym.startsWith('XAG') && !sym.startsWith('XPT') &&
    (sym.includes('/') && (
      sym.includes('JPY') || sym.includes('INR') || sym.includes('USD') || 
      sym.includes('GBP') || sym.includes('EUR') || sym.includes('CAD') || 
      sym.includes('CHF') || sym.includes('AUD') || sym.includes('NZD')
    ))
  );

  const formatted = price.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  if (isForex) {
    return formatted;
  }

  return `$${formatted}`;
};

/**
 * formatUsdPrice — Unified price formatter for TickerTape and global UI
 * Formats USD assets with '$' prefix and full commas, and Forex with unitless precision.
 */
export const formatUsdPrice = (symbol = '', price, category = '') => {
  return formatAssetPrice(price, symbol, category);
};

/**
 * formatForexSecondaryValue — Computes accurate secondary currency conversion for all 12 Forex pairs.
 * 
 * Cases:
 *  - Case A (quote === 'INR', e.g. USD/INR, EUR/INR): Primary is in ₹. Return USD value: ($1.00) or ($X.XX).
 *  - Case B (quote === 'USD', e.g. EUR/USD, GBP/USD, AUD/USD, NZD/USD): 1 base in INR = rate * usdInr. Return (1 BASE = ₹X.XX).
 *  - Case C (base === 'USD' & quote !== 'INR', e.g. USD/JPY, USD/CAD, USD/CHF): 1 quote in INR = usdInr / rate. Return (1 QUOTE = ₹X.XX).
 *  - Case D (Cross pairs EUR/GBP, GBP/JPY, EUR/JPY): Convert 1 base to USD, multiply by usdInr. Return (1 BASE = ₹X.XX).
 *
 * @param {string} symbol - e.g. 'USD/JPY', 'EUR/INR'
 * @param {number} rate - Current exchange rate
 * @param {Record<string, number|object>|number} [ratesMap] - Map of current rates or direct USD/INR rate
 * @returns {string}
 */
export const formatForexSecondaryValue = (symbol = '', rate, ratesMap = {}) => {
  if (!symbol || typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) {
    return '';
  }

  const parts = symbol.toUpperCase().split('/');
  if (parts.length !== 2) return '';
  const [base, quote] = parts;

  // Extract reference rates with reliable fallbacks
  const getRate = (pair, fallback) => {
    if (typeof ratesMap === 'number') {
      if (pair === 'USD/INR') return ratesMap;
      return fallback;
    }
    if (!ratesMap) return fallback;
    if (typeof ratesMap[pair] === 'number') return ratesMap[pair];
    if (typeof ratesMap[pair]?.price === 'number') return ratesMap[pair].price;
    const keyLower = pair.toLowerCase().replace('/', '');
    if (typeof ratesMap[keyLower]?.price === 'number') return ratesMap[keyLower].price;
    if (typeof ratesMap[keyLower] === 'number') return ratesMap[keyLower];
    const code = pair.split('/')[1] || pair;
    if (typeof ratesMap[code] === 'number') return ratesMap[code];
    return fallback;
  };

  const usdInr = getRate('USD/INR', 93.96);
  const eurUsd = getRate('EUR/USD', 1.1187);
  const gbpUsd = getRate('GBP/USD', 1.3366);

  // Case A: Quote is INR (USD/INR, EUR/INR)
  if (quote === 'INR') {
    if (base === 'USD') {
      return '($1.00)';
    }
    const usdVal = rate / usdInr;
    return `($${usdVal.toFixed(2)})`;
  }

  // Case B: Quote is USD (EUR/USD, GBP/USD, AUD/USD, NZD/USD)
  if (quote === 'USD') {
    const inrVal = rate * usdInr;
    return `(1 ${base} = ₹${inrVal.toFixed(2)})`;
  }

  // Case C: Base is USD and Quote is not INR (USD/JPY, USD/CAD, USD/CHF)
  if (base === 'USD') {
    const quoteInr = usdInr / rate;
    const decimals = quoteInr < 1 ? 4 : 2;
    return `(1 ${quote} = ₹${quoteInr.toFixed(decimals)})`;
  }

  // Case D: Cross pairs (EUR/GBP, GBP/JPY, EUR/JPY)
  let baseUsd = 1;
  if (base === 'EUR') {
    baseUsd = eurUsd;
  } else if (base === 'GBP') {
    baseUsd = gbpUsd;
  } else {
    baseUsd = getRate(`${base}/USD`, 1);
  }
  const baseInr = baseUsd * usdInr;
  return `(1 ${base} = ₹${baseInr.toFixed(2)})`;
};

/**
 * formatCardUnitSuffix — Renders correct unit suffix:
 * - Forex: Never prefixes quote with '/'. Renders '${quote}' (e.g. '1.1205 USD', '158.02 JPY'),
 *   and omits suffix entirely for INR pairs (USD/INR, EUR/INR) once '₹' is prefixed.
 * - Metals: '/oz'
 * - Energy: '/bbl', '/MMBtu', '/gal'
 * - Crypto & Equities: '' (no unit suffix)
 */
export const formatCardUnitSuffix = (sector = '', unit = '', symbol = '') => {
  const sec = (sector || '').toLowerCase();
  const sym = (symbol || '').toUpperCase();

  if (sec === 'forex' || (sec !== 'metals' && sec !== 'energy' && sec !== 'crypto' && sec !== 'equities' && sym.includes('/'))) {
    if (sym.endsWith('/INR') || sym.endsWith('INR')) {
      return ''; // Omit suffix for USD/INR and EUR/INR
    }
    const quote = sym.split('/')[1] || unit || '';
    return quote ? ` ${quote}` : '';
  }

  if (sec === 'equities' || sec === 'crypto') {
    return '';
  }

  if (unit) {
    return `/${unit}`;
  }

  return '';
};

/**
 * formatChangePercentage — Standardized percentage change formatter:
 * - Flat (|c| < 0.005): "0.00%" (neutral, no '+' sign)
 * - Positive (> 0.005): "+X.XX%"
 * - Negative (< -0.005): "-X.XX%"
 * - Null/Undefined: "—"
 */
export const formatChangePercentage = (c) => {
  if (c === null || c === undefined || !Number.isFinite(c)) return '—';
  if (Math.abs(c) < 0.005) return '0.00%';
  return `${c > 0 ? '+' : ''}${c.toFixed(2)}%`;
};
