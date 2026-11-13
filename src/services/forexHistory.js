/**
 * Forex Multi-Day Timeseries & History Service (Frankfurter 14-Day Range)
 * Module 6 Standard: market-web-architect
 */

import { D, mergeAssetState, renderAllCardCanvases } from '../utils/marketEngine';
import { FOREX_PAIRS_CONFIG } from '../utils/forexHelpers';
import { useMarketStore } from '../store/marketStore';

function formatDate(d) {
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function fetchFrankfurterForexHistory() {
  const now = new Date();
  const past = new Date(now.getTime() - 14 * 86400000);
  const start = formatDate(past);
  const end = formatDate(now);

  const url = `https://api.frankfurter.app/${start}..${end}?from=USD&to=EUR,GBP,JPY,AUD,CAD,CHF,NZD,INR`;

  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || !data.rates) return null;

    const dates = Object.keys(data.rates).sort();
    if (dates.length < 2) return null;

    const prevDate = dates[dates.length - 2];
    const latestDate = dates[dates.length - 1];

    const results = {};

    Object.entries(FOREX_PAIRS_CONFIG).forEach(([id, cfg]) => {
      const history = [];
      dates.forEach(d => {
        const rates = data.rates[d];
        if (rates) {
          const val = cfg.computeRate(rates);
          if (typeof val === 'number' && Number.isFinite(val) && val > 0) {
            history.push(D(val).toDecimalPlaces(cfg.decimals || 4).toNumber());
          }
        }
      });

      if (history.length >= 2) {
        const prevClose = history[history.length - 2];
        const price = history[history.length - 1];
        const change24h = D(price).minus(prevClose).div(prevClose).times(100).toDecimalPlaces(2).toNumber();

        const payload = {
          symbol: cfg.symbol,
          id,
          category: 'forex',
          sector: 'forex',
          price,
          prevClose,
          change24h,
          change: change24h,
          history,
          status: 'LIVE',
          timestampUtc: Date.now(),
        };

        const updated = mergeAssetState(cfg.symbol, payload);
        results[cfg.symbol] = updated;

        // Sync with zustand store
        useMarketStore.getState().applyTick(cfg.symbol, {
          ...updated,
          id,
          symbol: cfg.symbol,
          sector: 'forex',
          category: 'forex',
          price,
          prevClose,
          change: change24h,
          changePercent: change24h,
          status: 'live',
          quoteTs: Date.now(),
          timestamp: Date.now(),
          spark1d: history.map((h, i) => [`${i}`, h]),
        });
      }
    });

    renderAllCardCanvases();
    return results;
  } catch (err) {
    console.warn('[forexHistory] Frankfurter fetch error:', err.message);
    return null;
  }
}
