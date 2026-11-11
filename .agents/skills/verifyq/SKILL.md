---
name: verifyq
description: Real-time accuracy verifier and ultra-high-resolution visual snapshot auditor for Quidesk (quidesk.github.io). Captures full-page 4K/Retina screenshots, extracts rendered DOM prices, cross-references against authoritative real-time financial databases (Yahoo Finance continuous tape, Binance Live Spot, Gold-API), computes multi-tier asset-specific deltas, validates unitless Forex formatting, checks cross-currency triangulation, and produces actionable remediation reports.
---

# VerifyQ — Quidesk Visual Snapshot & Multi-Tier Market Auditor

VerifyQ is the dedicated real-time market audit, formatting compliance, and visual snapshot engine for the Quidesk market intelligence terminal (`https://quidesk.github.io`).

---

## When to Use

Activate this skill when:
- The user requests a visual snapshot or 4K screenshot of `quidesk.github.io` or the local preview.
- The user asks to audit, verify, or cross-check Quidesk's displayed prices, deltas, or market data against live exchange feeds.
- The user mentions `/verifyq`, `VerifyQ`, or asks to detect stale cache values, hallucinations, or data discrepancies.
- Pre-deployment and post-deployment sanity checks of market rates, unitless FX formatting, and sparklines.

---

## Architecture & Upgraded Verification Methodology

### 1. Ground-Truth Data Hierarchy (Continuous Tape vs Daily Snapshots)
To eliminate false discrepancies caused by provider timing or fixed-rate daily snapshots, VerifyQ enforces an authoritative ground-truth hierarchy:

| Asset Class | Ground-Truth Source | Venue / Endpoint | Ingestion Frequency |
| :--- | :--- | :--- | :--- |
| **Forex Continuous Tape** | **Yahoo Finance v8 Chart API** | `JPY=X`, `CHF=X`, `NZDUSD=X`, `EURUSD=X`, `GBPUSD=X`, `AUDUSD=X`, `CAD=X`, `EURGBP=X`, `GBPJPY=X`, `EURJPY=X`, `INR=X`, `EURINR=X` | Sub-minute real-time tape |
| **Forex Hourly Fallback** | FxRatesAPI | `https://api.fxratesapi.com/latest` | Hourly spot rate update |
| **Equities & Indices** | Yahoo Finance v8 Chart API | `SPY`, `QQQ`, `DIA`, `AAPL`, `TSLA`, `META`, `NVDA` | Live exchange tape |
| **Energy Futures** | Yahoo Finance Futures | `CL=F` (WTI), `BZ=F` (Brent), `NG=F` (NatGas), `HO=F` (Heating Oil) | Continuous futures settlement |
| **Cryptocurrency** | Binance Official Data Mirror | `https://data-api.binance.vision/api/v3/ticker/24hr` | Live spot tick & 24h rolling delta |
| **Precious Metals** | Gold-API Spot Bullion | `https://api.gold-api.com/price/{XAU,XAG,XPT}` | Live London/NY bullion spot |

> [!IMPORTANT]
> **Daily Snapshot Lag Discovery**: Free endpoints like `open.er-api.com` publish fixed rates once per day (~00:00 UTC). During active trading, major currencies drift significantly (>0.25%) against the continuous interbank tape. Continuous Yahoo Finance FX feeds (`=X`) are mandatory ground truth for live audits.

---

### 2. Strict Quote Orientations & Inversion Guards
VerifyQ verifies that exchange rates adhere strictly to ISO 4217 quoting conventions:

- **Direct Rates (USD Base)**: Quoted as Foreign Currency per 1 USD.
  - `USD/JPY` (~155–165): `rates.JPY`
  - `USD/CHF` (~0.80–0.92): `rates.CHF`
  - `USD/CAD` (~1.35–1.45): `rates.CAD`
  - `USD/INR` (~85–98): `rates.INR`
- **Indirect Rates (USD Quote)**: Quoted as USD per 1 Base Currency.
  - `NZD/USD` (~0.54–0.62): $1 / \text{rates.NZD}$
  - `EUR/USD` (~1.05–1.15): $1 / \text{rates.EUR}$
  - `GBP/USD` (~1.25–1.38): $1 / \text{rates.GBP}$
  - `AUD/USD` (~0.64–0.74): $1 / \text{rates.AUD}$
- **Cross Currency Rates**: Derived via triangular arbitrage:
  - `EUR/GBP`: $\text{rates.GBP} / \text{rates.EUR}$
  - `GBP/JPY`: $\text{rates.JPY} / \text{rates.GBP}$
  - `EUR/JPY`: $\text{rates.JPY} / \text{rates.EUR}$
  - `EUR/INR`: $\text{rates.INR} / \text{rates.EUR}$

---

### 3. Formatting & Presentation Validation
VerifyQ inspects DOM nodes for strict UI and financial formatting standards:

1. **Unitless Forex Rule**: Forex pairs must **NEVER** display a `$` or currency sign before the exchange rate (e.g., `157.94`, NOT `$157.94`). Any Forex card prepended with `$` is flagged as `FORMAT VIOLATION`.
2. **Numeric Precision**:
   - `/JPY` and `/INR` pairs: Strictly formatted to **2 decimal places** (e.g., `157.94`, `94.53`).
   - All other Forex pairs: Strictly formatted to **4 decimal places** (e.g., `0.8144`, `0.5649`).
   - Equities, Metals, Energy: Formatted with `$` and 2 decimal places.
   - Crypto: Formatted with `$` (4 decimals if $< \$2.00$, else 2 decimals).

---

### 4. Calibrated Tolerance Matrix
Drift is classified using asset-specific volatility thresholds:

$$\text{Drift \%} = \frac{|\text{Displayed Price} - \text{Ground Truth Price}|}{\text{Ground Truth Price}} \times 100\%$$

| Sector | Max Tolerance ($\tau$) | Classification Criteria |
| :--- | :--- | :--- |
| **Forex** | **$\le 0.25\%$** | Strict interbank spot spread tolerance |
| **Equities** | **$\le 0.50\%$** | Intraday trading spread / consolidated tape drift |
| **Energy** | **$\le 0.50\%$** | Continuous contract rollover & settlement drift |
| **Metals** | **$\le 1.00\%$** | Physical bullion spot vs futures spread |
| **Crypto** | **$\le 1.00\%$** | High-frequency spot orderbook volatility |

- **`VERIFIED MATCH`**: $\text{Drift} \le \tau$ and sign of 24h change matches ground truth.
- **`ACCEPTABLE DRIFT`**: $\tau < \text{Drift} \le 1.5 \times \tau$ (normal intraday tick movement during active sessions).
- **`FIX NEEDED`**: $\text{Drift} > 1.5 \times \tau$ or inverted 24h delta sign ($|\Delta| > 0.8\%$).
- **`FORMAT VIOLATION`**: Currency prefix on FX pair, invalid precision, or missing rate.

---

### 5. Cross-Currency Triangulation Verification
VerifyQ checks mathematical consistency across foreign exchange cross rates:

- $\text{GBP/JPY} \approx \text{GBP/USD} \times \text{USD/JPY}$ (Tolerance: $\le 0.35\%$)
- $\text{EUR/JPY} \approx \text{EUR/USD} \times \text{USD/JPY}$ (Tolerance: $\le 0.35\%$)
- $\text{EUR/GBP} \approx \text{EUR/USD} / \text{GBP/USD}$ (Tolerance: $\le 0.35\%$)
- $\text{EUR/INR} \approx \text{EUR/USD} \times \text{USD/INR}$ (Tolerance: $\le 0.35\%$)

Any breach $> 0.35\%$ is flagged as an arbitrage anomaly or mismatched provider timestamp.

---

## Tool Execution

### A. Workspace CLI Tool (`scripts/verifyq.mjs`)

```powershell
# 1. Full 4K Snapshot + Live Verification Audit (auto-detects local/remote)
npm run verifyq

# 2. Audit against running local preview (http://localhost:4173)
node scripts/verifyq.mjs --local

# 3. Audit against live production site (https://quidesk.github.io)
node scripts/verifyq.mjs --remote

# 4. Fast verification against a pre-rendered snapshot (skips headless browser)
node scripts/verifyq.mjs --verify-only --snapshot public/market-snapshot.json

# 5. Capture 4K Retina snapshot only
node scripts/verifyq.mjs --snapshot-only

# 6. Mirror snapshot and JSON audit report to Antigravity brain artifact directory
node scripts/verifyq.mjs --artifact-dir "<artifactDir>"

# 7. Audit with external / user-provided screenshot (skips browser screenshot capture)
node scripts/verifyq.mjs --image "<imagePath>" --artifact-dir "<artifactDir>"

# 8. Audit with user-provided screenshot in headless fast-mode (no browser)
node scripts/verifyq.mjs --image "<imagePath>" --no-browser --artifact-dir "<artifactDir>"
```

### B. Standalone External Suite (`C:\Users\subhr\quidesk-verifier\`)
For running tests completely outside the git repository without creating tracked workspace artifacts:

```powershell
cd C:\Users\subhr\quidesk-verifier
# Run verification (auto-probes local preview :4173, dev :5173, then remote)
node verify.mjs

# Target explicit local snapshot file
node verify.mjs "I:\Quidesk AG\public\market-snapshot.json"

# Capture 4K desktop snapshot
.\capture-desktop.bat
```

---

## Output Files

| File | Location | Description |
| :--- | :--- | :--- |
| `quidesk-latest.png` | `snapshots/` | Latest 4K full-page capture (~3840x8600 px at DPR 2x) |
| `quidesk-snapshot-<timestamp>.png` | `snapshots/` | Timestamped full-page archival capture |
| `quidesk-verified-snapshot.png` | Artifact directory | Mirrored user-facing image for direct chat preview and download |
| `verifyq-report.json` | `snapshots/` & Artifacts | Full structured audit log with per-asset deltas and triangulation stats |

---

## Common Root Causes & Remediation Playbook

When VerifyQ flags `FIX NEEDED` or `FORMAT VIOLATION`:

1. **Forex Rate Drift (`USD/JPY`, `USD/CHF`, `NZD/USD`)**:
   - *Cause*: Daily snapshot provider (`open.er-api.com`) hasn't updated since 00:00 UTC, while the market moved during London/NY trading.
   - *Remediation*: Re-run `node scripts/generate-snapshot.mjs` to fetch live Yahoo continuous tape (`JPY=X`, `CHF=X`, `NZDUSD=X`) or ensure client connects to `https://api.fxratesapi.com/latest`.

2. **Forex `$` Prefix (`FORMAT VIOLATION`)**:
   - *Cause*: Card renderer or price formatter improperly prepended `$` to currency pairs.
   - *Remediation*: Ensure `formatPrice(price, symbol, category)` checks `category === 'Forex'` or `symbol.includes('/')` and returns unitless string.

3. **Precious Metals & Energy Fallback**:
   - *Cause*: Calling `api.gold-api.com/price/WTI` (404 Not Found), which causes silent fallback to outdated baseline values.
   - *Remediation*: Route commodities and energy to Yahoo continuous futures (`CL=F`, `BZ=F`, `NG=F`, `HO=F`).

4. **Equity Mega-Caps Unauthenticated 401 Fallback**:
   - *Cause*: Finnhub WebSocket / REST failing due to missing or expired API token.
   - *Remediation*: Hydrate `public/market-snapshot.json` prior to deployment via GitHub Actions workflow (`.github/workflows/market-snapshot.yml`).
