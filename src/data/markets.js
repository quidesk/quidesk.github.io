import { formatAssetPrice, formatUsdPrice, formatForexSecondaryValue, formatCardUnitSuffix } from '../utils/formatters';

export { formatAssetPrice, formatUsdPrice, formatForexSecondaryValue, formatCardUnitSuffix };

/**
 * generateDeterministicSparkline — Generates authentic multi-point intraday curve
 * seeded deterministically by symbol hash and anchored to [prevClose, ...interpolated, currentPrice].
 */
export function generateDeterministicSparkline(symbol = '', currentPrice, changePercent = 0, count = 48) {
  const p = Math.max(0.0001, Number(currentPrice) || 1);
  const chg = Number(changePercent) || 0;
  const prevClose = p / (1 + chg / 100);
  const diff = p - prevClose;

  // Simple string hash for deterministic pseudorandom seed
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) {
    hash = ((hash << 5) - hash) + symbol.charCodeAt(i);
    hash |= 0;
  }
  hash = Math.abs(hash);

  const points = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    // Baseline progression from prevClose to currentPrice
    const base = prevClose + diff * t;
    
    // Deterministic harmonic oscillations with seed
    const phase1 = ((hash % 17) + 1) * 0.4;
    const phase2 = ((hash % 31) + 1) * 0.25;
    const wave1 = Math.sin(t * Math.PI * 3 + phase1);
    const wave2 = Math.cos(t * Math.PI * 5 + phase2);
    
    // Oscillation envelope: 0 at start (prevClose) and 0 at end (currentPrice)
    const envelope = Math.sin(t * Math.PI);
    const volatility = Math.abs(diff) > 0 ? Math.abs(diff) * 0.35 : p * 0.008;
    const fluctuation = (wave1 * 0.6 + wave2 * 0.4) * envelope * volatility;

    const val = parseFloat((base + fluctuation).toFixed(p < 1 ? 4 : 2));
    points.push(Math.max(0.0001, val));
  }
  points[0] = parseFloat(prevClose.toFixed(p < 1 ? 4 : 2));
  points[points.length - 1] = parseFloat(p.toFixed(p < 1 ? 4 : 2));

  return points;
}

/**
 * Clean baseline history initialization seeded deterministically by symbol hash.
 */
function withHistory(asset) {
  const p = Math.max(0.0001, asset.price);
  const change = asset.change || 0;
  const points = generateDeterministicSparkline(asset.symbol || asset.id, p, change, 48);

  const history = {
    '1H': points.slice(-12),
    '24H': points,
    '1M': points,
    '1Y': points,
  };
  return {
    ...asset,
    history,
    chartData: points.map((v, i) => ({ time: `${i}:00`, value: v })),
  };
}

export const SECTOR_META = {
  equities:    { label:'Equities',    color:'#4d9eff', icon:'↗', cssVar:'--sector-equities' },
  crypto:      { label:'Crypto',      color:'#00d4ff', icon:'₿', cssVar:'--sector-crypto' },
  metals:      { label:'Metals',      color:'#ffd700', icon:'Au', cssVar:'--sector-metals' },
  energy:      { label:'Energy',      color:'#f97316', icon:'⚡', cssVar:'--sector-energy' },
  forex:       { label:'Forex',       color:'#8b949e', icon:'¥', cssVar:'--sector-forex' },
};

export const MARKET_DATA = {
  equities: [
    withHistory({ id:'spx',  symbol:'SPY',      name:'SPDR S&P 500 ETF',   price:749.92,  change:-0.37, volume:'60M', marketCap:'540B', sector:'equities' }, 3.2),
    withHistory({ id:'ndx',  symbol:'QQQ',      name:'Invesco QQQ Trust',  price:674.76,  change:-0.68, volume:'40M', marketCap:'300B', sector:'equities' }, 4.1),
    withHistory({ id:'dow',  symbol:'DIA',      name:'SPDR Dow Jones',     price:521.73,  change:-0.31, volume:'5M',  marketCap:'35B',  sector:'equities' }, 1.5),
    withHistory({ id:'aapl', symbol:'AAPL',     name:'Apple Inc.',         price:348.51,  change:-0.62, volume:'58M', marketCap:'3.5T', sector:'equities' }, 3.2),
    withHistory({ id:'tsla', symbol:'TSLA',     name:'Tesla Inc.',         price:379.78,  change:0.46,  volume:'98M', marketCap:'1.1T', sector:'equities' }, 9.5),
    withHistory({ id:'meta', symbol:'META',     name:'Meta Platforms',     price:641.39,  change:0.00,  volume:'32M', marketCap:'1.4T', sector:'equities' }, 6.5),
    withHistory({ id:'nvda', symbol:'NVDA',     name:'NVIDIA Corp.',       price:168.89,  change:-5.47, volume:'42M', marketCap:'3.4T', sector:'equities' }, 4.2),
  ],
  crypto: [
    withHistory({ id:'btc',  symbol:'BTC',      name:'Bitcoin',            price:73382.64,change:-0.44, volume:'28.4B',marketCap:'1.54T', sector:'crypto' }, 850),
    withHistory({ id:'eth',  symbol:'ETH',      name:'Ethereum',           price:2048.09, change:-3.77, volume:'14.2B',marketCap:'272B',  sector:'crypto' }, 52),
    withHistory({ id:'sol',  symbol:'SOL',      name:'Solana',             price:83.04,   change:-4.12, volume:'3.8B', marketCap:'44B',   sector:'crypto' }, 6.2),
    withHistory({ id:'bnb',  symbol:'BNB',      name:'BNB',                price:679.36,  change:-1.69, volume:'1.9B', marketCap:'102B',  sector:'crypto' }, 12),
    withHistory({ id:'xrp',  symbol:'XRP',      name:'XRP',                price:1.0507,  change:-4.87, volume:'2.1B', marketCap:'72B',   sector:'crypto' }, 0.07),
    withHistory({ id:'ada',  symbol:'ADA',      name:'Cardano',            price:0.1743,  change:-1.69, volume:'820M', marketCap:'6.8B',  sector:'crypto' }, 0.024),
  ],
  metals: [
    withHistory({ id:'gold',     symbol:'XAU/USD', name:'Gold Spot',       price:4028.10, change:0.25,  volume:'142B', marketCap:'14.6T', sector:'metals', unit:'oz' }, 24),
    withHistory({ id:'silver',   symbol:'XAG/USD', name:'Silver Spot',     price:51.75,   change:0.35,  volume:'18B',  marketCap:'1.7T',  sector:'metals', unit:'oz' }, 1.1),
    withHistory({ id:'platinum', symbol:'XPT/USD', name:'Platinum',        price:1553.00, change:1.25,  volume:'4.2B', marketCap:'—',     sector:'metals', unit:'oz' }, 16),
  ],
  forex: [
    withHistory({ id:'eurusd', symbol:'EUR/USD', name:'Euro / US Dollar',        unit:'USD', price:1.1214, change:0.19,  volume:'580B', marketCap:'—', sector:'forex' }, 0.003),
    withHistory({ id:'gbpusd', symbol:'GBP/USD', name:'British Pound / USD',     unit:'USD', price:1.3346, change:-0.48, volume:'310B', marketCap:'—', sector:'forex' }, 0.004),
    withHistory({ id:'usdjpy', symbol:'USD/JPY', name:'US Dollar / Yen',         unit:'JPY', price:158.94, change:0.65,  volume:'430B', marketCap:'—', sector:'forex' }, 0.45),
    withHistory({ id:'audusd', symbol:'AUD/USD', name:'Australian Dollar / USD', unit:'USD', price:0.6879, change:-1.80, volume:'170B', marketCap:'—', sector:'forex' }, 0.002),
    withHistory({ id:'usdcad', symbol:'USD/CAD', name:'US Dollar / CAD',         unit:'CAD', price:1.4193, change:1.49,  volume:'160B', marketCap:'—', sector:'forex' }, 0.003),
    withHistory({ id:'usdchf', symbol:'USD/CHF', name:'US Dollar / CHF',         unit:'CHF', price:0.8260, change:0.79,  volume:'130B', marketCap:'—', sector:'forex' }, 0.002),
    withHistory({ id:'nzdusd', symbol:'NZD/USD', name:'NZ Dollar / USD',         unit:'USD', price:0.5628, change:0.27,  volume:'95B',  marketCap:'—', sector:'forex' }, 0.002),
    withHistory({ id:'eurgbp', symbol:'EUR/GBP', name:'Euro / GBP',              unit:'GBP', price:0.8362, change:0.14,  volume:'90B',  marketCap:'—', sector:'forex' }, 0.002),
    withHistory({ id:'gbpjpy', symbol:'GBP/JPY', name:'British Pound / Yen',     unit:'JPY', price:212.10, change:0.19,  volume:'70B',  marketCap:'—', sector:'forex' }, 0.65),
    withHistory({ id:'eurjpy', symbol:'EUR/JPY', name:'Euro / Yen',              unit:'JPY', price:177.38, change:0.33,  volume:'85B',  marketCap:'—', sector:'forex' }, 0.55),
    withHistory({ id:'usdinr', symbol:'USD/INR', name:'US Dollar / INR',         unit:'INR', price:93.92,  change:0.00,  volume:'40B',  marketCap:'—', sector:'forex' }, 0.18),
    withHistory({ id:'eurinr', symbol:'EUR/INR', name:'Euro / INR',              unit:'INR', price:104.89, change:0.18,  volume:'20B',  marketCap:'—', sector:'forex' }, 0.25),
  ],
  energy: [
    withHistory({ id:'wti',   symbol:'WTI',      name:'WTI Crude Oil',    price:86.62,  change:0.67,  volume:'820M', marketCap:'—', sector:'energy', unit:'bbl' }, 1.2),
    withHistory({ id:'brent', symbol:'BRENT',    name:'Brent Crude',      price:92.27,  change:0.85,  volume:'940M', marketCap:'—', sector:'energy', unit:'bbl' }, 1.3),
    withHistory({ id:'ng',    symbol:'NGAS',     name:'Natural Gas',      price:3.31,   change:0.52,  volume:'210M', marketCap:'—', sector:'energy', unit:'MMBtu' }, 0.08),
    withHistory({ id:'hoil',  symbol:'HOIL',     name:'Heating Oil',      price:4.16,   change:0.60,  volume:'180M', marketCap:'—', sector:'energy', unit:'gal' }, 0.05),
  ]
};

export const ALL_ASSETS = Object.values(MARKET_DATA).flat();

/**
 * formatPrice - Centralized display price formatter delegates to formatAssetPrice
 */
export function formatPrice(price, symbol = '', sector = '') {
  return formatAssetPrice(price, symbol, sector);
}

export function formatChange(c) { return `${c>=0?'+':''}${c.toFixed(2)}%`; }

/**
 * formatChangeBubble — Space-constrained 1-decimal rounding for MarketMap bubble labels.
 */
export function formatChangeBubble(c) {
  if (c === null || c === undefined || isNaN(c)) return '0.0%';
  return `${c >= 0 ? '+' : ''}${c.toFixed(1)}%`;
}

export const CORRELATIONS = [
  { a:'spx', b:'ndx', r:0.94 },
  { a:'spx', b:'dow', r:0.88 },
  { a:'ndx', b:'aapl', r:0.86 },
  { a:'ndx', b:'nvda', r:0.82 },
  { a:'spx', b:'tsla', r:0.68 },
  { a:'btc', b:'eth', r:0.91 },
  { a:'btc', b:'sol', r:0.84 },
  { a:'eth', b:'bnb', r:0.78 },
  { a:'gold', b:'silver', r:0.87 },
  { a:'wti', b:'brent', r:0.98 },
  { a:'eurusd', b:'gbpusd', r:0.85 },
  { a:'eurusd', b:'usdchf', r:-0.92 },
  { a:'usdjpy', b:'gbpjpy', r:0.89 },
  { a:'usdjpy', b:'eurjpy', r:0.91 },
  { a:'spx', b:'gold', r:-0.22 },
  { a:'spx', b:'wti', r:0.35 },
  { a:'btc', b:'spx', r:0.42 },
  { a:'gold', b:'usdjpy', r:-0.58 },
  { a:'wti', b:'usdcad', r:-0.65 },
];

export function detectHotspots(assets) {
  return assets
    .filter(a => typeof a.change === 'number' && Math.abs(a.change) >= 2.0)
    .map(a => ({
      assetId: a.id,
      symbol: a.symbol,
      sector: a.sector,
      change: a.change,
      type: a.change > 0 ? 'breakout' : 'breakdown',
      signal: a.change > 0 ? 'bullish_breakout' : 'bearish_reversal',
      severity: Math.abs(a.change) >= 5 ? 'high' : 'medium',
    }));
}
