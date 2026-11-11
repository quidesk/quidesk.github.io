/**
 * Quidesk — Canonical Asset Metadata & Static Definitions
 * 
 * Strict architectural rule:
 * This file retains STATIC METADATA ONLY (id, symbol, name, sector, unit, decimals).
 * ALL prices, percentage changes, sparklines, and history come exclusively from the
 * Cloudflare Worker feed (/v1/quotes and /v1/history).
 * Zero seed prices, zero random walks, zero synthetic noise.
 */

import {
  formatAssetPrice,
  formatUsdPrice,
  formatForexSecondaryValue,
  formatCardUnitSuffix,
  formatChangePercentage,
} from '../utils/formatters';

export {
  formatAssetPrice,
  formatUsdPrice,
  formatForexSecondaryValue,
  formatCardUnitSuffix,
  formatChangePercentage,
};

export const SECTOR_META = {
  equities: { label: 'Equities', color: '#4d9eff', icon: '↗', cssVar: '--sector-equities' },
  crypto:   { label: 'Crypto',   color: '#00d4ff', icon: '₿', cssVar: '--sector-crypto' },
  metals:   { label: 'Metals',   color: '#ffd700', icon: 'Au', cssVar: '--sector-metals' },
  energy:   { label: 'Energy',   color: '#f97316', icon: '⚡', cssVar: '--sector-energy' },
  forex:    { label: 'Forex',    color: '#8b949e', icon: '¥', cssVar: '--sector-forex' },
};

/**
 * Static metadata catalog for all 32 assets.
 */
export const STATIC_ASSETS_METADATA = {
  // Equities
  spx:  { id: 'spx',  symbol: 'SPY',      name: 'SPDR S&P 500 ETF',  sector: 'equities', unit: 'USD', decimals: 2 },
  ndx:  { id: 'ndx',  symbol: 'QQQ',      name: 'Invesco QQQ Trust', sector: 'equities', unit: 'USD', decimals: 2 },
  dow:  { id: 'dow',  symbol: 'DIA',      name: 'SPDR Dow Jones',    sector: 'equities', unit: 'USD', decimals: 2 },
  aapl: { id: 'aapl', symbol: 'AAPL',     name: 'Apple Inc.',        sector: 'equities', unit: 'USD', decimals: 2 },
  tsla: { id: 'tsla', symbol: 'TSLA',     name: 'Tesla Inc.',        sector: 'equities', unit: 'USD', decimals: 2 },
  meta: { id: 'meta', symbol: 'META',     name: 'Meta Platforms',    sector: 'equities', unit: 'USD', decimals: 2 },
  nvda: { id: 'nvda', symbol: 'NVDA',     name: 'NVIDIA Corp.',      sector: 'equities', unit: 'USD', decimals: 2 },

  // Crypto
  btc:  { id: 'btc',  symbol: 'BTC',      name: 'Bitcoin',           sector: 'crypto',   unit: 'USD', decimals: 2 },
  eth:  { id: 'eth',  symbol: 'ETH',      name: 'Ethereum',          sector: 'crypto',   unit: 'USD', decimals: 2 },
  sol:  { id: 'sol',  symbol: 'SOL',      name: 'Solana',            sector: 'crypto',   unit: 'USD', decimals: 2 },
  bnb:  { id: 'bnb',  symbol: 'BNB',      name: 'BNB',               sector: 'crypto',   unit: 'USD', decimals: 2 },
  xrp:  { id: 'xrp',  symbol: 'XRP',      name: 'XRP',               sector: 'crypto',   unit: 'USD', decimals: 4 },
  ada:  { id: 'ada',  symbol: 'ADA',      name: 'Cardano',           sector: 'crypto',   unit: 'USD', decimals: 4 },

  // Metals
  gold:     { id: 'gold',     symbol: 'XAU/USD', name: 'Gold (fut.)',     sector: 'metals', unit: 'oz', decimals: 2 },
  silver:   { id: 'silver',   symbol: 'XAG/USD', name: 'Silver (fut.)',   sector: 'metals', unit: 'oz', decimals: 2 },
  platinum: { id: 'platinum', symbol: 'XPT/USD', name: 'Platinum (fut.)', sector: 'metals', unit: 'oz', decimals: 2 },

  // Energy
  wti:   { id: 'wti',   symbol: 'WTI',   name: 'WTI Crude Oil', sector: 'energy', unit: 'bbl',   decimals: 2 },
  brent: { id: 'brent', symbol: 'BRENT', name: 'Brent Crude',   sector: 'energy', unit: 'bbl',   decimals: 2 },
  ng:    { id: 'ng',    symbol: 'NGAS',  name: 'Natural Gas',   sector: 'energy', unit: 'MMBtu', decimals: 3 },
  hoil:  { id: 'hoil',  symbol: 'HOIL',  name: 'Heating Oil',   sector: 'energy', unit: 'gal',   decimals: 3 },

  // Forex
  eurusd: { id: 'eurusd', symbol: 'EUR/USD', name: 'Euro / US Dollar',        sector: 'forex', unit: 'USD', decimals: 4 },
  gbpusd: { id: 'gbpusd', symbol: 'GBP/USD', name: 'British Pound / USD',     sector: 'forex', unit: 'USD', decimals: 4 },
  usdjpy: { id: 'usdjpy', symbol: 'USD/JPY', name: 'US Dollar / Yen',         sector: 'forex', unit: 'JPY', decimals: 2 },
  audusd: { id: 'audusd', symbol: 'AUD/USD', name: 'Australian Dollar / USD', sector: 'forex', unit: 'USD', decimals: 4 },
  usdcad: { id: 'usdcad', symbol: 'USD/CAD', name: 'US Dollar / CAD',         sector: 'forex', unit: 'CAD', decimals: 4 },
  usdchf: { id: 'usdchf', symbol: 'USD/CHF', name: 'US Dollar / CHF',         sector: 'forex', unit: 'CHF', decimals: 4 },
  nzdusd: { id: 'nzdusd', symbol: 'NZD/USD', name: 'NZ Dollar / USD',         sector: 'forex', unit: 'USD', decimals: 4 },
  eurgbp: { id: 'eurgbp', symbol: 'EUR/GBP', name: 'Euro / GBP',              sector: 'forex', unit: 'GBP', decimals: 4 },
  gbpjpy: { id: 'gbpjpy', symbol: 'GBP/JPY', name: 'British Pound / Yen',     sector: 'forex', unit: 'JPY', decimals: 2 },
  eurjpy: { id: 'eurjpy', symbol: 'EUR/JPY', name: 'Euro / Yen',              sector: 'forex', unit: 'JPY', decimals: 2 },
  usdinr: { id: 'usdinr', symbol: 'USD/INR', name: 'US Dollar / INR',         sector: 'forex', unit: 'INR', decimals: 2 },
  eurinr: { id: 'eurinr', symbol: 'EUR/INR', name: 'Euro / INR',              sector: 'forex', unit: 'INR', decimals: 2 },
};

/**
 * Creates an unhydrated asset skeleton with null numbers and status 'unavailable'.
 */
function createSkeletonAsset(meta) {
  return {
    ...meta,
    price: null,
    prevClose: null,
    change: null,
    changePercent: null,
    status: 'unavailable',
    session: meta.sector === 'crypto' ? '24x7' : 'regular',
    spark1d: [],
    history: {
      '1H': [],
      '24H': [],
      '1M': [],
      '1Y': [],
    },
    chartData: [],
  };
}

export const MARKET_DATA = {
  equities: ['spx', 'ndx', 'dow', 'aapl', 'tsla', 'meta', 'nvda'].map(id => createSkeletonAsset(STATIC_ASSETS_METADATA[id])),
  crypto:   ['btc', 'eth', 'sol', 'bnb', 'xrp', 'ada'].map(id => createSkeletonAsset(STATIC_ASSETS_METADATA[id])),
  metals:   ['gold', 'silver', 'platinum'].map(id => createSkeletonAsset(STATIC_ASSETS_METADATA[id])),
  energy:   ['wti', 'brent', 'ng', 'hoil'].map(id => createSkeletonAsset(STATIC_ASSETS_METADATA[id])),
  forex:    ['eurusd', 'gbpusd', 'usdjpy', 'audusd', 'usdcad', 'usdchf', 'nzdusd', 'eurgbp', 'gbpjpy', 'eurjpy', 'usdinr', 'eurinr'].map(id => createSkeletonAsset(STATIC_ASSETS_METADATA[id])),
};

export const ALL_ASSETS = Object.values(MARKET_DATA).flat();

/**
 * Delegating display formatters
 */
export function formatPrice(price, symbol = '', sector = '') {
  return formatAssetPrice(price, symbol, sector);
}

export function formatChange(c) {
  return formatChangePercentage(c);
}

export function formatChangeBubble(c) {
  if (c === null || c === undefined || !Number.isFinite(c)) return '—';
  if (Math.abs(c) < 0.005) return '0.0%';
  return `${c > 0 ? '+' : ''}${c.toFixed(1)}%`;
}

/**
 * Illustrative cross-market sector correlation links.
 * Explicitly labeled illustrative to represent structural macroeconomic couplings.
 */
export const CORRELATIONS = [
  { a: 'spx', b: 'ndx', r: 0.94, label: 'illustrative' },
  { a: 'spx', b: 'dow', r: 0.88, label: 'illustrative' },
  { a: 'ndx', b: 'aapl', r: 0.86, label: 'illustrative' },
  { a: 'ndx', b: 'nvda', r: 0.82, label: 'illustrative' },
  { a: 'spx', b: 'tsla', r: 0.68, label: 'illustrative' },
  { a: 'btc', b: 'eth', r: 0.91, label: 'illustrative' },
  { a: 'btc', b: 'sol', r: 0.84, label: 'illustrative' },
  { a: 'eth', b: 'bnb', r: 0.78, label: 'illustrative' },
  { a: 'gold', b: 'silver', r: 0.87, label: 'illustrative' },
  { a: 'wti', b: 'brent', r: 0.98, label: 'illustrative' },
  { a: 'eurusd', b: 'gbpusd', r: 0.85, label: 'illustrative' },
  { a: 'eurusd', b: 'usdchf', r: -0.92, label: 'illustrative' },
  { a: 'usdjpy', b: 'gbpjpy', r: 0.89, label: 'illustrative' },
  { a: 'usdjpy', b: 'eurjpy', r: 0.91, label: 'illustrative' },
  { a: 'spx', b: 'gold', r: -0.22, label: 'illustrative' },
  { a: 'spx', b: 'wti', r: 0.35, label: 'illustrative' },
  { a: 'btc', b: 'spx', r: 0.42, label: 'illustrative' },
  { a: 'gold', b: 'usdjpy', r: -0.58, label: 'illustrative' },
  { a: 'wti', b: 'usdcad', r: -0.65, label: 'illustrative' },
];

function getNYDateKey(tsMs) {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(tsMs));
  } catch {
    return null;
  }
}

/**
 * Detects intraday hotspots directly from verified quote changes.
 * Uses the quote's own timestamp and expires on session rollover or closed/stale status.
 * Flat and rebounded assets (< 2.0%) are excluded.
 */
export function detectHotspots(assets = [], referenceNow = null) {
  const hasRefClock = typeof referenceNow === 'number' && Number.isFinite(referenceNow);
  const nowDateNY = hasRefClock ? getNYDateKey(referenceNow) : null;
  return assets
    .filter(a => {
      if (!a) return false;
      if (a.status === 'closed' || a.status === 'unavailable' || a.status === 'stale' || a.status === 'delayed' || a.tradingPeriod === 'closed') {
        return false;
      }
      const chg = typeof a.changePercent === 'number' ? a.changePercent : a.change;
      if (typeof chg !== 'number' || !Number.isFinite(chg) || Math.abs(chg) < 2.0) {
        return false;
      }
      if (hasRefClock) {
        const ts = typeof a.quoteTs === 'number' && Number.isFinite(a.quoteTs)
          ? a.quoteTs
          : (typeof a.timestamp === 'number' && Number.isFinite(a.timestamp) ? a.timestamp : null);
        if (ts === null) return false;
        if (referenceNow - ts > 16 * 60 * 60 * 1000) return false;
        if (a.sector === 'equities' && nowDateNY && getNYDateKey(ts) !== nowDateNY) {
          return false;
        }
      }
      return true;
    })
    .map(a => {
      const ts = typeof a.quoteTs === 'number' && Number.isFinite(a.quoteTs) ? a.quoteTs : a.timestamp;
      const chg = typeof a.changePercent === 'number' ? a.changePercent : a.change;
      return {
        assetId: a.id,
        symbol: a.symbol,
        sector: a.sector,
        change: chg,
        quoteTs: ts,
        timestamp: ts,
        type: chg > 0 ? 'breakout' : 'breakdown',
        signal: chg > 0 ? 'bullish_breakout' : 'bearish_reversal',
        severity: Math.abs(chg) >= 5 ? 'high' : 'medium',
      };
    });
}
