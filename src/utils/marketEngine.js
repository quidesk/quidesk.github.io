/**
 * Quidesk Market Architecture Engine (Edition 2A-II / Sovereign V3)
 * Standards: market-web-architect
 * - Decimal.js arbitrary-precision math (with safe fallback)
 * - Strict Runtime Schema Validation (rejects NaN, Infinity, <= 0)
 * - Triangular cross-rate parity (EUR/INR === EUR/USD * USD/INR)
 * - Honest High-DPI HTML5 Canvas chart engine (no synthetic prevClose spikes)
 * - DST-safe America/New_York session helper
 */

import { useMarketStore } from '../store/marketStore';

const root = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : {});
if (typeof window === 'undefined' && typeof globalThis !== 'undefined') {
  globalThis.window = globalThis;
}
root.marketState = root.marketState || {};

export function D(val) {
  let n;
  if (val && typeof val === 'object') {
    if (typeof val.toNumber === 'function') {
      n = val.toNumber();
    } else if (val.v !== undefined) {
      n = Number(val.v);
    } else {
      n = Number(val);
    }
  } else {
    n = (val !== null && val !== undefined && Number.isFinite(Number(val))) ? Number(val) : 0;
  }
  if (!Number.isFinite(n)) n = 0;

  const DecimalClass = (typeof window !== 'undefined' && window.Decimal) ||
                       (typeof globalThis !== 'undefined' && globalThis.Decimal);
  if (DecimalClass) {
    return new DecimalClass(String(n));
  }

  return {
    v: n,
    plus(b) {
      const bn = D(b).toNumber();
      const res = Math.round((this.v + bn) * 1e12) / 1e12;
      return D(res);
    },
    minus(b) {
      const bn = D(b).toNumber();
      const res = Math.round((this.v - bn) * 1e12) / 1e12;
      return D(res);
    },
    times(b) {
      const bn = D(b).toNumber();
      const res = Math.round((this.v * bn) * 1e12) / 1e12;
      return D(res);
    },
    div(b) {
      const bn = D(b).toNumber();
      return D(bn !== 0 ? this.v / bn : 0);
    },
    gte(b) { return this.v >= D(b).toNumber(); },
    lt(b) { return this.v < D(b).toNumber(); },
    toDecimalPlaces(dp) {
      const f = Math.pow(10, dp);
      return D(Math.round(this.v * f) / f);
    },
    toFixed(dp) { return this.v.toFixed(dp); },
    toNumber() { return this.v; }
  };
}

function extractPointNumber(pt) {
  if (typeof pt === 'number') return pt;
  if (Array.isArray(pt)) return Number(pt[1]);
  if (pt && typeof pt === 'object') return Number(pt.value ?? pt.close ?? pt.price);
  return NaN;
}

export function validateMarketPayload(raw) {
  if (!raw || typeof raw.symbol !== 'string' || !raw.symbol.trim()) return null;
  const price = Number(raw.price);
  if (!Number.isFinite(price) || price <= 0) return null;

  const rawPrev = Number(raw.prevClose);
  const prevClose = (Number.isFinite(rawPrev) && rawPrev > 0) ? rawPrev : null;
  const history = Array.isArray(raw.history)
    ? raw.history.map(extractPointNumber).filter(v => Number.isFinite(v) && v > 0)
    : [];

  return {
    symbol: raw.symbol.trim(),
    category: String(raw.category || raw.sector || '').toLowerCase(),
    price,
    prevClose,
    change24h: (raw.change24h !== undefined && Number.isFinite(Number(raw.change24h)))
      ? Number(raw.change24h)
      : (raw.change !== undefined && Number.isFinite(Number(raw.change))) ? Number(raw.change) : null,
    history,
    status: raw.status || 'LIVE',
    timestampUtc: Number.isFinite(Number(raw.timestampUtc)) ? Number(raw.timestampUtc) : Date.now()
  };
}

export function mergeAssetState(symbol, rawIncoming = {}) {
  const valid = validateMarketPayload({ ...rawIncoming, symbol });
  const state = typeof window !== 'undefined' ? window.marketState : {};
  if (!valid) return state[symbol] || null;

  const existing = state[symbol] || {};
  const price = valid.price;

  let prevClose = valid.prevClose ?? existing.prevClose ?? null;
  if ((!prevClose || Math.abs(prevClose - price) < 1e-8) && existing.prevClose && Math.abs(existing.prevClose - price) > 1e-8) {
    prevClose = existing.prevClose;
  }

  let change24h;
  if (prevClose && Math.abs(price - prevClose) > 1e-8) {
    change24h = D(price).minus(prevClose).div(prevClose).times(100).toDecimalPlaces(2).toNumber();
  } else if (valid.change24h !== null && Math.abs(valid.change24h) > 1e-5) {
    change24h = D(valid.change24h).toDecimalPlaces(2).toNumber();
    if (!prevClose || Math.abs(prevClose - price) < 1e-8) {
      prevClose = D(price).div(D(1).plus(D(change24h).div(100))).toNumber();
    }
  } else if (existing.change24h !== undefined && Math.abs(existing.change24h) > 1e-5) {
    change24h = Number(existing.change24h);
    if (!prevClose || Math.abs(prevClose - price) < 1e-8) {
      prevClose = D(price).div(D(1).plus(D(change24h).div(100))).toNumber();
    }
  } else {
    change24h = valid.change24h ?? existing.change24h ?? 0;
  }

  let history = valid.history.length >= 2 ? [...valid.history] : (existing.history ? [...existing.history] : []);
  if (history.length >= 2 && Math.abs(history[history.length - 1] - price) > 1e-8) {
    history[history.length - 1] = price;
  }

  const updated = {
    ...existing,
    ...valid,
    prevClose: prevClose || price,
    change: change24h,
    change24h,
    history
  };
  state[symbol] = updated;

  if (symbol === 'EUR/USD' || symbol === 'USD/INR' || symbol === 'EUR/INR') {
    const eurUsd = state['EUR/USD']?.price;
    const usdInr = state['USD/INR']?.price;
    if (eurUsd > 0 && usdInr > 0 && state['EUR/INR']) {
      const exactEurInr = D(eurUsd).times(usdInr).toDecimalPlaces(2).toNumber();
      const prevEurUsd = state['EUR/USD']?.prevClose;
      const prevUsdInr = state['USD/INR']?.prevClose;
      const prevEurInr = (prevEurUsd > 0 && prevUsdInr > 0)
        ? D(prevEurUsd).times(prevUsdInr).toDecimalPlaces(2).toNumber()
        : (state['EUR/INR'].prevClose || exactEurInr);
      state['EUR/INR'].price = exactEurInr;
      state['EUR/INR'].prevClose = prevEurInr;
      state['EUR/INR'].change24h = prevEurInr > 0
        ? D(exactEurInr).minus(prevEurInr).div(prevEurInr).times(100).toDecimalPlaces(2).toNumber()
        : 0;
      state['EUR/INR'].change = state['EUR/INR'].change24h;
    }
  }

  return updated;
}

function resolveCanonicalPrice(state, sym, fallback) {
  if (state && typeof state[sym]?.price === 'number' && Number.isFinite(state[sym].price) && state[sym].price > 0) {
    return state[sym].price;
  }
  try {
    const storeState = useMarketStore.getState();
    const quotes = storeState?.quotes || {};
    const keyLower = sym.toLowerCase().replace('/', '');
    const q = quotes[sym] || quotes[keyLower];
    if (q && q.status !== 'unavailable' && typeof q.price === 'number' && Number.isFinite(q.price) && q.price > 0) {
      return q.price;
    }
    if (sym === 'USD/SGD' && typeof storeState?.fxExtras?.usdsgd === 'number' && storeState.fxExtras.usdsgd > 0) {
      return storeState.fxExtras.usdsgd;
    }
  } catch {}
  return fallback;
}

export function formatAssetPriceDisplay(asset, state = (typeof window !== 'undefined' ? window.marketState : {})) {
  const usdInr = D(resolveCanonicalPrice(state, 'USD/INR', 94.03));
  const hasValidPrice = asset && asset.status !== 'unavailable' && typeof asset.price === 'number' && Number.isFinite(asset.price) && asset.price > 0;
  if (!hasValidPrice) {
    return { primary: '—', unit: '', secondary: '', chgStr: '—' };
  }
  const price = D(asset.price);
  const priceNum = price.toNumber();
  const sym = String(asset?.symbol || '');
  const cat = String(asset?.category || asset?.sector || '').toLowerCase();
  const chg = Number(asset?.change24h ?? asset?.changePercent ?? asset?.change ?? 0);
  const arrow = chg >= 0 ? '▲' : '▼';
  const chgStr = `${arrow} ${chg >= 0 ? '+' : '-'}${Math.abs(chg).toFixed(2)}%`;

  if (['XAU/USD', 'XAG/USD', 'XPT/USD'].includes(sym) || cat === 'metals') {
    const primary = `$${priceNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const inrVal = Math.round(price.times(usdInr).toNumber()).toLocaleString('en-IN');
    return { primary, unit: '/oz', secondary: `(₹${inrVal})`, chgStr };
  }

  if (cat === 'forex' || sym.includes('/')) {
    const [base, quote] = sym.split('/');
    const decimals = ['JPY', 'INR'].includes(quote) ? 2 : 4;
    const rateStr = price.toFixed(decimals);

    if (quote === 'INR') {
      return { primary: `₹${rateStr}`, unit: '', secondary: `($${price.div(usdInr).toFixed(2)})`, chgStr };
    }
    if (quote === 'USD') {
      return { primary: rateStr, unit: 'USD', secondary: `(1 ${base} = ₹${price.times(usdInr).toFixed(2)})`, chgStr };
    }
    if (base === 'USD') {
      const unitInr = priceNum > 0 ? usdInr.div(price).toFixed(quote === 'JPY' ? 4 : 2) : '0.00';
      return { primary: rateStr, unit: quote, secondary: `(1 ${quote} = ₹${unitInr})`, chgStr };
    }
    const baseUsd = D(resolveCanonicalPrice(state, `${base}/USD`, base === 'EUR' ? 1.1062 : 1.3237));
    return { primary: rateStr, unit: quote, secondary: `(1 ${base} = ₹${baseUsd.times(usdInr).toFixed(2)})`, chgStr };
  }

  const unitMap = { WTI: '/bbl', BRENT: '/bbl', NGAS: '/MMBtu', HOIL: '/gal' };
  const unit = unitMap[sym] || '';
  const frac = (priceNum < 10 && ['NGAS', 'HOIL'].includes(sym)) ? 3 : (priceNum < 1 ? 4 : 2);
  const primary = `$${priceNum.toLocaleString('en-US', { minimumFractionDigits: frac, maximumFractionDigits: frac })}`;
  const inrRaw = price.times(usdInr);
  const inrFormatted = inrRaw.gte(100) ? Math.round(inrRaw.toNumber()).toLocaleString('en-IN') : inrRaw.toFixed(2);
  return { primary, unit, secondary: `(₹${inrFormatted})`, chgStr };
}

export function computeEightCurrencies(asset, state = (typeof window !== 'undefined' ? window.marketState : {})) {
  const usdInr = D(resolveCanonicalPrice(state, 'USD/INR', 94.03));
  const eurUsd = D(resolveCanonicalPrice(state, 'EUR/USD', 1.1062));
  const gbpUsd = D(resolveCanonicalPrice(state, 'GBP/USD', 1.3237));
  const usdJpy = D(resolveCanonicalPrice(state, 'USD/JPY', 159.90));
  const btcUsd = D(resolveCanonicalPrice(state, 'BTC', 74500));
  const usdSgd = D(resolveCanonicalPrice(state, 'USD/SGD', 1.3450));
  const sym = String(asset?.symbol || '');
  const cat = String(asset?.category || asset?.sector || '').toLowerCase();
  let usdVal = D(asset?.price || 0);

  if ((cat === 'forex' || sym.includes('/')) && !['XAU/USD', 'XAG/USD', 'XPT/USD'].includes(sym)) {
    const [base, quote] = sym.split('/');
    if (base === 'USD') usdVal = D(1);
    else if (quote === 'USD') usdVal = D(asset?.price);
    else if (base === 'EUR') usdVal = eurUsd;
    else if (base === 'GBP') usdVal = gbpUsd;
  }

  return [
    { code: 'USD', name: 'US Dollar', flag: '🇺🇸', val: `$${usdVal.toNumber().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, display: `$${usdVal.toNumber().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
    { code: 'INR', name: 'Indian Rupee', flag: '🇮🇳', val: `₹${usdVal.times(usdInr).toNumber().toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, display: `₹${usdVal.times(usdInr).toNumber().toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
    { code: 'EUR', name: 'Euro', flag: '🇪🇺', val: `€${usdVal.div(eurUsd).toFixed(2)}`, display: `€${usdVal.div(eurUsd).toFixed(2)}` },
    { code: 'GBP', name: 'British Pound', flag: '🇬🇧', val: `£${usdVal.div(gbpUsd).toFixed(2)}`, display: `£${usdVal.div(gbpUsd).toFixed(2)}` },
    { code: 'JPY', name: 'Japanese Yen', flag: '🇯🇵', val: `¥${usdVal.times(usdJpy).toFixed(2)}`, display: `¥${usdVal.times(usdJpy).toFixed(2)}` },
    { code: 'AED', name: 'UAE Dirham', flag: '🇦🇪', val: `${usdVal.times(3.6725).toFixed(2)} د.إ`, display: `${usdVal.times(3.6725).toFixed(2)} د.إ` },
    { code: 'SGD', name: 'Singapore Dollar', flag: '🇸🇬', val: `S$${usdVal.times(usdSgd).toFixed(2)}`, display: `S$${usdVal.times(usdSgd).toFixed(2)}` },
    { code: 'BTC', name: 'Bitcoin', flag: '₿', val: `₿${usdVal.div(btcUsd).toFixed(6)}`, display: `₿${usdVal.div(btcUsd).toFixed(6)}` }
  ];
}

function getNewYorkMinutes(nowUtc) {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(new Date(nowUtc));
    const map = {};
    for (const p of parts) {
      if (p.type !== 'literal') map[p.type] = p.value;
    }
    const hour = Number(map.hour) === 24 ? 0 : Number(map.hour);
    const minute = Number(map.minute);
    return {
      weekday: map.weekday || '',
      minutesOfDay: hour * 60 + minute,
    };
  } catch {
    const d = new Date(nowUtc);
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return {
      weekday: dayNames[d.getUTCDay()],
      minutesOfDay: ((d.getUTCHours() + 19) % 24) * 60 + d.getUTCMinutes(),
    };
  }
}

export function getSessionStatus(category, nowUtc = Date.now()) {
  const cat = String(category || '').toLowerCase();
  if (cat === 'crypto') return 'LIVE';

  const { weekday, minutesOfDay } = getNewYorkMinutes(nowUtc);
  if (cat === 'equities') {
    if (weekday === 'Sat' || weekday === 'Sun') return 'CLOSED';
    const isNyseOpen = minutesOfDay >= (9 * 60 + 30) && minutesOfDay < (16 * 60);
    return isNyseOpen ? 'LIVE' : 'CLOSED';
  }

  if (weekday === 'Sat') return 'CLOSED';
  if (weekday === 'Sun') return minutesOfDay >= 18 * 60 ? 'LIVE' : 'CLOSED';
  if (weekday === 'Fri') return minutesOfDay < 17 * 60 ? 'LIVE' : 'CLOSED';
  return 'LIVE';
}

/**
 * Honest High-DPI HTML5 Canvas Chart Engine (Warm Editorial Palette Calibrated)
 * - Never prepends prevClose into real history arrays (prevents artificial left-edge spikes)
 * - Renders a clean dashed baseline + "No 24H history" notice when < 2 real points exist
 */
export function drawCardCanvasChart(canvas, asset) {
  if (!canvas || !asset) return;
  const price = Number(asset.price);
  if (!Number.isFinite(price) || price <= 0) return;

  const chg = Number(asset.change24h ?? asset.changePercent ?? asset.change ?? 0);
  const prevClose = (Number.isFinite(asset.prevClose) && asset.prevClose > 0)
    ? Number(asset.prevClose)
    : D(price).div(D(1).plus(D(chg).div(100))).toNumber();

  let rawSeries = [];
  if (Array.isArray(asset.history) && asset.history.length > 0) {
    rawSeries = asset.history;
  } else if (Array.isArray(asset.history?.['24H']) && asset.history['24H'].length > 0) {
    rawSeries = asset.history['24H'];
  } else if (Array.isArray(asset.chartData) && asset.chartData.length > 0) {
    rawSeries = asset.chartData;
  } else if (Array.isArray(asset.spark1d) && asset.spark1d.length > 0) {
    rawSeries = asset.spark1d;
  }

  const series = rawSeries
    .map(extractPointNumber)
    .filter(v => Number.isFinite(v) && v > 0);

  const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
  const width = Math.max(canvas.clientWidth || 260, 200);
  const height = 52;
  canvas.width = width * dpr;
  canvas.height = height * dpr;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, width, height);

  if (series.length < 2) {
    ctx.save();
    ctx.strokeStyle = 'rgba(142, 147, 158, 0.30)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(142, 147, 158, 0.85)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('No 24H history', width / 2, height / 2 - 8);
    ctx.restore();
    return;
  }

  const tf = canvas.getAttribute?.('data-tf') || '24H';
  const plotSeries = [...series];
  if ((tf === '24H' || tf === '1H') && Math.abs(plotSeries[plotSeries.length - 1] - price) > 1e-8) {
    plotSeries.push(price);
  }

  const showBaseline = tf === '24H' && Number.isFinite(prevClose) && prevClose > 0;
  const minVal = Math.min(...plotSeries);
  const maxVal = Math.max(...plotSeries);
  const span = (maxVal - minVal) || Math.abs(price * 0.001) || 1;
  const padY = 6;
  const plotH = height - padY * 2;

  const pts = plotSeries.map((v, i) => ({
    x: (i / (plotSeries.length - 1)) * width,
    y: (height - padY) - ((v - minVal) / span) * plotH
  }));

  const isFlat = Math.abs(chg) < 0.005;
  const isUp = chg >= 0;
  const color = isFlat ? '#8E939E' : (isUp ? '#36C982' : '#F06A64');
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, isFlat ? 'rgba(142, 147, 158, 0.16)' : (isUp ? 'rgba(54, 201, 130, 0.22)' : 'rgba(240, 106, 100, 0.22)'));
  grad.addColorStop(1, 'rgba(11, 12, 15, 0.0)');

  if (showBaseline && prevClose >= minVal && prevClose <= maxVal) {
    const baseY = (height - padY) - ((prevClose - minVal) / span) * plotH;
    ctx.save();
    ctx.strokeStyle = 'rgba(142, 147, 158, 0.26)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(0, baseY);
    ctx.lineTo(width, baseY);
    ctx.stroke();
    ctx.restore();
  }

  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    const mx = (pts[i - 1].x + pts[i].x) / 2;
    const my = (pts[i - 1].y + pts[i].y) / 2;
    ctx.quadraticCurveTo(pts[i - 1].x, pts[i - 1].y, mx, my);
  }
  ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.85;
  ctx.stroke();

  const lastPt = pts[pts.length - 1];
  ctx.beginPath();
  ctx.arc(lastPt.x - 2, lastPt.y, 2.5, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();
}

export function renderAllCardCanvases() {
  if (typeof document === 'undefined') return;
  document.querySelectorAll('canvas.qd-card-canvas[data-symbol]').forEach(canvas => {
    const tf = canvas.getAttribute('data-tf');
    if (tf && tf !== '24H') return;
    const sym = canvas.getAttribute('data-symbol');
    const asset = (typeof window !== 'undefined' && window.marketState[sym]) || null;
    if (asset) drawCardCanvasChart(canvas, asset);
  });
}

const target = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : {});
target.D = D;
target.validateMarketPayload = validateMarketPayload;
target.mergeAssetState = mergeAssetState;
target.formatAssetPriceDisplay = formatAssetPriceDisplay;
target.computeEightCurrencies = computeEightCurrencies;
target.getSessionStatus = getSessionStatus;
target.drawCardCanvasChart = drawCardCanvasChart;
target.renderAllCardCanvases = renderAllCardCanvases;
