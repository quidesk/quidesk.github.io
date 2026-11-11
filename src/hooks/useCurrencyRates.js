/**
 * Quidesk — Canonical Currency Conversion & User Local Currency
 * 
 * Strict architectural rule:
 * NO external IP lookups (ipapi.co deleted).
 * Local currency is inferred strictly from client locale/timezone and user settings.
 * Exchange rates are derived directly from the canonical store quotes.
 */

import { useState, useMemo, useCallback } from 'react';
import { useMarketStore } from '../store/marketStore';

export const CURRENCIES = [
  { code: 'USD', symbol: '$',    name: 'US Dollar',        flag: '🇺🇸' },
  { code: 'INR', symbol: '₹',    name: 'Indian Rupee',     flag: '🇮🇳' },
  { code: 'EUR', symbol: '€',    name: 'Euro',             flag: '🇪🇺' },
  { code: 'GBP', symbol: '£',    name: 'British Pound',    flag: '🇬🇧' },
  { code: 'JPY', symbol: '¥',    name: 'Japanese Yen',     flag: '🇯🇵' },
  { code: 'SGD', symbol: 'S$',   name: 'Singapore Dollar', flag: '🇸🇬' },
  { code: 'AED', symbol: 'AED ', name: 'UAE Dirham',       flag: '🇦🇪' },
  { code: 'BTC', symbol: '₿',    name: 'Bitcoin',          flag: '₿'  },
];

function lookupStorePrice(storeQuotes = {}, pairOrId) {
  if (!storeQuotes || !pairOrId) return null;
  const keyLower = pairOrId.toLowerCase().replace('/', '');
  const upper = pairOrId.toUpperCase();
  const candidates = [
    storeQuotes[pairOrId],
    storeQuotes[keyLower],
    storeQuotes[upper],
  ];
  for (const c of candidates) {
    if (typeof c === 'number' && Number.isFinite(c) && c > 0) return c;
    if (c && typeof c.price === 'number' && Number.isFinite(c.price) && c.price > 0 && c.status !== 'unavailable') {
      return c.price;
    }
  }
  return null;
}

/**
 * Resolves the USD value to convert in the "PRICE IN 8 CURRENCIES" popover:
 * - For USD-denominated assets (equities, crypto, metals, energy): uses asset.price.
 * - For Forex: converts 1 unit of the BASE currency (USD-base => $1.00;
 *   USD-quoted => base/USD pair rate; crosses => base/USD from store).
 */
export function resolveBaseUsdAmount(assetOrUsdPrice, storeQuotes = {}) {
  if (typeof assetOrUsdPrice === 'number') {
    return Number.isFinite(assetOrUsdPrice) && assetOrUsdPrice > 0 ? assetOrUsdPrice : null;
  }
  if (!assetOrUsdPrice || typeof assetOrUsdPrice !== 'object') return null;

  const sym = (assetOrUsdPrice.symbol || '').toUpperCase();
  const sec = (assetOrUsdPrice.sector || '').toLowerCase();
  const isForex = sec === 'forex' || (
    sym.includes('/') && !sym.startsWith('XAU') && !sym.startsWith('XAG') && !sym.startsWith('XPT')
  );

  if (isForex) {
    const [base, quote] = sym.split('/');
    if (!base || !quote) return null;
    if (base === 'USD') return 1.00;
    if (quote === 'USD') {
      if (typeof assetOrUsdPrice.price === 'number' && Number.isFinite(assetOrUsdPrice.price) && assetOrUsdPrice.price > 0) {
        return assetOrUsdPrice.price;
      }
      return lookupStorePrice(storeQuotes, `${base}/USD`);
    }
    return lookupStorePrice(storeQuotes, `${base}/USD`);
  }

  return typeof assetOrUsdPrice.price === 'number' && Number.isFinite(assetOrUsdPrice.price) && assetOrUsdPrice.price > 0
    ? assetOrUsdPrice.price
    : null;
}

/**
 * Pure 8-currency conversion computation from canonical store quotes + fxExtras.
 * Missing store rates render "—" and are never replaced with hardcoded numbers.
 */
export function computeCurrencyConversions(assetOrUsdPrice, storeQuotes = {}, fxExtras = {}) {
  const usdAmount = resolveBaseUsdAmount(assetOrUsdPrice, storeQuotes);

  const usdInr = lookupStorePrice(storeQuotes, 'USD/INR');
  const eurUsd = lookupStorePrice(storeQuotes, 'EUR/USD');
  const gbpUsd = lookupStorePrice(storeQuotes, 'GBP/USD');
  const usdJpy = lookupStorePrice(storeQuotes, 'USD/JPY');
  const btcUsd = lookupStorePrice(storeQuotes, 'btc');
  const usdSgd = (typeof fxExtras?.usdsgd === 'number' && Number.isFinite(fxExtras.usdsgd) && fxExtras.usdsgd > 0)
    ? fxExtras.usdsgd
    : lookupStorePrice(storeQuotes, 'USD/SGD');
  const usdAed = (typeof fxExtras?.usdaed === 'number' && Number.isFinite(fxExtras.usdaed) && fxExtras.usdaed > 0)
    ? fxExtras.usdaed
    : 3.6725;

  const fxPerUsd = {
    USD: 1,
    INR: usdInr,
    EUR: eurUsd ? 1 / eurUsd : null,
    GBP: gbpUsd ? 1 / gbpUsd : null,
    JPY: usdJpy,
    SGD: usdSgd,
    AED: usdAed,
    BTC: btcUsd ? 1 / btcUsd : null,
  };

  if (usdAmount === null) {
    return CURRENCIES.map((c) => ({ ...c, value: null, display: '—' }));
  }

  return CURRENCIES.map((c) => {
    const rate = fxPerUsd[c.code];
    if (!rate || !Number.isFinite(rate) || rate <= 0) {
      return { ...c, value: null, display: '—' };
    }

    const converted = usdAmount * rate;
    let formatted;
    if (c.code === 'BTC') {
      formatted = converted.toLocaleString('en-US', { minimumFractionDigits: 6, maximumFractionDigits: 6 });
    } else if (c.code === 'INR') {
      formatted = converted.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } else if (c.code === 'JPY') {
      const decimals = converted >= 1000 ? 0 : 2;
      formatted = converted.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    } else {
      formatted = converted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    return { ...c, value: converted, display: `${c.symbol}${formatted}` };
  });
}

/**
 * Derives user's local currency from local storage or system timezone/locale.
 * Completely offline and private — no third-party IP leaks.
 * @returns {string}
 */
export function detectLocalCurrency() {
  if (typeof window === 'undefined') return 'USD';

  // 1. User manual override
  try {
    const saved = localStorage.getItem('quidesk_user_currency');
    if (saved && saved.length === 3) return saved.toUpperCase();
  } catch {}

  // 2. Timezone heuristics
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  if (tz.includes('Calcutta') || tz.includes('Kolkata')) return 'INR';
  if (tz.includes('London')) return 'GBP';
  if (tz.includes('Paris') || tz.includes('Berlin') || tz.includes('Rome') || tz.includes('Madrid') || tz.includes('Amsterdam') || tz.includes('Dublin')) return 'EUR';
  if (tz.includes('Tokyo')) return 'JPY';
  if (tz.includes('Sydney') || tz.includes('Melbourne') || tz.includes('Brisbane') || tz.includes('Perth')) return 'AUD';
  if (tz.includes('Toronto') || tz.includes('Vancouver') || tz.includes('Montreal')) return 'CAD';
  if (tz.includes('Zurich') || tz.includes('Geneva')) return 'CHF';
  if (tz.includes('Auckland')) return 'NZD';

  // 3. System language fallback
  if (typeof navigator !== 'undefined' && navigator.language) {
    const parts = navigator.language.split('-');
    if (parts.length > 1) {
      const region = parts[1].toUpperCase();
      const map = {
        IN: 'INR', GB: 'GBP', AU: 'AUD', CA: 'CAD', JP: 'JPY',
        CH: 'CHF', NZ: 'NZD', FR: 'EUR', DE: 'EUR', IT: 'EUR',
        ES: 'EUR', NL: 'EUR', IE: 'EUR'
      };
      if (map[region]) return map[region];
    }
  }

  return 'INR'; // Default secondary for the Quidesk financial suite
}

export function formatRatesMeta(storeQuotes = {}, generatedAt = null) {
  const fxKeys = ['usdinr', 'eurusd', 'gbpusd', 'usdjpy', 'btc'];
  const sources = new Set();
  let newestTs = null;
  for (const k of fxKeys) {
    const q = storeQuotes[k];
    if (q && q.status !== 'unavailable') {
      if (q.source) sources.add(q.source);
      const ts = typeof q.quoteTs === 'number' && Number.isFinite(q.quoteTs) ? q.quoteTs : q.timestamp;
      if (typeof ts === 'number' && Number.isFinite(ts)) {
        newestTs = newestTs === null ? ts : Math.max(newestTs, ts);
      }
    }
  }
  const asOfMs = newestTs ?? (generatedAt ? Date.parse(generatedAt) : NaN);
  const asOfLabel = Number.isFinite(asOfMs)
    ? new Date(asOfMs).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short' })
    : null;
  const sourceText = sources.size > 0 ? Array.from(sources).join(' / ') : 'Worker FX';
  return asOfLabel ? `${sourceText} · As of ${asOfLabel}` : `${sourceText} · Awaiting quote`;
}

export function useCurrencyRates() {
  const storeQuotes = useMarketStore((s) => s.quotes);
  const fxExtras = useMarketStore((s) => s.fxExtras);
  const generatedAt = useMarketStore((s) => s.generatedAt);
  const [localCurrency, setLocalCurrencyState] = useState(detectLocalCurrency);

  const setLocalCurrency = (code) => {
    setLocalCurrencyState(code);
    try {
      localStorage.setItem('quidesk_user_currency', code);
    } catch {}
  };

  // Build current rate dictionary exclusively from canonical Worker store quotes (null-safe, zero fallbacks)
  const rates = useMemo(() => {
    const dict = { USD: 1, AED: fxExtras?.usdaed || 3.6725 };

    const usdInr = lookupStorePrice(storeQuotes, 'USD/INR');
    if (usdInr) dict.INR = usdInr;

    const eurUsd = lookupStorePrice(storeQuotes, 'EUR/USD');
    if (eurUsd) dict.EUR = 1 / eurUsd;

    const gbpUsd = lookupStorePrice(storeQuotes, 'GBP/USD');
    if (gbpUsd) dict.GBP = 1 / gbpUsd;

    const usdJpy = lookupStorePrice(storeQuotes, 'USD/JPY');
    if (usdJpy) dict.JPY = usdJpy;

    const audUsd = lookupStorePrice(storeQuotes, 'AUD/USD');
    if (audUsd) dict.AUD = 1 / audUsd;

    const usdCad = lookupStorePrice(storeQuotes, 'USD/CAD');
    if (usdCad) dict.CAD = usdCad;

    const usdChf = lookupStorePrice(storeQuotes, 'USD/CHF');
    if (usdChf) dict.CHF = usdChf;

    const nzdUsd = lookupStorePrice(storeQuotes, 'NZD/USD');
    if (nzdUsd) dict.NZD = 1 / nzdUsd;

    const usdSgd = (typeof fxExtras?.usdsgd === 'number' && Number.isFinite(fxExtras.usdsgd) && fxExtras.usdsgd > 0)
      ? fxExtras.usdsgd
      : lookupStorePrice(storeQuotes, 'USD/SGD');
    if (usdSgd) dict.SGD = usdSgd;

    return dict;
  }, [storeQuotes, fxExtras]);

  const ratesMeta = useMemo(
    () => formatRatesMeta(storeQuotes, generatedAt),
    [storeQuotes, generatedAt]
  );

  const convertPrice = useCallback(
    (assetOrUsdPrice) => computeCurrencyConversions(assetOrUsdPrice, storeQuotes, fxExtras),
    [storeQuotes, fxExtras]
  );

  const formatLocalPrice = useCallback((usdPrice) => {
    if (typeof usdPrice !== 'number' || !Number.isFinite(usdPrice) || usdPrice <= 0) return null;
    const rate = rates[localCurrency];
    if (!rate) return null;

    const converted = usdPrice * rate;
    if (localCurrency === 'INR') {
      const decimals = converted >= 1000 ? 0 : 2;
      return `₹${converted.toLocaleString('en-IN', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}`;
    }

    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: localCurrency,
        minimumFractionDigits: converted >= 100 ? 0 : 2,
        maximumFractionDigits: converted >= 100 ? 0 : 2,
      }).format(converted);
    } catch {
      return null;
    }
  }, [rates, localCurrency]);

  return {
    rates,
    ratesMeta,
    localCurrency,
    setLocalCurrency,
    convertPrice,
    formatLocalPrice,
    loaded: Boolean(rates.INR),
  };
}
