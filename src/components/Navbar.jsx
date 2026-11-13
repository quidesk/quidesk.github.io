import React, { useState, useEffect } from 'react'
import { Sun, Moon, RefreshCw, Share2 } from 'lucide-react'
import Logo from './Logo'
import SearchBar from './SearchBar'
import ShareModal from './ShareModal'
import { deriveFeedStatus } from '../lib/freshness'

const NAV_TABS = [
  { id:'map',       label:'Market Map',  short:'Map'  },
  { id:'equities',  label:'Equities',    short:'EQ'   },
  { id:'crypto',    label:'Crypto',      short:'₿'    },
  { id:'metals',    label:'Metals',      short:'Au'   },
  { id:'energy',    label:'Energy',      short:'Oil'  },
  { id:'forex',     label:'Forex',       short:'FX'   },
  { id:'compare',   label:'Compare',     short:'Cmp'  },
  { id:'watchlist', label:'Watchlist',   short:'★'    },
  { id:'portfolio', label:'Portfolio',   short:'P&L'  },
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
  formatLocalPrice,
  lastUpdate,
  generatedAt,
  oldestQuoteTs,
  sourcesHealth,
  isWorkerOnline,
  connectionStatus,
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
      } catch (e) {}
    } else {
      setShowGlobalShare(true)
    }
  }

  const feedStatus = deriveFeedStatus({
    isLive,
    isWorkerOnline,
    allAssets,
    sourcesHealth,
  })
  const pillActiveColor = feedStatus.color

  return (
    <>
      {/* ── Desktop Hero Header ── */}
      <header style={s.heroNav} className="d-none d-md-block">
        {/* Tier 1: Sovereign Brand Crown & Live Telemetry */}
        <div style={s.heroTopTier}>
          {/* Brand — Hero Emblem + Sovereign Typography */}
          <button style={s.heroBrand} onClick={() => setActive('map')} title="Quidesk — Sovereign Terminal">
            <div style={s.logoGlowWrapper}>
              <Logo size={42} />
            </div>
            <div style={s.heroBrandText}>
              <div style={s.heroTitleRow}>
                <span style={s.heroTitle} className="qd-brand-wordmark">QUIDESK</span>
                <span style={s.heroBadge}>SOVEREIGN EDITION</span>
                <div
                  id="qd-stream-status"
                  className={`qd-status-pill ${feedStatus.key === 'live' ? 'is-live' : ''}`}
                  style={{
                    ...s.heroLiveBadge,
                    background: feedStatus.key === 'live' ? 'rgba(34, 212, 122, 0.08)' : 'rgba(240, 64, 96, 0.08)',
                    borderColor: feedStatus.key === 'live' ? 'rgba(34, 212, 122, 0.25)' : 'rgba(240, 64, 96, 0.25)',
                    color: feedStatus.key === 'live' ? 'var(--bull)' : 'var(--bear)',
                  }}
                >
                  <span style={{
                    ...s.heroLiveDot,
                    background: pillActiveColor,
                    boxShadow: feedStatus.key === 'live' ? '0 0 8px var(--bull)' : 'none',
                    animation: feedStatus.key === 'live' ? 'pulseDot 1.6s ease-in-out infinite' : 'none',
                  }} />
                  <span style={{ ...s.heroLiveText, color: pillActiveColor }}>
                    {feedStatus.key === 'live' ? '● LIVE STREAM' : '● DELAYED'}
                  </span>
                </div>
              </div>
              <span style={s.heroTagline}>
                Live Market Intelligence, served neat and easy
              </span>
            </div>
          </button>

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

            <button style={s.iconBtn} onClick={() => window.location.reload()} title="Refresh telemetry">
              <RefreshCw size={14} color="var(--text-secondary)"/>
            </button>

            <button style={s.iconBtn} onClick={onToggleTheme} title="Toggle theme">
              {theme === 'dark'
                ? <Sun size={14} color="var(--text-secondary)"/>
                : <Moon size={14} color="var(--text-secondary)"/>
              }
            </button>

            <button
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
          <div style={s.tabs}>
            {NAV_TABS.map(t => (
              <button
                key={t.id}
                style={{ ...s.tab, ...(active === t.id ? s.tabOn : {}) }}
                onClick={() => setActive(t.id)}
              >
                {t.label}
                {t.id === 'map' && hotspotCount > 0 && (
                  <span style={s.hotBadge}>{hotspotCount}</span>
                )}
                {active === t.id && <div style={s.tabBar}/>}
              </button>
            ))}
          </div>

          <div style={s.heroSearchWrap}>
            <SearchBar allAssets={allAssets || []} onSelect={() => setActive('map')} />
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
            // Sort to preserve requested order
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
      <nav style={s.mobileTop} className="d-md-none">
        <button style={s.heroBrandMobile} onClick={() => setActive('map')}>
          <div style={{ ...s.logoGlowWrapper, boxShadow: '0 2px 14px rgba(212, 175, 55, 0.22)' }}>
            <Logo size={46} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 900, color: '#fff', letterSpacing: '0.06em', lineHeight: 1 }}>
                QUIDESK
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: '#D4AF37', fontWeight: 700, letterSpacing: '0.12em', background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '3px', padding: '1px 5px' }}>
                SOVEREIGN
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '2px' }}>
              <span style={{ fontSize: '9px', color: 'var(--text-secondary)', fontWeight: 500, letterSpacing: '0.01em' }}>
                Live Market Intelligence
              </span>
              <div onClick={(e) => { e.stopPropagation(); handleMobileShare(); }} style={{ padding: '2px 6px', background: '#4d9eff', borderRadius: '4px', border: 'none', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(77, 158, 255, 0.35)' }}>
                <Share2 size={10} color="#ffffff" />
                <span style={{ fontSize: '10px', color: '#ffffff', fontWeight: 700 }}>Share</span>
              </div>
            </div>
          </div>
        </button>
        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
          <SearchBar allAssets={allAssets || []} onSelect={() => setActive('map')}/>
          <button style={s.iconBtn} onClick={() => window.location.reload()} title="Refresh">
            <RefreshCw size={13} color="var(--text-secondary)"/>
          </button>
          <button style={s.iconBtn} onClick={onToggleTheme}>
            {theme === 'dark'
              ? <Sun size={14} color="var(--text-secondary)"/>
              : <Moon size={14} color="var(--text-secondary)"/>
            }
          </button>
          <button
            style={{ ...s.liveBtn, ...(isLive && feedStatus.key !== 'offline' ? s.liveBtnOn : s.liveBtnOff), padding:'4px 8px', borderColor: pillActiveColor, color: pillActiveColor }}
            onClick={() => setIsLive(v => !v)}
            title={`Feed status: ${feedStatus.label}`}
          >
            <span style={{
              ...s.liveDot,
              background: pillActiveColor,
              animation: feedStatus.key === 'live' ? 'pulseDot 1.6s ease-in-out infinite' : 'none',
            }}/>
          </button>
        </div>
      </nav>

      {/* ── Mobile bottom nav ── */}
      <div className="mobile-nav d-md-none">
        {NAV_TABS.map(t => (
          <button
            key={t.id}
            className={'mobile-nav-btn' + (active === t.id ? ' active' : '')}
            onClick={() => setActive(t.id)}
          >
            <span style={{ fontSize:'15px', lineHeight:1 }}>
              {t.id==='map'?'◉':t.id==='equities'?'📈':t.id==='crypto'?'₿':t.id==='metals'?'◎':t.id==='energy'?'⚡':t.id==='compare'?'⇄':t.id==='watchlist'?'★':t.id==='forex'?'⇄':'◈'}
            </span>
            {t.short}
          </button>
        ))}
      </div>
    </>
  )
}

const s = {
  heroNav: {
    position: 'sticky', top: 0, zIndex: 1000,
    isolation: 'isolate',
    background: 'rgba(8, 12, 20, 0.97)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    borderBottom: '1px solid var(--border-subtle)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
  },
  heroTopTier: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 28px',
    maxWidth: '1700px',
    margin: '0 auto',
    gap: '24px',
  },
  heroBrand: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
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
    borderRadius: '16px',
    background: 'radial-gradient(circle, rgba(212, 175, 55, 0.16) 0%, rgba(11, 14, 20, 0) 75%)',
    boxShadow: '0 4px 20px rgba(212, 175, 55, 0.25)',
  },
  heroBrandText: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  heroTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap',
  },
  heroTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '26px',
    fontWeight: 800,
    color: '#ffffff',
    letterSpacing: '0.16em',
    lineHeight: 1,
    whiteSpace: 'nowrap',
    textShadow: '0 2px 10px rgba(0,0,0,0.5)',
  },
  heroBadge: {
    fontFamily: 'var(--font-mono)',
    fontSize: '10px',
    fontWeight: 700,
    color: '#D4AF37',
    letterSpacing: '0.14em',
    background: 'rgba(212, 175, 55, 0.08)',
    border: '1px solid rgba(212, 175, 55, 0.35)',
    borderRadius: '4px',
    padding: '3px 8px',
    textTransform: 'uppercase',
  },
  heroLiveBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    background: 'rgba(34, 212, 122, 0.08)',
    border: '1px solid rgba(34, 212, 122, 0.25)',
    borderRadius: '4px',
    padding: '3px 8px',
  },
  heroLiveDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
  },
  heroLiveText: {
    fontFamily: 'var(--font-mono)',
    fontSize: '9px',
    fontWeight: 700,
    color: 'var(--bull)',
    letterSpacing: '0.08em',
  },
  heroTagline: {
    fontFamily: 'var(--font-body)',
    fontSize: '12px',
    color: 'var(--text-secondary)',
    fontWeight: 500,
    letterSpacing: '0.02em',
  },
  heroTelemetry: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexShrink: 0,
  },
  telemetryPill: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '2px',
    padding: '4px 10px',
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '6px',
  },
  telemetryLabel: {
    fontFamily: 'var(--font-mono)',
    fontSize: '8px',
    color: 'var(--text-dim)',
    letterSpacing: '0.1em',
    fontWeight: 600,
  },
  telemetryVal: {
    fontFamily: 'var(--font-mono)',
    fontSize: '11px',
    color: 'var(--text-secondary)',
    fontWeight: 600,
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
  },
  tab: {
    position: 'relative', background: 'none', border: '1px solid transparent',
    color: 'var(--text-dim)', fontFamily: 'var(--font-body)',
    fontSize: '13px', fontWeight: 500,
    padding: '7px 12px', cursor: 'pointer',
    transition: 'all 0.2s', borderRadius: '8px',
    whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px',
  },
  tabOn: {
    color: 'var(--text-primary)', fontWeight: 600,
    background: 'var(--bg-card)',
    borderColor: 'var(--border-subtle)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 2px 10px rgba(0,0,0,0.1)'
  },
  tabBar: {
    display: 'none'
  },
  hotBadge: {
    fontFamily: 'var(--font-mono)', fontSize: '9px',
    background: 'var(--accent-dim)', color: 'var(--accent)',
    border: '1px solid var(--border-accent)',
    borderRadius: '3px', padding: '0 5px', lineHeight: '16px',
  },
  alertPill: {
    fontFamily: 'var(--font-mono)', fontSize: '10px',
    color: 'var(--bear)', background: 'var(--bear-dim)',
    border: '1px solid rgba(240,64,96,0.25)',
    borderRadius: '4px', padding: '3px 8px', cursor: 'pointer',
  },
  iconBtn: {
    background: 'none', border: '1px solid var(--border-subtle)',
    borderRadius: '6px', padding: '6px 8px',
    cursor: 'pointer', display: 'flex', alignItems: 'center',
    transition: 'border-color 0.15s',
  },
  liveBtn: {
    display: 'flex', alignItems: 'center', gap: '6px',
    border: '1px solid', borderRadius: '6px',
    fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 500,
    padding: '5px 12px', cursor: 'pointer', transition: 'all 0.15s',
  },
  liveBtnOn: {
    background: 'rgba(34,212,122,0.07)',
    borderColor: 'rgba(34,212,122,0.2)', color: 'var(--bull)',
  },
  liveBtnOff: {
    background: 'rgba(240,64,96,0.07)',
    borderColor: 'rgba(240,64,96,0.2)', color: 'var(--bear)',
  },
  liveDot: {
    width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0,
  },
  clock: { textAlign: 'right' },
  clockTime: {
    fontFamily: 'var(--font-mono)', fontSize: '13px',
    color: 'var(--text-primary)', letterSpacing: '0.05em',
  },
  clockDate: {
    fontFamily: 'var(--font-mono)', fontSize: '9px',
    color: 'var(--text-dim)', letterSpacing: '0.04em',
  },
  mobileTop: {
    position: 'sticky', top: 0, zIndex: 100,
    background: 'var(--bg-overlay)', backdropFilter: 'blur(20px)',
    borderBottom: '1px solid var(--border-subtle)',
    display: 'flex', alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px', gap: '10px', minHeight: '76px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
  },
  shareNavBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: 'rgba(77, 158, 255, 0.08)',
    border: '1px solid rgba(77, 158, 255, 0.25)',
    borderRadius: '6px',
    padding: '5px 11px',
    cursor: 'pointer',
    color: 'var(--accent)',
    fontFamily: 'var(--font-mono)',
    fontSize: '11px',
    fontWeight: 600,
    transition: 'all 0.15s ease',
  },
  shareNavText: {
    letterSpacing: '0.03em',
  },
}
