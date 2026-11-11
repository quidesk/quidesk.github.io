/**
 * Quidesk Market Engine — Forex Secondary / Fallback Provider (Frankfurter / ECB)
 * 
 * Used strictly as a fallback when Yahoo FX continuous tape fails.
 * Marks quotes as status 'delayed' and source 'ECB daily ref'.
 * NEVER uses open.er-api or fawazahmed0.
 */

const FX_CONFIGS = {
  eurusd: { id: 'eurusd', symbol: 'EUR/USD', calc: (r) => (r.EUR > 0 ? 1 / r.EUR : null), decimals: 4 },
  gbpusd: { id: 'gbpusd', symbol: 'GBP/USD', calc: (r) => (r.GBP > 0 ? 1 / r.GBP : null), decimals: 4 },
  usdjpy: { id: 'usdjpy', symbol: 'USD/JPY', calc: (r) => r.JPY, decimals: 2 },
  audusd: { id: 'audusd', symbol: 'AUD/USD', calc: (r) => (r.AUD > 0 ? 1 / r.AUD : null), decimals: 4 },
  usdcad: { id: 'usdcad', symbol: 'USD/CAD', calc: (r) => r.CAD, decimals: 4 },
  usdchf: { id: 'usdchf', symbol: 'USD/CHF', calc: (r) => r.CHF, decimals: 4 },
  nzdusd: { id: 'nzdusd', symbol: 'NZD/USD', calc: (r) => (r.NZD > 0 ? 1 / r.NZD : null), decimals: 4 },
  eurgbp: { id: 'eurgbp', symbol: 'EUR/GBP', calc: (r) => (r.EUR > 0 && r.GBP > 0 ? r.GBP / r.EUR : null), decimals: 4 },
  gbpjpy: { id: 'gbpjpy', symbol: 'GBP/JPY', calc: (r) => (r.GBP > 0 && r.JPY > 0 ? r.JPY / r.GBP : null), decimals: 2 },
  eurjpy: { id: 'eurjpy', symbol: 'EUR/JPY', calc: (r) => (r.EUR > 0 && r.JPY > 0 ? r.JPY / r.EUR : null), decimals: 2 },
  usdinr: { id: 'usdinr', symbol: 'USD/INR', calc: (r) => r.INR, decimals: 2 },
  eurinr: { id: 'eurinr', symbol: 'EUR/INR', calc: (r) => (r.EUR > 0 && r.INR > 0 ? r.INR / r.EUR : null), decimals: 2 },
};

/**
 * Fetches rolling 5-day interbank rates from Frankfurter ECB API.
 * @param {number} [timeoutMs=8000]
 * @returns {Promise<Record<string, object>>}
 */
export async function fetchFrankfurterFallback(timeoutMs = 8000) {
  const today = new Date().toISOString().split('T')[0];
  const fiveDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  const url = `https://api.frankfurter.dev/v1/${fiveDaysAgo}..${today}?base=USD`;

  const res = await fetch(url, {
    headers: { 'Accept': 'application/json' },
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) {
    throw new Error(`Frankfurter HTTP ${res.status}`);
  }

  const json = await res.json();
  if (!json || !json.rates) throw new Error('Invalid Frankfurter response');

  const dates = Object.keys(json.rates).sort();
  if (dates.length < 2) throw new Error('Insufficient dates for 24h baseline');

  const curDate = dates[dates.length - 1];
  const prevDate = dates[dates.length - 2];
  const curRates = { ...json.rates[curDate], USD: 1 };
  const prevRates = { ...json.rates[prevDate], USD: 1 };

  const ecbParsed = Date.parse(`${curDate}T00:00:00Z`);
  const ecbQuoteTs = Number.isFinite(ecbParsed) ? ecbParsed : null;

  const results = {};

  for (const [id, cfg] of Object.entries(FX_CONFIGS)) {
    const curVal = cfg.calc(curRates);
    const prevVal = cfg.calc(prevRates);

    if (typeof curVal === 'number' && Number.isFinite(curVal) && curVal > 0) {
      const price = parseFloat(curVal.toFixed(cfg.decimals));
      const prevClose = (typeof prevVal === 'number' && Number.isFinite(prevVal) && prevVal > 0)
        ? parseFloat(prevVal.toFixed(cfg.decimals))
        : null;

      results[id] = {
        id,
        symbol: cfg.symbol,
        price,
        prevClose,
        quoteTs: ecbQuoteTs,
        rateDate: curDate,
        source: 'ECB daily ref',
        changeBasis: 'vs prior ECB fix',
        session: 'regular',
        status: 'delayed',
      };
    }
  }

  if (typeof curRates.SGD === 'number' && Number.isFinite(curRates.SGD) && curRates.SGD > 0) {
    results.usdsgd = {
      id: 'usdsgd',
      symbol: 'USD/SGD',
      price: parseFloat(curRates.SGD.toFixed(4)),
      prevClose: (typeof prevRates.SGD === 'number' && Number.isFinite(prevRates.SGD) && prevRates.SGD > 0)
        ? parseFloat(prevRates.SGD.toFixed(4))
        : null,
      quoteTs: ecbQuoteTs,
      rateDate: curDate,
      source: 'ECB daily ref',
      changeBasis: 'vs prior ECB fix',
      session: 'regular',
      status: 'delayed',
    };
  }

  return results;
}
