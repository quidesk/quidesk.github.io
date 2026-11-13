/**
 * Quidesk Market Architecture Engine (Edition 2A-II / Sovereign V3)
 * Standards: market-web-architect
 * - Decimal.js arbitrary-precision math (with safe fallback)
 * - Strict Runtime Schema Validation (rejects NaN, Infinity, <= 0)
 * - Triangular cross-rate parity (EUR/INR === EUR/USD * USD/INR)
 * - High-DPI HTML5 Canvas chart engine (honest 2-point prevClose -> price vector, zero empty placeholders)
 * - UTC internal session helper
 */

const root = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : {});
if (typeof window === 'undefined' && typeof globalThis !== 'undefined') {
  globalThis.window = globalThis;
}
root.marketState = root.marketState || {};

/**
 * Arbitrary precision wrapper using Decimal.js if loaded, or safe precision fallback.
 */
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

/**
 * Strict Runtime Schema Validator (rejects NaN, Infinity, <= 0 prices, or malformed payloads)
 */
export function validateMarketPayload(raw) {
  if (!raw || typeof raw.symbol !== 'string' || !raw.symbol.trim()) return null;
  const price = Number(raw.price);
  if (!Number.isFinite(price) || price <= 0) return null;

  const rawPrev = Number(raw.prevClose);
  const prevClose = (Number.isFinite(rawPrev) && rawPrev > 0) ? rawPrev : null;
  const history = Array.isArray(raw.history)
    ? raw.history.map(Number).filter(v => Number.isFinite(v) && v > 0)
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

/**
 * Atomic state merge with locked 24h prevClose protection and triangular parity enforcement.
 */
export function mergeAssetState(symbol, rawIncoming = {}) {
  const valid = validateMarketPayload({ ...rawIncoming, symbol });
  const state = typeof window !== 'undefined' ? window.marketState : {};
  if (!valid) return state[symbol] || null;

  const existing = state[symbol] || {};
  const price = valid.price;

  // Protect locked 24h prevClose from being overwritten by spot-only ticks
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

  let history = valid.history.length >= 2 ? valid.history : (existing.history || []);
  if (history.length >= 2) {
    history = [...history];
    if (prevClose && prevClose > 0) history[0] = prevClose;
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

  // Enforce exact triangular cross-rate parity: EUR/INR === Decimal(EUR/USD) * Decimal(USD/INR)
  if (symbol === 'EUR/USD' || symbol === 'USD/INR') {
    const eurUsd = state['EUR/USD']?.price;
    const usdInr = state['USD/INR']?.price;
    if (eurUsd > 0 && usdInr > 0 && state['EUR/INR']) {
      const exactEurInr = D(eurUsd).times(usdInr).toDecimalPlaces(2).toNumber();
      const prevEurInr = state['EUR/INR'].prevClose || exactEurInr;
      state['EUR/INR'].price = exactEurInr;
      state['EUR/INR'].change24h = prevEurInr > 0
        ? D(exactEurInr).minus(prevEurInr).div(prevEurInr).times(100).toDecimalPlaces(2).toNumber()
        : 0;
      state['EUR/INR'].change = state['EUR/INR'].change24h;
    }
  }

  return updated;
}

/**
 * Format asset price display matching exact Module 3 conventions
 */
export function formatAssetPriceDisplay(asset, state = (typeof window !== 'undefined' ? window.marketState : {})) {
  const usdInr = D(state['USD/INR']?.price || 94.03);
  const price = D(asset?.price || 0);
  const priceNum = price.toNumber();
  const sym = String(asset?.symbol || '');
  const cat = String(asset?.category || asset?.sector || '').toLowerCase();
  const chg = Number(asset?.change24h ?? asset?.change ?? 0);
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
    const baseUsd = D(state[`${base}/USD`]?.price || (base === 'EUR' ? 1.1062 : 1.3237));
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

/**
 * 8-Currency conversion according to Module 3 (Forex base currency normalization)
 */
export function computeEightCurrencies(asset, state = (typeof window !== 'undefined' ? window.marketState : {})) {
  const usdInr = D(state['USD/INR']?.price || 94.03);
  const eurUsd = D(state['EUR/USD']?.price || 1.1062);
  const gbpUsd = D(state['GBP/USD']?.price || 1.3237);
  const usdJpy = D(state['USD/JPY']?.price || 159.90);
  const btcUsd = D(state['BTC']?.price || 74500);
  const sym = String(asset?.symbol || '');
  const cat = String(asset?.category || asset?.sector || '').toLowerCase();
  let usdVal = D(asset?.price || 0);

  // For Forex pairs, convert 1 unit of the pair's BASE currency (never treat 159.90 JPY as $159.90 USD)
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
    { code: 'SGD', name: 'Singapore Dollar', flag: '🇸🇬', val: `S$${usdVal.times(1.3450).toFixed(2)}`, display: `S$${usdVal.times(1.3450).toFixed(2)}` },
    { code: 'BTC', name: 'Bitcoin', flag: '₿', val: `₿${usdVal.div(btcUsd).toFixed(6)}`, display: `₿${usdVal.div(btcUsd).toFixed(6)}` }
  ];
}

/**
 * Uniform Session Status Helper
 * - Forex: ● LIVE on weekdays
 * - Equities: ● CLOSED outside NYSE hours (14:30 - 21:00 UTC)
 * - Crypto: ● LIVE 24/7
 */
export function getSessionStatus(category, nowUtc = Date.now()) {
  const cat = String(category || '').toLowerCase();
  const date = new Date(nowUtc);
  const day = date.getUTCDay(); // 0 = Sun, 6 = Sat
  const hour = date.getUTCHours();
  const minute = date.getUTCMinutes();
  const timeMin = hour * 60 + minute;

  if (cat === 'crypto') {
    return 'LIVE';
  }

  if (cat === 'forex') {
    // Weekdays are Monday through Friday
    const isWeekend = (day === 6) || (day === 0 && timeMin < 21 * 60) || (day === 5 && timeMin >= 21 * 60);
    return !isWeekend ? 'LIVE' : 'CLOSED';
  }

  if (cat === 'equities') {
    const isWeekday = day >= 1 && day <= 5;
    const isNyseOpen = isWeekday && timeMin >= (14 * 60 + 30) && timeMin < (21 * 60);
    return isNyseOpen ? 'LIVE' : 'CLOSED';
  }

  // Metals & Energy
  const isWeekend = (day === 6) || (day === 0 && timeMin < 23 * 60) || (day === 5 && timeMin >= 22 * 60);
  return isWeekend ? 'CLOSED' : 'LIVE';
}

/**
 * Honest High-DPI HTML5 Canvas Chart Engine
 * - Zero "no chart data" empty states
 * - Honest 2-point prevClose -> price linear vector when < 2 historical points exist
 * - High price = top, low price = bottom
 * - Dashed prevClose baseline
 * - Terminal live dot & gradient fill
 */
export function drawCardCanvasChart(canvas, asset) {
  if (!canvas || !asset) return;
  const price = Number(asset.price);
  if (!Number.isFinite(price) || price <= 0) return;

  const chg = Number(asset.change24h ?? asset.change ?? 0);
  const prevClose = (Number.isFinite(asset.prevClose) && asset.prevClose > 0)
    ? Number(asset.prevClose)
    : D(price).div(D(1).plus(D(chg).div(100))).toNumber();

  let series = Array.isArray(asset.history)
    ? asset.history.map(Number).filter(v => Number.isFinite(v) && v > 0)
    : [];

  if (series.length < 2) {
    series = [prevClose, price];
  } else {
    series = [...series];
    series[0] = prevClose;
    series[series.length - 1] = price;
  }

  const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
  const width = Math.max(canvas.clientWidth || 260, 200);
  const height = 52;
  canvas.width = width * dpr;
  canvas.height = height * dpr;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, width, height);

  const minVal = Math.min(...series);
  const maxVal = Math.max(...series);
  const span = (maxVal - minVal) || Math.abs(price * 0.001) || 1;
  const padY = 6;
  const plotH = height - padY * 2;

  // Proper SVG/Canvas Y-axis inversion: high price = top (small Y), low price = bottom (large Y)
  const pts = series.map((v, i) => ({
    x: (i / (series.length - 1)) * width,
    y: (height - padY) - ((v - minVal) / span) * plotH
  }));

  const isUp = chg >= 0;
  const color = isUp ? '#10B981' : '#EF4444';
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, isUp ? 'rgba(16, 185, 129, 0.24)' : 'rgba(239, 68, 68, 0.24)');
  grad.addColorStop(1, 'rgba(8, 12, 20, 0.0)');

  // Dashed 24h baseline (prevClose)
  const baseY = (height - padY) - ((prevClose - minVal) / span) * plotH;
  ctx.save();
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.22)';
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(0, baseY);
  ctx.lineTo(width, baseY);
  ctx.stroke();
  ctx.restore();

  // Plot trajectory
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  if (pts.length === 2) {
    ctx.lineTo(pts[1].x, pts[1].y);
  } else {
    for (let i = 1; i < pts.length; i++) {
      const mx = (pts[i - 1].x + pts[i].x) / 2;
      const my = (pts[i - 1].y + pts[i].y) / 2;
      ctx.quadraticCurveTo(pts[i - 1].x, pts[i - 1].y, mx, my);
    }
    ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.85;
  ctx.stroke();

  // Terminal live dot
  const lastPt = pts[pts.length - 1];
  ctx.beginPath();
  ctx.arc(lastPt.x - 2, lastPt.y, 2.5, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  // Area fill
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();
}

/**
 * Re-render all card canvases in the DOM
 */
export function renderAllCardCanvases() {
  if (typeof document === 'undefined') return;
  document.querySelectorAll('canvas.qd-card-canvas[data-symbol]').forEach(canvas => {
    const sym = canvas.getAttribute('data-symbol');
    const asset = (typeof window !== 'undefined' && window.marketState[sym]) || null;
    if (asset) drawCardCanvasChart(canvas, asset);
  });
}

// Bind to window/globalThis for runtime access
const target = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : {});
target.D = D;
target.validateMarketPayload = validateMarketPayload;
target.mergeAssetState = mergeAssetState;
target.formatAssetPriceDisplay = formatAssetPriceDisplay;
target.computeEightCurrencies = computeEightCurrencies;
target.getSessionStatus = getSessionStatus;
target.drawCardCanvasChart = drawCardCanvasChart;
target.renderAllCardCanvases = renderAllCardCanvases;
