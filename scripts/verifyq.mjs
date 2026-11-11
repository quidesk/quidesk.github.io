#!/usr/bin/env node
/**
 * VerifyQ — High-Resolution Quidesk Visual Snapshot & Real-Time Market Auditor
 * 
 * Capabilities:
 *  1. Captures full-page, 4K/Retina ultra-high-resolution snapshots (3840px wide).
 *  2. Evaluates the live DOM to extract all displayed asset prices and percentage changes.
 *  3. Ingests authoritative real-time market feeds (Yahoo Finance continuous tape, Binance Vision, Gold-API).
 *  4. Enforces strict quote orientations (direct USD/JPY, USD/CHF vs indirect NZD/USD, EUR/USD).
 *  5. Validates currency formatting rules (unitless Forex, bans '$' prefix, 2 vs 4 decimals).
 *  6. Executes calibrated multi-tier drift checks (Forex <= 0.25%, Equities/Energy <= 0.50%, Crypto/Metals <= 1.00%).
 *  7. Validates mathematical cross-currency triangulation (GBP/JPY, EUR/JPY, EUR/GBP, EUR/INR).
 *  8. Emits formatted ASCII audit tables, machine-readable JSON reports, and mirrors to artifacts.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer-core';
import { FOREX_PAIRS_CONFIG, formatForexRate } from '../src/utils/forexHelpers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const SNAPSHOTS_DIR = path.join(ROOT_DIR, 'snapshots');

// ─── Calibrated Tolerance Matrix ───────────────────────────────────────────
const TOLERANCE_MATRIX = {
  forex:    0.25, // Interbank FX continuous tape spread (0.25%)
  equities: 0.50, // Major US equity ETFs & mega-caps intraday movement (0.50%)
  energy:   0.50, // NYMEX / ICE continuous energy futures (0.50%)
  metals:   1.00, // Physical bullion spot trading (1.00%)
  crypto:   1.00, // Crypto spot exchange tick volatility (1.00%)
};

// Find Chromium / Edge executable
function getBrowserExecutable() {
  const edgePaths = [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    process.env.CHROME_PATH,
    process.env.EDGE_PATH,
  ].filter(Boolean);

  for (const p of edgePaths) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('No compatible browser executable found (msedge.exe or chrome.exe). Please install Edge or Chrome.');
}

// ─── Target Resolution ─────────────────────────────────────────────────────
async function resolveTargetUrl(options) {
  if (options.url) return options.url;
  if (options.local) {
    // Probe 4173 then 5173
    for (const port of [4173, 5173]) {
      try {
        const testUrl = `http://localhost:${port}/`;
        const res = await fetch(testUrl, { signal: AbortSignal.timeout(1200) });
        if (res.ok) return testUrl;
      } catch {
        // continue
      }
    }
    return 'http://localhost:4173/';
  }
  if (options.remote) {
    return 'https://quidesk.github.io/';
  }

  // Auto-probe: local preview -> local dev -> remote production
  for (const port of [4173, 5173]) {
    try {
      const testUrl = `http://localhost:${port}/`;
      const res = await fetch(testUrl, { signal: AbortSignal.timeout(1200) });
      if (res.ok) {
        console.log(`[VerifyQ] Auto-detected local server at: ${testUrl}`);
        return testUrl;
      }
    } catch {
      // continue
    }
  }

  return 'https://quidesk.github.io/';
}

// ─── Authoritative Real-Time Data Fetchers ─────────────────────────────────

// 1. Binance 24hr Ticker (Sub-second live crypto spot)
async function fetchLiveCrypto() {
  const symbolMap = {
    BTCUSDT: 'BTC',
    ETHUSDT: 'ETH',
    SOLUSDT: 'SOL',
    BNBUSDT: 'BNB',
    XRPUSDT: 'XRP',
    ADAUSDT: 'ADA',
  };
  const syms = Object.keys(symbolMap);
  const url = `https://data-api.binance.vision/api/v3/ticker/24hr?symbols=${encodeURIComponent(JSON.stringify(syms))}`;
  
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`Binance HTTP ${res.status}`);
  const data = await res.json();

  const out = {};
  for (const item of data) {
    const s = symbolMap[item.symbol];
    if (s) {
      const p = parseFloat(item.lastPrice);
      out[s] = {
        symbol: s,
        category: 'crypto',
        source: 'Binance Live Spot Stream',
        price: parseFloat(p.toFixed(s === 'ADA' || s === 'XRP' ? 4 : 2)),
        changePercent: parseFloat(parseFloat(item.priceChangePercent).toFixed(2)),
        volume: item.quoteVolume,
        timestamp: new Date().toISOString()
      };
    }
  }
  return out;
}

// 2. Physical Bullion Spot (api.gold-api.com)
async function fetchLiveMetals() {
  const metalMap = {
    'GOLD': 'XAU',
    'SILVER': 'XAG',
    'PLATINUM': 'XPT',
    'XAU/USD': 'XAU',
    'XAG/USD': 'XAG',
    'XPT/USD': 'XPT'
  };
  const out = {};

  for (const [sym, code] of Object.entries(metalMap)) {
    try {
      const res = await fetch(`https://api.gold-api.com/price/${code}`, { signal: AbortSignal.timeout(8000) });
      if (res.ok) {
        const d = await res.json();
        out[sym] = {
          symbol: sym,
          category: 'metals',
          source: 'Gold-API Bullion Spot',
          price: parseFloat(d.price.toFixed(2)),
          timestamp: d.updatedAt || new Date().toISOString()
        };
      }
    } catch (e) {
      console.warn(`[VerifyQ] Error fetching metal ${sym}:`, e.message);
    }
  }
  return out;
}

// 3. Equities, Energy Futures & Continuous Forex Tape (Yahoo Finance v8 Chart API)
async function fetchLiveYahooAssets() {
  const equitiesAndEnergy = {
    // Equities
    SPY: { yahoo: 'SPY', cat: 'equities' },
    QQQ: { yahoo: 'QQQ', cat: 'equities' },
    DIA: { yahoo: 'DIA', cat: 'equities' },
    AAPL: { yahoo: 'AAPL', cat: 'equities' },
    TSLA: { yahoo: 'TSLA', cat: 'equities' },
    META: { yahoo: 'META', cat: 'equities' },
    NVDA: { yahoo: 'NVDA', cat: 'equities' },
    // Energy Futures
    WTI: { yahoo: 'CL=F', cat: 'energy' },
    BRENT: { yahoo: 'BZ=F', cat: 'energy' },
    NGAS: { yahoo: 'NG=F', cat: 'energy' },
    HOIL: { yahoo: 'HO=F', cat: 'energy' },
  };

  const out = {};

  // Fetch Equities & Energy
  await Promise.all(
    Object.entries(equitiesAndEnergy).map(async ([key, info]) => {
      try {
        const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(info.yahoo)}`, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          signal: AbortSignal.timeout(8000)
        });
        if (!res.ok) return;
        const data = await res.json();
        const meta = data?.chart?.result?.[0]?.meta;
        if (meta && typeof meta.regularMarketPrice === 'number' && meta.regularMarketPrice > 0) {
          const p = meta.regularMarketPrice;
          const prev = meta.chartPreviousClose || p;
          const chg = prev > 0 ? ((p - prev) / prev) * 100 : 0;
          out[key] = {
            symbol: key,
            category: info.cat,
            source: 'Yahoo Finance v8 Tape',
            price: parseFloat(p.toFixed(2)),
            prevClose: parseFloat(prev.toFixed(2)),
            changePercent: parseFloat(chg.toFixed(2)),
            timestamp: new Date(meta.regularMarketTime ? meta.regularMarketTime * 1000 : Date.now()).toISOString()
          };
        }
      } catch (e) {
        console.warn(`[VerifyQ] Error fetching Yahoo ${key} (${info.yahoo}):`, e.message);
      }
    })
  );

  // Fetch Continuous Forex Tape via Yahoo Finance Currency Pairs
  await Promise.all(
    Object.entries(FOREX_PAIRS_CONFIG).map(async ([id, cfg]) => {
      try {
        const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(cfg.yahooSymbol)}`, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          signal: AbortSignal.timeout(8000)
        });
        if (!res.ok) return;
        const data = await res.json();
        const meta = data?.chart?.result?.[0]?.meta;
        if (meta && typeof meta.regularMarketPrice === 'number' && meta.regularMarketPrice > 0) {
          const rawPrice = meta.regularMarketPrice;
          const prev = meta.chartPreviousClose || rawPrice;
          const chg = prev > 0 ? ((rawPrice - prev) / prev) * 100 : 0;
          const roundedPrice = parseFloat(rawPrice.toFixed(cfg.decimals));

          out[cfg.symbol] = {
            symbol: cfg.symbol,
            category: 'forex',
            source: 'Yahoo Finance FX Tape',
            price: roundedPrice,
            prevClose: parseFloat(prev.toFixed(cfg.decimals)),
            changePercent: parseFloat(chg.toFixed(2)),
            orientation: cfg.orientation,
            decimals: cfg.decimals,
            timestamp: new Date(meta.regularMarketTime ? meta.regularMarketTime * 1000 : Date.now()).toISOString()
          };
        }
      } catch (e) {
        console.warn(`[VerifyQ] Error fetching FX ${cfg.symbol} (${cfg.yahooSymbol}):`, e.message);
      }
    })
  );

  // Fallback: If any FX pair failed on Yahoo, query fxratesapi.com
  const missingFx = Object.values(FOREX_PAIRS_CONFIG).filter(cfg => !out[cfg.symbol]);
  if (missingFx.length > 0) {
    try {
      const res = await fetch('https://api.fxratesapi.com/latest', { signal: AbortSignal.timeout(8000) });
      if (res.ok) {
        const j = await res.json();
        if (j.rates) {
          for (const cfg of missingFx) {
            const calculated = cfg.computeRate(j.rates);
            if (typeof calculated === 'number' && calculated > 0) {
              out[cfg.symbol] = {
                symbol: cfg.symbol,
                category: 'forex',
                source: 'FxRatesAPI Fallback Feed',
                price: parseFloat(calculated.toFixed(cfg.decimals)),
                changePercent: 0.0,
                orientation: cfg.orientation,
                decimals: cfg.decimals,
                timestamp: j.date || new Date().toISOString()
              };
            }
          }
        }
      }
    } catch {
      // continue
    }
  }

  return out;
}

// ─── DOM Parsing & Formatting Validation ───────────────────────────────────

function parseExtractedPrice(rawText, symbol) {
  if (!rawText) return { value: null, hasCurrencyPrefix: false, formatError: null };
  const firstLine = rawText.split('\n')[0].trim();
  
  // Check if starts with currency symbol
  const hasCurrencyPrefix = /^[$,CFr£¥₹]/.test(firstLine);

  // Strip units like /oz, /bbl, /CAD, /CHF, /USD, /MMBtu, /gal, /INR, /JPY, /GBP
  const withoutUnit = firstLine.replace(/\/[a-zA-Z]+/g, '').trim();
  const numericOnly = withoutUnit.replace(/[$,CFr£¥₹\s]/g, '').replace(/,/g, '');
  const val = parseFloat(numericOnly);

  const isForex = symbol.includes('/') && !symbol.includes('XAU') && !symbol.includes('XAG') && !symbol.includes('XPT');
  const isForexInr = isForex && (symbol.endsWith('INR') || symbol.endsWith('/INR'));
  let formatError = null;

  if (isForex && hasCurrencyPrefix && !isForexInr) {
    formatError = `Forex rate has forbidden currency prefix in '${firstLine}' (must be unitless)`;
  }

  return {
    value: isNaN(val) ? null : val,
    hasCurrencyPrefix,
    rawText: firstLine,
    formatError
  };
}

function parseExtractedChange(rawBadge) {
  if (!rawBadge) return null;
  const clean = rawBadge.replace(/[▲▼%\s+]/g, '').trim();
  const val = parseFloat(clean);
  if (isNaN(val)) return null;
  return rawBadge.includes('▼') || rawBadge.includes('-') ? -Math.abs(val) : Math.abs(val);
}

// ─── Cross-Currency Triangulation Verification ─────────────────────────────
function verifyTriangulation(quotes) {
  const results = [];
  const checks = [
    {
      pair: 'GBP/JPY',
      formula: 'GBP/USD * USD/JPY',
      calc: (q) => (q['GBP/USD'] && q['USD/JPY'] ? q['GBP/USD'].price * q['USD/JPY'].price : null),
      decimals: 2
    },
    {
      pair: 'EUR/JPY',
      formula: 'EUR/USD * USD/JPY',
      calc: (q) => (q['EUR/USD'] && q['USD/JPY'] ? q['EUR/USD'].price * q['USD/JPY'].price : null),
      decimals: 2
    },
    {
      pair: 'EUR/GBP',
      formula: 'EUR/USD / GBP/USD',
      calc: (q) => (q['EUR/USD'] && q['GBP/USD'] ? q['EUR/USD'].price / q['GBP/USD'].price : null),
      decimals: 4
    },
    {
      pair: 'EUR/INR',
      formula: 'EUR/USD * USD/INR',
      calc: (q) => (q['EUR/USD'] && q['USD/INR'] ? q['EUR/USD'].price * q['USD/INR'].price : null),
      decimals: 2
    }
  ];

  for (const c of checks) {
    const actual = quotes[c.pair]?.price;
    const theoretical = c.calc(quotes);
    if (actual && theoretical) {
      const diff = Math.abs(actual - theoretical);
      const diffPct = (diff / theoretical) * 100;
      const pass = diffPct <= 0.35; // 0.35% theoretical arbitrage bound
      results.push({
        pair: c.pair,
        formula: c.formula,
        actual: parseFloat(actual.toFixed(c.decimals)),
        theoretical: parseFloat(theoretical.toFixed(c.decimals)),
        driftPct: parseFloat(diffPct.toFixed(3)),
        status: pass ? 'VALID' : 'ARBITRAGE SPREAD'
      });
    }
  }

  return results;
}

// ─── Main Execution Workflow ───────────────────────────────────────────────

export async function runVerifyQ(options = {}) {
  const {
    outputDir = SNAPSHOTS_DIR,
    scaleFactor = 2,
    artifactDir = null,
    skipSnapshot: rawSkipSnapshot = false,
    skipVerify = false,
    snapshotFile: explicitSnapshotFile = null,
    image: inputImage = null,
    noBrowser = false,
  } = options;

  let skipSnapshot = rawSkipSnapshot;

  console.log('═══════════════════════════════════════════════════════════════════════════════');
  console.log('       VerifyQ — Quidesk Visual Snapshot & Multi-Tier Market Auditor           ');
  console.log('═══════════════════════════════════════════════════════════════════════════════');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  let displayedAssets = [];
  let capturedSnapshotPath = null;
  let artifactSnapshotPath = null;

  // Process user-provided screenshot if supplied (DO NOT TAKE SCREENSHOT)
  if (inputImage) {
    if (fs.existsSync(inputImage)) {
      skipSnapshot = true;
      console.log(`[VerifyQ] Using user-provided screenshot: ${inputImage}`);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      capturedSnapshotPath = path.join(outputDir, `quidesk-snapshot-${timestamp}.png`);
      const latestFile = path.join(outputDir, 'quidesk-latest.png');

      try {
        const { Jimp } = await import('jimp');
        const img = await Jimp.read(inputImage);
        await img.write(capturedSnapshotPath);
        await img.write(latestFile);
        const stats = fs.statSync(capturedSnapshotPath);
        console.log(`[VerifyQ] ✓ Provided screenshot converted & saved: ${capturedSnapshotPath} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);

        if (artifactDir && fs.existsSync(artifactDir)) {
          artifactSnapshotPath = path.join(artifactDir, 'quidesk-verified-snapshot.png');
          await img.write(artifactSnapshotPath);
          console.log(`[VerifyQ] ✓ Screenshot mirrored to Artifact Directory: ${artifactSnapshotPath}`);
        }
      } catch (err) {
        fs.copyFileSync(inputImage, capturedSnapshotPath);
        fs.copyFileSync(inputImage, latestFile);
        console.log(`[VerifyQ] ✓ Screenshot copied to: ${capturedSnapshotPath}`);
        if (artifactDir && fs.existsSync(artifactDir)) {
          artifactSnapshotPath = path.join(artifactDir, 'quidesk-verified-snapshot.png');
          fs.copyFileSync(inputImage, artifactSnapshotPath);
          console.log(`[VerifyQ] ✓ Screenshot mirrored to Artifact Directory: ${artifactSnapshotPath}`);
        }
      }
    } else {
      console.warn(`[VerifyQ] Warning: Specified image file does not exist: ${inputImage}`);
    }
  }

  // Determine source of displayed assets
  const snapshotSource = explicitSnapshotFile || (noBrowser ? path.join(ROOT_DIR, 'public', 'market-snapshot.json') : null);

  // Mode A: Load directly from snapshot JSON file if provided or in no-browser mode
  if (snapshotSource) {
    console.log(`[VerifyQ] Loading pre-rendered snapshot from: ${snapshotSource}`);
    const raw = fs.readFileSync(path.resolve(snapshotSource), 'utf-8');
    const snapshotJson = JSON.parse(raw);
    const assetList = snapshotJson.assets || {};
    displayedAssets = Object.values(assetList).map(a => {
      const isForex = a.sector === 'forex' || (a.symbol && a.symbol.includes('/') && !a.symbol.startsWith('XAU') && !a.symbol.startsWith('XAG') && !a.symbol.startsWith('XPT'));
      const isJPYorINR = a.symbol && (a.symbol.includes('JPY') || a.symbol.includes('INR'));
      const isSubDollarCrypto = a.sector === 'crypto' && a.price < 1;
      const formatted = isForex
        ? a.price.toFixed(isJPYorINR ? 2 : 4)
        : `$${a.price.toFixed(isSubDollarCrypto ? 4 : 2)}`;
      return {
        symbol: a.symbol,
        badge: `${a.change >= 0 ? '▲ +' : '▼ '}${a.change.toFixed(2)}%`,
        rawPriceText: formatted,
        category: a.sector || (isForex ? 'forex' : 'equities')
      };
    });
    console.log(`[VerifyQ] Loaded ${displayedAssets.length} assets from snapshot file.`);
  } else {
    // Mode B: Launch Puppeteer to capture high-res snapshot and extract live DOM
    const url = await resolveTargetUrl(options);
    console.log(`Target URL:       ${url}`);
    console.log(`Resolution DPR:   ${scaleFactor}x (Ultra-HD 3840px crisp capture)`);
    console.log(`Output Directory: ${outputDir}`);
    console.log(`Timestamp:        ${new Date().toISOString()}`);
    console.log('───────────────────────────────────────────────────────────────────────────────');

    let browser = null;
    try {
      const execPath = getBrowserExecutable();
      console.log(`[VerifyQ] Browser engine: ${execPath}`);

      browser = await puppeteer.launch({
        executablePath: execPath,
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--hide-scrollbars',
          '--font-render-hinting=none',
          `--force-device-scale-factor=${scaleFactor}`
        ]
      });

      const page = await browser.newPage();
      await page.setViewport({
        width: 1920,
        height: 1080,
        deviceScaleFactor: scaleFactor
      });

      console.log(`[VerifyQ] Navigating to ${url}...`);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 35000 });

      // Wait for market cards and React hydration
      try {
        await page.waitForSelector('.card', { timeout: 15000 });
      } catch (e) {
        console.warn(`[VerifyQ] Card selector notice: ${e.message}`);
      }

      console.log('[VerifyQ] Waiting 5.5s for WebSocket & REST feeds to hydrate...');
      await new Promise(r => setTimeout(r, 5500));

      // Extract displayed asset values from the live DOM
      displayedAssets = await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('.card'));
        const items = [];

        cards.forEach(card => {
          const symEl = card.querySelector('span[style*="var(--font-display)"], span[style*="font-display"]');
          const symbol = symEl?.innerText?.trim();
          if (!symbol) return;

          const badgeEl = card.querySelector('.badge');
          const badge = badgeEl?.innerText?.trim() || '';

          const priceEl = card.querySelector('div[style*="var(--font-mono)"], div[style*="font-mono"]');
          const rawPriceText = priceEl?.innerText?.trim() || '';

          // Determine category from card structure or parent section
          let category = 'unknown';
          const header = card.closest('section')?.querySelector('h2, h3')?.innerText?.toLowerCase() || '';
          if (header.includes('crypto')) category = 'crypto';
          else if (header.includes('metal')) category = 'metals';
          else if (header.includes('energy')) category = 'energy';
          else if (header.includes('forex') || header.includes('currencies')) category = 'forex';
          else if (header.includes('equities') || header.includes('stocks')) category = 'equities';
          else if (symbol.includes('/')) category = 'forex';

          items.push({
            symbol,
            badge,
            rawPriceText,
            category
          });
        });

        return items;
      });

      console.log(`[VerifyQ] Extracted ${displayedAssets.length} displayed asset cards from live DOM.`);

      // Capture Full Page High-Resolution Snapshot
      if (!skipSnapshot) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        capturedSnapshotPath = path.join(outputDir, `quidesk-snapshot-${timestamp}.png`);
        const latestFile = path.join(outputDir, 'quidesk-latest.png');

        console.log('[VerifyQ] Capturing 4K ultra-high-resolution full-page screenshot...');
        await page.screenshot({
          path: capturedSnapshotPath,
          fullPage: true,
          type: 'png'
        });

        fs.copyFileSync(capturedSnapshotPath, latestFile);
        const stats = fs.statSync(capturedSnapshotPath);
        console.log(`[VerifyQ] ✓ High-resolution snapshot saved: ${capturedSnapshotPath} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);

        if (artifactDir && fs.existsSync(artifactDir)) {
          artifactSnapshotPath = path.join(artifactDir, 'quidesk-verified-snapshot.png');
          fs.copyFileSync(capturedSnapshotPath, artifactSnapshotPath);
          console.log(`[VerifyQ] ✓ Snapshot mirrored to Artifact Directory: ${artifactSnapshotPath}`);
        }
      }
    } catch (err) {
      console.error('[VerifyQ] Browser / Snapshot error:', err.message);
    } finally {
      if (browser) await browser.close();
    }
  }

  if (skipVerify) {
    console.log('[VerifyQ] --snapshot-only mode: Verification skipped.');
    return { snapshot: capturedSnapshotPath };
  }

  // ─── Query Authoritative Ground-Truth Feeds ──────────────────────────────
  console.log('\n[VerifyQ] Querying authoritative live market feeds...');
  const [cryptoData, metalsData, yahooData] = await Promise.all([
    fetchLiveCrypto().catch(e => { console.warn('Crypto error:', e.message); return {}; }),
    fetchLiveMetals().catch(e => { console.warn('Metals error:', e.message); return {}; }),
    fetchLiveYahooAssets().catch(e => { console.warn('Yahoo error:', e.message); return {}; }),
  ]);

  const verifiedMarket = {
    ...cryptoData,
    ...metalsData,
    ...yahooData,
  };

  console.log(`[VerifyQ] Ingested ${Object.keys(verifiedMarket).length} real-time ground-truth asset quotes.`);

  // ─── Mathematical Discrepancy & Verification Analysis ─────────────────────
  const auditResults = [];
  const fixesNeeded = [];
  let formatViolationsCount = 0;

  for (const item of displayedAssets) {
    const symbol = item.symbol;
    const parsed = parseExtractedPrice(item.rawPriceText, symbol);
    const dispPrice = parsed.value;
    const dispChange = parseExtractedChange(item.badge);

    const liveAsset = verifiedMarket[symbol];
    const category = liveAsset?.category || item.category || 'equities';
    const tolerance = TOLERANCE_MATRIX[category] || 0.50;

    let deltaPrice = null;
    let percentError = null;
    let status = 'VERIFIED MATCH';
    let rootCause = null;

    if (parsed.formatError) {
      status = 'FORMAT VIOLATION';
      rootCause = parsed.formatError;
      formatViolationsCount++;
    }

    if (!liveAsset) {
      auditResults.push({
        symbol,
        category,
        displayedPrice: dispPrice,
        displayedChange: dispChange,
        livePrice: null,
        liveChange: null,
        deltaPrice: null,
        percentError: null,
        tolerance,
        status: status === 'FORMAT VIOLATION' ? status : 'UNVERIFIED (NO FEED)',
        note: 'No direct ground-truth quote feed available',
        rootCause
      });
      continue;
    }

    const livePrice = liveAsset.price;
    const liveChange = liveAsset.changePercent ?? null;

    if (typeof dispPrice === 'number' && typeof livePrice === 'number' && livePrice > 0) {
      deltaPrice = parseFloat((dispPrice - livePrice).toFixed(4));
      percentError = parseFloat(((Math.abs(deltaPrice) / livePrice) * 100).toFixed(3));

      const isSignMismatch = (dispChange !== null && liveChange !== null &&
        Math.sign(dispChange) !== Math.sign(liveChange) &&
        Math.abs(dispChange - liveChange) > 0.80);

      if (status !== 'FORMAT VIOLATION') {
        if (percentError > tolerance * 1.5 || (isSignMismatch && category !== 'crypto')) {
          status = 'FIX NEEDED';
          if (isSignMismatch && percentError <= tolerance) {
            rootCause = `Trend direction mismatch: displayed ${dispChange}% vs ground-truth ${liveChange}%`;
          } else if (category === 'forex') {
            rootCause = `Forex rate ${dispPrice} drifted ${percentError}% from live continuous tape ${livePrice} (Tol: ${tolerance}%)`;
          } else if (['SPY', 'QQQ', 'DIA', 'AAPL', 'TSLA', 'META', 'NVDA'].includes(symbol)) {
            rootCause = `Equity ${dispPrice} drifted ${percentError}% from Yahoo tape (Tol: ${tolerance}%)`;
          } else if (['WTI', 'BRENT', 'HOIL', 'NGAS'].includes(symbol)) {
            rootCause = `Energy continuous contract ${dispPrice} drifted ${percentError}% from NYMEX/ICE tape`;
          } else {
            rootCause = `Price variance ${percentError}% exceeds allowable tolerance (${tolerance}%)`;
          }
        } else if (percentError > tolerance) {
          status = 'ACCEPTABLE DRIFT';
        }
      }
    }

    const row = {
      symbol,
      category,
      displayedPrice: dispPrice,
      livePrice,
      deltaPrice,
      percentError,
      tolerance,
      displayedChange: dispChange,
      liveChange,
      status,
      source: liveAsset.source,
      rootCause
    };

    auditResults.push(row);
    if (status === 'FIX NEEDED' || status === 'FORMAT VIOLATION') {
      fixesNeeded.push(row);
    }
  }

  // ─── Cross-Currency Triangulation Check ──────────────────────────────────
  const triangulationResults = verifyTriangulation(verifiedMarket);

  // ─── Format Audit Output Tables ──────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════════════════════════════════════════════════════');
  console.log('                                 VERIFYQ MULTI-TIER ACCURACY AUDIT REPORT                                  ');
  console.log('═══════════════════════════════════════════════════════════════════════════════════════════════════════════');
  console.log('SYMBOL      SECTOR     DISPLAYED         GROUND TRUTH      DRIFT %     TOL%     DISP CHG%  LIVE CHG%  STATUS');
  console.log('───────────────────────────────────────────────────────────────────────────────────────────────────────────');

  auditResults.forEach(r => {
    const sym = r.symbol.padEnd(11);
    const sec = r.category.padEnd(10);
    const isFx = r.category === 'forex';
    const isJPYorINR = r.symbol.includes('JPY') || r.symbol.includes('INR');

    const fmtPrice = (p) => {
      if (p === null || p === undefined) return 'N/A';
      return isFx
        ? p.toFixed(isJPYorINR ? 2 : 4)
        : `$${p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const dp = fmtPrice(r.displayedPrice).padEnd(17);
    const lp = fmtPrice(r.livePrice).padEnd(17);
    const err = (r.percentError !== null ? `${r.percentError.toFixed(3)}%` : 'N/A').padEnd(11);
    const tol = `${r.tolerance.toFixed(2)}%`.padEnd(8);
    const dc = (r.displayedChange !== null ? `${r.displayedChange >= 0 ? '+' : ''}${r.displayedChange.toFixed(2)}%` : 'N/A').padEnd(10);
    const lc = (r.liveChange !== null ? `${r.liveChange >= 0 ? '+' : ''}${r.liveChange.toFixed(2)}%` : 'N/A').padEnd(10);
    const st = r.status;
    console.log(`${sym} ${sec} ${dp} ${lp} ${err} ${tol} ${dc} ${lc} ${st}`);
  });

  console.log('───────────────────────────────────────────────────────────────────────────────────────────────────────────');

  // Print Triangulation Results
  if (triangulationResults.length > 0) {
    console.log('\n─── CROSS-CURRENCY TRIANGULATION INTEGRITY (ARBITRAGE SPREAD <= 0.35%) ───');
    triangulationResults.forEach(t => {
      console.log(`  ${t.pair.padEnd(9)} Formula: ${t.formula.padEnd(20)} Actual: ${t.actual} | Theoretical: ${t.theoretical} | Drift: ${t.driftPct}% [${t.status}]`);
    });
    console.log('');
  }

  const passedCount = auditResults.filter(r => r.status === 'VERIFIED MATCH').length;
  const acceptableCount = auditResults.filter(r => r.status === 'ACCEPTABLE DRIFT').length;

  console.log(`Total Assets Audited:   ${auditResults.length}`);
  console.log(`Strict Verified Matches: ${passedCount}`);
  console.log(`Acceptable Drift:       ${acceptableCount}`);
  console.log(`Format Violations:      ${formatViolationsCount}`);
  console.log(`Fixes Needed:           ${fixesNeeded.length}`);
  console.log('═══════════════════════════════════════════════════════════════════════════════════════════════════════════\n');

  if (fixesNeeded.length > 0) {
    console.log('⚠️  ASSETS REQUIRING ATTENTION:');
    fixesNeeded.forEach((f, idx) => {
      console.log(` [${idx + 1}] ${f.symbol} (${f.category}): Disp ${f.displayedPrice} vs Live ${f.livePrice} | Drift: ${f.percentError}% (Tol: ${f.tolerance}%)`);
      if (f.rootCause) console.log(`     Cause: ${f.rootCause}`);
    });
    console.log('');
  }

  // Write JSON Audit Log
  const reportPayload = {
    timestamp: new Date().toISOString(),
    toleranceMatrix: TOLERANCE_MATRIX,
    snapshot: capturedSnapshotPath,
    artifactSnapshot: artifactSnapshotPath,
    summary: {
      totalAudited: auditResults.length,
      verifiedMatches: passedCount,
      acceptableDrift: acceptableCount,
      formatViolations: formatViolationsCount,
      fixesNeeded: fixesNeeded.length
    },
    triangulation: triangulationResults,
    fixesNeeded,
    auditResults
  };

  const reportJsonPath = path.join(outputDir, 'verifyq-report.json');
  fs.writeFileSync(reportJsonPath, JSON.stringify(reportPayload, null, 2));
  console.log(`[VerifyQ] Machine-readable audit report saved to: ${reportJsonPath}`);

  if (artifactDir && fs.existsSync(artifactDir)) {
    const artifactJsonPath = path.join(artifactDir, 'verifyq-report.json');
    fs.writeFileSync(artifactJsonPath, JSON.stringify(reportPayload, null, 2));
    console.log(`[VerifyQ] Machine-readable audit report mirrored to: ${artifactJsonPath}`);
  }

  return reportPayload;
}

// ─── CLI Argument Parsing ──────────────────────────────────────────────────
const isDirectCall = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isDirectCall) {
  const args = process.argv.slice(2);
  const options = {
    skipSnapshot: args.includes('--verify-only'),
    skipVerify: args.includes('--snapshot-only'),
    local: args.includes('--local'),
    remote: args.includes('--remote'),
    noBrowser: args.includes('--no-browser'),
  };

  const urlIdx = args.indexOf('--url');
  if (urlIdx !== -1 && args[urlIdx + 1]) {
    options.url = args[urlIdx + 1];
  }

  const snapshotIdx = args.indexOf('--snapshot');
  if (snapshotIdx !== -1 && args[snapshotIdx + 1]) {
    options.snapshotFile = args[snapshotIdx + 1];
  }

  const imageIdx = args.indexOf('--image');
  if (imageIdx !== -1 && args[imageIdx + 1]) {
    options.image = args[imageIdx + 1];
  }

  const artifactIdx = args.indexOf('--artifact-dir');
  if (artifactIdx !== -1 && args[artifactIdx + 1]) {
    options.artifactDir = args[artifactIdx + 1];
  }

  runVerifyQ(options).catch(err => {
    console.error('[VerifyQ] Fatal execution failure:', err);
    process.exit(1);
  });
}
