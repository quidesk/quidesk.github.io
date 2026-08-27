function randomWalk(base, vol, points, intervalMs = 5 * 60 * 1000) {
  const data = [];
  let cur = base;
  const now = Date.now();
  const rawValues = [base];
  for (let i = 1; i <= points; i++) {
    cur = Math.max(cur * 0.5, cur + (Math.random() - 0.49) * vol);
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
      value: parseFloat(val.toFixed(val < 1 ? 4 : 2))
    });
  }
  return data;
}
function rp(r=5) { return parseFloat(((Math.random()-0.48)*r).toFixed(2)); }

function genHistory(base, vol) {
  return {
    '1H': randomWalk(base, vol * 0.2, 60, 60 * 1000),             // 1 min intervals
    '24H': randomWalk(base, vol, 48, 30 * 60 * 1000),             // 30 min intervals
    '1M': randomWalk(base, vol * 3, 30, 24 * 60 * 60 * 1000),     // 1 day intervals
    '1Y': randomWalk(base, vol * 8, 52, 7 * 24 * 60 * 60 * 1000), // 1 week intervals
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
    withHistory({ id:'spx',  symbol:'SPY',      name:'SPDR S&P 500 ETF',   price:771.10,  change:-0.17, volume:'60M', marketCap:'540B', sector:'equities' }, 3.2),
    withHistory({ id:'ndx',  symbol:'QQQ',      name:'Invesco QQQ Trust',  price:711.40,  change:-0.69, volume:'40M', marketCap:'300B', sector:'equities' }, 4.1),
    withHistory({ id:'dow',  symbol:'DIA',      name:'SPDR Dow Jones',     price:535.45,  change:0.27,  volume:'5M',  marketCap:'35B',  sector:'equities' }, 1.5),
    withHistory({ id:'aapl', symbol:'AAPL',     name:'Apple Inc.',         price:314.58,  change:0.53,  volume:'58M', marketCap:'3.5T', sector:'equities' }, 3.2),
    withHistory({ id:'tsla', symbol:'TSLA',     name:'Tesla Inc.',         price:352.94,  change:-2.81, volume:'98M', marketCap:'1.1T', sector:'equities' }, 9.5),
    withHistory({ id:'meta', symbol:'META',     name:'Meta Platforms',     price:571.90,  change:1.20,  volume:'32M', marketCap:'1.4T', sector:'equities' }, 6.5),
    withHistory({ id:'nvda', symbol:'NVDA',     name:'NVIDIA Corp.',       price:226.33,  change:-2.29, volume:'42M', marketCap:'3.4T', sector:'equities' }, 4.2),
  ],
  crypto: [
    withHistory({ id:'btc',  symbol:'BTC',      name:'Bitcoin',            price:80117.80,change:1.62,  volume:'28.4B',marketCap:'1.44T', sector:'crypto' }, 850),
    withHistory({ id:'eth',  symbol:'ETH',      name:'Ethereum',           price:2505.50, change:0.64,  volume:'14.2B',marketCap:'282B',  sector:'crypto' }, 52),
    withHistory({ id:'sol',  symbol:'SOL',      name:'Solana',             price:108.58,  change:0.95,  volume:'3.8B', marketCap:'88B',   sector:'crypto' }, 6.2),
    withHistory({ id:'bnb',  symbol:'BNB',      name:'BNB',                price:711.85,  change:0.34,  volume:'1.9B', marketCap:'94B',   sector:'crypto' }, 12),
    withHistory({ id:'xrp',  symbol:'XRP',      name:'XRP',                price:1.45,    change:-2.59, volume:'2.1B', marketCap:'138B',  sector:'crypto' }, 0.07),
    withHistory({ id:'ada',  symbol:'ADA',      name:'Cardano',            price:0.214,   change:-2.73, volume:'820M', marketCap:'28B',   sector:'crypto' }, 0.024),
  ],
  metals: [
    withHistory({ id:'gold',     symbol:'XAU/USD', name:'Gold Spot',       price:4602.50, change:0.17,  volume:'142B', marketCap:'14.6T', sector:'metals', unit:'oz' }, 24),
    withHistory({ id:'silver',   symbol:'XAG/USD', name:'Silver Spot',     price:69.65,   change:-1.40, volume:'18B',  marketCap:'1.7T',  sector:'metals', unit:'oz' }, 1.1),
    withHistory({ id:'platinum', symbol:'XPT/USD', name:'Platinum',        price:1852.50, change:-0.56, volume:'4.2B', marketCap:'—',     sector:'metals', unit:'oz' }, 16),
  ],
  forex: [
    withHistory({ id:'eurusd', symbol:'EUR/USD', name:'Euro / US Dollar',  unit:'USD', pricePrefix:'$', price:1.1653, change:-0.10, volume:'580B', marketCap:'—', sector:'forex' }, 0.003),
    withHistory({ id:'gbpusd', symbol:'GBP/USD', name:'British Pound / USD', unit:'USD', pricePrefix:'$', price:1.3595, change:-0.10, volume:'310B', marketCap:'—', sector:'forex' }, 0.004),
    withHistory({ id:'usdjpy', symbol:'USD/JPY', name:'US Dollar / Yen',   unit:'JPY', pricePrefix:'¥', price:159.28, change:0.15,  volume:'430B', marketCap:'—', sector:'forex' }, 0.45),
    withHistory({ id:'audusd', symbol:'AUD/USD', name:'Australian Dollar / USD', unit:'USD', pricePrefix:'$', price:0.7195, change:-0.33, volume:'170B', marketCap:'—', sector:'forex' }, 0.002),
    withHistory({ id:'usdcad', symbol:'USD/CAD', name:'US Dollar / CAD',   unit:'CAD', pricePrefix:'C$', price:1.3856, change:0.63,  volume:'160B', marketCap:'—', sector:'forex' }, 0.003),
    withHistory({ id:'usdchf', symbol:'USD/CHF', name:'US Dollar / CHF',   unit:'CHF', pricePrefix:'Fr', price:0.8038, change:0.21,  volume:'130B', marketCap:'—', sector:'forex' }, 0.002),
    withHistory({ id:'eurgbp', symbol:'EUR/GBP', name:'Euro / GBP',        unit:'GBP', pricePrefix:'£', price:0.8572, change:-0.07, volume:'90B',  marketCap:'—', sector:'forex' }, 0.002),
    withHistory({ id:'gbpjpy', symbol:'GBP/JPY', name:'British Pound / Yen',unit:'JPY', pricePrefix:'¥', price:216.59, change:0.12,  volume:'70B',  marketCap:'—', sector:'forex' }, 0.65),
    withHistory({ id:'eurjpy', symbol:'EUR/JPY', name:'Euro / Yen',        unit:'JPY', pricePrefix:'¥', price:185.59, change:0.05,  volume:'85B',  marketCap:'—', sector:'forex' }, 0.55),
    withHistory({ id:'usdinr', symbol:'USD/INR', name:'US Dollar / INR',   unit:'INR', pricePrefix:'₹', price:95.49,  change:0.04,  volume:'40B',  marketCap:'—', sector:'forex' }, 0.18),
    withHistory({ id:'eurinr', symbol:'EUR/INR', name:'Euro / INR',        unit:'INR', pricePrefix:'₹', price:111.27, change:-0.09, volume:'20B',  marketCap:'—', sector:'forex' }, 0.25),
  ],
  energy: [
    withHistory({ id:'wti',   symbol:'WTI',      name:'WTI Crude Oil',    price:83.95,  change:-0.62, volume:'820M', marketCap:'—', sector:'energy', unit:'bbl' }, 1.2),
    withHistory({ id:'brent', symbol:'BRENT',    name:'Brent Crude',      price:90.04,  change:-0.67, volume:'940M', marketCap:'—', sector:'energy', unit:'bbl' }, 1.3),
    withHistory({ id:'ng',    symbol:'NGAS',     name:'Natural Gas',      price:2.91,   change:1.80,  volume:'210M', marketCap:'—', sector:'energy', unit:'MMBtu' }, 0.08),
    withHistory({ id:'hoil',  symbol:'HOIL',     name:'Heating Oil',      price:4.20,   change:-1.22, volume:'180M', marketCap:'—', sector:'energy', unit:'gal' }, 0.05),
  ],
};

export const ALL_ASSETS = Object.values(MARKET_DATA).flat();

export function formatPrice(price) {
  if (!price && price !== 0) return '—';
  if (price < 1)     return `$${price.toFixed(4)}`;
  if (price >= 1000) return `$${price.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  return `$${price.toFixed(2)}`;
}
export function formatChange(c) { return `${c>=0?'+':''}${c.toFixed(2)}%`; }
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
