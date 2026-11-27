import React, { useState, useEffect } from 'react'
import { Sun, Moon, RefreshCw, Share2 } from 'lucide-react'
import Logo from './Logo'
import SearchBar from './SearchBar'
import ShareModal from './ShareModal'
import { deriveFeedStatus } from '../lib/freshness'

const NAV_TABS = [
  { id:'map',       label:'Market Map',  short:'Map' },
  { id:'equities',  label:'Equities',    short:'EQ'  },
  { id:'crypto',    label:'Crypto',      short:'Cry' },
  { id:'metals',    label:'Metals',      short:'Mtl' },
  { id:'energy',    label:'Energy',      short:'Eng' },
  { id:'forex',     label:'Forex',       short:'FX'  },
  { id:'compare',   label:'Compare',     short:'Cmp' },
  { id:'watchlist', label:'Watchlist',   short:'Fav' },
  { id:'portfolio', label:'Portfolio',   short:'P&L' },
]

export default function Navbar({
  active,
  setActive,
  isLive,
  setIsLive,
  hotspotCount,
  alertCount,
  theme,
  onToggleTheme,
  allAssets,
  onSelectSearchAsset,
  formatLocalPrice,
  lastUpdate,
  generatedAt,
  oldestQuoteTs,
  sourcesHealth,
  isWorkerOnline,
}) {
  const [clock, setClock] = useState(new Date())
  const [showGlobalShare, setShowGlobalShare] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const shareUrl = 'https://quidesk.github.io'
  const shareText = 'Check out Quidesk - Live Market Intelligence, served neat and easy!'

  const handleMobileShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Quidesk', text: shareText, url: shareUrl })
      } catch {}
    } else {
      setShowGlobalShare(true)
    }
  }

  const handleSearchPick = (asset) => {
    if (onSelectSearchAsset) {
      onSelectSearchAsset(asset)
    } else {
      setActive('map')
    }
  }

  const feedStatus = deriveFeedStatus({
    isLive,
    isWorkerOnline,
    allAssets,
    sourcesHealth,
  })
  const pillActiveColor = feedStatus.color

  let badgeLabel = '● LIVE';
  if (!isWorkerOnline || feedStatus.key === 'offline') {
    badgeLabel = '● OFFLINE';
  } else if (!isLive || feedStatus.key === 'paused') {
    badgeLabel = '● PAUSED';
  } else if (feedStatus.key === 'closed') {
    badgeLabel = '● CLOSED';
  } else if (feedStatus.key === 'delayed') {
    const delaySec = generatedAt ? Math.max(1, Math.floor((Date.now() - new Date(generatedAt).getTime()) / 1000)) : null;
    badgeLabel = delaySec !== null ? `● DELAYED ${delaySec}s` : '● DELAYED';
  } else {
    badgeLabel = '● LIVE';
  }

  const statusBg = feedStatus.key === 'live'
    ? 'var(--sc-gain-bg)'
    : feedStatus.key === 'delayed'
    ? 'var(--amber-dim)'
    : feedStatus.key === 'offline'
    ? 'var(--sc-loss-bg)'
    : 'var(--bg-surface)';

  const statusBorder = feedStatus.key === 'live'
    ? 'rgba(54, 201, 130, 0.32)'
    : feedStatus.key === 'delayed'
    ? 'var(--border-accent)'
    : feedStatus.key === 'offline'
    ? 'rgba(240, 106, 100, 0.32)'
    : 'var(--border-subtle)';

  return (
    <>
      {/* ── Desktop Hero Header ── */}
      <header style={s.heroNav} className="d-none d-md-block">
        <div style={s.heroTopTier}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button type="button" style={s.heroBrand} onClick={() => setActive('map')} title="Quidesk Live Market Intelligence Terminal">
              <div style={s.logoGlowWrapper}>
                <Logo size={42} />
              </div>
              <div style={s.heroBrandText}>
                <div style={s.heroTitleRow}>
                  <span style={s.heroTitle} className="qd-brand-wordmark">Quidesk</span>
                </div>
                <span style={s.heroTagline}>
                  Live Market Intelligence, served neat and easy
                </span>
              </div>
            </button>

            <button
              type="button"
              id="qd-stream-status"
              onClick={() => setIsLive && setIsLive(v => !v)}
              title={`Feed status: ${feedStatus.label} (click to ${isLive ? 'pause' : 'resume'})`}
              className={`qd-status-pill ${feedStatus.key === 'live' ? 'is-live' : ''}`}
              style={{
                ...s.heroLiveBadge,
                cursor: 'pointer',
                background: statusBg,
                borderColor: statusBorder,
                color: pillActiveColor,
              }}
            >
              <span style={{ ...s.heroLiveText, color: pillActiveColor }}>
                {badgeLabel}
              </span>
            </button>
          </div>

          {/* Right Telemetry & Controls */}
          <div style={s.heroTelemetry}>
            {generatedAt ? (
              <div
                style={s.telemetryPill}
                title={`Worker generatedAt: ${new Date(generatedAt).toLocaleString('en-US', { timeZoneName: 'short' })}${oldestQuoteTs ? ` · Oldest quoteTs: ${new Date(oldestQuoteTs).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short' })}` : ''}`}
              >
                <span style={s.telemetryLabel}>LAST UPDATED</span>
                <span style={s.telemetryVal}>
                  {new Date(generatedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short' })}
                </span>
              </div>
            ) : (
              <div
                style={s.telemetryPill}
                title="No authoritative Worker snapshot received yet"
              >
                <span style={s.telemetryLabel}>LAST UPDATED</span>
                <span style={s.telemetryVal}>
                  {lastUpdate
                    ? (lastUpdate instanceof Date ? lastUpdate : new Date(lastUpdate)).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short' })
                    : '—'}
                </span>
              </div>
            )}

            <button type="button" style={s.iconBtn} onClick={() => window.location.reload()} title="Refresh telemetry" aria-label="Refresh telemetry">
              <RefreshCw size={14} color="var(--text-secondary)"/>
            </button>

            <button type="button" style={s.iconBtn} onClick={onToggleTheme} title="Toggle light or dark theme" aria-label="Toggle theme">
              {theme === 'dark'
                ? <Sun size={14} color="var(--text-secondary)"/>
                : <Moon size={14} color="var(--text-secondary)"/>
              }
            </button>

            <button
              type="button"
              style={s.shareNavBtn}
              onClick={() => setShowGlobalShare(true)}
              title="Share terminal insight"
              aria-label="Share terminal"
            >
              <Share2 size={13} color="var(--accent)" />
              <span style={s.shareNavText}>Share</span>
            </button>

            <div style={s.clock}>
              <div style={s.clockTime}>
                {clock.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', second:'2-digit', timeZoneName:'short' })}
              </div>
              <div style={s.clockDate}>
                {clock.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })}
              </div>
            </div>
          </div>
        </div>

        {/* Tier 2: Navigation Tabs & Search Command */}
        <div style={s.heroNavTier}>
          <div
            style={s.tabs}
            role="tablist"
            aria-label="Terminal views"
            {...{ focusgroup: 'tablist nomemory' }}
          >
            {NAV_TABS.map(t => {
              const isSelected = active === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  id={`tab-${t.id}`}
                  aria-selected={isSelected}
                  aria-controls={`panel-${t.id}`}
                  style={{ ...s.tab, ...(isSelected ? s.tabOn : {}) }}
                  onClick={() => setActive(t.id)}
                >
                  {t.label}
                  {t.id === 'map' && hotspotCount > 0 && (
                    <span style={s.hotBadge}>{hotspotCount}</span>
                  )}
                  {isSelected && <div style={s.tabBar} aria-hidden="true" />}
                </button>
              );
            })}
          </div>

          <div style={s.heroSearchWrap}>
            <SearchBar allAssets={allAssets || []} onSelect={handleSearchPick} />
            {alertCount > 0 && (
              <button style={s.alertPill} onClick={() => setActive('watchlist')}>
                {alertCount} alert{alertCount > 1 ? 's' : ''}
              </button>
            )}
          </div>
        </div>
      </header>

      <ShareModal
        isOpen={showGlobalShare}
        onClose={() => setShowGlobalShare(false)}
        formatLocalPrice={formatLocalPrice}
        data={{
          type: 'global',
          assets: (() => {
            const targets = ['BTC', 'EUR/INR', 'WTI', 'XAU/USD', 'USD/INR', 'QQQ'];
            const popular = (allAssets || []).filter(a => targets.includes(a.symbol)).slice(0, 6);
            if (popular.length < 6) {
              const missing = 6 - popular.length;
              popular.push(...(allAssets || []).filter(a => !targets.includes(a.symbol)).slice(0, missing));
            }
            return popular.sort((a, b) => {
              const idxA = targets.indexOf(a.symbol);
              const idxB = targets.indexOf(b.symbol);
              if (idxA === -1 && idxB === -1) return 0;
              if (idxA === -1) return 1;
              if (idxB === -1) return -1;
              return idxA - idxB;
            });
          })()
        }}
      />

      {/* ── Mobile top bar ── */}
      <nav style={s.mobileTop} className="d-md-none" aria-label="Mobile top bar">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '8px', minWidth: 0 }}>
          <button type="button" style={{ ...s.heroBrandMobile, minWidth: 0, flex: '1 1 auto' }} onClick={() => setActive('map')}>
            <div style={s.logoGlowWrapper}>
              <Logo size={36} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px', minWidth: 0 }}>
              <span style={{ fontFamily: 'var(--font-brand, var(--font-display))', fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.025em', lineHeight: 1 }}>
                Quidesk
              </span>
              <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '150px' }}>
                Live Market Intelligence
              </span>
            </div>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            <button
              type="button"
              onClick={handleMobileShare}
              style={{
                padding: '4px 8px',
                minHeight: '30px',
                background: 'var(--accent-dim)',
                borderRadius: '6px',
                border: '1px solid var(--border-accent)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer',
                color: 'var(--accent)',
                fontSize: '10px',
                fontWeight: 700,
              }}
              aria-label="Share terminal"
            >
              <Share2 size={11} color="var(--accent)" />
              <span>Share</span>
            </button>
            <button type="button" style={s.iconBtn} onClick={() => window.location.reload()} title="Refresh" aria-label="Refresh telemetry">
              <RefreshCw size={13} color="var(--text-secondary)"/>
            </button>
            <button type="button" style={s.iconBtn} onClick={onToggleTheme} title="Toggle theme" aria-label="Toggle theme">
              {theme === 'dark'
                ? <Sun size={14} color="var(--text-secondary)"/>
                : <Moon size={14} color="var(--text-secondary)"/>
              }
            </button>
            <button
              type="button"
              style={{ ...s.liveBtn, background: statusBg, borderColor: statusBorder, color: pillActiveColor, padding:'4px 8px' }}
              onClick={() => setIsLive && setIsLive(v => !v)}
              title={`Feed status: ${feedStatus.label}`}
              aria-label={`Feed status: ${feedStatus.label}`}
            >
              <span style={{
                ...s.liveDot,
                background: pillActiveColor,
                animation: feedStatus.key === 'live' ? 'pulseDot 1.6s ease-in-out infinite' : 'none',
              }}/>
            </button>
          </div>
        </div>

        <div style={{ width: '100%', minWidth: 0 }}>
          <SearchBar allAssets={allAssets || []} onSelect={handleSearchPick} fullWidth />
        </div>
      </nav>

      {/* ── Mobile bottom nav ── */}
      <nav className="mobile-nav d-md-none" role="tablist" aria-label="Mobile navigation">
        {NAV_TABS.map(t => {
          const isSelected = active === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`mob-tab-${t.id}`}
              aria-selected={isSelected}
              className={'mobile-nav-btn' + (isSelected ? ' active' : '')}
              onClick={() => setActive(t.id)}
            >
              <span style={{ fontSize:'14px', lineHeight:1, fontFamily: 'var(--font-mono)' }} aria-hidden="true">
                {t.id==='map'?'◉':t.id==='equities'?'↗':t.id==='crypto'?'₿':t.id==='metals'?'Au':t.id==='energy'?'Oil':t.id==='compare'?'⇄':t.id==='watchlist'?'★':t.id==='forex'?'¥':'◈'}
              </span>
              {t.short}
            </button>
          );
        })}
      </nav>
    </>
  )
}

const s = {
  heroNav: {
    position: 'sticky', top: 0, zIndex: 1000,
    isolation: 'isolate',
    background: 'var(--surface-chrome)',
    backdropFilter: 'blur(18px)',
    WebkitBackdropFilter: 'blur(18px)',
    borderBottom: '1px solid var(--border-subtle)',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.16)',
  },
  heroTopTier: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 28px',
    maxWidth: '1700px',
    margin: '0 auto',
    gap: '24px',
  },
  heroBrand: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    textAlign: 'left',
  },
  heroBrandMobile: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    textAlign: 'left',
  },
  logoGlowWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    padding: '2px',
    borderRadius: '14px',
    background: 'var(--accent-subtle)',
    border: '1px solid var(--border-subtle)',
  },
  heroBrandText: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
  },
  heroTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap',
  },
  heroTitle: {
    fontFamily: 'var(--font-brand, var(--font-display))',
    fontSize: '24px',
    fontWeight: 800,
    color: 'var(--text-primary)',
    letterSpacing: '-0.025em',
    lineHeight: 1,
    whiteSpace: 'nowrap',
  },
  heroBadge: {
    fontFamily: 'var(--font-mono)',
    fontSize: '10px',
    fontWeight: 700,
    color: 'var(--accent)',
    letterSpacing: '0.14em',
    background: 'var(--accent-dim)',
    border: '1px solid var(--border-accent)',
    borderRadius: '4px',
    padding: '3px 8px',
    textTransform: 'uppercase',
  },
  heroLiveBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    background: 'var(--sc-gain-bg)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '6px',
    padding: '4px 10px',
  },
  heroLiveDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
  },
  heroLiveText: {
    fontFamily: 'var(--font-mono)',
    fontSize: '10px',
    fontWeight: 700,
    color: 'var(--bull)',
    letterSpacing: '0.06em',
  },
  heroTagline: {
    fontFamily: 'var(--font-body)',
    fontSize: '12px',
    color: 'var(--text-secondary)',
    fontWeight: 500,
    letterSpacing: '0.01em',
  },
  heroTelemetry: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexShrink: 0,
  },
  telemetryPill: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '2px',
    padding: '4px 10px',
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '6px',
  },
  telemetryLabel: {
    fontFamily: 'var(--font-mono)',
    fontSize: '9px',
    color: 'var(--text-dim)',
    letterSpacing: '0.08em',
    fontWeight: 600,
  },
  telemetryVal: {
    fontFamily: 'var(--font-mono)',
    fontSize: '11px',
    color: 'var(--text-secondary)',
    fontWeight: 600,
    fontVariantNumeric: 'tabular-nums lining-nums',
  },
  heroNavTier: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '6px 28px',
    maxWidth: '1700px',
    margin: '0 auto',
    borderTop: '1px solid var(--border-subtle)',
    gap: '20px',
  },
  heroSearchWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexShrink: 0,
  },
  tabs: {
    display: 'flex', gap: '6px', flex: 1,
    overflowX: 'auto', scrollbarWidth: 'none',
    scrollSnapType: 'inline proximity',
    scrollPaddingInline: '8px',
  },
  tab: {
    position: 'relative', background: 'none', border: '1px solid transparent',
    color: 'var(--text-dim)', fontFamily: 'var(--font-body)',
    fontSize: '13px', fontWeight: 500,
    padding: '7px 14px', cursor: 'pointer',
    transition: 'all 0.2s cubic-bezier(0.22, 1, 0.36, 1)', borderRadius: '8px',
    whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px',
    scrollSnapAlign: 'start',
  },
  tabOn: {
    color: 'var(--text-primary)', fontWeight: 600,
    background: 'var(--bg-card-hover)',
    borderColor: 'var(--sc-border-strong)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
  },
  tabBar: {
    position: 'absolute',
    bottom: '-1px',
    left: '12px',
    right: '12px',
    height: '2px',
    background: 'var(--sc-accent)',
    borderRadius: '2px',
  },
  hotBadge: {
    fontFamily: 'var(--font-mono)', fontSize: '10px',
    background: 'var(--accent-dim)', color: 'var(--accent)',
    border: '1px solid var(--border-accent)',
    borderRadius: '4px', padding: '0 5px', lineHeight: '16px',
  },
  alertPill: {
    fontFamily: 'var(--font-mono)', fontSize: '10px',
    color: 'var(--bear)', background: 'var(--bear-dim)',
    border: '1px solid rgba(240, 106, 100, 0.32)',
    borderRadius: '4px', padding: '4px 8px', cursor: 'pointer',
  },
  iconBtn: {
    background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
    borderRadius: '6px', padding: '6px 9px', minWidth: '30px', minHeight: '30px',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'border-color 0.2s cubic-bezier(0.22, 1, 0.36, 1)',
  },
  liveBtn: {
    display: 'flex', alignItems: 'center', gap: '6px',
    border: '1px solid', borderRadius: '6px',
    fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 600,
    padding: '5px 12px', cursor: 'pointer', transition: 'all 0.2s',
    minHeight: '30px',
  },
  liveBtnOn: {
    background: 'var(--sc-gain-bg)',
    borderColor: 'rgba(54, 201, 130, 0.32)', color: 'var(--bull)',
  },
  liveBtnOff: {
    background: 'var(--sc-loss-bg)',
    borderColor: 'rgba(240, 106, 100, 0.32)', color: 'var(--bear)',
  },
  liveDot: {
    width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0,
  },
  clock: { textAlign: 'right' },
  clockTime: {
    fontFamily: 'var(--font-mono)', fontSize: '13px',
    color: 'var(--text-primary)', letterSpacing: '0.04em',
    fontVariantNumeric: 'tabular-nums lining-nums',
  },
  clockDate: {
    fontFamily: 'var(--font-mono)', fontSize: '10px',
    color: 'var(--text-dim)', letterSpacing: '0.03em',
  },
  mobileTop: {
    position: 'sticky', top: 0, zIndex: 100,
    background: 'var(--surface-chrome)', backdropFilter: 'blur(18px)',
    WebkitBackdropFilter: 'blur(18px)',
    borderBottom: '1px solid var(--border-subtle)',
    display: 'flex', flexDirection: 'column', alignItems: 'stretch',
    padding: '10px 12px', gap: '8px',
    width: '100%', boxSizing: 'border-box', overflowX: 'clip',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.16)',
  },
  shareNavBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: 'var(--accent-dim)',
    border: '1px solid var(--border-accent)',
    borderRadius: '6px',
    padding: '6px 12px',
    minHeight: '30px',
    cursor: 'pointer',
    color: 'var(--accent)',
    fontFamily: 'var(--font-mono)',
    fontSize: '11px',
    fontWeight: 600,
    transition: 'all 0.2s cubic-bezier(0.22, 1, 0.36, 1)',
  },
  shareNavText: {
    letterSpacing: '0.02em',
  },
}
