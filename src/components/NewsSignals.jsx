import React, { useState } from 'react'
import { RefreshCw, ExternalLink, Radio, Share2 } from 'lucide-react'
import ShareModal from './ShareModal'

const SECTOR_LABELS = {
  crypto:   { label:'Crypto',    color:'#a78bfa' },
  equities: { label:'Equities',  color:'#4d9eff' },
  metals:   { label:'Metals',    color:'#f0a500' },
  energy:   { label:'Energy',    color:'#f97316' },
  forex:    { label:'Forex',     color:'#22d3ee' },
}

function timeAgo(date) {
  if (!date) return ''
  const diff = (Date.now() - date.getTime()) / 1000
  if (diff < 60)   return `${Math.floor(diff)}s ago`
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`
  return `${Math.floor(diff/3600)}h ago`
}

export default function NewsSignals({ news, loading, lastFetch, onRefresh, layout = 'vertical' }) {
  const [filter, setFilter] = useState('all')
  const [shareItem, setShareItem] = useState(null)

  const isHorz = layout === 'horizontal'
  const filtered = filter === 'all'
    ? news
    : news.filter(n => n.sector === filter)

  return (
    <div style={{...s.wrap, ...(isHorz ? { border: 'none', background: 'transparent' } : {})}}>
      {/* Header */}
      <div style={s.header}>
        <div style={s.headerLeft}>
          <Radio size={12} color="var(--bull)" style={{ flexShrink:0 }}/>
          <span style={s.title}>OSINT SIGNALS</span>
          <span style={s.subtitle}>OSINT · updates every 30s</span>
        </div>
        <div style={s.headerRight}>
          {lastFetch && (
            <span style={s.lastFetch}>
              {timeAgo(lastFetch)}
            </span>
          )}
          <button style={s.refreshBtn} onClick={onRefresh} title="Refresh now">
            <RefreshCw
              size={11}
              color="var(--text-dim)"
              style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }}
            />
          </button>
        </div>
      </div>

      {/* Filter pills */}
      <div style={s.filters}>
        {['all', 'crypto', 'equities', 'metals', 'energy', 'forex'].map(f => {
          const meta = SECTOR_LABELS[f] || { label:'All', color:'var(--accent)' }
          const isOn = filter === f
          return (
            <button
              key={f}
              style={{
                ...s.filterBtn,
                ...(isOn ? {
                  borderColor: f === 'all' ? 'var(--accent)' : meta.color,
                  color:       f === 'all' ? 'var(--accent)' : meta.color,
                  background:  f === 'all' ? 'var(--accent-dim)' : meta.color + '15',
                } : {}),
              }}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'All' : meta.label}
            </button>
          )
        })}
      </div>

      {/* News list */}
      <div style={{
        ...s.list,
        ...(isHorz ? {
          display: 'grid',
          gridTemplateRows: `repeat(${Math.min(3, filtered.length || 1)}, min-content)`,
          gridAutoColumns: '280px',
          gridAutoFlow: 'column',
          overflowX: 'auto',
          overflowY: 'hidden',
          maxHeight: 'none',
          padding: '10px 0',
          gap: '12px'
        } : {})
      }}>
        {loading && news.length === 0 ? (
          <div style={s.loading}>
            <div style={s.loadingDot}/>
            <span style={s.loadingText}>Scanning feeds...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div style={s.loading}>
            <span style={s.loadingText}>No signals in this sector</span>
          </div>
        ) : (
          filtered.map(item => {
            const meta = SECTOR_LABELS[item.sector] || {}
            return (
              <div
                key={item.id}
                style={{
                  ...s.item,
                  ...(isHorz ? {
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    minWidth: '280px',
                    maxWidth: '280px',
                    background: 'var(--bg-card)',
                    padding: '12px',
                    borderBottom: '1px solid var(--border-subtle)'
                  } : {})
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = isHorz ? 'var(--bg-card)' : 'transparent'}
              >
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'flex', flex: 1, textDecoration: 'none', minWidth: 0, gap: '10px' }}
                >
                  <div style={s.itemLeft}>
                    <span style={{ ...s.dot, background: meta.color || 'var(--accent)' }}/>
                  </div>
                  <div style={s.itemBody}>
                    <div style={s.itemTitle}>{item.title}</div>
                    <div style={s.itemMeta}>
                      <span style={{ ...s.itemSource, color: meta.color || 'var(--accent)' }}>
                        {item.source}
                      </span>
                      <span style={s.itemDot}>•</span>
                      <span style={s.itemTime}>{timeAgo(item.published)}</span>
                      {item.mentionedAssets.length > 0 && (
                        <>
                          <span style={s.itemDot}>•</span>
                          <span style={s.itemAssets}>
                            {item.mentionedAssets.slice(0,3).map(a => a.toUpperCase()).join(' ')}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </a>
              <button
                style={{
                  background: 'var(--bg-overlay)', 
                  border: '1px solid var(--border-subtle)', 
                  borderRadius: '6px',
                  cursor: 'pointer', 
                  padding: '4px 10px', 
                  display: 'flex', 
                  alignItems: 'center',
                  gap: '6px',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-body)',
                  fontSize: '11px',
                  fontWeight: 500,
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'var(--accent)'
                  e.currentTarget.style.color = 'var(--accent)'
                  e.currentTarget.style.background = 'var(--accent-dim)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--border-subtle)'
                  e.currentTarget.style.color = 'var(--text-primary)'
                  e.currentTarget.style.background = 'var(--bg-overlay)'
                }}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setShareItem(item)
                }}
                title="Share Insight"
              >
                <Share2 size={12} style={{ color: 'inherit' }} />
                Share
              </button>
              </div>
            )
          })
        )}
      </div>

      <ShareModal 
        isOpen={!!shareItem} 
        onClose={() => setShareItem(null)} 
        data={shareItem ? { type: 'news', news: shareItem } : null} 
      />

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

const s = {
  wrap: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '12px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 4px 20px rgba(0,0,0,0.12)',
    backdropFilter: 'blur(16px)'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid var(--border-subtle)',
    background: 'var(--bg-overlay)',
  },
  headerLeft: {
    display: 'flex', alignItems: 'center', gap: '8px',
  },
  title: {
    fontFamily: 'var(--font-body)',
    fontSize: '14px', fontWeight: 600,
    color: 'var(--text-primary)', letterSpacing: '-0.01em',
  },
  subtitle: {
    fontFamily: 'var(--font-body)',
    fontSize: '12px', color: 'var(--text-secondary)',
  },
  headerRight: {
    display: 'flex', alignItems: 'center', gap: '8px',
  },
  lastFetch: {
    fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-secondary)',
  },
  refreshBtn: {
    background: 'none', border: '1px solid var(--border-subtle)', cursor: 'pointer',
    padding: '6px', borderRadius: '6px', display: 'flex', alignItems: 'center',
    transition: 'border-color 0.2s'
  },
  filters: {
    display: 'flex', gap: '6px', padding: '12px 20px',
    borderBottom: '1px solid var(--border-subtle)',
    flexWrap: 'wrap',
  },
  filterBtn: {
    background: 'none',
    border: '1px solid var(--border-subtle)',
    borderRadius: '4px',
    color: 'var(--text-dim)',
    fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.06em',
    padding: '2px 8px', cursor: 'pointer', transition: 'all 0.12s',
  },
  list: {
    overflowY: 'auto',
    maxHeight: '400px',
    scrollbarWidth: 'thin',
  },
  loading: {
    display: 'flex', alignItems: 'center', gap: '8px',
    padding: '24px 20px',
  },
  loadingDot: {
    width: '8px', height: '8px', borderRadius: '50%',
    background: 'var(--bull)',
    animation: 'pulseDot 1.2s ease-in-out infinite',
  },
  loadingText: {
    fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-secondary)',
  },
  item: {
    display: 'flex', alignItems: 'flex-start', gap: '12px',
    padding: '14px 20px',
    borderBottom: '1px solid var(--border-subtle)',
    textDecoration: 'none',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  itemLeft: {
    paddingTop: '6px', flexShrink: 0,
  },
  dot: {
    display: 'block', width: '6px', height: '6px', borderRadius: '50%',
  },
  itemBody: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' },
  itemTitle: {
    fontFamily: 'var(--font-body)',
    fontSize: '13px', fontWeight: 500, lineHeight: 1.4,
    color: 'var(--text-primary)',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  itemMeta: {
    display: 'flex', alignItems: 'center', gap: '8px',
    fontFamily: 'var(--font-mono)', fontSize: '11px',
    color: 'var(--text-secondary)', flexWrap: 'wrap',
  },
  itemSource: {
    fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.04em',
  },
  itemDot: {
    color: 'var(--text-dim)', fontSize: '10px',
  },
  itemTime: {
    fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-dim)',
  },
  itemAssets: {
    fontFamily: 'var(--font-mono)', fontSize: '9px',
    color: 'var(--accent)', letterSpacing: '0.04em',
  },
}
