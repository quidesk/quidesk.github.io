import React, { useState, useEffect } from 'react'
import { ExternalLink, RefreshCw, Newspaper } from 'lucide-react'

// Free news sources (no key required)
const NEWS_FEEDS = [
  {
    id: 'coingecko',
    label: 'CRYPTO',
    color: 'var(--neon-orange)',
    url: 'https://api.coingecko.com/api/v3/news',
    parse: (json) => (json.data || []).slice(0, 12).map(n => ({
      id: n.id || n.title,
      title: n.title,
      description: n.description || '',
      url: n.url,
      source: n.author?.name || 'CoinGecko',
      publishedAt: n.updated_at ? new Date(n.updated_at * 1000) : new Date(),
      category: 'crypto',
    })),
  },
]

// Fallback mock news when APIs are unavailable
function getMockNews() {
  const now = Date.now()
  return [
    {
      id: '1', category: 'crypto',
      title: 'Bitcoin ETF Inflows Hit Record $1.2B in Single Day',
      description: 'Spot Bitcoin ETFs saw unprecedented inflows as institutional demand surged following the latest Fed commentary on interest rates.',
      source: 'CoinDesk', url: '#',
      publishedAt: new Date(now - 1000 * 60 * 15),
    },
    {
      id: '2', category: 'stocks',
      title: 'NVIDIA Surges 8% on Blackwell GPU Demand Outlook',
      description: 'NVIDIA raised its revenue guidance citing overwhelming demand for its next-generation Blackwell architecture chips from hyperscalers.',
      source: 'Bloomberg', url: '#',
      publishedAt: new Date(now - 1000 * 60 * 42),
    },
    {
      id: '3', category: 'commodities',
      title: 'Gold Hits New All-Time High Amid Geopolitical Tensions',
      description: 'Safe-haven demand pushed gold above $2,400/oz for the first time, with analysts citing persistent inflation and central bank purchases.',
      source: 'Reuters', url: '#',
      publishedAt: new Date(now - 1000 * 60 * 68),
    },
    {
      id: '4', category: 'crypto',
      title: 'Ethereum Layer-2 TVL Surpasses $50B Milestone',
      description: 'The combined total value locked across Ethereum Layer-2 networks crossed $50 billion, driven by activity on Arbitrum and Base.',
      source: 'The Block', url: '#',
      publishedAt: new Date(now - 1000 * 60 * 95),
    },
    {
      id: '5', category: 'stocks',
      title: 'S&P 500 Eyes 6,000 Level as Earnings Season Kicks Off',
      description: 'Wall Street bulls are optimistic as major banks report earnings. Analysts expect a 12% YoY earnings growth for Q1 2026.',
      source: 'MarketWatch', url: '#',
      publishedAt: new Date(now - 1000 * 60 * 130),
    },
    {
      id: '6', category: 'commodities',
      title: 'Crude Oil Steadies Near $80 Ahead of OPEC+ Meeting',
      description: 'WTI crude hovered near the $80 mark as traders awaited clarity on OPEC+ production quotas at this week\'s Vienna summit.',
      source: 'Reuters', url: '#',
      publishedAt: new Date(now - 1000 * 60 * 180),
    },
    {
      id: '7', category: 'crypto',
      title: 'Solana DeFi Volume Hits Monthly Record $28B',
      description: 'Solana\'s decentralized exchange ecosystem processed a record $28 billion in monthly trading volume, overtaking Ethereum DEX volume.',
      source: 'DeFiLlama', url: '#',
      publishedAt: new Date(now - 1000 * 60 * 240),
    },
    {
      id: '8', category: 'stocks',
      title: 'Fed Minutes Signal Two Rate Cuts Possible in 2026',
      description: 'The latest FOMC meeting minutes showed a majority of members believe two quarter-point cuts are appropriate if inflation trends hold.',
      source: 'WSJ', url: '#',
      publishedAt: new Date(now - 1000 * 60 * 300),
    },
    {
      id: '9', category: 'commodities',
      title: 'Silver Outperforms Gold as Industrial Demand Accelerates',
      description: 'Silver rose 4% this week outpacing gold, driven by surging demand from the solar panel and EV battery manufacturing sectors.',
      source: 'Kitco', url: '#',
      publishedAt: new Date(now - 1000 * 60 * 360),
    },
    {
      id: '10', category: 'crypto',
      title: 'BlackRock IBIT Options Volume Signals Bullish Institutional Sentiment',
      description: 'Options on the iShares Bitcoin ETF showed a heavily skewed call-to-put ratio, suggesting institutions are positioning for further upside.',
      source: 'Coinbase', url: '#',
      publishedAt: new Date(now - 1000 * 60 * 420),
    },
    {
      id: '11', category: 'stocks',
      title: 'Apple Vision Pro 2 Leaks Point to Major Display Upgrade',
      description: 'Supply chain sources indicate Apple\'s second-generation mixed reality headset will feature a micro-OLED display with 4x the resolution.',
      source: '9to5Mac', url: '#',
      publishedAt: new Date(now - 1000 * 60 * 480),
    },
    {
      id: '12', category: 'commodities',
      title: 'Natural Gas Futures Spike 12% on Unexpected Cold Snap Forecast',
      description: 'Henry Hub natural gas futures jumped sharply after NOAA forecasted below-normal temperatures across the eastern US through month-end.',
      source: 'EIA', url: '#',
      publishedAt: new Date(now - 1000 * 60 * 540),
    },
  ]
}

function timeAgo(date) {
  const diff = (Date.now() - date.getTime()) / 1000
  if (diff < 60) return `${Math.floor(diff)}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return date.toLocaleDateString()
}

const CATEGORY_COLORS = {
  crypto: 'var(--neon-orange)',
  stocks: 'var(--neon-cyan)',
  commodities: 'var(--neon-yellow)',
}

const CATEGORY_BG = {
  crypto: 'rgba(255,107,0,0.1)',
  stocks: 'var(--neon-cyan-dim)',
  commodities: 'var(--neon-yellow-dim)',
}

export default function NewsPage() {
  const [news, setNews] = useState(getMockNews())
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('all')
  const [featured, setFeatured] = useState(getMockNews()[0])

  const refresh = async () => {
    setLoading(true)
    try {
      const res = await fetch(NEWS_FEEDS[0].url)
      if (res.ok) {
        const json = await res.json()
        const parsed = NEWS_FEEDS[0].parse(json)
        if (parsed.length > 0) {
          setNews(parsed)
          setFeatured(parsed[0])
        }
      }
    } catch {
      // Keep mock data on failure
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const filtered = filter === 'all' ? news : news.filter(n => n.category === filter)

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>
            <Newspaper size={22} color="var(--neon-cyan)" style={{ marginRight: 10 }} />
            MARKET INTEL
          </h1>
          <p style={styles.sub}>Latest news across equities, crypto & commodities</p>
        </div>
        <button
          style={{ ...styles.refreshBtn, opacity: loading ? 0.5 : 1 }}
          onClick={refresh}
          disabled={loading}
        >
          <RefreshCw size={12} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          REFRESH
        </button>
      </div>

      {/* Filter tabs */}
      <div style={styles.filterRow}>
        {['all', 'stocks', 'crypto', 'commodities'].map(f => (
          <button
            key={f}
            style={{
              ...styles.filterBtn,
              ...(filter === f ? {
                background: f === 'all' ? 'var(--neon-cyan-dim)' : CATEGORY_BG[f],
                borderColor: f === 'all' ? 'var(--neon-cyan)' : CATEGORY_COLORS[f],
                color: f === 'all' ? 'var(--neon-cyan)' : CATEGORY_COLORS[f],
              } : {}),
            }}
            onClick={() => setFilter(f)}
          >
            {f.toUpperCase()}
            <span style={styles.filterCount}>
              {f === 'all' ? news.length : news.filter(n => n.category === f).length}
            </span>
          </button>
        ))}
      </div>

      {/* Featured story */}
      {featured && (
        <a href={featured.url} target="_blank" rel="noopener noreferrer" style={styles.featured}>
          <div style={styles.featuredBadge}>
            <span style={{
              ...styles.categoryTag,
              color: CATEGORY_COLORS[featured.category] || 'var(--neon-cyan)',
              background: CATEGORY_BG[featured.category] || 'var(--neon-cyan-dim)',
              borderColor: CATEGORY_COLORS[featured.category] || 'var(--neon-cyan)',
            }}>
              {featured.category?.toUpperCase()}
            </span>
            <span style={styles.featuredLabel}>◈ FEATURED</span>
          </div>
          <h2 style={styles.featuredTitle}>{featured.title}</h2>
          {featured.description && (
            <p style={styles.featuredDesc}>{featured.description}</p>
          )}
          <div style={styles.featuredMeta}>
            <span style={styles.metaSource}>{featured.source}</span>
            <span style={styles.metaDot}>·</span>
            <span style={styles.metaTime}>{timeAgo(featured.publishedAt)}</span>
            <ExternalLink size={11} color="var(--text-dim)" style={{ marginLeft: 'auto' }} />
          </div>
        </a>
      )}

      {/* News grid */}
      <div style={styles.grid}>
        {filtered.filter(n => n.id !== featured?.id).map(item => (
          <a
            key={item.id}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            style={styles.card}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--border-glow)'
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--border-subtle)'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            <div style={styles.cardTop}>
              <span style={{
                ...styles.categoryTag,
                color: CATEGORY_COLORS[item.category] || 'var(--neon-cyan)',
                background: CATEGORY_BG[item.category] || 'var(--neon-cyan-dim)',
                borderColor: CATEGORY_COLORS[item.category] || 'var(--neon-cyan)',
              }}>
                {item.category?.toUpperCase()}
              </span>
              <span style={styles.cardTime}>{timeAgo(item.publishedAt)}</span>
            </div>
            <h3 style={styles.cardTitle}>{item.title}</h3>
            {item.description && (
              <p style={styles.cardDesc}>{item.description.slice(0, 120)}{item.description.length > 120 ? '…' : ''}</p>
            )}
            <div style={styles.cardFooter}>
              <span style={styles.cardSource}>{item.source}</span>
              <ExternalLink size={10} color="var(--text-dim)" />
            </div>
          </a>
        ))}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

const styles = {
  container: {
    padding: '32px 24px',
    maxWidth: '1600px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '28px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontFamily: 'var(--font-display)',
    fontSize: '28px',
    fontWeight: 900,
    letterSpacing: '3px',
    color: 'var(--neon-cyan)',
    textShadow: '0 0 20px var(--neon-cyan-glow)',
    display: 'flex',
    alignItems: 'center',
  },
  sub: {
    fontFamily: 'var(--font-mono)',
    fontSize: '11px',
    color: 'var(--text-dim)',
    marginTop: '6px',
    letterSpacing: '1px',
  },
  refreshBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: 'none',
    border: '1px solid var(--border-panel)',
    borderRadius: '4px',
    color: 'var(--text-secondary)',
    fontFamily: 'var(--font-display)',
    fontSize: '9px',
    letterSpacing: '1.5px',
    padding: '7px 14px',
    cursor: 'pointer',
  },
  filterRow: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  filterBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: 'none',
    border: '1px solid var(--border-subtle)',
    borderRadius: '4px',
    color: 'var(--text-dim)',
    fontFamily: 'var(--font-display)',
    fontSize: '10px',
    letterSpacing: '1.5px',
    padding: '6px 14px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  filterCount: {
    fontFamily: 'var(--font-mono)',
    fontSize: '9px',
    opacity: 0.6,
  },
  featured: {
    display: 'block',
    background: 'var(--bg-card)',
    border: '1px solid var(--border-panel)',
    borderRadius: '10px',
    padding: '28px',
    textDecoration: 'none',
    transition: 'all 0.2s ease',
    boxShadow: '0 0 30px rgba(0,245,255,0.05)',
    cursor: 'pointer',
  },
  featuredBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '12px',
  },
  featuredLabel: {
    fontFamily: 'var(--font-display)',
    fontSize: '9px',
    color: 'var(--text-dim)',
    letterSpacing: '2px',
  },
  featuredTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '20px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    letterSpacing: '0.5px',
    lineHeight: 1.4,
    marginBottom: '10px',
  },
  featuredDesc: {
    fontFamily: 'var(--font-body)',
    fontSize: '14px',
    color: 'var(--text-secondary)',
    lineHeight: 1.6,
    marginBottom: '16px',
  },
  featuredMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  metaSource: {
    fontFamily: 'var(--font-display)',
    fontSize: '10px',
    color: 'var(--neon-cyan)',
    letterSpacing: '1px',
  },
  metaDot: {
    color: 'var(--text-dim)',
  },
  metaTime: {
    fontFamily: 'var(--font-mono)',
    fontSize: '10px',
    color: 'var(--text-dim)',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '14px',
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    background: 'var(--bg-card)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '8px',
    padding: '18px',
    textDecoration: 'none',
    transition: 'all 0.2s ease',
    cursor: 'pointer',
  },
  cardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryTag: {
    fontFamily: 'var(--font-display)',
    fontSize: '8px',
    letterSpacing: '1.5px',
    padding: '2px 7px',
    border: '1px solid',
    borderRadius: '3px',
  },
  cardTime: {
    fontFamily: 'var(--font-mono)',
    fontSize: '10px',
    color: 'var(--text-dim)',
  },
  cardTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    letterSpacing: '0.3px',
    lineHeight: 1.5,
  },
  cardDesc: {
    fontFamily: 'var(--font-body)',
    fontSize: '12px',
    color: 'var(--text-secondary)',
    lineHeight: 1.5,
    flex: 1,
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto',
    paddingTop: '8px',
    borderTop: '1px solid var(--border-subtle)',
  },
  cardSource: {
    fontFamily: 'var(--font-display)',
    fontSize: '9px',
    color: 'var(--text-dim)',
    letterSpacing: '1px',
  },
}
