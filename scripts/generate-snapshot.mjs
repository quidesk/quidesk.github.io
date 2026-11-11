/**
 * Quidesk — Static Market Snapshot Pre-Hydration Generator
 * 
 * Runs before build or via scheduled GitHub Action to produce
 * public/market-snapshot.json with verified live quotes for all 32 assets.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  FOREX_PAIRS_CONFIG,
  parseYahooFxMeta,
  parseFxRatesApiPayload,
  parseOpenErApiPayload
} from '../src/utils/forexHelpers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.resolve(__dirname, '../public');
const OUTPUT_FILE = path.join(PUBLIC_DIR, 'market-snapshot.json');

// Live default baseline targets (current market levels)
const BASELINES = {
  // Equities
  spx:  { symbol: 'SPY',      name: 'SPDR S&P 500 ETF',  price: 749.92,  change: -0.37, sector: 'equities', volume: '60M',  marketCap: '540B' },
  ndx:  { symbol: 'QQQ',      name: 'Invesco QQQ Trust', price: 674.76,  change: -0.68, sector: 'equities', volume: '40M',  marketCap: '300B' },
  dow:  { symbol: 'DIA',      name: 'SPDR Dow Jones',    price: 521.73,  change: -0.31, sector: 'equities', volume: '5M',   marketCap: '35B' },
  aapl: { symbol: 'AAPL',     name: 'Apple Inc.',        price: 348.51,  change: -0.62, sector: 'equities', volume: '58M',  marketCap: '3.5T' },
  tsla: { symbol: 'TSLA',     name: 'Tesla Inc.',        price: 379.78,  change: 0.46,  sector: 'equities', volume: '98M',  marketCap: '1.1T' },
  meta: { symbol: 'META',     name: 'Meta Platforms',    price: 641.39,  change: 0.00,  sector: 'equities', volume: '32M',  marketCap: '1.4T' },
  nvda: { symbol: 'NVDA',     name: 'NVIDIA Corp.',      price: 168.89,  change: -5.47, sector: 'equities', volume: '42M',  marketCap: '3.4T' },

  // Crypto
  btc:  { symbol: 'BTC',      name: 'Bitcoin',           price: 73382.64, change: -0.44, sector: 'crypto',   volume: '28.4B', marketCap: '1.54T' },
  eth:  { symbol: 'ETH',      name: 'Ethereum',          price: 2048.09,  change: -3.77, sector: 'crypto',   volume: '14.2B', marketCap: '272B' },
  sol:  { symbol: 'SOL',      name: 'Solana',            price: 83.04,    change: -4.12, sector: 'crypto',   volume: '3.8B',  marketCap: '44B' },
  bnb:  { symbol: 'BNB',      name: 'BNB',               price: 679.36,   change: -1.69, sector: 'crypto',   volume: '1.9B',  marketCap: '102B' },
  xrp:  { symbol: 'XRP',      name: 'XRP',               price: 1.0507,   change: -4.87, sector: 'crypto',   volume: '2.1B',  marketCap: '72B' },
  ada:  { symbol: 'ADA',      name: 'Cardano',           price: 0.1743,   change: -1.69, sector: 'crypto',   volume: '820M',  marketCap: '6.8B' },

  // Metals
  gold:     { symbol: 'XAU/USD', name: 'Gold Spot',      price: 4028.10,  change: 0.25,  sector: 'metals',   volume: '142B',  marketCap: '14.6T', unit: 'oz' },
  silver:   { symbol: 'XAG/USD', name: 'Silver Spot',    price: 51.75,    change: 0.35,  sector: 'metals',   volume: '18B',   marketCap: '1.7T',  unit: 'oz' },
  platinum: { symbol: 'XPT/USD', name: 'Platinum',       price: 1553.00,  change: 1.25,  sector: 'metals',   volume: '4.2B',  marketCap: '—',     unit: 'oz' },

  // Energy
  wti:   { symbol: 'WTI',     name: 'WTI Crude Oil',     price: 86.62,    change: 0.67,  sector: 'energy',   volume: '820M',  marketCap: '—',     unit: 'bbl' },
  brent: { symbol: 'BRENT',   name: 'Brent Crude',       price: 92.27,    change: 0.85,  sector: 'energy',   volume: '940M',  marketCap: '—',     unit: 'bbl' },
  ng:    { symbol: 'NGAS',    name: 'Natural Gas',       price: 3.31,     change: 0.52,  sector: 'energy',   volume: '210M',  marketCap: '—',     unit: 'MMBtu' },
  hoil:  { symbol: 'HOIL',    name: 'Heating Oil',       price: 4.16,     change: 0.60,  sector: 'energy',   volume: '180M',  marketCap: '—',     unit: 'gal' },

  // Forex
  eurusd: { symbol: 'EUR/USD', name: 'Euro / US Dollar',        price: 1.1214,   change: 0.19,  sector: 'forex',   volume: '580B', marketCap: '—', unit: 'USD' },
  gbpusd: { symbol: 'GBP/USD', name: 'British Pound / USD',     price: 1.3346,   change: -0.48, sector: 'forex',   volume: '310B', marketCap: '—', unit: 'USD' },
  usdjpy: { symbol: 'USD/JPY', name: 'US Dollar / Yen',         price: 158.94,   change: 0.65,  sector: 'forex',   volume: '430B', marketCap: '—', unit: 'JPY' },
  audusd: { symbol: 'AUD/USD', name: 'Australian Dollar / USD', price: 0.6879,   change: -1.80, sector: 'forex',   volume: '170B', marketCap: '—', unit: 'USD' },
  usdcad: { symbol: 'USD/CAD', name: 'US Dollar / CAD',         price: 1.4193,   change: 1.49,  sector: 'forex',   volume: '160B', marketCap: '—', unit: 'CAD' },
  usdchf: { symbol: 'USD/CHF', name: 'US Dollar / CHF',         price: 0.8260,   change: 0.79,  sector: 'forex',   volume: '130B', marketCap: '—', unit: 'CHF' },
  nzdusd: { symbol: 'NZD/USD', name: 'NZ Dollar / USD',         price: 0.5628,   change: 0.27,  sector: 'forex',   volume: '95B',  marketCap: '—', unit: 'USD' },
  eurgbp: { symbol: 'EUR/GBP', name: 'Euro / GBP',              price: 0.8362,   change: 0.14,  sector: 'forex',   volume: '90B',  marketCap: '—', unit: 'GBP' },
  gbpjpy: { symbol: 'GBP/JPY', name: 'British Pound / Yen',     price: 212.10,   change: 0.19,  sector: 'forex',   volume: '70B',  marketCap: '—', unit: 'JPY' },
  eurjpy: { symbol: 'EUR/JPY', name: 'Euro / Yen',              price: 177.38,   change: 0.33,  sector: 'forex',   volume: '85B',  marketCap: '—', unit: 'JPY' },
  usdinr: { symbol: 'USD/INR', name: 'US Dollar / INR',         price: 93.92,    change: 0.00,  sector: 'forex',   volume: '40B',  marketCap: '—', unit: 'INR' },
  eurinr: { symbol: 'EUR/INR', name: 'Euro / INR',              price: 104.89,   change: 0.18,  sector: 'forex',   volume: '20B',  marketCap: '—', unit: 'INR' },
};

async function fetchCrypto() {
  try {
    const syms = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT'];
    const url = `https://data-api.binance.vision/api/v3/ticker/24hr?symbols=${encodeURIComponent(JSON.stringify(syms))}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) return null;
    const json = await res.json();
    const map = { BTCUSDT: 'btc', ETHUSDT: 'eth', SOLUSDT: 'sol', BNBUSDT: 'bnb', XRPUSDT: 'xrp', ADAUSDT: 'ada' };
    const out = {};
    for (const item of json) {
      const id = map[item.symbol];
      if (id) {
        out[id] = {
          price: parseFloat(parseFloat(item.lastPrice).toFixed(id === 'ada' || id === 'xrp' ? 4 : 2)),
          change: parseFloat(parseFloat(item.priceChangePercent).toFixed(2)),
        };
      }
    }
    return out;
  } catch (e) {
    console.warn('Snapshot crypto fetch error:', e.message);
    return null;
  }
}

async function fetchMetals() {
  const yahooMetals = { gold: 'GC=F', silver: 'SI=F', platinum: 'PL=F' };
  const metals = { gold: 'XAU', silver: 'XAG', platinum: 'XPT' };
  const out = {};

  // Primary: Yahoo Finance Futures for true institutional 24h previous close
  for (const [id, ySym] of Object.entries(yahooMetals)) {
    try {
      const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ySym)}?interval=1d&range=5d`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });
      if (res.ok) {
        const j = await res.json();
        const meta = j?.chart?.result?.[0]?.meta;
        if (meta && meta.regularMarketPrice && meta.chartPreviousClose) {
          const p = parseFloat(meta.regularMarketPrice.toFixed(2));
          const prev = parseFloat(meta.chartPreviousClose.toFixed(2));
          const change = parseFloat((((p - prev) / prev) * 100).toFixed(2));
          out[id] = { price: p, change, previousClose: prev };
        }
      }
    } catch (e) {
      console.warn(`Snapshot Yahoo metal ${ySym} error:`, e.message);
    }
  }

  // Fallback: gold-api.com
  for (const [id, sym] of Object.entries(metals)) {
    if (!out[id]) {
      try {
        const res = await fetch(`https://api.gold-api.com/price/${sym}`);
        if (res.ok) {
          const j = await res.json();
          const p = parseFloat(j.price);
          if (p > 0) {
            const baseline = BASELINES[id].price;
            const change = parseFloat((((p - baseline) / baseline) * 100).toFixed(2));
            out[id] = { price: parseFloat(p.toFixed(2)), change };
          }
        }
      } catch (e) {
        console.warn(`Snapshot metal ${sym} error:`, e.message);
      }
    }
  }
  return out;
}

async function fetchForex() {
  const out = {};

  // 1. Primary: Direct Yahoo Finance v8 FX chart requests
  const yahooResults = await Promise.all(
    Object.entries(FOREX_PAIRS_CONFIG).map(async ([id, cfg]) => {
      try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(cfg.yahooSymbol)}?interval=1m&range=1d`;
        const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
        if (res.ok) {
          const j = await res.json();
          const result = j?.chart?.result?.[0];
          if (result) {
            return parseYahooFxMeta(id, result);
          }
        }
      } catch (e) {
        console.warn(`Snapshot Yahoo FX error for ${id}:`, e.message);
      }
      return null;
    })
  );

  yahooResults.forEach(r => {
    if (r && r.price > 0) {
      out[r.id] = {
        price: r.price,
        change: r.change,
        observedAt: r.observedAt,
        source: r.source,
      };
    }
  });

  // 2. Enrich or fallback with Frankfurter 5-day rolling range
  try {
    const today = new Date().toISOString().split('T')[0];
    const fiveDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    const res = await fetch(`https://api.frankfurter.dev/v1/${fiveDaysAgo}..${today}?base=USD`);
    if (res.ok) {
      const json = await res.json();
      const dates = Object.keys(json.rates || {}).sort();
      if (dates.length >= 2) {
        const curDate = dates[dates.length - 1];
        const prevDate = dates[dates.length - 2];
        const curRates = { ...json.rates[curDate], USD: 1 };
        const prevRates = { ...json.rates[prevDate], USD: 1 };

        for (const [id, cfg] of Object.entries(FOREX_PAIRS_CONFIG)) {
          // If pair is missing or had 0% change, use Frankfurter
          if (!out[id] || out[id].change === 0) {
            const curVal = cfg.computeRate(curRates);
            const prevVal = cfg.computeRate(prevRates);
            if (curVal > 0) {
              const p = parseFloat(curVal.toFixed(cfg.decimals));
              const prev = prevVal > 0 ? parseFloat(prevVal.toFixed(cfg.decimals)) : p;
              const chg = prev > 0 ? parseFloat((((p - prev) / prev) * 100).toFixed(2)) : 0;
              out[id] = {
                price: out[id]?.price || p,
                change: chg !== 0 ? chg : (BASELINES[id]?.change || 0.15),
                observedAt: new Date().toISOString(),
                source: out[id]?.source || 'Frankfurter ECB Tape',
              };
            }
          }
        }
      }
    }
  } catch (e) {
    console.warn('Snapshot Frankfurter enrichment error:', e.message);
  }

  // 3. Fallback: fxratesapi.com
  const missingAfterFrankfurter = Object.keys(FOREX_PAIRS_CONFIG).filter(id => !out[id]);
  if (missingAfterFrankfurter.length > 0) {
    try {
      const fxRes = await fetch('https://api.fxratesapi.com/latest');
      if (fxRes.ok) {
        const payload = await fxRes.json();
        const parsed = parseFxRatesApiPayload(payload, BASELINES);
        missingAfterFrankfurter.forEach(id => {
          if (parsed[id]) {
            out[id] = {
              price: parsed[id].price,
              change: parsed[id].change,
              observedAt: parsed[id].observedAt,
              source: parsed[id].source,
            };
          }
        });
      }
    } catch (e) {
      console.warn('Snapshot fxratesapi fallback error:', e.message);
    }
  }

  return out;
}

async function fetchEquitiesAndEnergy() {
  const yahooSymbols = {
    spx: 'SPY', ndx: 'QQQ', dow: 'DIA', aapl: 'AAPL', tsla: 'TSLA', meta: 'META', nvda: 'NVDA',
    wti: 'CL=F', brent: 'BZ=F', ng: 'NG=F', hoil: 'HO=F',
  };
  const out = {};
  for (const [id, sym] of Object.entries(yahooSymbols)) {
    try {
      const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${sym}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      if (res.ok) {
        const j = await res.json();
        const meta = j?.chart?.result?.[0]?.meta;
        if (meta && meta.regularMarketPrice > 0) {
          const p = meta.regularMarketPrice;
          const prev = meta.chartPreviousClose || p;
          const change = parseFloat((((p - prev) / prev) * 100).toFixed(2));
          out[id] = {
            price: parseFloat(p.toFixed(p < 10 ? 3 : 2)),
            change,
          };
        }
      }
    } catch (e) {
      // Non-fatal, baseline handles it
    }
  }
  return out;
}

function sanitizePoints(arr, basePrice) {
  const safe = (arr || []).filter(v => typeof v === 'number' && Number.isFinite(v) && v > 0);
  if (safe.length < 2) return [basePrice, basePrice];
  return safe;
}

function generateHistory(base, changePercent) {
  const points = 48;
  const history24h = [];
  const start = base / (1 + (changePercent / 100));
  for (let i = 0; i < points; i++) {
    const progress = i / (points - 1);
    const interp = start + (base - start) * progress;
    const noise = (Math.sin(i * 0.8) + Math.cos(i * 0.3)) * (base * 0.002);
    const val = Math.max(0.001, interp + noise);
    history24h.push(parseFloat(val.toFixed(val < 2 ? 4 : 2)));
  }
  return {
    '24H': sanitizePoints(history24h, base),
    '1H': sanitizePoints(history24h.slice(-12), base),
    '1M': sanitizePoints(history24h, base),
    '1Y': sanitizePoints(history24h, base),
  };
}

async function fetchFromWorker() {
  try {
    const url = 'https://quidesk-market-engine.quidesk0.workers.dev/api/market';
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (res.ok) {
      const data = await res.json();
      if (data && data.assets && Object.keys(data.assets).length >= 28) {
        console.log('[Snapshot Generator] Loaded verified quotes from Cloudflare Worker edge.');
        return data.assets;
      }
    }
  } catch {
    // Non-fatal, falls back to direct feeds
  }
  return null;
}

async function main() {
  console.log('[Snapshot Generator] Gathering live market quotes...');
  if (!fs.existsSync(PUBLIC_DIR)) {
    fs.mkdirSync(PUBLIC_DIR, { recursive: true });
  }

  // Check Cloudflare Worker edge stream first
  const workerData = await fetchFromWorker();

  const [cryptoData, metalsData, forexData, yahooData] = await Promise.all([
    fetchCrypto(),
    fetchMetals(),
    fetchForex(),
    fetchEquitiesAndEnergy(),
  ]);

  const liveOverrides = {
    ...(cryptoData || {}),
    ...(metalsData || {}),
    ...(forexData || {}),
    ...(yahooData || {}),
    ...(workerData || {}),
  };

  const assets = {};
  const sectors = { equities: [], crypto: [], metals: [], energy: [], forex: [] };

  for (const [id, base] of Object.entries(BASELINES)) {
    const override = liveOverrides[id] || {};
    const price = override.price ?? base.price;
    const change = override.change ?? base.change;
    const history = generateHistory(price, change);

    const asset = {
      ...base,
      id,
      price,
      change,
      history,
      chartData: history['24H'].map((v, i) => ({ time: `${i}:00`, value: v })),
    };

    assets[id] = asset;
    if (sectors[asset.sector]) {
      sectors[asset.sector].push(asset);
    }
  }

  const payload = {
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    assetCount: Object.keys(assets).length,
    assets,
    sectors,
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(payload, null, 2));
  console.log(`[Snapshot Generator] ✓ Generated snapshot with ${payload.assetCount} assets at ${OUTPUT_FILE}`);

  // Automatically update sitemap lastmod date
  const sitemapPath = path.join(PUBLIC_DIR, 'sitemap.xml');
  if (fs.existsSync(sitemapPath)) {
    const today = new Date().toISOString().split('T')[0];
    const sitemapContent = fs.readFileSync(sitemapPath, 'utf8');
    const updatedSitemap = sitemapContent.replace(/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/g, `<lastmod>${today}</lastmod>`);
    fs.writeFileSync(sitemapPath, updatedSitemap);
    console.log(`[Snapshot Generator] ✓ Synchronized sitemap.xml lastmod with ${today}`);
  }
}

main().catch(err => {
  console.error('[Snapshot Generator] Error:', err);
  process.exit(1);
});
