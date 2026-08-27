import React, { useState, useEffect } from 'react'
import { Sun, Moon, RefreshCw, Facebook, Instagram, Share2 } from 'lucide-react'
import Logo from './Logo'
import SearchBar from './SearchBar'
import ShareModal from './ShareModal'

const XLogo = ({ size = 14, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
)

const WhatsappIcon = ({ size = 16, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.086 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
)

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

export default function Navbar({ active, setActive, isLive, setIsLive, hotspotCount, alertCount, theme, onToggleTheme, allAssets, formatLocalPrice }) {
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

  return (
    <>
      {/* ── Desktop navbar ── */}
      <nav style={s.nav} className="d-none d-md-block">
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

      {/* ── Floating Social Bar (Desktop Only) ── */}
      <div style={s.floatingShare} className="d-none d-md-flex">
        <button style={{...s.iconBtn, padding: '8px', borderRadius: '50%', background: '#25D366', borderColor: '#25D366', boxShadow: '0 2px 8px rgba(37,211,102,0.4)'}} onClick={() => setShowGlobalShare(true)} title="Share on WhatsApp">
          <WhatsappIcon size={16} color="#ffffff"/>
        </button>
        <button style={{...s.iconBtn, padding: '8px', borderRadius: '50%', background: '#1877F2', borderColor: '#1877F2', boxShadow: '0 2px 8px rgba(24,119,242,0.4)'}} onClick={() => setShowGlobalShare(true)} title="Share on Facebook">
          <Facebook size={16} color="#ffffff"/>
        </button>
        <button style={{...s.iconBtn, padding: '8px', borderRadius: '50%', background: '#000000', borderColor: 'rgba(255,255,255,0.15)', boxShadow: '0 2px 8px rgba(0,0,0,0.6)'}} onClick={() => setShowGlobalShare(true)} title="Share on X">
          <XLogo size={16} color="#ffffff"/>
        </button>
        <button style={{...s.iconBtn, padding: '8px', borderRadius: '50%', background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)', borderColor: 'transparent', boxShadow: '0 2px 8px rgba(220,39,67,0.4)'}} onClick={() => setShowGlobalShare(true)} title="Share on Instagram">
          <Instagram size={16} color="#ffffff"/>
        </button>
      </div>

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
        <button style={{ ...s.brand, flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }} onClick={() => setActive('map')}>
          <Logo size={180} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '4px' }}>
            <span style={{ fontSize: '9px', color: 'var(--text-secondary)', fontWeight: 500, letterSpacing: '0.01em', paddingLeft: '4px' }}>
              Live Market Intelligence
            </span>
            <div onClick={(e) => { e.stopPropagation(); handleMobileShare(); }} style={{ padding: '3px 8px', background: '#4d9eff', borderRadius: '4px', border: 'none', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(77, 158, 255, 0.35)' }}>
              <Share2 size={10} color="#ffffff" />
              <span style={{ fontSize: '10px', color: '#ffffff', fontWeight: 700 }}>Share</span>
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
  floatingShare: {
    position: 'fixed',
    top: '50%',
    right: '0',
    transform: 'translateY(-50%)',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    zIndex: 9999,
    background: 'var(--bg-overlay)',
    backdropFilter: 'blur(16px)',
    padding: '10px 8px',
    borderTopLeftRadius: '12px',
    borderBottomLeftRadius: '12px',
    border: '1px solid var(--border-subtle)',
    borderRight: 'none',
    boxShadow: '-4px 0 24px rgba(0,0,0,0.3)',
  },
}
