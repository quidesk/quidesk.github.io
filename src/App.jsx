import React, { useState, useEffect } from 'react'
import Navbar from './components/Navbar'
import TickerTape from './components/TickerTape'
import MapPage from './pages/MapPage'
import SectorPage from './pages/SectorPage'
import ComparePage from './pages/ComparePage'
import WatchlistPage from './pages/WatchlistPage'
import PortfolioPage from './pages/PortfolioPage'
import { useMarketData } from './hooks/useMarketData'
import { useWatchlist } from './hooks/useWatchlist'
import { usePortfolio } from './hooks/usePortfolio'
import { useAlerts } from './hooks/useAlerts'
import { useCurrencyRates } from './hooks/useCurrencyRates'
import { useTheme } from './hooks/useTheme'
import { useNewsSignals } from './hooks/useNewsSignals'
import OSINTMap from './components/OSINTMap'
import Logo from './components/Logo'
import SocialShareBar from './components/SocialShareBar'
import { Share2 } from 'lucide-react'

const VALID_TABS = ['map', 'equities', 'crypto', 'metals', 'energy', 'forex', 'compare', 'watchlist', 'portfolio'];

const BUILD_SHA = typeof __BUILD_SHA__ !== 'undefined'
  ? __BUILD_SHA__
  : (import.meta.env?.VITE_BUILD_SHA || 'dev');
const BUILD_TIME = typeof __BUILD_TIME__ !== 'undefined'
  ? __BUILD_TIME__
  : (import.meta.env?.VITE_BUILD_TIME || '');

function formatBuildIdentity(sha, iso) {
  if (!iso) return `build ${sha}`;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return `build ${sha}`;
  const stamp = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
  return `build ${sha} · ${stamp}`;
}

function formatHealthTimestamp(ts) {
  if (!ts) return '—';
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  });
}

const SEO_META = {
  map: {
    title: 'Quidesk — Live Market Intelligence Terminal | Crypto, Stocks, Metals & Energy',
    desc: 'Quidesk is a free real-time market intelligence terminal tracking Bitcoin, Ethereum, S&P 500, gold, crude oil and 20+ assets. Live price maps, OSINT news signals, and multi-currency conversion.'
  },
  equities: {
    title: 'Live Equities & Stock Market Terminal | S&P 500, QQQ, NVDA, AAPL | Quidesk',
    desc: 'Track US stocks and indices in real-time. Live streaming quotes and historical charts for SPY, QQQ, DIA, Apple, Nvidia, Tesla, and Meta with volume telemetry.'
  },
  crypto: {
    title: 'Live Crypto Market Intelligence | Bitcoin, Ethereum, Solana Spot | Quidesk',
    desc: 'Real-time cryptocurrency tracking across Bitcoin (BTC), Ethereum (ETH), Solana (SOL), BNB, XRP, and Cardano. Sub-second streaming prices and market cap metrics.'
  },
  metals: {
    title: 'Live Precious Metals Spot Prices | Gold, Silver, Platinum Spot | Quidesk',
    desc: 'Continuous real-time spot tracking for Gold (XAU/USD), Silver (XAG/USD), and Platinum (XPT/USD) with institutional multi-tier feeds and currency triangulation.'
  },
  energy: {
    title: 'Live Energy Commodities Tracker | WTI Crude, Brent, Natural Gas | Quidesk',
    desc: 'Track global energy markets live: WTI Crude Oil, Brent Crude, Natural Gas, and Heating Oil spot prices with real-time percentage deltas and commodity tape.'
  },
  forex: {
    title: 'Live Foreign Exchange Rates | EUR/USD, GBP/USD, USD/JPY Spot Ticker | Quidesk',
    desc: 'Institutional foreign exchange market intelligence covering EUR/USD, GBP/USD, USD/JPY, AUD/USD, USD/CAD, USD/CHF, NZD/USD with cross-currency triangulation.'
  },
  compare: {
    title: 'Cross-Asset Market Correlation & Performance Comparison | Quidesk',
    desc: 'Compare multi-asset historical performance and cross-market correlations across equities, crypto, precious metals, and commodities on synchronized normalized charts.'
  },
  watchlist: {
    title: 'Real-Time Financial Watchlist & Price Alerts | Quidesk',
    desc: 'Customizable multi-asset watchlist with customizable high/low price threshold alerts. Monitor your favorite market instruments in real-time without signing up.'
  },
  portfolio: {
    title: 'Multi-Asset Portfolio Tracker & Live P&L Analytics | Quidesk',
    desc: 'Private, browser-stored multi-asset portfolio tracker. Real-time profit and loss (P&L) calculations across stocks, crypto, commodities, and fiat holdings.'
  }
};

export default function App() {
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#', '').toLowerCase();
      if (VALID_TABS.includes(hash)) return hash;
    }
    return 'map';
  });

  const {
    data,
    allAssets,
    lastUpdate,
    generatedAt,
    oldestQuoteTs,
    sourcesHealth,
    isLive,
    setIsLive,
    hotspots,
    isStale,
    isWorkerOnline,
    workerError,
    connectionStatus,
  } = useMarketData();
  const watchlist                  = useWatchlist();
  const portfolio                  = usePortfolio(allAssets);
  const alerts                     = useAlerts(allAssets);
  const { convertPrice, formatLocalPrice } = useCurrencyRates();
  const { theme, toggle: toggleTheme } = useTheme();
  const newsSignals = useNewsSignals(isLive);
  const [showFeedHealth, setShowFeedHealth] = useState(false);

  // Sync URL hash and dynamic document metadata for deep-linking SEO
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (window.location.hash !== `#${activeTab}`) {
      window.history.replaceState(null, '', `#${activeTab}`);
    }

    const meta = SEO_META[activeTab] || SEO_META.map;
    document.title = meta.title;

    const descEl = document.querySelector('meta[name="description"]');
    if (descEl) descEl.setAttribute('content', meta.desc);

    const ogTitleEl = document.querySelector('meta[property="og:title"]');
    if (ogTitleEl) ogTitleEl.setAttribute('content', meta.title);

    const ogDescEl = document.querySelector('meta[property="og:description"]');
    if (ogDescEl) ogDescEl.setAttribute('content', meta.desc);

    const canonicalEl = document.querySelector('link[rel="canonical"]');
    if (canonicalEl) {
      canonicalEl.setAttribute('href', `https://quidesk.github.io/#${activeTab}`);
    }
  }, [activeTab]);

  // Handle browser back/forward buttons
  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.replace('#', '').toLowerCase();
      if (VALID_TABS.includes(hash)) {
        setActiveTab(hash);
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const watchlistProps = {
    isWatched: watchlist.isWatched,
    onToggleWatch: watchlist.toggleWatch,
    convertPrice,
    formatLocalPrice
  }

  const renderPage = () => {
    switch (activeTab) {
      case 'map':
        return <MapPage data={data} allAssets={allAssets} hotspots={hotspots} watchlistProps={watchlistProps} convertPrice={convertPrice} formatLocalPrice={formatLocalPrice} isStale={isStale} newsSignals={newsSignals} />
      case 'equities':
        return <SectorPage sector="equities" assets={data.equities || []} watchlistProps={watchlistProps} convertPrice={convertPrice} formatLocalPrice={formatLocalPrice} isStale={isStale} />
      case 'crypto':
        return <SectorPage sector="crypto" assets={data.crypto || []} watchlistProps={watchlistProps} convertPrice={convertPrice} formatLocalPrice={formatLocalPrice} isStale={isStale} />
      case 'metals':
        return <SectorPage sector="metals" assets={data.metals || []} watchlistProps={watchlistProps} convertPrice={convertPrice} formatLocalPrice={formatLocalPrice} isStale={isStale} />
      case 'energy':
        return <SectorPage sector="energy" assets={data.energy || []} watchlistProps={watchlistProps} convertPrice={convertPrice} formatLocalPrice={formatLocalPrice} isStale={isStale} />
      case 'forex':
        return <SectorPage sector="forex" assets={data.forex || []} watchlistProps={watchlistProps} convertPrice={convertPrice} formatLocalPrice={formatLocalPrice} isStale={isStale} />
      case 'compare':
        return <ComparePage data={data} formatLocalPrice={formatLocalPrice} />
      case 'watchlist':
        return (
          <WatchlistPage
            watchlist={watchlist.items}
            allAssets={allAssets}
            onToggleWatch={watchlist.toggleWatch}
            alerts={alerts}
            onAddAlert={alerts.addAlert}
            onRemoveAlert={alerts.removeAlert}
            convertPrice={convertPrice}
            formatLocalPrice={formatLocalPrice}
            isStale={isStale}
          />
        )
      case 'portfolio':
        return (
          <PortfolioPage
            portfolio={portfolio}
            allAssets={allAssets}
            alerts={alerts}
            convertPrice={convertPrice}
            formatLocalPrice={formatLocalPrice}
            isStale={isStale}
          />
        )
      default:
        return <MapPage data={data} allAssets={allAssets} hotspots={hotspots} watchlistProps={watchlistProps} convertPrice={convertPrice} formatLocalPrice={formatLocalPrice} isStale={isStale} newsSignals={newsSignals} />
    }
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column' }}>
      <Navbar
        active={activeTab}
        setActive={setActiveTab}
        isLive={isLive}
        setIsLive={setIsLive}
        hotspotCount={hotspots.length}
        alertCount={alerts.activeAlerts.length}
        theme={theme}
        onToggleTheme={toggleTheme}
        allAssets={allAssets}
        formatLocalPrice={formatLocalPrice}
        lastUpdate={lastUpdate}
        generatedAt={generatedAt}
        oldestQuoteTs={oldestQuoteTs}
        sourcesHealth={sourcesHealth}
        isWorkerOnline={isWorkerOnline}
        connectionStatus={connectionStatus}
      />
      {!isWorkerOnline && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.15)',
          borderBottom: '1px solid var(--bear)',
          color: 'var(--bear)',
          padding: '8px 16px',
          fontSize: '12px',
          fontFamily: 'var(--font-mono)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          zIndex: 100,
        }}>
          <span>⚠</span>
          <span>
            <strong>Edge Feed Offline:</strong> Live market data aggregator unreachable ({workerError || 'Connection refused'}). Showing unavailable indicators. Reconnecting automatically...
          </span>
        </div>
      )}
      <TickerTape allAssets={allAssets} formatLocalPrice={formatLocalPrice} isStale={isStale} />
      <main style={{ flex:1 }}>
        {renderPage()}
      </main>

      {/* OSINT Live Tracker Map */}
      <OSINTMap news={newsSignals.news} />

      {/* Disclaimer */}
      <div style={fS.disclaimer}>
        <div style={fS.disclaimerInner}>
          <span style={fS.disclaimerIcon}>⚠</span>
          <span style={fS.disclaimerText}>
            <strong style={{ color:'var(--text-secondary)', fontWeight:600 }}>Disclaimer:</strong>{' '}
            Quidesk is for informational purposes only. Data displayed may be delayed or subject to change without notice.
            Nothing on this platform constitutes financial advice, investment advice, or a recommendation to buy or sell any asset.
            Trading involves significant risk of loss. Always do your own research (DYOR) and consult a qualified financial adviser before making any investment decisions.
            Quidesk and its contributors accept no liability for any losses arising from use of this platform.
          </span>
        </div>
      </div>

      {/* Footer */}
      <footer style={fS.footer}>
        <div style={fS.shareSection}>
          <div style={fS.shareInner}>
            <div style={fS.shareMeta}>
              <div style={fS.shareBadge}>
                <Share2 size={12} color="var(--accent)" />
                <span style={fS.shareHeading}>SHARE TERMINAL</span>
              </div>
              <span style={fS.shareSub}>Share live market intelligence with your network</span>
            </div>
            <SocialShareBar
              url="https://quidesk.github.io"
              text="Quidesk — Live Market Intelligence Terminal | Equities, Crypto, Metals, Energy & Forex"
              showLabels={true}
            />
          </div>
        </div>
        <div style={fS.inner}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Logo size={24} />
            <span style={fS.brand}>QUIDESK</span>
          </div>
          <span style={fS.text}>Market intelligence terminal · For informational purposes only</span>
          <div style={fS.metaRow}>
            {(() => {
              const entries = Object.entries(sourcesHealth || {});
              const okCount = entries.filter(([, v]) => v?.ok).length;
              const allOk = entries.length > 0 && okCount === entries.length && isWorkerOnline;
              const dotColor = !isWorkerOnline
                ? 'var(--bear)'
                : (entries.length === 0 ? 'var(--text-dim)' : (allOk ? 'var(--bull)' : 'var(--amber)'));
              return (
                <div style={fS.healthWrap}>
                  <button
                    type="button"
                    style={fS.healthChip}
                    onClick={() => setShowFeedHealth((v) => !v)}
                    aria-expanded={showFeedHealth}
                    aria-controls="footer-feed-health"
                    title="Inspect /v1/health per-source telemetry"
                  >
                    <span style={{ ...fS.healthDot, background: dotColor }} />
                    <span>
                      Feed {entries.length > 0 ? `${okCount}/${entries.length} ok` : (isWorkerOnline ? 'syncing' : 'offline')}
                    </span>
                  </button>
                  {showFeedHealth && (
                    <div id="footer-feed-health" style={fS.healthPanel}>
                      <div style={fS.healthHeader}>/v1/health · Upstream Sources</div>
                      {entries.length === 0 ? (
                        <div style={fS.healthRow}>No source telemetry yet</div>
                      ) : (
                        entries.map(([name, info]) => (
                          <div key={name} style={fS.healthRow}>
                            <span style={{ ...fS.healthDot, background: info?.ok ? 'var(--bull)' : 'var(--bear)' }} />
                            <span style={fS.healthName}>{name}</span>
                            <span style={{ color: info?.ok ? 'var(--bull)' : 'var(--bear)' }}>
                              {info?.ok ? 'ok' : 'down'}
                            </span>
                            <span style={fS.healthDim}>
                              {typeof info?.latencyMs === 'number' ? `${info.latencyMs}ms` : '—'}
                            </span>
                            <span style={fS.healthDim}>
                              lastOk: {formatHealthTimestamp(info?.lastOk)}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
            <span style={fS.text} title={BUILD_TIME ? `Built ${BUILD_TIME}` : undefined}>
              {formatBuildIdentity(BUILD_SHA, BUILD_TIME)}
            </span>
            <span style={fS.text}>
              Last tick: {lastUpdate ? formatHealthTimestamp(lastUpdate) : '—'}
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}

const fS = {
  shareSection: {
    borderBottom: '1px solid var(--border-subtle)',
    background: 'rgba(255, 255, 255, 0.015)',
  },
  shareInner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 28px',
    maxWidth: '1700px',
    margin: '0 auto',
    flexWrap: 'wrap',
    gap: '16px',
  },
  shareMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
  },
  shareBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    background: 'rgba(77, 158, 255, 0.08)',
    border: '1px solid rgba(77, 158, 255, 0.2)',
    borderRadius: '4px',
    padding: '4px 8px',
  },
  shareHeading: {
    fontFamily: 'var(--font-mono)',
    fontSize: '11px',
    fontWeight: 700,
    color: 'var(--accent)',
    letterSpacing: '0.06em',
  },
  shareSub: {
    fontFamily: 'var(--font-body)',
    fontSize: '12px',
    color: 'var(--text-dim)',
  },
  disclaimer: {
    background: 'rgba(244, 176, 17, 0.03)',
    borderTop: '1px solid rgba(244, 176, 17, 0.08)',
    borderBottom: '1px solid rgba(244, 176, 17, 0.08)',
    marginTop: '60px',
  },
  disclaimerInner: {
    display: 'flex', alignItems: 'flex-start', gap: '12px',
    padding: '16px 28px', maxWidth: '1700px', margin: '0 auto',
  },
  disclaimerIcon: {
    fontSize: '14px', color: 'var(--amber)', flexShrink: 0, marginTop: '2px',
  },
  disclaimerText: {
    fontFamily: 'var(--font-body)', fontSize: '12px',
    color: 'var(--text-dim)', lineHeight: 1.6,
  },
  footer: {
    borderTop: '1px solid var(--border-subtle)',
    background: 'var(--bg-surface)',
  },
  inner: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '20px 28px', maxWidth: '1700px', margin: '0 auto',
    flexWrap: 'wrap', gap: '12px',
  },
  brand: {
    display: 'flex', alignItems: 'center',
    fontFamily: 'var(--font-display)', fontSize: '12px',
    color: 'var(--text-secondary)', letterSpacing: '0.1em', opacity: 0.8,
  },
  text: {
    fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--text-dim)',
  },
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
  },
  healthWrap: {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
  },
  healthChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '3px 8px',
    borderRadius: '4px',
    border: '1px solid var(--border-mid)',
    background: 'var(--bg-panel)',
    color: 'var(--text-secondary)',
    fontFamily: 'var(--font-mono)',
    fontSize: '10px',
    cursor: 'pointer',
  },
  healthDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  healthPanel: {
    position: 'absolute',
    bottom: 'calc(100% + 8px)',
    right: 0,
    minWidth: '300px',
    padding: '10px 12px',
    borderRadius: '6px',
    border: '1px solid var(--border-mid)',
    background: 'var(--bg-panel)',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
    zIndex: 60,
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    fontFamily: 'var(--font-mono)',
    fontSize: '10px',
  },
  healthHeader: {
    fontWeight: 700,
    color: 'var(--text-secondary)',
    borderBottom: '1px solid var(--border-subtle)',
    paddingBottom: '4px',
  },
  healthRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap',
  },
  healthName: {
    minWidth: '58px',
    fontWeight: 600,
  },
  healthDim: {
    color: 'var(--text-dim)',
  },
}
