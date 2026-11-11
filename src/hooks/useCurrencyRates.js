/**
 * Quidesk — Canonical Currency Conversion & User Local Currency
 * 
 * Strict architectural rule:
 * NO external IP lookups (ipapi.co deleted).
 * Local currency is inferred strictly from client locale/timezone and user settings.
 * Exchange rates are derived directly from the canonical store quotes.
 */

import { useState, useMemo } from 'react';
import { useMarketStore } from '../store/marketStore';

export const CURRENCIES = [
  { code: 'USD', symbol: '$',   name: 'US Dollar',        flag: '🇺🇸' },
  { code: 'INR', symbol: '₹',   name: 'Indian Rupee',     flag: '🇮🇳' },
  { code: 'EUR', symbol: '€',   name: 'Euro',             flag: '🇪🇺' },
  { code: 'GBP', symbol: '£',   name: 'British Pound',    flag: '🇬🇧' },
  { code: 'JPY', symbol: '¥',   name: 'Japanese Yen',     flag: '🇯🇵' },
  { code: 'AUD', symbol: 'A$',  name: 'Australian Dollar', flag: '🇦🇺' },
  { code: 'CAD', symbol: 'C$',  name: 'Canadian Dollar',  flag: '🇨🇦' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc',      flag: '🇨🇭' },
  { code: 'NZD', symbol: 'NZ$', name: 'NZ Dollar',        flag: '🇳🇿' },
];

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

export function useCurrencyRates() {
  const storeQuotes = useMarketStore((s) => s.quotes);
  const [localCurrency, setLocalCurrencyState] = useState(detectLocalCurrency);

  const setLocalCurrency = (code) => {
    setLocalCurrencyState(code);
    try {
      localStorage.setItem('quidesk_user_currency', code);
    } catch {}
  };

  // Build current rate dictionary from canonical store quotes
  const rates = useMemo(() => {
    const dict = { USD: 1 };

    const usdInr = storeQuotes['USD/INR']?.price || storeQuotes['usdinr']?.price;
    if (usdInr) dict.INR = usdInr;

    const eurUsd = storeQuotes['EUR/USD']?.price || storeQuotes['eurusd']?.price;
    if (eurUsd) dict.EUR = 1 / eurUsd;

    const gbpUsd = storeQuotes['GBP/USD']?.price || storeQuotes['gbpusd']?.price;
    if (gbpUsd) dict.GBP = 1 / gbpUsd;

    const usdJpy = storeQuotes['USD/JPY']?.price || storeQuotes['usdjpy']?.price;
    if (usdJpy) dict.JPY = usdJpy;

    const audUsd = storeQuotes['AUD/USD']?.price || storeQuotes['audusd']?.price;
    if (audUsd) dict.AUD = 1 / audUsd;

    const usdCad = storeQuotes['USD/CAD']?.price || storeQuotes['usdcad']?.price;
    if (usdCad) dict.CAD = usdCad;

    const usdChf = storeQuotes['USD/CHF']?.price || storeQuotes['usdchf']?.price;
    if (usdChf) dict.CHF = usdChf;

    const nzdUsd = storeQuotes['NZD/USD']?.price || storeQuotes['nzdusd']?.price;
    if (nzdUsd) dict.NZD = 1 / nzdUsd;

    return dict;
  }, [storeQuotes]);

  function convertPrice(usdPrice) {
    if (typeof usdPrice !== 'number' || !Number.isFinite(usdPrice) || usdPrice <= 0) {
      return CURRENCIES.map(c => ({ ...c, value: null, display: '—' }));
    }

    return CURRENCIES.map((c) => {
      const rate = rates[c.code];
      if (!rate) return { ...c, value: null, display: '—' };

      const converted = usdPrice * rate;
      const formatted = c.code === 'JPY'
        ? Math.round(converted).toLocaleString('en-US')
        : converted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      return { ...c, value: converted, display: `${c.symbol}${formatted}` };
    });
  }

  function formatLocalPrice(usdPrice) {
    if (typeof usdPrice !== 'number' || !Number.isFinite(usdPrice) || usdPrice <= 0) return null;
    const rate = rates[localCurrency];
    if (!rate) return null;

    const converted = usdPrice * rate;
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: localCurrency,
        maximumFractionDigits: converted > 100 ? 0 : 2,
      }).format(converted);
    } catch {
      return null;
    }
  }

  return {
    rates,
    localCurrency,
    setLocalCurrency,
    convertPrice,
    formatLocalPrice,
    loaded: true,
  };
}
