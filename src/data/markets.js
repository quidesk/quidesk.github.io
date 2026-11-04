function randomWalk(base, vol, points, intervalMs = 5 * 60 * 1000) {
  const data = [];
  let cur = Math.max(0.001, base);
  const now = Date.now();
  const rawValues = [cur];
  for (let i = 1; i <= points; i++) {
    cur = Math.max(cur * 0.7, cur + (Math.random() - 0.49) * vol);
    rawValues.unshift(cur);
  }
  for (let i = points; i >= 0; i--) {
    const val = rawValues[points - i];
    const d = new Date(now - i * intervalMs);
    const timeStr = intervalMs >= 24 * 60 * 60 * 1000 
      ? d.toLocaleDateString('en-US', { month:'short', day:'numeric' })
      : d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    
    data.push({
      time: timeStr,
      value: parseFloat(Math.max(0.0001, val).toFixed(val < 1 ? 4 : 2))
    });
  }
  return data;
}
function rp(r=5) { return parseFloat(((Math.random()-0.48)*r).toFixed(2)); }

function genHistory(base, vol) {
  const safeBase = Math.max(0.001, base);
  return {
    '1H': randomWalk(safeBase, vol * 0.2, 60, 60 * 1000),             // 1 min intervals
    '24H': randomWalk(safeBase, vol, 48, 30 * 60 * 1000),             // 30 min intervals
    '1M': randomWalk(safeBase, vol * 3, 30, 24 * 60 * 60 * 1000),     // 1 day intervals
    '1Y': randomWalk(safeBase, vol * 8, 52, 7 * 24 * 60 * 60 * 1000), // 1 week intervals
  }
}

function withHistory(asset, vol) {
  const history = genHistory(asset.price, vol);
  return { ...asset, history, chartData: history['24H'] };
}

export const SECTOR_META = {
  equities:    { label:'Equities',    color:'#4d9eff', icon:'-^', cssVar:'--sector-equities' },
  crypto:      { label:'Crypto',      color:'#00d4ff', icon:'₿', cssVar:'--sector-crypto' },
  metals:      { label:'Metals',      color:'#ffd700', icon:'Au', cssVar:'--sector-metals' },
  energy:      { label:'Energy',      color:'#f97316', icon:'-%', cssVar:'--sector-energy' },
  forex:       { label:'Forex',       color:'#8b949e', icon:'¥', cssVar:'--sector-forex' },
};

export const MARKET_DATA = {
  equities: [
    withHistory({ id:'spx',  symbol:'SPY',      name:'SPDR S&P 500 ETF',   price:754.35,  change:0.30,  volume:'60M', marketCap:'540B', sector:'equities' }, 3.2),
    withHistory({ id:'ndx',  symbol:'QQQ',      name:'Invesco QQQ Trust',  price:685.28,  change:0.62,  volume:'40M', marketCap:'300B', sector:'equities' }, 4.1),
    withHistory({ id:'dow',  symbol:'DIA',      name:'SPDR Dow Jones',     price:517.06,  change:-0.44, volume:'5M',  marketCap:'35B',  sector:'equities' }, 1.5),
    withHistory({ id:'aapl', symbol:'AAPL',     name:'Apple Inc.',         price:331.90,  change:-1.90, volume:'58M', marketCap:'3.5T', sector:'equities' }, 3.2),
    withHistory({ id:'tsla', symbol:'TSLA',     name:'Tesla Inc.',         price:398.50,  change:-1.32, volume:'98M', marketCap:'1.1T', sector:'equities' }, 9.5),
    withHistory({ id:'meta', symbol:'META',     name:'Meta Platforms',     price:621.03,  change:2.36,  volume:'32M', marketCap:'1.4T', sector:'equities' }, 6.5),
    withHistory({ id:'nvda', symbol:'NVDA',     name:'NVIDIA Corp.',       price:206.69,  change:2.29,  volume:'42M', marketCap:'3.4T', sector:'equities' }, 4.2),
  ],
  crypto: [
    withHistory({ id:'btc',  symbol:'BTC',      name:'Bitcoin',            price:77718.01,change:1.14,  volume:'28.4B',marketCap:'1.54T', sector:'crypto' }, 850),
    withHistory({ id:'eth',  symbol:'ETH',      name:'Ethereum',           price:2283.58, change:1.33,  volume:'14.2B',marketCap:'272B',  sector:'crypto' }, 52),
    withHistory({ id:'sol',  symbol:'SOL',      name:'Solana',             price:93.17,   change:1.34,  volume:'3.8B', marketCap:'44B',   sector:'crypto' }, 6.2),
    withHistory({ id:'bnb',  symbol:'BNB',      name:'BNB',                price:700.33,  change:0.15,  volume:'1.9B', marketCap:'102B',  sector:'crypto' }, 12),
    withHistory({ id:'xrp',  symbol:'XRP',      name:'XRP',                price:1.2813,  change:2.59,  volume:'2.1B', marketCap:'72B',   sector:'crypto' }, 0.07),
    withHistory({ id:'ada',  symbol:'ADA',      name:'Cardano',            price:0.1908,  change:1.33,  volume:'820M', marketCap:'6.8B',  sector:'crypto' }, 0.024),
  ],
  metals: [
    withHistory({ id:'gold',     symbol:'XAU/USD', name:'Gold Spot',       price:3936.70, change:1.51,  volume:'142B', marketCap:'14.6T', sector:'metals', unit:'oz' }, 24),
    withHistory({ id:'silver',   symbol:'XAG/USD', name:'Silver Spot',     price:49.93,   change:2.10,  volume:'18B',  marketCap:'1.7T',  sector:'metals', unit:'oz' }, 1.1),
    withHistory({ id:'platinum', symbol:'XPT/USD', name:'Platinum',        price:1425.00, change:-0.77, volume:'4.2B', marketCap:'—',     sector:'metals', unit:'oz' }, 16),
  ],
  forex: [
    withHistory({ id:'eurusd', symbol:'EUR/USD', name:'Euro / US Dollar',        unit:'USD', price:1.1195, change:0.03,  volume:'580B', marketCap:'—', sector:'forex' }, 0.003),
    withHistory({ id:'gbpusd', symbol:'GBP/USD', name:'British Pound / USD',     unit:'USD', price:1.3410, change:0.07,  volume:'310B', marketCap:'—', sector:'forex' }, 0.004),
    withHistory({ id:'usdjpy', symbol:'USD/JPY', name:'US Dollar / Yen',         unit:'JPY', price:157.90, change:0.56,  volume:'430B', marketCap:'—', sector:'forex' }, 0.45),
    withHistory({ id:'audusd', symbol:'AUD/USD', name:'Australian Dollar / USD', unit:'USD', price:0.7003, change:-0.41, volume:'170B', marketCap:'—', sector:'forex' }, 0.002),
    withHistory({ id:'usdcad', symbol:'USD/CAD', name:'US Dollar / CAD',         unit:'CAD', price:1.3981, change:0.05,  volume:'160B', marketCap:'—', sector:'forex' }, 0.003),
    withHistory({ id:'usdchf', symbol:'USD/CHF', name:'US Dollar / CHF',         unit:'CHF', price:0.8195, change:0.31,  volume:'130B', marketCap:'—', sector:'forex' }, 0.002),
    withHistory({ id:'nzdusd', symbol:'NZD/USD', name:'NZ Dollar / USD',         unit:'USD', price:0.5621, change:-0.30, volume:'95B',  marketCap:'—', sector:'forex' }, 0.002),
    withHistory({ id:'eurgbp', symbol:'EUR/GBP', name:'Euro / GBP',              unit:'GBP', price:0.8348, change:-0.02, volume:'90B',  marketCap:'—', sector:'forex' }, 0.002),
    withHistory({ id:'gbpjpy', symbol:'GBP/JPY', name:'British Pound / Yen',     unit:'JPY', price:211.73, change:0.64,  volume:'70B',  marketCap:'—', sector:'forex' }, 0.65),
    withHistory({ id:'eurjpy', symbol:'EUR/JPY', name:'Euro / Yen',              unit:'JPY', price:176.76, change:0.52,  volume:'85B',  marketCap:'—', sector:'forex' }, 0.55),
    withHistory({ id:'usdinr', symbol:'USD/INR', name:'US Dollar / INR',         unit:'INR', price:94.93,  change:-0.01, volume:'40B',  marketCap:'—', sector:'forex' }, 0.18),
    withHistory({ id:'eurinr', symbol:'EUR/INR', name:'Euro / INR',              unit:'INR', price:106.27, change:0.12,  volume:'20B',  marketCap:'—', sector:'forex' }, 0.25),
  ],
  energy: [
    withHistory({ id:'wti',   symbol:'WTI',      name:'WTI Crude Oil',    price:96.56,  change:0.49,  volume:'820M', marketCap:'—', sector:'energy', unit:'bbl' }, 1.2),
    withHistory({ id:'brent', symbol:'BRENT',    name:'Brent Crude',      price:104.27, change:0.65,  volume:'940M', marketCap:'—', sector:'energy', unit:'bbl' }, 1.3),
    withHistory({ id:'ng',    symbol:'NGAS',     name:'Natural Gas',      price:2.896,  change:0.03,  volume:'210M', marketCap:'—', sector:'energy', unit:'MMBtu' }, 0.08),
    withHistory({ id:'hoil',  symbol:'HOIL',     name:'Heating Oil',      price:4.559,  change:0.64,  volume:'180M', marketCap:'—', sector:'energy', unit:'gal' }, 0.05),
  ],
};

export const ALL_ASSETS = Object.values(MARKET_DATA).flat();

export function formatPrice(price, symbol = '', sector = '') {
  if (price === null || price === undefined || isNaN(price)) return '—';
  
  const sec = (sector || '').toLowerCase();
  const sym = (symbol || '').toUpperCase();
  
  // Explicitly check for forex sector or pure currency pairs (excluding metals like XAU/USD)
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
    // Clean unitless exchange rate (no '$')
    const decimals = (sym.includes('JPY') || sym.includes('INR')) ? 2 : 4;
    return price.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }

  // USD-denominated assets: Equities, Crypto, Metals, Energy
  if (sec === 'crypto' || (!sec && price < 2)) {
    if (price < 2) {
      return `$${price.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}`;
    }
  }

  if (price >= 1000) {
    return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `$${price.toFixed(2)}`;
}
export function formatChange(c) { return `${c>=0?'+':''}${c.toFixed(2)}%`; }

/**
 * formatChangeBubble — Space-constrained 1-decimal rounding for MarketMap bubble labels.
 *
 * Uses toFixed(1) because SVG text inside small orbs can't fit 2-decimal precision.
 * Both this function and formatChange read from the same asset.change float —
 * the difference is purely display formatting, not a second independent calculation.
 *
 * @param {number} c — percent change value
 * @returns {string} — e.g. "+1.2%" or "-4.6%"
 */
export function formatChangeBubble(c) { return `${c>=0?'+':''}${c.toFixed(1)}%`; }
export function formatVolume(v) { return v || '—'; }

export function simulateTick(asset) {
  const drift = (Math.random() - 0.495) * asset.price * 0.0018;
  const newPrice = Math.max(0.001, asset.price + drift);
  const newChange = asset.change + (Math.random() - 0.5) * 0.08;
  const last = asset.chartData[asset.chartData.length - 1];
  const newPoint = {
    time: new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}),
    value: parseFloat(newPrice.toFixed(newPrice < 1 ? 4 : 2))
  };
  return {
    ...asset,
    price: parseFloat(newPrice.toFixed(newPrice < 1 ? 4 : 2)),
    change: parseFloat(Math.max(-99, Math.min(99, newChange)).toFixed(2)),
    chartData: [...asset.chartData.slice(-79), newPoint],
  };
}

// Correlation coefficients between major assets (simplified, not real)
export const CORRELATIONS = [
  { a:'btc',  b:'eth',  r: 0.91, type:'crypto-crypto' },
  { a:'btc',  b:'spx',  r: 0.42, type:'crypto-equity' },
  { a:'gold', b:'spx',  r:-0.28, type:'metal-equity' },
  { a:'gold', b:'btc',  r: 0.35, type:'metal-crypto' },
  { a:'wti',  b:'spx',  r: 0.38, type:'energy-equity' },
  { a:'eurusd', b:'gold', r: 0.52, type:'forex-metal' },
  { a:'usdjpy', b:'gold', r:-0.44, type:'forex-metal' },
  { a:'eurusd', b:'spx',  r: 0.31, type:'forex-equity' },
  { a:'usdcad', b:'wti',  r:-0.62, type:'forex-energy' },
  { a:'wti',  b:'gold', r: 0.22, type:'energy-metal' },
  { a:'gold', b:'silver', r: 0.88, type:'metal-metal' },
  { a:'wti',  b:'brent',  r: 0.98, type:'energy-energy' },
  { a:'nvda', b:'btc',    r: 0.55, type:'equity-crypto' },
  { a:'spx',  b:'ndx',    r: 0.96, type:'equity-equity' },
];

// Detect hotspots from current data
export function detectHotspots(assets) {
  const hotspots = [];
  assets.forEach(a => {
    const absChange = Math.abs(a.change);
    if (absChange > 4.0) {
      hotspots.push({
        assetId: a.id, symbol: a.symbol, sector: a.sector,
        type: a.change > 0 ? 'breakout' : 'breakdown',
        signal: `${Math.abs(a.change).toFixed(2)}% ${a.change > 0 ? 'surge' : 'drop'}`,
        severity: absChange > 7 ? 'high' : absChange > 5 ? 'medium' : 'low',
        color: a.change > 0 ? '#22d47a' : '#f04060',
        timestamp: Date.now(),
      });
    }
    const data = a.chartData;
    if (data.length > 10) {
      const recent = data.slice(-5).reduce((s,d)=>s+d.value,0)/5;
      const older  = data.slice(-15,-10).reduce((s,d)=>s+d.value,0)/5;
      const mom = ((recent - older) / older) * 100;
      if (Math.abs(mom) > 2.5 && Math.abs(a.change) < 1.5) {
        hotspots.push({
          assetId: a.id, symbol: a.symbol, sector: a.sector,
          type: 'divergence',
          signal: `momentum ${mom > 0 ? 'building' : 'fading'} quietly`,
          severity: 'low',
          color: '#a78bfa',
          timestamp: Date.now(),
        });
      }
    }
  });
  return hotspots.sort((a,b) =>
    ({high:0,medium:1,low:2}[a.severity]||2) - ({high:0,medium:1,low:2}[b.severity]||2)
  );
}
