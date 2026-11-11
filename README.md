# Quidesk

> **The trader's desk.** All markets. One view. Live.

Quidesk is an all-in-one market intelligence terminal built for traders who think in systems, not silos. Live heatmaps, correlation maps, hotspot detection, and cross-asset comparison — equities, crypto, metals, energy, and foreign exchange, all on one desk.

---

## Architecture: Unified Cloudflare Worker Feed

Quidesk operates on an authentic, zero-fabrication market data architecture:

```
[ Upstream Authoritative APIs ]
  ├── Yahoo Finance (Equities, Energy, Interbank FX Tape)
  ├── Gold-API (Spot Bullion XAU/XAG/XPT)
  ├── Binance Spot (Sub-second Crypto Spot)
  ├── Frankfurter ECB / Fawaz Ahmed (Reference FX)
  └── Financial RSS Feeds (OSINT News Signals)
                 │
                 ▼
[ Cloudflare Worker: quidesk-market-engine ]
  ├── Batch subrequest deduplication (<= 30 subrequests per uncached tick)
  ├── In-memory + Cache API edge caching (15s quotes, 60s history/news)
  ├── CORS protection & Origin validation
  ├── Strict normalization & session status stamping
  └── Endpoints: /v1/quotes, /v1/history, /v1/news, /v1/fx, /v1/health
                 │
                 ▼
[ Quidesk Frontend (React 18 + Vite 5 on GitHub Pages) ]
  ├── Centralized Zustand Store (marketStore.js)
  ├── Memoized Selectors (marketSelectors.js)
  ├── Pure Mathematical Triangulation & Formatting (formatters.js)
  ├── Physics-based Constrained Market Map (MarketMap.jsx)
  └── Authentic Recharts Timeframe Series (MiniChart.jsx, DetailChart.jsx)
```

### Zero Synthetic Data Guarantee
- **No Mock Numbers:** Never uses `Math.random()`, random walks, sin/cos noise, baseline closes, or localStorage baselines.
- **Unavailable State:** Assets without live data display `"—"` with `status: 'unavailable'` rather than synthetic ticks.
- **Session Freshness:** Markets outside trading hours are stamped with session status `closed` and display their authentic official close price.
- **Client Security:** Zero API keys or secrets are bundled into client-side JavaScript.

---

## Features

- **Market Map** — Interactive 2D physics map with strict radial ellipse containment. Displays all 29 instruments across 5 sectors with illustrative correlation links.
- **Sector Analysis** — Real-time performance tracking across Equities, Crypto, Metals, Energy, and Forex.
- **Hotspot Engine** — Surfaces authentic market breakouts, breakdowns, and cross-asset volume surges using genuine quote timestamps.
- **Curated OSINT News Feed** — Edge-ingested RSS intelligence with strict word-boundary asset tagging prohibiting ticker collisions.
- **Cross-Currency Triangulation** — Accurate Forex rate formatting, INR base triangulation, and unitless pair pricing.
- **Compare & Portfolio Modes** — Multi-asset normalized comparative overlays, watchlists, and persistent portfolio tracker.

---

## Tech Stack

- **Frontend:** React 18, Vite 5, Recharts, Zustand, Lucide React
- **Edge Backend:** Cloudflare Workers (ES Modules, Cache API)
- **Testing:** Vitest (Contract tests, selector tests, formatter tests, physics containment tests)
- **CI/CD:** GitHub Actions (Automated linting, vitest suite, GitHub Pages deployment, Cloudflare Worker deployment)

---

## Local Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env.local` (optional):
```bash
cp .env.example .env.local
```
By default, the client proxies `/api` to the local or production Cloudflare Worker feed.

### 3. Run Development Server
```bash
npm run dev
```
Terminal interface runs locally at `http://localhost:5173`.

### 4. Run Test Suite
```bash
npm test
```
Executes all 14 test suites covering edge worker contracts, math formatters, store selectors, map physics, and chart sanitization.

### 5. Run Verification Auditor (VerifyQ)
```bash
npm run verifyq
```
Captures full-page 4K snapshots and cross-references rendered DOM prices against independent live market feeds.

---

## Cloudflare Worker Deployment

The edge market engine lives in `worker/` and is deployed using Wrangler:

```bash
# Test worker locally
npx wrangler dev worker/index.js

# Deploy to Cloudflare Workers
npx wrangler deploy
```

In GitHub Actions, worker updates are deployed automatically on push to `main` when `worker/**` or `wrangler.toml` changes, using the `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` secrets.

---

## Project Structure

```
├── .github/workflows/
│   ├── ci.yml                 — Automated CI (Lint, Vitest, Build Check on Node 20)
│   ├── main.yml               — GitHub Pages static deploy
│   └── worker-deploy.yml      — Cloudflare Worker deploy
├── worker/
│   ├── index.js               — Edge Worker router & fetch/scheduled entry point
│   ├── config.js              — Upstream symbol mappings, tolerances, feeds
│   ├── worker.test.js         — 16 contract and performance tests
│   ├── providers/             — Upstream fetchers (Yahoo, Gold-API, Binance, RSS)
│   └── routes/                — /v1/quotes, /v1/history, /v1/news, /v1/health
├── src/
│   ├── components/            — UI components (MarketMap, TickerTape, MiniChart, etc.)
│   ├── data/                  — Canonical INITIAL_ASSETS catalog
│   ├── hooks/                 — React hooks (useMarketData, useNewsSignals, etc.)
│   ├── lib/                   — Freshness & market session calculators
│   ├── selectors/             — Memoized store selectors
│   ├── store/                 — Centralized Zustand marketStore
│   └── utils/                 — Pure mathematical formatters, api client, security
├── scripts/
│   ├── verifyq.mjs            — 4K visual snapshot & DOM real-time audit script
│   └── generate-og.mjs        — OpenGraph social banner generator
└── wrangler.toml              — Cloudflare Worker deployment configuration
```

---

## License

MIT © Quidesk
