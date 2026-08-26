const fs = require('fs');
const results = JSON.parse(fs.readFileSync('market_results.json', 'utf8'));

let data = fs.readFileSync('src/data/markets.js', 'utf8');

const mapping = {
  'SPY': 'SPY', 'QQQ': 'QQQ', 'DIA': 'DIA', 'AAPL': 'AAPL', 'NVDA': 'NVDA', 'TSLA': 'TSLA',
  'BTC': 'BTC-USD', 'ETH': 'ETH-USD', 'SOL': 'SOL-USD', 'BNB': 'BNB-USD', 'XRP': 'XRP-USD', 'ADA': 'ADA-USD',
  'XAU/USD': 'GC=F', 'XAG/USD': 'SI=F', 'XPT/USD': 'PL=F',
  'EUR/USD': 'EURUSD=X', 'GBP/USD': 'GBPUSD=X', 'USD/JPY': 'JPY=X', 'AUD/USD': 'AUDUSD=X', 'USD/CAD': 'CAD=X', 'USD/CHF': 'CHF=X', 'EUR/GBP': 'EURGBP=X', 'USD/INR': 'INR=X', 'EUR/INR': 'EURINR=X',
  'USO': 'USO', 'BNO': 'BNO', 'UNG': 'UNG', 'UGA': 'UGA'
};

for (const [sym, key] of Object.entries(mapping)) {
  if (results[key]) {
    const newPrice = results[key].price;
    const newChange = results[key].change;
    // We want to replace the price and change inside the withHistory call.
    // The regex needs to handle cases like price: 100.5, change: rp(4) or price:1.16, change:0.12
    
    // Create a precise regex to match the symbol block
    const blockRegex = new RegExp(\(symbol:['\u0022]\['\u0022].*?price:)[0-9.]+(,\\s*change:)(?:rp\\([^)]+\\)|[-0-9.]+)\, 'g');
    
    // Replace with new values
    const changeStr = newChange.toFixed(2);
    data = data.replace(blockRegex, (match, p1, p2) => {
      // If we don't want to break rp(), we could keep it, but real data means we want absolute number
      return p1 + newPrice.toFixed(newPrice < 1 ? 4 : 2) + p2 + changeStr;
    });
  }
}

fs.writeFileSync('src/data/markets.js', data);
console.log('Updated markets.js successfully.');

