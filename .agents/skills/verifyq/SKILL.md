---
name: verifyq
description: Real-time accuracy verifier and ultra-high-resolution visual snapshot auditor for Quidesk (quidesk.github.io). Captures full-page 4K/Retina screenshots, extracts rendered DOM prices, cross-references against authoritative real-time financial databases (Yahoo Finance, Binance, Gold-API), computes price/percent deltas, and produces actionable remediation reports for any stale or mismatched market values.
---

# VerifyQ — Quidesk Visual Snapshot & Real-Time Market Auditor

VerifyQ is the dedicated verification and snapshot tool for the Quidesk market intelligence terminal (`https://quidesk.github.io`).

## When to Use

Activate this skill when:
- The user asks to snapshot or capture `quidesk.github.io`
- The user requests price verification or audit of Quidesk's displayed market data
- The user mentions `/verifyq`, `VerifyQ`, or asks to check for hallucinations/stale data on Quidesk
- Pre-deployment or post-deployment quality checks of market rates and UI integrity

---

## Capabilities

1. **Ultra-HD Full-Page Visual Snapshot**:
   - Uses headless Chromium with `deviceScaleFactor: 2` (4K/Retina resolution, ~3840px wide).
   - Waits for full React hydration, mini-charts, SVG world maps, and ticker tape animations.
   - Saves full-page capture to `snapshots/` and mirrors to Antigravity brain artifacts for instant user preview and download.

2. **Real-Time Data Extraction**:
   - Evaluates the live DOM of `https://quidesk.github.io`.
   - Parses displayed prices, local currency converted amounts, and percentage changes across Equities, Crypto, Metals, Energy, and Forex.

3. **Authoritative Market Cross-Verification (Zero Hallucination)**:
   - **Crypto**: Binance Official REST API (`data-api.binance.vision`) for live tick prices and 24h deltas.
   - **Equities & Commodities**: Yahoo Finance Real-Time API (`query1.finance.yahoo.com/v8/finance/chart/`) for SPY, QQQ, DIA, AAPL, TSLA, META, NVDA, WTI (CL=F), Brent (BZ=F), Natural Gas (NG=F), Heating Oil (HO=F).
   - **Metals**: Physical bullion spot rates via `api.gold-api.com` (XAU, XAG, XPT).
   - **Forex**: Spot exchange rates via `open.er-api.com` and Yahoo Finance currency pairs (`EURUSD=X`, etc.).

4. **Mathematical Drift & Discrepancy Classification**:
   - `VERIFIED MATCH`: Price variance < 0.25% (normal exchange tick spread / live streaming delay).
   - `ACCEPTABLE DRIFT`: Variance 0.25% - 1.5% during active market movement.
   - `FIX NEEDED`: Variance > 1.5% or inverted sign (indicates stale cache, unauthenticated 401 API fallback, or 404 endpoint).

---

## Tool Execution

Run VerifyQ directly using npm or node:

```powershell
# Full snapshot + real-time verification audit
npm run verifyq

# With artifact directory mirroring
node scripts/verifyq.mjs --artifact-dir "<artifactDir>"

# Verification audit only (skips browser screenshot)
node scripts/verifyq.mjs --verify-only

# Snapshot capture only
node scripts/verifyq.mjs --snapshot-only
```

---

## Output Files

| Output File | Location | Description |
| :--- | :--- | :--- |
| `quidesk-latest.png` | `snapshots/` | Latest full-page 4K snapshot (~3840x8600 px) |
| `quidesk-snapshot-<timestamp>.png` | `snapshots/` | Timestamped archival snapshot |
| `quidesk-verified-snapshot.png` | Artifact directory | User-facing download and inline preview |
| `verifyq-report.json` | `snapshots/` | Machine-readable audit results with all deltas |

---

## Common Root Causes & Remediation

When VerifyQ flags `FIX NEEDED`:

1. **Equities / Tech Stocks (SPY, QQQ, AAPL, TSLA, NVDA)**:
   - *Cause*: Finnhub requires an API key. In client-side builds where `VITE_FMP_KEY` or `FINNHUB_TOKEN` is unconfigured, the app falls back to hardcoded dummy prices in `src/data/markets.js`.
   - *Fix*: Hydrate prices using `scripts/generate-snapshot.mjs` before build or configure Yahoo Finance / CORS proxy endpoints.

2. **Energy Commodities (WTI, BRENT, HOIL)**:
   - *Cause*: Client code erroneously requests `api.gold-api.com/price/WTI` which returns 404 Not Found (Gold-API only serves precious metals), defaulting back to baseline.
   - *Fix*: Route energy queries to Yahoo Finance futures (`CL=F`, `BZ=F`, `HO=F`) or pre-render in `market-snapshot.json`.

3. **Forex Pairs (0.00% Change)**:
   - *Cause*: Currency API provides static reference rates without 24-hour delta vectors.
   - *Fix*: Cache previous day close in snapshot generator to calculate true 24h rolling change.
