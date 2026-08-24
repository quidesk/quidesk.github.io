import React, { useState, useEffect } from 'react'
import { Sun, Moon, RefreshCw } from 'lucide-react'
import Logo from './Logo'
import SearchBar from './SearchBar'

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

export default function Navbar({ active, setActive, isLive, setIsLive, hotspotCount, alertCount, theme, onToggleTheme, allAssets }) {
  const [clock, setClock] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <>
      {/* ── Desktop navbar ── */}
      <nav style={s.nav} className="desktop-only">
        <div style={s.inner}>

          {/* Brand — logo + wordmark */}
          <button style={{ ...s.brand, flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }} onClick={() => setActive('map')}>
            <Logo size={220} />
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 500, letterSpacing: '0.02em', paddingLeft: '4px' }}>
              Live Market Intelligence, served neat and easy
            </span>
          </button>

          {/* Divider */}
          <div style={s.divider} />

          {/* Tabs */}
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

          {/* Right controls */}
          <div style={s.right}>
            <SearchBar allAssets={allAssets || []} onSelect={() => setActive('map')} />

            {alertCount > 0 && (
              <button style={s.alertPill} onClick={() => setActive('watchlist')}>
                {alertCount} alert{alertCount > 1 ? 's' : ''}
              </button>
            )}

            <button style={s.iconBtn} onClick={() => window.location.reload()} title="Refresh page">
              <RefreshCw size={14} color="var(--text-secondary)"/>
            </button>

            <button style={s.iconBtn} onClick={onToggleTheme} title="Toggle theme">
              {theme === 'dark'
                ? <Sun size={14} color="var(--text-secondary)"/>
                : <Moon size={14} color="var(--text-secondary)"/>
              }
            </button>

            <button
              style={{ ...s.liveBtn, ...(isLive ? s.liveBtnOn : s.liveBtnOff) }}
              onClick={() => setIsLive(v => !v)}
            >
              <span style={{
                ...s.liveDot,
                background: isLive ? 'var(--bull)' : 'var(--bear)',
                boxShadow: isLive ? '0 0 6px var(--bull)' : 'none',
                animation: isLive ? 'pulseDot 1.6s ease-in-out infinite' : 'none',
              }}/>
              {isLive ? 'Live' : 'Paused'}
            </button>

            <div style={s.clock}>
              <div style={s.clockTime}>
                {clock.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', second:'2-digit' })}
              </div>
              <div style={s.clockDate}>
                {clock.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Mobile top bar ── */}
      <nav style={s.mobileTop} className="mobile-only">
        <button style={{ ...s.brand, flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }} onClick={() => setActive('map')}>
          <Logo size={180} />
          <span style={{ fontSize: '9px', color: 'var(--text-secondary)', fontWeight: 500, letterSpacing: '0.01em', paddingLeft: '4px' }}>
            Live Market Intelligence, served neat and easy
          </span>
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
            style={{ ...s.liveBtn, ...(isLive ? s.liveBtnOn : s.liveBtnOff), padding:'4px 8px' }}
            onClick={() => setIsLive(v => !v)}
          >
            <span style={{
              ...s.liveDot,
              background: isLive ? 'var(--bull)' : 'var(--bear)',
              animation: isLive ? 'pulseDot 1.6s ease-in-out infinite' : 'none',
            }}/>
          </button>
        </div>
      </nav>

      {/* ── Mobile bottom nav ── */}
      <div className="mobile-nav mobile-only">
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
  nav: {
    position:'sticky', top:0, zIndex:100,
    background:'var(--bg-overlay)',
    backdropFilter:'blur(24px)',
    borderBottom:'1px solid var(--border-subtle)',
    boxShadow: '0 4px 24px rgba(0,0,0,0.2)'
  },
  inner: {
    display:'flex', alignItems:'center', gap:'0',
    padding:'0 24px', minHeight:'64px',
    maxWidth:'1700px', margin:'0 auto',
  },
  brand: {
    display:'flex', alignItems:'center', gap:'12px',
    background:'none', border:'none', cursor:'pointer',
    flexShrink:0, padding:'0 4px',
  },
  brandText: { display:'flex', flexDirection:'column', gap:'1px' },
  brandName: {
    fontFamily:'var(--font-display)', fontSize:'16px', fontWeight:700,
    color:'var(--text-primary)', letterSpacing:'-0.01em', textAlign:'left',
  },
  brandTag: {
    fontFamily:'var(--font-mono)', fontSize:'10px',
    color:'var(--text-dim)', letterSpacing:'0.02em',
  },
  divider: {
    width:'1px', height:'24px',
    background:'var(--border-mid)',
    margin:'0 24px', flexShrink:0,
  },
  tabs: {
    display:'flex', gap:'6px', flex:1,
    overflowX:'auto', scrollbarWidth:'none',
  },
  tab: {
    position:'relative', background:'none', border:'1px solid transparent',
    color:'var(--text-dim)', fontFamily:'var(--font-body)',
    fontSize:'13px', fontWeight:500,
    padding:'7px 12px', cursor:'pointer',
    transition:'all 0.2s', borderRadius:'8px',
    whiteSpace:'nowrap', display:'flex', alignItems:'center', gap:'6px',
  },
  tabOn: {
    color:'var(--text-primary)', fontWeight: 600,
    background:'var(--bg-card)',
    borderColor:'var(--border-subtle)',
    boxShadow:'inset 0 1px 0 rgba(255,255,255,0.06), 0 2px 10px rgba(0,0,0,0.1)'
  },
  tabBar: {
    display: 'none'
  },
  hotBadge: {
    fontFamily:'var(--font-mono)', fontSize:'9px',
    background:'var(--accent-dim)', color:'var(--accent)',
    border:'1px solid var(--border-accent)',
    borderRadius:'3px', padding:'0 5px', lineHeight:'16px',
  },
  right: {
    display:'flex', alignItems:'center', gap:'10px',
    marginLeft:'auto', flexShrink:0,
  },
  alertPill: {
    fontFamily:'var(--font-mono)', fontSize:'10px',
    color:'var(--bear)', background:'var(--bear-dim)',
    border:'1px solid rgba(240,64,96,0.25)',
    borderRadius:'4px', padding:'3px 8px', cursor:'pointer',
  },
  iconBtn: {
    background:'none', border:'1px solid var(--border-subtle)',
    borderRadius:'6px', padding:'6px 8px',
    cursor:'pointer', display:'flex', alignItems:'center',
    transition:'border-color 0.15s',
  },
  liveBtn: {
    display:'flex', alignItems:'center', gap:'6px',
    border:'1px solid', borderRadius:'6px',
    fontFamily:'var(--font-mono)', fontSize:'11px', fontWeight:500,
    padding:'5px 12px', cursor:'pointer', transition:'all 0.15s',
  },
  liveBtnOn: {
    background:'rgba(34,212,122,0.07)',
    borderColor:'rgba(34,212,122,0.2)', color:'var(--bull)',
  },
  liveBtnOff: {
    background:'rgba(240,64,96,0.07)',
    borderColor:'rgba(240,64,96,0.2)', color:'var(--bear)',
  },
  liveDot: {
    width:'6px', height:'6px', borderRadius:'50%', flexShrink:0,
  },
  clock: { textAlign:'right' },
  clockTime: {
    fontFamily:'var(--font-mono)', fontSize:'13px',
    color:'var(--text-primary)', letterSpacing:'0.05em',
  },
  clockDate: {
    fontFamily:'var(--font-mono)', fontSize:'9px',
    color:'var(--text-dim)', letterSpacing:'0.04em',
  },
  mobileTop: {
    position:'sticky', top:0, zIndex:100,
    background:'var(--bg-overlay)', backdropFilter:'blur(20px)',
    borderBottom:'1px solid var(--border-subtle)',
    display:'flex', alignItems:'center',
    justifyContent:'space-between',
    padding:'12px 16px', gap:'10px', minHeight:'72px'
  },
}
