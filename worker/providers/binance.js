/**
 * Quidesk Market Engine — Crypto Provider (Binance Vision + CoinGecko Fallback)
 * 
 * Batches all crypto tickers into a single HTTP subrequest to conserve worker subrequest quotas.
 * Sets changeBasis to 'rolling_24h' and session to '24x7'.
 */

const CRYPTO_MAP = {
  BTCUSDT: { id: 'btc', symbol: 'BTC', coingeckoId: 'bitcoin', decimals: 2 },
  ETHUSDT: { id: 'eth', symbol: 'ETH', coingeckoId: 'ethereum', decimals: 2 },
  SOLUSDT: { id: 'sol', symbol: 'SOL', coingeckoId: 'solana', decimals: 2 },
  BNBUSDT: { id: 'bnb', symbol: 'BNB', coingeckoId: 'binancecoin', decimals: 2 },
  XRPUSDT: { id: 'xrp', symbol: 'XRP', coingeckoId: 'ripple', decimals: 4 },
  ADAUSDT: { id: 'ada', symbol: 'ADA', coingeckoId: 'cardano', decimals: 4 },
};

/**
 * Fetches all crypto quotes from Binance Vision REST in a single batch request.
 * @param {number} [timeoutMs=6000]
 * @returns {Promise<Record<string, object>>}
 */
export async function fetchBinanceCrypto(timeoutMs = 6000) {
  const symbols = Object.keys(CRYPTO_MAP);
  const url = `https://data-api.binance.vision/api/v3/ticker/24hr?symbols=${encodeURIComponent(JSON.stringify(symbols))}`;

  const res = await fetch(url, {
    headers: { 'Accept': 'application/json' },
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) {
    throw new Error(`Binance Vision HTTP ${res.status}`);
  }

  const json = await res.json();
  if (!Array.isArray(json)) {
    throw new Error('Invalid Binance Vision payload');
  }

  const results = {};
  const now = Date.now();

  for (const item of json) {
    const meta = CRYPTO_MAP[item.symbol];
    if (!meta) continue;

    const price = parseFloat(item.lastPrice);
    const prevClose = parseFloat(item.prevClosePrice) || parseFloat(item.openPrice) || price;
    const ts = typeof item.closeTime === 'number' && item.closeTime > 0 ? item.closeTime : now;

    if (Number.isFinite(price) && price > 0) {
      results[meta.id] = {
        id: meta.id,
        symbol: meta.symbol,
        price,
        prevClose,
        quoteTs: ts,
        source: 'binance',
        changeBasis: 'rolling_24h',
        session: '24x7',
        status: (now - ts > 120000) ? 'stale' : 'live',
      };
    }
  }

  return results;
}

/**
 * Secondary fallback: CoinGecko Simple Price API.
 * @param {number} [timeoutMs=8000]
 * @returns {Promise<Record<string, object>>}
 */
export async function fetchCoinGeckoCrypto(timeoutMs = 8000) {
  const ids = Object.values(CRYPTO_MAP).map(m => m.coingeckoId).join(',');
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`;

  const res = await fetch(url, {
    headers: { 'Accept': 'application/json' },
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) {
    throw new Error(`CoinGecko HTTP ${res.status}`);
  }

  const json = await res.json();
  const results = {};
  const now = Date.now();

  for (const meta of Object.values(CRYPTO_MAP)) {
    const data = json[meta.coingeckoId];
    if (data && typeof data.usd === 'number' && data.usd > 0) {
      const price = data.usd;
      const chgPercent = data.usd_24h_change || 0;
      const prevClose = chgPercent !== 0 ? price / (1 + chgPercent / 100) : price;

      results[meta.id] = {
        id: meta.id,
        symbol: meta.symbol,
        price,
        prevClose,
        quoteTs: now,
        source: 'coingecko',
        changeBasis: 'rolling_24h',
        session: '24x7',
        status: 'live',
      };
    }
  }

  return results;
}
