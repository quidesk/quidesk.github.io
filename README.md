# Quidesk

> **The trader's desk.** All markets. One view. Live.

Quidesk is an all-in-one market intelligence terminal built for traders who think in systems, not silos. Live heatmaps, correlation maps, hotspot detection, and cross-asset comparison — equities, crypto, metals, and energy, all on one desk.

---

## What it does

- **Market Map** — every asset as a live node. Hover to see correlation lines light up between related assets. Hotspot rings pulse on breakouts and breakdowns.
- **Sector Heatmaps** — visual heat across equities, crypto, metals and energy. Brightness encodes momentum, not just price.
- **Hotspot Engine** — automatically surfaces breakouts, breakdowns and quiet divergences ranked by severity.
- **Compare Mode** — overlay any two to four assets on a normalised scale. Spot divergence before it becomes a trade.
- **Narrative Strip** — one auto-generated sentence describing what the market map is doing right now.
- **Watchlist + Alerts** — star any asset, set price alerts above or below any level.
- **Portfolio Tracker** — live P&L, allocation pie, sector breakdown, unrealised gains bar chart.

---

## Stack

- **React 18** + **Vite 5**
- **Recharts** — area charts, line charts, bar charts, pie charts
- **Lucide React** — icons
- **Google Fonts** — Syne (display), DM Mono (mono), Inter (body)

---

## Get running

```bash
npm install
npm run dev
```

Runs at `http://localhost:3000`

---

## Connect real data

Replace simulated prices by setting environment variables. Copy `.env.example` to `.env` and fill in your keys.

| Variable | Provider | Cost |
|---|---|---|
| `VITE_ALPHA_VANTAGE_KEY` | [alphavantage.co](https://www.alphavantage.co) | Free tier |
| `VITE_TWELVE_DATA_KEY` | [twelvedata.com](https://twelvedata.com) | Free tier |
| `VITE_METALS_API_KEY` | [metals-api.com](https://metals-api.com) | Free tier |
| `VITE_COINGECKO_PRO_KEY` | [coingecko.com](https://www.coingecko.com/api) | Free + Pro |

Binance WebSocket (crypto real-time) connects automatically — no key needed.

See `src/utils/api.js` for the full integration layer.

---

## Deploy to GitHub Pages

The repo includes a GitHub Actions workflow that deploys automatically on every push to `main`.

1. Create a repo named `yourusername.github.io` on GitHub
2. Push this code to it
3. Go to **Settings → Pages → Source → GitHub Actions**
4. Push to `main` — live in ~2 minutes at `https://yourusername.github.io`

---

## Project structure

```
src/
├── components/
│   ├── Navbar.jsx          — Navigation with live clock and hotspot count
│   ├── TickerTape.jsx      — Scrolling live price ticker
│   ├── MarketMap.jsx       — SVG node map with correlation lines
│   ├── HotspotPanel.jsx    — Ranked signal feed
│   ├── AssetCard.jsx       — Asset card with price flash on tick
│   ├── MiniChart.jsx       — Sparkline chart
│   └── DetailChart.jsx     — Full interactive chart
├── pages/
│   ├── MapPage.jsx         — The main desk view
│   ├── SectorPage.jsx      — Per-sector view (equities/crypto/metals/energy)
│   ├── ComparePage.jsx     — Cross-asset overlay and comparison
│   ├── WatchlistPage.jsx   — Saved assets and price alerts
│   └── PortfolioPage.jsx   — Holdings, P&L, allocation
├── hooks/
│   ├── useMarketData.js    — Live price simulation + hotspot detection
│   ├── useWatchlist.js     — Persistent watchlist
│   ├── usePortfolio.js     — Persistent portfolio with live P&L
│   └── useAlerts.js        — Price alert engine
├── data/
│   └── markets.js          — 20 instruments, correlations, hotspot engine
├── utils/
│   └── api.js              — Real API integration layer
└── index.css               — Design system
```

---

*Quidesk — Quid is old money. Desk is where every trade gets made.*
