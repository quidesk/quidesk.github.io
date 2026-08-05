function randomWalk(base, vol, points) {
  const data = []; let cur = base; const now = Date.now();
  for (let i = points; i >= 0; i--) {
    cur = Math.max(cur * 0.5, cur + (Math.random() - 0.49) * vol);
    data.push({
      time: new Date(now - i * 5 * 60 * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      value: parseFloat(cur.toFixed(cur < 1 ? 4 : 2))
    });
  }
  return data;
}
function rp(r=5) { return parseFloat(((Math.random()-0.48)*r).toFixed(2)); }

export const SECTOR_META = {
  equities:    { label:'Equities',    color:'#4d9eff', icon:'◈', cssVar:'--sector-equities' },
  crypto:      { label:'Crypto',      color:'#a78bfa', icon:'◆', cssVar:'--sector-crypto' },
  metals:      { label:'Metals',      color:'#f0a500', icon:'◎', cssVar:'--sector-metals' },
  energy:      { label:'Energy',      color:'#f97316', icon:'◉', cssVar:'--sector-energy' },
  forex:       { label:'Forex',       color:'#22d3ee', icon:'⇄', cssVar:'--sector-forex' },
};

export const MARKET_DATA = {
  equities: [
    { id:'spx',  symbol:'S&P 500',  name:'S&P 500 Index',      price:5487.23, change:rp(2),  volume:'3.2B', marketCap:'42.1T', sector:'equities', chartData:randomWalk(5487,28,72) },
    { id:'ndx',  symbol:'NASDAQ',   name:'NASDAQ Composite',   price:17832.15,change:rp(2.5),volume:'8.7B', marketCap:'28.4T', sector:'equities', chartData:randomWalk(17832,85,72) },
    { id:'dow',  symbol:'DOW',      name:'Dow Jones Ind.',     price:39254.86,change:rp(1.5),volume:'2.1B', marketCap:'12.8T', sector:'equities', chartData:randomWalk(39254,190,72) },
    { id:'aapl', symbol:'AAPL',     name:'Apple Inc.',         price:221.55,  change:rp(3),  volume:'58M',  marketCap:'3.4T',  sector:'equities', chartData:randomWalk(221,2.8,72) },
    { id:'nvda', symbol:'NVDA',     name:'NVIDIA Corp.',       price:875.40,  change:rp(5),  volume:'42M',  marketCap:'2.1T',  sector:'equities', chartData:randomWalk(875,14,72) },
    { id:'tsla', symbol:'TSLA',     name:'Tesla Inc.',         price:182.63,  change:rp(6),  volume:'98M',  marketCap:'581B',  sector:'equities', chartData:randomWalk(182,5.5,72) },
  ],
  crypto: [
    { id:'btc',  symbol:'BTC',      name:'Bitcoin',            price:67420,   change:rp(4),  volume:'28.4B',marketCap:'1.32T', sector:'crypto',   chartData:randomWalk(67420,750,72) },
    { id:'eth',  symbol:'ETH',      name:'Ethereum',           price:3521.80, change:rp(5),  volume:'14.2B',marketCap:'423B',  sector:'crypto',   chartData:randomWalk(3521,75,72) },
    { id:'sol',  symbol:'SOL',      name:'Solana',             price:168.44,  change:rp(7),  volume:'3.8B', marketCap:'78B',   sector:'crypto',   chartData:randomWalk(168,5.5,72) },
    { id:'bnb',  symbol:'BNB',      name:'BNB',                price:589.12,  change:rp(4),  volume:'1.9B', marketCap:'88B',   sector:'crypto',   chartData:randomWalk(589,11,72) },
    { id:'xrp',  symbol:'XRP',      name:'XRP',                price:0.5842,  change:rp(6),  volume:'2.1B', marketCap:'32B',   sector:'crypto',   chartData:randomWalk(0.5842,0.018,72) },
    { id:'ada',  symbol:'ADA',      name:'Cardano',            price:0.4521,  change:rp(5),  volume:'820M', marketCap:'16B',   sector:'crypto',   chartData:randomWalk(0.4521,0.013,72) },
  ],
  metals: [
    { id:'gold',     symbol:'XAU/USD', name:'Gold Spot',       price:2342.50, change:rp(1.5),volume:'142B', marketCap:'14.6T', sector:'metals',  unit:'oz',    chartData:randomWalk(2342,13,72) },
    { id:'silver',   symbol:'XAG/USD', name:'Silver Spot',     price:29.84,   change:rp(2.5),volume:'18B',  marketCap:'1.7T',  sector:'metals',  unit:'oz',    chartData:randomWalk(29.84,0.45,72) },
    { id:'platinum', symbol:'XPT/USD', name:'Platinum',        price:1021.30, change:rp(2),  volume:'4.2B', marketCap:'—',     sector:'metals',  unit:'oz',    chartData:randomWalk(1021,9,72) },
    { id:'copper',   symbol:'COPPER',  name:'Copper',          price:4.22,    change:rp(2),  volume:'6.1B', marketCap:'—',     sector:'metals',  unit:'lb',    chartData:randomWalk(4.22,0.06,72) },
  ],
  forex: [
    { id:'eurusd', symbol:'EUR/USD', name:'Euro / US Dollar',          price:1.0850, change:0.12,  volume:'580B', marketCap:'—', sector:'forex', chartData:randomWalk(1.0850,0.003,72) },
    { id:'gbpusd', symbol:'GBP/USD', name:'British Pound / US Dollar', price:1.2680, change:-0.08, volume:'310B', marketCap:'—', sector:'forex', chartData:randomWalk(1.2680,0.004,72) },
    { id:'usdjpy', symbol:'USD/JPY', name:'US Dollar / Japanese Yen',  price:149.82, change:0.22,  volume:'430B', marketCap:'—', sector:'forex', chartData:randomWalk(149.82,0.45,72) },
    { id:'audusd', symbol:'AUD/USD', name:'Australian Dollar / USD',   price:0.6520, change:-0.15, volume:'170B', marketCap:'—', sector:'forex', chartData:randomWalk(0.6520,0.002,72) },
    { id:'usdcad', symbol:'USD/CAD', name:'US Dollar / Canadian Dollar',price:1.3640, change:0.09,  volume:'160B', marketCap:'—', sector:'forex', chartData:randomWalk(1.3640,0.003,72) },
    { id:'usdchf', symbol:'USD/CHF', name:'US Dollar / Swiss Franc',   price:0.8980, change:-0.06, volume:'130B', marketCap:'—', sector:'forex', chartData:randomWalk(0.8980,0.002,72) },
    { id:'eurgbp', symbol:'EUR/GBP', name:'Euro / British Pound',      price:0.8560, change:0.04,  volume:'90B',  marketCap:'—', sector:'forex', chartData:randomWalk(0.8560,0.002,72) },
    { id:'usdinr', symbol:'USD/INR', name:'US Dollar / Indian Rupee',  price:83.42,  change:0.08,  volume:'40B',  marketCap:'—', sector:'forex', chartData:randomWalk(83.42,0.15,72) },
  ],
  energy: [
    { id:'wti',   symbol:'WTI',      name:'Crude Oil WTI',     price:78.42,   change:rp(3),  volume:'820M', marketCap:'—',     sector:'energy',  unit:'bbl',   chartData:randomWalk(78.42,1.4,72) },
    { id:'brent', symbol:'BRENT',    name:'Brent Crude',       price:82.18,   change:rp(3),  volume:'940M', marketCap:'—',     sector:'energy',  unit:'bbl',   chartData:randomWalk(82.18,1.4,72) },
    { id:'ng',    symbol:'NAT GAS',  name:'Natural Gas',       price:2.84,    change:rp(4),  volume:'210M', marketCap:'—',     sector:'energy',  unit:'MMBtu', chartData:randomWalk(2.84,0.07,72) },
    { id:'rbob',  symbol:'RBOB',     name:'RBOB Gasoline',     price:2.41,    change:rp(3),  volume:'180M', marketCap:'—',     sector:'energy',  unit:'gal',   chartData:randomWalk(2.41,0.05,72) },
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
        });
      }
    }
  });
  return hotspots.sort((a,b) =>
    ({high:0,medium:1,low:2}[a.severity]||2) - ({high:0,medium:1,low:2}[b.severity]||2)
  );
}
