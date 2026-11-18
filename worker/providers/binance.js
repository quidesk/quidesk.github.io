/**
 * Quidesk Market Engine — Crypto Provider (Binance Vision + CoinGecko Fallback)
 *
 * Fetches 24hr tickers AND 24h klines (30m interval, 48 bars) so all 6 crypto
 * assets include authentic spark1d series in /v1/quotes.
 */

const CRYPTO_MAP = {
  BTCUSDT: { id: 'btc', symbol: 'BTC', coingeckoId: 'bitcoin', decimals: 2 },
  ETHUSDT: { id: 'eth', symbol: 'ETH', coingeckoId: 'ethereum', decimals: 2 },
  SOLUSDT: { id: 'sol', symbol: 'SOL', coingeckoId: 'solana', decimals: 2 },
  BNBUSDT: { id: 'bnb', symbol: 'BNB', coingeckoId: 'binancecoin', decimals: 2 },
  XRPUSDT: { id: 'xrp', symbol: 'XRP', coingeckoId: 'ripple', decimals: 4 },
  ADAUSDT: { id: 'ada', symbol: 'ADA', coingeckoId: 'cardano', decimals: 4 },
};

async function fetchBinanceSparkline(binanceSymbol, timeoutMs = 4500) {
  try {
    const url = `https://data-api.binance.vision/api/v3/klines?symbol=${encodeURIComponent(binanceSymbol)}&interval=30m&limit=48`;
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return [];
    const klines = await res.json();
    if (!Array.isArray(klines)) return [];
    const points = [];
    for (const k of klines) {
      const ts = Number(k?.[0]);
      const close = parseFloat(k?.[4]);
      if (Number.isFinite(ts) && ts > 0 && Number.isFinite(close) && close > 0) {
        points.push([ts, close]);
      }
    }
    return points;
  } catch {
    return [];
  }
}

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

  const sparkEntries = await Promise.all(
    symbols.map(async (sym) => [sym, await fetchBinanceSparkline(sym)])
  );
  const sparkMap = Object.fromEntries(sparkEntries);

  const results = {};
  const now = Date.now();

  for (const item of json) {
    const meta = CRYPTO_MAP[item.symbol];
    if (!meta) continue;

    const price = parseFloat(item.lastPrice);
    const parsedPrev = parseFloat(item.prevClosePrice);
    const parsedOpen = parseFloat(item.openPrice);
    const prevClose = (Number.isFinite(parsedPrev) && parsedPrev > 0)
      ? parsedPrev
      : ((Number.isFinite(parsedOpen) && parsedOpen > 0) ? parsedOpen : null);
    const ts = (typeof item.closeTime === 'number' && Number.isFinite(item.closeTime) && item.closeTime > 0)
      ? item.closeTime
      : null;

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
        status: ts === null ? 'stale' : ((now - ts > 120000) ? 'stale' : 'live'),
        spark1d: sparkMap[item.symbol] || [],
      };
    }
  }

  return results;
}

export async function fetchCoinGeckoCrypto(timeoutMs = 8000) {
  const ids = Object.values(CRYPTO_MAP).map(m => m.coingeckoId).join(',');
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_last_updated_at=true`;

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
    if (data && typeof data.usd === 'number' && Number.isFinite(data.usd) && data.usd > 0) {
      const price = data.usd;
      const chgPercent = (typeof data.usd_24h_change === 'number' && Number.isFinite(data.usd_24h_change))
        ? data.usd_24h_change
        : null;
      const prevClose = chgPercent !== null && (1 + chgPercent / 100) > 0
        ? price / (1 + chgPercent / 100)
        : null;
      const ts = (typeof data.last_updated_at === 'number' && Number.isFinite(data.last_updated_at) && data.last_updated_at > 0)
        ? data.last_updated_at * 1000
        : null;

      results[meta.id] = {
        id: meta.id,
        symbol: meta.symbol,
        price,
        prevClose,
        quoteTs: ts,
        source: 'coingecko',
        changeBasis: 'rolling_24h',
        session: '24x7',
        status: ts === null ? 'stale' : ((now - ts > 120000) ? 'stale' : 'live'),
        spark1d: [],
      };
    }
  }

  return results;
}
