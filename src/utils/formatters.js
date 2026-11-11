// src/utils/formatters.js

/**
 * formatAssetPrice — Formats numerical asset prices according to financial rules:
 * - Forex pairs: Unitless (no '$' prefix)
 * - Equities, Crypto, Metals, Energy: Preceded by '$'
 * - Precision: 2 decimals for /JPY and /INR pairs, 4 decimals for other Forex pairs,
 *   4 decimals for sub-dollar assets (< 1), and 2 decimals for all standard assets.
 */
export const formatAssetPrice = (price, symbol = '', sector = '') => {
  if (price === null || price === undefined || typeof price !== 'number' || isNaN(price)) return '—';

  const sec = (sector || '').toLowerCase();
  const sym = (symbol || '').toUpperCase();
  
  const isForex = sec === 'forex' || (
    sec !== 'metals' && sec !== 'energy' && sec !== 'crypto' && sec !== 'equities' &&
    !sym.startsWith('XAU') && !sym.startsWith('XAG') && !sym.startsWith('XPT') &&
    (sym.includes('/') && (
      sym.includes('JPY') || sym.includes('INR') || sym.includes('USD') || 
      sym.includes('GBP') || sym.includes('EUR') || sym.includes('CAD') || 
      sym.includes('CHF') || sym.includes('AUD') || sym.includes('NZD')
    ))
  );

  if (isForex) {
    const decimals = (sym.includes('JPY') || sym.includes('INR')) ? 2 : 4;
    const formatted = price.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    return formatted;
  }

  // Consistent precision: prices < 1 use 4 decimals, prices >= 1 use 2 decimals
  const decimals = price < 1 ? 4 : 2;
  return `$${price.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
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
 *  - Case B (quote === 'USD', e.g. EUR/USD, GBP/USD, AUD/USD, NZD/USD): 1 base in INR = rate * usdInr. Return (₹X.XX).
 *  - Case C (base === 'USD' & quote !== 'INR', e.g. USD/JPY, USD/CAD, USD/CHF): 1 quote in INR = usdInr / rate. Return (1 JPY = ₹0.59).
 *  - Case D (Cross pairs EUR/GBP, GBP/JPY, EUR/JPY): Convert 1 base to USD, multiply by usdInr. Return (1 EUR = ₹105).
 *
 * @param {string} symbol - e.g. 'USD/JPY', 'EUR/INR'
 * @param {number} rate - Current exchange rate
 * @param {Record<string, number>|object} [ratesMap] - Map of current rates
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
    if (!ratesMap) return fallback;
    if (typeof ratesMap[pair] === 'number') return ratesMap[pair];
    const keyLower = pair.toLowerCase().replace('/', '');
    if (typeof ratesMap[keyLower]?.price === 'number') return ratesMap[keyLower].price;
    if (typeof ratesMap[keyLower] === 'number') return ratesMap[keyLower];
    const code = pair.split('/')[1] || pair;
    if (typeof ratesMap[code] === 'number') return ratesMap[code];
    return fallback;
  };

  const usdInr = getRate('USD/INR', 93.92);
  const eurUsd = getRate('EUR/USD', 1.1172);
  const gbpUsd = getRate('GBP/USD', 1.3347);

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
    return `(₹${inrVal.toFixed(2)})`;
  }

  // Case C: Base is USD and Quote is not INR (USD/JPY, USD/CAD, USD/CHF)
  if (base === 'USD') {
    const quoteInr = usdInr / rate;
    return `(1 ${quote} = ₹${quoteInr.toFixed(2)})`;
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
  return `(1 ${base} = ₹${Math.round(baseInr).toLocaleString('en-IN')})`;
};

/**
 * formatCardUnitSuffix — Renders correct unit suffix:
 * - Forex: Never prefixes quote with '/'. Renders '${quote}' (e.g. '1.1205 USD', '158.02 JPY'),
 *   and omits suffix entirely for INR pairs (USD/INR, EUR/INR) once '₹' is prefixed.
 * - Metals: '/oz'
 * - Energy: '/bbl', '/MMBtu', '/gal'
 * - Crypto & Equities: ''
 */
export const formatCardUnitSuffix = (sector = '', unit = '', symbol = '') => {
  const sec = (sector || '').toLowerCase();
  const sym = (symbol || '').toUpperCase();

  if (sec === 'forex' || sym.includes('/')) {
    if (sym.endsWith('/INR') || sym.endsWith('INR')) {
      return ''; // Omit suffix for USD/INR and EUR/INR
    }
    const quote = sym.split('/')[1] || unit || '';
    return quote ? ` ${quote}` : '';
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

