import React, { useState } from 'react'
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
import Logo from './components/Logo'

export default function App() {
  const [activeTab, setActiveTab] = useState('map')
  const { data, allAssets, lastUpdate, isLive, setIsLive, hotspots, isStale } = useMarketData()
  const watchlist                  = useWatchlist()
  const portfolio                  = usePortfolio(allAssets)
  const alerts                     = useAlerts(allAssets)
  const { convertPrice, formatLocalPrice, loaded } = useCurrencyRates()
  const { theme, toggle: toggleTheme } = useTheme()

  const watchlistProps = {
    isWatched: watchlist.isWatched,
    onToggleWatch: watchlist.toggleWatch,
    convertPrice,
    formatLocalPrice
  }

  const renderPage = () => {
    switch (activeTab) {
      case 'map':
        return <MapPage data={data} allAssets={allAssets} hotspots={hotspots} watchlistProps={watchlistProps} convertPrice={convertPrice} formatLocalPrice={formatLocalPrice} isStale={isStale} />
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
        return <MapPage data={data} allAssets={allAssets} hotspots={hotspots} watchlistProps={watchlistProps} convertPrice={convertPrice} formatLocalPrice={formatLocalPrice} />
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
      />
      <TickerTape allAssets={allAssets} formatLocalPrice={formatLocalPrice} isStale={isStale} />
      <main style={{ flex:1 }}>
        {renderPage()}
      </main>

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
        <div style={fS.inner}>
          <span style={fS.brand}><Logo size={160} /></span>
          <span style={fS.text}>Market intelligence terminal · For informational purposes only</span>
          <span style={fS.text}>Last tick: {lastUpdate.toLocaleTimeString()}</span>
        </div>
      </footer>
    </div>
  )
}

const fS = {
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
}
