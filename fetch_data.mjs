import yahooFinance from 'yahoo-finance2';
import fs from 'fs';

const symbols = [
  'SPY', 'QQQ', 'DIA', 'AAPL', 'NVDA', 'TSLA',
  'BTC-USD', 'ETH-USD', 'SOL-USD', 'BNB-USD', 'XRP-USD', 'ADA-USD',
  'GC=F', 'SI=F', 'PL=F',
  'EURUSD=X', 'GBPUSD=X', 'JPY=X', 'AUDUSD=X', 'CAD=X', 'CHF=X', 'EURGBP=X', 'INR=X', 'EURINR=X',
  'USO', 'BNO', 'UNG', 'UGA'
];

async function fetchAll() {
  const results = {};
  for (const sym of symbols) {
    try {
      const quote = await yahooFinance.default.quote(sym);
      results[sym] = {
        price: quote.regularMarketPrice,
        changePercent: quote.regularMarketChangePercent
      };
      console.log('Fetched ' + sym + ': ' + quote.regularMarketPrice);
    } catch (e) {
      console.error('Failed to fetch ' + sym + ':', e.message);
    }
  }
  fs.writeFileSync('market_results.json', JSON.stringify(results, null, 2));
}

fetchAll();
