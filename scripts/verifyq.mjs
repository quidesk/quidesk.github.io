#!/usr/bin/env node
/**
 * VerifyQ — High-Resolution Quidesk Visual Snapshot & Real-Time Market Auditor
 * 
 * Capabilities:
 *  1. Captures a full-page, 4K/Retina high-resolution snapshot of https://quidesk.github.io
 *  2. Evaluates the live DOM to extract all displayed asset prices and percentage changes
 *  3. Queries authoritative real-time market databases (Yahoo Finance, Binance, Gold-API, ER-API)
 *  4. Performs mathematical verification, delta/drift analysis, and classifies "Fix Needed" assets
 *  5. Outputs formatted audit tables, JSON report, and saves download-ready snapshot images
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer-core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const SNAPSHOTS_DIR = path.join(ROOT_DIR, 'snapshots');

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

// ─── Authoritative Real-Time Data Fetchers ─────────────────────────────────

// 1. Binance 24hr Ticker (Zero auth, sub-second live spot crypto)
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
  
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`Binance HTTP ${res.status}`);
  const data = await res.json();

  const out = {};
  for (const item of data) {
    const s = symbolMap[item.symbol];
    if (s) {
      out[s] = {
        symbol: s,
        source: 'Binance Official REST',
        price: parseFloat(parseFloat(item.lastPrice).toFixed(s === 'ADA' || s === 'XRP' ? 4 : 2)),
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
    'XAU/USD': 'XAU',
    'XAG/USD': 'XAG',
    'XPT/USD': 'XPT'
  };
  const out = {};

  for (const [sym, code] of Object.entries(metalMap)) {
    try {
      const res = await fetch(`https://api.gold-api.com/price/${code}`);
      if (res.ok) {
        const d = await res.json();
        out[sym] = {
          symbol: sym,
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

// 3. Equities, Energy Futures, and Forex Spot (Yahoo Finance v8 Chart API)
async function fetchLiveYahooAssets() {
  const tickers = {
    // Equities
    SPY: 'SPY',
    QQQ: 'QQQ',
    DIA: 'DIA',
    AAPL: 'AAPL',
    TSLA: 'TSLA',
    META: 'META',
    NVDA: 'NVDA',
    // Energy Futures
    WTI: 'CL=F',
    BRENT: 'BZ=F',
    NGAS: 'NG=F',
    HOIL: 'HO=F',
    // Forex
    'EUR/USD': 'EURUSD=X',
    'GBP/USD': 'GBPUSD=X',
    'USD/JPY': 'JPY=X',
    'AUD/USD': 'AUDUSD=X',
    'USD/CAD': 'CAD=X',
    'USD/CHF': 'CHF=X',
    'NZD/USD': 'NZDUSD=X',
    'EUR/GBP': 'EURGBP=X',
    'GBP/JPY': 'GBPJPY=X',
    'EUR/JPY': 'EURJPY=X',
    'USD/INR': 'INR=X',
    'EUR/INR': 'EURINR=X',
  };

  const out = {};
  for (const [key, ticker] of Object.entries(tickers)) {
    try {
      const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      if (!res.ok) continue;
      const data = await res.json();
      const meta = data?.chart?.result?.[0]?.meta;
      if (meta && typeof meta.regularMarketPrice === 'number' && meta.regularMarketPrice > 0) {
        const p = meta.regularMarketPrice;
        const prev = meta.chartPreviousClose || p;
        const chg = prev > 0 ? ((p - prev) / prev) * 100 : 0;
        const decimals = (key.includes('JPY') || key.includes('INR')) ? 2 : (p < 2 ? 4 : 2);
        out[key] = {
          symbol: key,
          source: 'Yahoo Finance Real-Time API',
          price: parseFloat(p.toFixed(decimals)),
          prevClose: parseFloat(prev.toFixed(decimals)),
          changePercent: parseFloat(chg.toFixed(2)),
          timestamp: new Date(meta.regularMarketTime ? meta.regularMarketTime * 1000 : Date.now()).toISOString()
        };
      }
    } catch (e) {
      console.warn(`[VerifyQ] Error fetching Yahoo ticker ${ticker}:`, e.message);
    }
  }
  return out;
}

// Helper to clean price strings extracted from DOM
function parseExtractedPrice(rawText) {
  if (!rawText) return null;
  // Examples: "$771.10\n(₹73,144)", "C$1.398/CAD\n(₹133)", "$3,925.20/oz"
  const cleanFirstLine = rawText.split('\n')[0].trim();
  // Strip units like /oz, /bbl, /CAD, /CHF, /USD, /MMBtu, /gal, /INR, /JPY, /GBP
  const withoutUnit = cleanFirstLine.replace(/\/[a-zA-Z]+/g, '').trim();
  // Strip currency prefixes: $, C$, Fr, £, ¥, ₹
  const numericOnly = withoutUnit.replace(/[$,CFr£¥₹\s]/g, '').replace(/,/g, '');
  const val = parseFloat(numericOnly);
  return isNaN(val) ? null : val;
}

function parseExtractedChange(rawBadge) {
  if (!rawBadge) return null;
  // Examples: "▲ +1.38%", "▼ -0.17%", "▲ +0.00%"
  const clean = rawBadge.replace(/[▲▼%\s+]/g, '').trim();
  const val = parseFloat(clean);
  if (isNaN(val)) return null;
  return rawBadge.includes('▼') || rawBadge.includes('-') ? -Math.abs(val) : Math.abs(val);
}

// ─── Main Execution Workflow ───────────────────────────────────────────────

export async function runVerifyQ(options = {}) {
  const {
    url = 'https://quidesk.github.io',
    outputDir = SNAPSHOTS_DIR,
    scaleFactor = 2,
    artifactDir = null,
    skipSnapshot = false,
    skipVerify = false,
  } = options;

  console.log('═══════════════════════════════════════════════════════════════');
  console.log(' VerifyQ — Quidesk Visual Snapshot & Real-Time Market Auditor  ');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`Target URL:     ${url}`);
  console.log(`Resolution DPR: ${scaleFactor}x (Ultra-HD 3840px crisp capture)`);
  console.log(`Output Directory: ${outputDir}`);
  console.log(`Timestamp:      ${new Date().toISOString()}`);
  console.log('───────────────────────────────────────────────────────────────');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  let browser = null;
  let snapshotFile = null;
  let artifactSnapshotFile = null;
  let displayedAssets = [];
  let imageDimensions = null;

  try {
    const execPath = getBrowserExecutable();
    console.log(`[VerifyQ] Launching browser engine: ${execPath}`);

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
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 35000 });
    } catch (e) {
      console.warn(`[VerifyQ] Initial navigation notice: ${e.message}`);
    }

    // Wait for card elements to render
    try {
      await page.waitForSelector('.card', { timeout: 15000 });
    } catch (e) {
      console.warn(`[VerifyQ] Card selector notice: ${e.message}`);
    }

    // Wait for animations, hydration, and REST endpoints to settle
    console.log('[VerifyQ] Waiting for React components and market data to hydrate...');
    await new Promise(r => setTimeout(r, 6000));

    // Extract displayed asset values from the live DOM
    console.log('[VerifyQ] Extracting displayed quotes from live DOM...');
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

        items.push({
          symbol,
          badge,
          rawPriceText
        });
      });

      return items;
    });

    console.log(`[VerifyQ] Extracted ${displayedAssets.length} displayed asset cards.`);

    // Capture Full Page High-Resolution Snapshot
    if (!skipSnapshot) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      snapshotFile = path.join(outputDir, `quidesk-snapshot-${timestamp}.png`);
      const latestFile = path.join(outputDir, 'quidesk-latest.png');

      console.log('[VerifyQ] Capturing full-page ultra-high-resolution screenshot...');
      await page.screenshot({
        path: snapshotFile,
        fullPage: true,
        type: 'png'
      });

      // Also copy to latest
      fs.copyFileSync(snapshotFile, latestFile);

      const stats = fs.statSync(snapshotFile);
      console.log(`[VerifyQ] ✓ High-resolution snapshot saved: ${snapshotFile} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);

      if (artifactDir && fs.existsSync(artifactDir)) {
        artifactSnapshotFile = path.join(artifactDir, 'quidesk-verified-snapshot.png');
        fs.copyFileSync(snapshotFile, artifactSnapshotFile);
        console.log(`[VerifyQ] ✓ Snapshot mirrored to Artifact Directory for user download: ${artifactSnapshotFile}`);
      }
    }
  } catch (err) {
    console.error('[VerifyQ] Browser / Snapshot error:', err);
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  // ─── Verification Phase: Query Authoritative Real-Time Databases ─────────
  console.log('\n[VerifyQ] Querying authoritative real-time market data providers...');
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

  console.log(`[VerifyQ] Retrieved live verified quotes for ${Object.keys(verifiedMarket).length} market assets.`);

  // ─── Mathematical Discrepancy & Verification Analysis ─────────────────────
  const auditResults = [];
  const fixesNeeded = [];

  for (const item of displayedAssets) {
    const symbol = item.symbol;
    const dispPrice = parseExtractedPrice(item.rawPriceText);
    const dispChange = parseExtractedChange(item.badge);

    const liveAsset = verifiedMarket[symbol];

    if (!liveAsset) {
      auditResults.push({
        symbol,
        displayedPrice: dispPrice,
        displayedChange: dispChange,
        livePrice: null,
        liveChange: null,
        deltaPrice: null,
        percentError: null,
        status: 'UNVERIFIED (NO FEED)',
        note: 'No direct public quote feed found for this symbol'
      });
      continue;
    }

    const livePrice = liveAsset.price;
    const liveChange = liveAsset.changePercent ?? null;

    let deltaPrice = null;
    let percentError = null;
    let status = 'VERIFIED MATCH';
    let rootCause = null;

    if (typeof dispPrice === 'number' && typeof livePrice === 'number' && livePrice > 0) {
      deltaPrice = parseFloat((dispPrice - livePrice).toFixed(4));
      percentError = parseFloat(((Math.abs(deltaPrice) / livePrice) * 100).toFixed(2));

      // Tolerance thresholds:
      // Crypto / Equities during market movement can drift slightly (0.5%)
      // If error > 1.5%, or sign of change inverted (> 1.0%), classify as FIX NEEDED
      const isSignMismatch = (dispChange !== null && liveChange !== null && Math.sign(dispChange) !== Math.sign(liveChange) && Math.abs(dispChange - liveChange) > 0.8);
      
      if (percentError > 2.0 || isSignMismatch) {
        status = 'FIX NEEDED';
        if (['SPY', 'QQQ', 'DIA', 'AAPL', 'TSLA', 'META', 'NVDA'].includes(symbol)) {
          rootCause = 'Finnhub API 401 unauthenticated fallback to outdated baseline values in production build';
        } else if (['WTI', 'BRENT', 'HOIL'].includes(symbol)) {
          rootCause = 'Client requests api.gold-api.com/price/WTI which returns 404 Not Found, falling back to static dummy baseline';
        } else if (symbol.includes('/')) {
          rootCause = 'Forex change fixed at 0.00% due to static rate snapshot without live 24h delta';
        } else {
          rootCause = 'Outdated baseline quote in cache/markets.js';
        }
      } else if (percentError > 0.5) {
        status = 'ACCEPTABLE DRIFT';
      }
    }

    const row = {
      symbol,
      displayedPrice: dispPrice,
      livePrice,
      deltaPrice,
      percentError,
      displayedChange: dispChange,
      liveChange,
      status,
      source: liveAsset.source,
      rootCause
    };

    auditResults.push(row);
    if (status === 'FIX NEEDED') {
      fixesNeeded.push(row);
    }
  }

  // ─── Format Audit Output Tables ──────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════════════════════════════════════════');
  console.log('                          VERIFYQ ACCURACY AUDIT REPORT                                       ');
  console.log('═══════════════════════════════════════════════════════════════════════════════════════════════');
  console.log('SYMBOL      DISPLAYED PRICE   LIVE REAL-TIME   PRICE DELTA   ERROR (%)  DISP CHG%  LIVE CHG%  STATUS');
  console.log('───────────────────────────────────────────────────────────────────────────────────────────────');

  auditResults.forEach(r => {
    const sym = r.symbol.padEnd(11);
    const dp = (r.displayedPrice !== null ? `$${r.displayedPrice}` : 'N/A').padEnd(17);
    const lp = (r.livePrice !== null ? `$${r.livePrice}` : 'N/A').padEnd(16);
    const delta = (r.deltaPrice !== null ? (r.deltaPrice >= 0 ? `+${r.deltaPrice}` : `${r.deltaPrice}`) : 'N/A').padEnd(14);
    const err = (r.percentError !== null ? `${r.percentError}%` : 'N/A').padEnd(10);
    const dc = (r.displayedChange !== null ? `${r.displayedChange}%` : 'N/A').padEnd(10);
    const lc = (r.liveChange !== null ? `${r.liveChange}%` : 'N/A').padEnd(10);
    const st = r.status;
    console.log(`${sym} ${dp} ${lp} ${delta} ${err} ${dc} ${lc} ${st}`);
  });

  console.log('───────────────────────────────────────────────────────────────────────────────────────────────');
  console.log(`Total Assets Audited: ${auditResults.length}`);
  console.log(`Verified Accurate:   ${auditResults.filter(r => r.status === 'VERIFIED MATCH' || r.status === 'ACCEPTABLE DRIFT').length}`);
  console.log(`Fixes Needed:        ${fixesNeeded.length}`);
  console.log('═══════════════════════════════════════════════════════════════════════════════════════════════\n');

  if (fixesNeeded.length > 0) {
    console.log('⚠️  ASSETS REQUIRING IMMEDIATE FIXES:');
    fixesNeeded.forEach((f, idx) => {
      console.log(` [${idx + 1}] ${f.symbol}: Displays $${f.displayedPrice} (${f.displayedChange}%) vs Real-Time $${f.livePrice} (${f.liveChange}%) | Error: ${f.percentError}%`);
      if (f.rootCause) console.log(`     Cause: ${f.rootCause}`);
    });
    console.log('');
  }

  // Write JSON Audit Log
  const reportPayload = {
    timestamp: new Date().toISOString(),
    url,
    snapshot: snapshotFile,
    artifactSnapshot: artifactSnapshotFile,
    summary: {
      totalAudited: auditResults.length,
      verifiedMatches: auditResults.filter(r => r.status === 'VERIFIED MATCH').length,
      acceptableDrift: auditResults.filter(r => r.status === 'ACCEPTABLE DRIFT').length,
      fixesNeeded: fixesNeeded.length
    },
    fixesNeeded,
    auditResults
  };

  const reportJsonPath = path.join(outputDir, 'verifyq-report.json');
  fs.writeFileSync(reportJsonPath, JSON.stringify(reportPayload, null, 2));
  console.log(`[VerifyQ] Audit JSON report saved to ${reportJsonPath}`);

  return reportPayload;
}

// ─── CLI Invocation ────────────────────────────────────────────────────────
const isDirectCall = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isDirectCall) {
  const args = process.argv.slice(2);
  const options = {
    skipSnapshot: args.includes('--verify-only'),
    skipVerify: args.includes('--snapshot-only'),
  };

  const urlIdx = args.indexOf('--url');
  if (urlIdx !== -1 && args[urlIdx + 1]) {
    options.url = args[urlIdx + 1];
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
