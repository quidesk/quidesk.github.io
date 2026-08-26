import urllib.request, json
symbols = ['SPY', 'QQQ', 'DIA', 'AAPL', 'NVDA', 'TSLA', 'BTC-USD', 'ETH-USD', 'SOL-USD', 'BNB-USD', 'XRP-USD', 'ADA-USD', 'GC=F', 'SI=F', 'PL=F', 'EURUSD=X', 'GBPUSD=X', 'JPY=X', 'AUDUSD=X', 'CAD=X', 'CHF=X', 'EURGBP=X', 'INR=X', 'EURINR=X', 'USO', 'BNO', 'UNG', 'UGA']
results = {}
for sym in symbols:
    try:
        req = urllib.request.Request(f'https://query1.finance.yahoo.com/v8/finance/chart/{sym}', headers={'User-Agent': 'Mozilla/5.0'})
        res = urllib.request.urlopen(req)
        data = json.loads(res.read())
        meta = data['chart']['result'][0]['meta']
        price = meta['regularMarketPrice']
        prev = meta['chartPreviousClose']
        change = ((price - prev) / prev) * 100
        results[sym] = {'price': price, 'change': change}
        print(f'{sym}: {price}')
    except Exception as e:
        print(f'Failed {sym}')
with open('market_results.json', 'w') as f:
    json.dump(results, f)

