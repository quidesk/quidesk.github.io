/**
 * Real Intraday History Service for Equities, Metals & Energy
 * Fetches 15m/2d intraday quotes from Yahoo Finance via CORS proxy chain (corsproxy.io / allorigins.win)
 * Module Standard: market-web-architect
 */

import { mergeAssetState, renderAllCardCanvases, syncAllDashboardWidgets } from '../utils/marketEngine';
import { useMarketStore } from '../store/marketStore';

export const YAHOO_HISTORY_SYMBOLS = {
  // Equities (7)
  SPY: { yahoo: 'SPY', category: 'equities', sector: 'equities', id: 'spx' },
  QQQ: { yahoo: 'QQQ', category: 'equities', sector: 'equities', id: 'ndx' },
  DIA: { yahoo: 'DIA', category: 'equities', sector: 'equities', id: 'dow' },
  AAPL: { yahoo: 'AAPL', category: 'equities', sector: 'equities', id: 'aapl' },
  TSLA: { yahoo: 'TSLA', category: 'equities', sector: 'equities', id: 'tsla' },
  META: { yahoo: 'META', category: 'equities', sector: 'equities', id: 'meta' },
  NVDA: { yahoo: 'NVDA', category: 'equities', sector: 'equities', id: 'nvda' },

  // Metals (3)
  'XAU/USD': { yahoo: 'GC=F', category: 'metals', sector: 'metals', id: 'gold' },
  'XAG/USD': { yahoo: 'SI=F', category: 'metals', sector: 'metals', id: 'silver' },
  'XPT/USD': { yahoo: 'PL=F', category: 'metals', sector: 'metals', id: 'platinum' },

  // Energy (4)
  WTI: { yahoo: 'CL=F', category: 'energy', sector: 'energy', id: 'wti' },
  BRENT: { yahoo: 'BZ=F', category: 'energy', sector: 'energy', id: 'brent' },
  NGAS: { yahoo: 'NG=F', category: 'energy', sector: 'energy', id: 'ng' },
  HOIL: { yahoo: 'HO=F', category: 'energy', sector: 'energy', id: 'hoil' },
};

async function fetchYahooChartSingle(sym, cfg) {
  const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(cfg.yahoo)}?interval=15m&range=2d`;
  let json = null;

  // Tier 1: corsproxy.io
  try {
    const res = await fetch(`https://corsproxy.io/?url=${encodeURIComponent(targetUrl)}`, { cache: 'no-store' });
    if (res.ok) {
      json = await res.json();
    }
  } catch (_) {}

  // Tier 2: allorigins.win
  if (!json?.chart?.result?.[0]) {
    try {
      const res = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`, { cache: 'no-store' });
      if (res.ok) {
        json = await res.json();
      }
    } catch (_) {}
  }

  // Tier 3: Direct fetch (in environments where allowed)
  if (!json?.chart?.result?.[0]) {
    try {
      const res = await fetch(targetUrl, { cache: 'no-store' });
      if (res.ok) {
        json = await res.json();
      }
    } catch (_) {}
  }

  const result = json?.chart?.result?.[0];
  if (!result) return false;

  const rawCloses = result?.indicators?.quote?.[0]?.close || [];
  const validCloses = rawCloses.map(Number).filter(v => Number.isFinite(v) && v > 0).slice(-32);

  if (validCloses.length >= 2) {
    const cur = (typeof window !== 'undefined' && window.marketState && window.marketState[sym]) || {};
    const metaPrice = Number(result?.meta?.regularMarketPrice);
    const metaPrev = Number(result?.meta?.chartPreviousClose || result?.meta?.previousClose);
    const price = cur.price > 0 ? cur.price : (Number.isFinite(metaPrice) && metaPrice > 0 ? metaPrice : validCloses[validCloses.length - 1]);
    const prevClose = cur.prevClose > 0 ? cur.prevClose : (Number.isFinite(metaPrev) && metaPrev > 0 ? metaPrev : validCloses[0]);

    const updated = mergeAssetState(sym, {
      category: cfg.category,
      price,
      prevClose,
      history: validCloses,
      status: 'LIVE',
      timestampUtc: Date.now()
    });

    if (updated) {
      useMarketStore.getState().applyTick(sym, {
        ...updated,
        id: cfg.id,
        symbol: sym,
        sector: cfg.sector,
        category: cfg.category,
        price: updated.price,
        prevClose: updated.prevClose,
        change: updated.change24h,
        changePercent: updated.change24h,
        status: 'live',
        quoteTs: updated.timestampUtc,
        timestamp: updated.timestampUtc,
        spark1d: validCloses.map((h, i) => [`${i}`, h])
      });
      return true;
    }
  }

  return false;
}

/**
 * Fetch intraday history for all 14 Equities, Metals & Energy assets.
 */
export async function fetchAllYahooIntradayHistory() {
  const entries = Object.entries(YAHOO_HISTORY_SYMBOLS);
  let updatedAny = false;

  // Process in batches of 4 to prevent browser connection saturation
  for (let i = 0; i < entries.length; i += 4) {
    const batch = entries.slice(i, i + 4);
    const results = await Promise.allSettled(
      batch.map(([sym, cfg]) => fetchYahooChartSingle(sym, cfg))
    );
    if (results.some(r => r.status === 'fulfilled' && r.value === true)) {
      updatedAny = true;
    }
  }

  if (updatedAny) {
    renderAllCardCanvases();
    if (typeof syncAllDashboardWidgets === 'function') {
      syncAllDashboardWidgets();
    }
  }
}
