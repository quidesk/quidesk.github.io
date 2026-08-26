const https = require('https');
const fs = require('fs');
const symbols = ['SPY', 'QQQ', 'DIA', 'AAPL', 'NVDA', 'TSLA', 'BTC-USD', 'ETH-USD', 'SOL-USD', 'BNB-USD', 'XRP-USD', 'ADA-USD', 'GC=F', 'SI=F', 'PL=F', 'EURUSD=X', 'GBPUSD=X', 'JPY=X', 'AUDUSD=X', 'CAD=X', 'CHF=X', 'EURGBP=X', 'INR=X', 'EURINR=X', 'USO', 'BNO', 'UNG', 'UGA'];
const results = {};

function fetchSym(sym) {
  return new Promise((resolve, reject) => {
    https.get('https://query1.finance.yahoo.com/v8/finance/chart/' + sym, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const meta = json.chart.result[0].meta;
          const price = meta.regularMarketPrice;
          const prev = meta.chartPreviousClose;
          const change = ((price - prev) / prev) * 100;
          results[sym] = { price, change };
          console.log(sym + ': ' + price);
          resolve();
        } catch(e) {
          console.log('Failed ' + sym);
          resolve();
        }
      });
    }).on('error', resolve);
  });
}

async function run() {
  for(let s of symbols) await fetchSym(s);
  fs.writeFileSync('market_results.json', JSON.stringify(results, null, 2));
}
run();

