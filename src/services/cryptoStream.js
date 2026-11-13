/**
 * Multi-Tier Crypto WebSocket + Circuit Breaker + 100ms rAF Batching Engine
 * Module 4 Standard: market-web-architect
 */

import { D, mergeAssetState, renderAllCardCanvases } from '../utils/marketEngine';
import { useMarketStore } from '../store/marketStore';

export const CRYPTO_SYMBOLS = {
  BTC: { binance: 'BTCUSDT', coincap: 'bitcoin', cg: 'bitcoin' },
  ETH: { binance: 'ETHUSDT', coincap: 'ethereum', cg: 'ethereum' },
  SOL: { binance: 'SOLUSDT', coincap: 'solana', cg: 'solana' },
  BNB: { binance: 'BNBUSDT', coincap: 'binance-coin', cg: 'binancecoin' },
  XRP: { binance: 'XRPUSDT', coincap: 'xrp', cg: 'ripple' },
  ADA: { binance: 'ADAUSDT', coincap: 'cardano', cg: 'cardano' }
};

const uiTickQueue = new Map();
let rafScheduled = false;
let lastUiFlush = 0;

export function enqueueMarketTick(symbol, payload) {
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
          if (updated) {
            const store = useMarketStore.getState();
            store.applyTick(sym, {
              ...updated,
              id: sym.toLowerCase(),
              symbol: sym,
              sector: 'crypto',
              category: 'crypto',
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
        if (typeof window !== 'undefined' && typeof window.syncAllDashboardWidgets === 'function') {
          window.syncAllDashboardWidgets();
        }
      });
    }, delay);
  }
}

export class CryptoStreamEngine {
  constructor() {
    this.retryAttempt = 0;
    this.ws = null;
    this.isDestroyed = false;
  }

  async init() {
    this.isDestroyed = false;
    await this.fetch24hRestAndKlines();
    if (!this.isDestroyed) {
      this.connectWebSocket();
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
            if (sym) {
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
            if (sym) {
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
          if (sym) {
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
    if (this.ws) {
      try { this.ws.close(); } catch (_) {}
      this.ws = null;
    }
  }
}

// Global instance for app lifecycle
export const cryptoStreamEngine = new CryptoStreamEngine();
