/**
 * Multi-Tier Crypto WebSocket + Geo-Unblocked Resilient Fetcher + 100ms rAF Batching Engine
 * Module 4 Standard: market-web-architect
 */

import { D, mergeAssetState, renderAllCardCanvases, syncAllDashboardWidgets } from '../utils/marketEngine';
import { useMarketStore } from '../store/marketStore';

export const CRYPTO_SYMBOLS = {
  BTC: { binance: 'BTCUSDT', coincap: 'bitcoin', cg: 'bitcoin' },
  ETH: { binance: 'ETHUSDT', coincap: 'ethereum', cg: 'ethereum' },
  SOL: { binance: 'SOLUSDT', coincap: 'solana', cg: 'solana' },
  BNB: { binance: 'BNBUSDT', coincap: 'binance-coin', cg: 'binancecoin' },
  XRP: { binance: 'XRPUSDT', coincap: 'xrp', cg: 'ripple' },
  ADA: { binance: 'ADAUSDT', coincap: 'cardano', cg: 'cardano' }
};

export const CRYPTO_ENDPOINTS = {
  BTC: { kraken: 'XXBTZUSD', coinbase: 'BTC-USD', cg: 'bitcoin', cc: 'BTC' },
  ETH: { kraken: 'XETHZUSD', coinbase: 'ETH-USD', cg: 'ethereum', cc: 'ETH' },
  SOL: { kraken: 'SOLUSD',   coinbase: 'SOL-USD', cg: 'solana',   cc: 'SOL' },
  BNB: { kraken: null,       coinbase: null,      cg: 'binancecoin', cc: 'BNB' },
  XRP: { kraken: 'XXRPZUSD', coinbase: 'XRP-USD', cg: 'ripple',   cc: 'XRP' },
  ADA: { kraken: 'ADAUSD',   coinbase: 'ADA-USD', cg: 'cardano',  cc: 'ADA' }
};

const uiTickQueue = new Map();
let rafScheduled = false;
let lastUiFlush = 0;

export function enqueueMarketTick(symbol, payload) {
  if (!symbol || !payload) return;
  const price = Number(payload.price);
  if (!Number.isFinite(price) || price <= 0) return;

  uiTickQueue.set(symbol, payload);
  if (!rafScheduled) {
    rafScheduled = true;
    const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    const delay = Math.max(0, 100 - (now - lastUiFlush));
    setTimeout(() => {
      const scheduleFn = (typeof requestAnimationFrame !== 'undefined')
        ? requestAnimationFrame
        : (cb) => setTimeout(cb, 16);

      scheduleFn(() => {
        lastUiFlush = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
        rafScheduled = false;
        uiTickQueue.forEach((data, sym) => {
          const updated = mergeAssetState(sym, data);
          if (updated && updated.price > 0) {
            const store = useMarketStore.getState();
            store.applyTick(sym, {
              ...updated,
              id: sym.toLowerCase(),
              symbol: sym,
              sector: 'crypto',
              category: 'crypto',
              price: updated.price,
              prevClose: updated.prevClose,
              change: updated.change24h,
              changePercent: updated.change24h,
              quoteTs: updated.timestampUtc,
              timestamp: updated.timestampUtc,
              status: 'live',
              source: 'websocket',
              spark1d: (updated.history || []).map((h, idx) => [`${idx}`, h]),
            });
          }
        });
        uiTickQueue.clear();
        renderAllCardCanvases();
        if (typeof syncAllDashboardWidgets === 'function') {
          syncAllDashboardWidgets();
        } else if (typeof window !== 'undefined' && typeof window.syncAllDashboardWidgets === 'function') {
          window.syncAllDashboardWidgets();
        }
      });
    }, delay);
  }
}

/**
 * Geo-Unblocked Multi-Tier Crypto Fetcher (Kraken + CryptoCompare + CoinGecko + 24h Hourly Charts)
 * Fixes ISP blockades in India and other restricted regions.
 */
export async function fetchLiveCryptoResilient() {
  let fetchedCount = 0;

  // Tier 1: Kraken Public Ticker API (Zero geo-blocks, returns live price + 24h open `o`)
  try {
    const kPairs = Object.values(CRYPTO_ENDPOINTS).map(c => c.kraken).filter(Boolean).join(',');
    const res = await fetch(`https://api.kraken.com/0/public/Ticker?pair=${kPairs}`, { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      const result = json?.result || {};
      Object.entries(CRYPTO_ENDPOINTS).forEach(([sym, cfg]) => {
        if (!cfg.kraken) return;
        const row = result[cfg.kraken] || Object.entries(result).find(([k]) => k.includes(sym === 'BTC' ? 'XBT' : sym))?.[1];
        if (row && Array.isArray(row.c) && Number(row.c[0]) > 0) {
          const price = Number(row.c[0]);
          const prevClose = Number(row.o) > 0 ? Number(row.o) : price;
          enqueueMarketTick(sym, { category: 'crypto', price, prevClose, status: 'LIVE', timestampUtc: Date.now() });
          fetchedCount++;
        }
      });
    }
  } catch (_) {}

  // Tier 2: CryptoCompare Multi-Symbol Price + 24h Open (Covers all 6 including BNB, zero geo-blocks)
  try {
    const fsyms = Object.keys(CRYPTO_ENDPOINTS).join(',');
    const res = await fetch(`https://min-api.cryptocompare.com/data/pricemultifull?fsyms=${fsyms}&tsyms=USD`, { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      const raw = json?.RAW || {};
      Object.keys(CRYPTO_ENDPOINTS).forEach(sym => {
        const usd = raw[sym]?.USD;
        if (usd && Number(usd.PRICE) > 0) {
          const price = Number(usd.PRICE);
          const prevClose = Number(usd.OPEN24HOUR) > 0 ? Number(usd.OPEN24HOUR) : price;
          enqueueMarketTick(sym, { category: 'crypto', price, prevClose, status: 'LIVE', timestampUtc: Date.now() });
          fetchedCount++;
        }
      });
    }
  } catch (_) {}

  // Tier 3: CoinGecko Simple Price Fallback
  if (fetchedCount < 6) {
    try {
      const ids = Object.values(CRYPTO_ENDPOINTS).map(c => c.cg).join(',');
      const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        Object.entries(CRYPTO_ENDPOINTS).forEach(([sym, cfg]) => {
          const d = data?.[cfg.cg];
          if (d && Number(d.usd) > 0) {
            const price = Number(d.usd);
            const chg = Number(d.usd_24h_change || 0);
            const prevClose = D(price).div(D(1).plus(D(chg).div(100))).toNumber();
            enqueueMarketTick(sym, { category: 'crypto', price, prevClose, status: 'LIVE', timestampUtc: Date.now() });
          }
        });
      }
    } catch (_) {}
  }

  // Fetch Real 24h Hourly History from CryptoCompare `histohour` for all 6 Crypto Canvas charts
  Object.keys(CRYPTO_ENDPOINTS).forEach(async (sym) => {
    try {
      const res = await fetch(`https://min-api.cryptocompare.com/data/v2/histohour?fsym=${sym}&tsym=USD&limit=24`, { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        const pts = (json?.Data?.Data || []).map(b => Number(b.close)).filter(v => Number.isFinite(v) && v > 0);
        if (pts.length >= 6) {
          const cur = (typeof window !== 'undefined' && window.marketState && window.marketState[sym]) || {};
          enqueueMarketTick(sym, {
            category: 'crypto',
            price: cur.price > 0 ? cur.price : pts[pts.length - 1],
            prevClose: cur.prevClose > 0 ? cur.prevClose : pts[0],
            history: pts,
            status: 'LIVE',
            timestampUtc: Date.now()
          });
          if (typeof syncAllDashboardWidgets === 'function') syncAllDashboardWidgets();
        }
      }
    } catch (_) {}
  });

  renderAllCardCanvases();
  if (typeof syncAllDashboardWidgets === 'function') syncAllDashboardWidgets();
}

export class CryptoStreamEngine {
  constructor() {
    this.retryAttempt = 0;
    this.ws = null;
    this.isDestroyed = false;
    this.pollTimer = null;
  }

  async init() {
    this.isDestroyed = false;
    // Immediate geo-unblocked resilient fetch
    await fetchLiveCryptoResilient();
    // Also try direct rest mirrors in case available
    await this.fetch24hRestAndKlines();
    if (!this.isDestroyed) {
      this.connectWebSocket();
      if (!this.pollTimer) {
        // Poll every 15 seconds to ensure live crypto updates without relying on Binance
        this.pollTimer = setInterval(() => {
          if (!this.isDestroyed) {
            fetchLiveCryptoResilient();
          }
        }, 15000);
      }
    }
  }

  async fetch24hRestAndKlines() {
    const syms = encodeURIComponent(JSON.stringify(Object.values(CRYPTO_SYMBOLS).map(s => s.binance)));
    const restMirrors = [
      `https://data-api.binance.vision/api/v3/ticker/24hr?symbols=${syms}`,
      `https://api.binance.com/api/v3/ticker/24hr?symbols=${syms}`
    ];

    let hydrated = false;
    for (const url of restMirrors) {
      try {
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) continue;
        const rows = await res.json();
        if (Array.isArray(rows) && rows.length > 0) {
          rows.forEach(r => {
            const sym = Object.keys(CRYPTO_SYMBOLS).find(k => CRYPTO_SYMBOLS[k].binance === r.symbol);
            if (sym && Number(r.lastPrice) > 0) {
              enqueueMarketTick(sym, {
                category: 'crypto',
                price: Number(r.lastPrice),
                prevClose: Number(r.openPrice || r.prevClosePrice),
                status: 'LIVE',
                timestampUtc: Date.now()
              });
            }
          });
          hydrated = true;
          break;
        }
      } catch (_) {}
    }

    // Circuit Breaker Tier 2: CoinCap v2
    if (!hydrated) {
      try {
        const ids = Object.values(CRYPTO_SYMBOLS).map(s => s.coincap).join(',');
        const res = await fetch(`https://api.coincap.io/v2/assets?ids=${ids}`, { cache: 'no-store' });
        if (res.ok) {
          const { data } = await res.json();
          (data || []).forEach(item => {
            const sym = Object.keys(CRYPTO_SYMBOLS).find(k => CRYPTO_SYMBOLS[k].coincap === item.id);
            if (sym && Number(item.priceUsd) > 0) {
              const price = Number(item.priceUsd);
              const chg = Number(item.changePercent24Hr || 0);
              const prevClose = D(price).div(D(1).plus(D(chg).div(100))).toNumber();
              enqueueMarketTick(sym, { category: 'crypto', price, prevClose, status: 'LIVE', timestampUtc: Date.now() });
            }
          });
        }
      } catch (_) {}
    }

    // Fetch authentic 24h hourly klines for HTML5 Canvas charts
    Object.entries(CRYPTO_SYMBOLS).forEach(async ([sym, cfg]) => {
      try {
        const res = await fetch(`https://data-api.binance.vision/api/v3/klines?symbol=${cfg.binance}&interval=1h&limit=24`);
        if (res.ok) {
          const klines = await res.json();
          const closes = klines.map(k => Number(k[4])).filter(v => Number.isFinite(v) && v > 0);
          if (closes.length >= 2) {
            const cur = (typeof window !== 'undefined' && window.marketState && window.marketState[sym]) || {};
            enqueueMarketTick(sym, {
              category: 'crypto',
              price: cur.price || closes[closes.length - 1],
              prevClose: cur.prevClose || closes[0],
              history: closes,
              status: 'LIVE',
              timestampUtc: Date.now()
            });
          }
        }
      } catch (_) {}
    });
  }

  connectWebSocket() {
    if (this.isDestroyed || typeof WebSocket === 'undefined') return;

    const streams = Object.values(CRYPTO_SYMBOLS).map(s => `${s.binance.toLowerCase()}@miniTicker`).join('/');
    const wsMirrors = [
      `wss://data-stream.binance.vision/stream?streams=${streams}`,
      `wss://stream.binance.com:9443/stream?streams=${streams}`
    ];
    const url = wsMirrors[this.retryAttempt % wsMirrors.length];

    try {
      this.ws = new WebSocket(url);
      this.ws.onopen = () => {
        this.retryAttempt = 0;
        const pill = document.getElementById('qd-stream-status');
        if (pill) {
          pill.textContent = '● LIVE STREAM';
          pill.className = 'qd-status-pill is-live';
        }
      };
      this.ws.onmessage = (evt) => {
        try {
          const d = JSON.parse(evt.data)?.data;
          if (!d?.s) return;
          const sym = Object.keys(CRYPTO_SYMBOLS).find(k => CRYPTO_SYMBOLS[k].binance === d.s);
          if (sym && Number(d.c) > 0) {
            enqueueMarketTick(sym, {
              category: 'crypto',
              price: Number(d.c),
              prevClose: Number(d.o),
              status: 'LIVE',
              timestampUtc: Number(d.E) || Date.now()
            });
          }
        } catch (_) {}
      };
      this.ws.onclose = () => {
        if (!this.isDestroyed) this.scheduleReconnect();
      };
      this.ws.onerror = () => {
        try { if (this.ws) this.ws.close(); } catch (_) {}
      };
    } catch (_) {
      if (!this.isDestroyed) this.scheduleReconnect();
    }
  }

  scheduleReconnect() {
    if (this.isDestroyed) return;
    const backoff = Math.min(30000, 1000 * Math.pow(2, this.retryAttempt++));
    setTimeout(() => {
      if (!this.isDestroyed) this.connectWebSocket();
    }, backoff);
  }

  destroy() {
    this.isDestroyed = true;
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    if (this.ws) {
      try { this.ws.close(); } catch (_) {}
      this.ws = null;
    }
  }
}

// Global instance for app lifecycle
export const cryptoStreamEngine = new CryptoStreamEngine();
