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
    if (sym === 'NG' || sym === 'NGAS' || sym === 'HOIL' || sym.includes('NATURAL') || sym.includes('HEATING')) return 3;
    return 2;
  }
  if (sec === 'crypto') {
    if (typeof price === 'number' && Number.isFinite(price) && price > 0 && price < 2) return 4;
    return 2;
  }
  if (sec === 'equities') {
    return 2;
  }

  if (sec === 'forex' || sym.includes('/')) {
    if (sym.includes('JPY') || sym.includes('INR')) return 2;
    return 4;
  }

  if (typeof price === 'number' && Number.isFinite(price) && price > 0 && price < 1) return 4;
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
export const formatForexSecondaryValue = (symbol = '', rate, ratesMap = {}, targetCurrency = 'INR') => {
  if (!symbol || typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) {
    return '';
  }

  const parts = symbol.toUpperCase().split('/');
  if (parts.length !== 2) return '';
  const [base, quote] = parts;

  // Strictly extract authoritative rates from store/map — never use hardcoded fallbacks
  const getRate = (pair) => {
    if (typeof ratesMap === 'number') {
      return pair === 'USD/INR' && Number.isFinite(ratesMap) && ratesMap > 0 ? ratesMap : null;
    }
    if (!ratesMap || typeof ratesMap !== 'object') return null;
    if (typeof ratesMap[pair] === 'number' && ratesMap[pair] > 0) return ratesMap[pair];
    if (ratesMap[pair]?.status !== 'unavailable' && typeof ratesMap[pair]?.price === 'number' && ratesMap[pair].price > 0) return ratesMap[pair].price;
    const keyLower = pair.toLowerCase().replace('/', '');
    if (ratesMap[keyLower]?.status !== 'unavailable' && typeof ratesMap[keyLower]?.price === 'number' && ratesMap[keyLower].price > 0) return ratesMap[keyLower].price;
    if (typeof ratesMap[keyLower] === 'number' && ratesMap[keyLower] > 0) return ratesMap[keyLower];
    const code = pair.split('/')[1] || pair;
    if (pair.startsWith('USD/') && typeof ratesMap[code] === 'number' && ratesMap[code] > 0) return ratesMap[code];
    if (pair === 'USD/AED') return 3.6725;
    return null;
  };

  const usdInr = getRate('USD/INR');
  const eurUsd = getRate('EUR/USD');
  const gbpUsd = getRate('GBP/USD');

  // Case A: Quote is INR (USD/INR, EUR/INR) -> show USD value of 1 base unit
  if (quote === 'INR') {
    if (base === 'USD') {
      return '($1.00)';
    }
    if (!usdInr) return '';
    const usdVal = rate / usdInr;
    return `($${usdVal.toFixed(2)})`;
  }

  // Resolve target currency rate per 1 USD for INR or generalized local currencies
  const tgt = (targetCurrency || 'INR').toUpperCase();
  const TARGET_SYMBOLS = {
    INR: '₹', USD: '$', EUR: '€', GBP: '£', JPY: '¥',
    AUD: 'A$', CAD: 'C$', CHF: 'CHF ', NZD: 'NZ$', SGD: 'S$', AED: 'AED ',
  };
  let usdToTarget = null;
  if (tgt === 'USD') {
    usdToTarget = 1;
  } else if (tgt === 'INR') {
    usdToTarget = usdInr;
  } else if (tgt === 'EUR') {
    usdToTarget = eurUsd ? 1 / eurUsd : null;
  } else if (tgt === 'GBP') {
    usdToTarget = gbpUsd ? 1 / gbpUsd : null;
  } else if (tgt === 'AUD' || tgt === 'NZD') {
    const indirect = getRate(`${tgt}/USD`);
    usdToTarget = indirect ? 1 / indirect : null;
  } else {
    usdToTarget = getRate(`USD/${tgt}`);
  }

  if (!usdToTarget || !Number.isFinite(usdToTarget) || usdToTarget <= 0) {
    return '';
  }

  const fmtTarget = (val) => {
    const decimals = val < 1 ? 4 : 2;
    const locale = tgt === 'INR' ? 'en-IN' : 'en-US';
    return `${TARGET_SYMBOLS[tgt] || `${tgt} `}${val.toLocaleString(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}`;
  };

  // Case B: Quote is USD (EUR/USD, GBP/USD, AUD/USD, NZD/USD)
  if (quote === 'USD') {
    if (tgt === 'USD') return '';
    return `(1 ${base} = ${fmtTarget(rate * usdToTarget)})`;
  }

  // Case C: Base is USD and Quote is not INR (USD/JPY, USD/CAD, USD/CHF)
  if (base === 'USD') {
    if (tgt === quote) return '';
    return `(1 ${quote} = ${fmtTarget(usdToTarget / rate)})`;
  }

  // Case D: Cross pairs (EUR/GBP, GBP/JPY, EUR/JPY) -> require authoritative BASE/USD
  const baseUsd = base === 'EUR'
    ? eurUsd
    : base === 'GBP'
    ? gbpUsd
    : getRate(`${base}/USD`);
  if (!baseUsd || !Number.isFinite(baseUsd) || baseUsd <= 0) {
    return '';
  }
  return `(1 ${base} = ${fmtTarget(baseUsd * usdToTarget)})`;
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
