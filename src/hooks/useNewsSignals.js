import { useState, useEffect, useRef } from 'react'

// Free RSS/news APIs — no key needed
// Using AllOrigins CORS proxy to fetch RSS feeds
const CORS = 'https://api.allorigins.win/get?url='

const FEEDS = [
  {
    url: 'https://decrypt.co/feed',
    source: 'Decrypt',
    sector: 'crypto',
    color: '#a78bfa',
  },
  {
    url: 'https://cryptoslate.com/feed/',
    source: 'CryptoSlate',
    sector: 'crypto',
    color: '#a78bfa',
  },
  {
    url: 'https://feeds.content.dowjones.io/public/rss/mw_realtimeheadlines',
    source: 'MarketWatch',
    sector: 'equities',
    color: '#4d9eff',
  },
  {
    url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10000664',
    source: 'CNBC Finance',
    sector: 'equities',
    color: '#4d9eff',
  },
  {
    url: 'https://www.mining.com/feed/',
    source: 'Mining.com',
    sector: 'metals',
    color: '#f0a500',
  },
  {
    url: 'https://oilprice.com/rss/main',
    source: 'OilPrice',
    sector: 'energy',
    color: '#f97316',
  },
  {
    url: 'https://www.forexlive.com/feed/news',
    source: 'ForexLive',
    sector: 'forex',
    color: '#22d3ee',
  },
  {
    url: 'https://www.investing.com/rss/news_1.rss',
    source: 'Investing.com',
    sector: 'forex',
    color: '#22d3ee',
  }
]

// Asset keyword map — used to draw canvas correlation lines
export const ASSET_KEYWORDS = {
  btc:  ['bitcoin','btc','crypto','digital asset','satoshi'],
  eth:  ['ethereum','eth','ether','defi','smart contract'],
  sol:  ['solana','sol'],
  bnb:  ['bnb','binance'],
  xrp:  ['xrp','ripple'],
  ada:  ['cardano','ada'],
  spx:  ['s&p','sp500','s&p 500','spy','stock market','wall street','equities'],
  ndx:  ['nasdaq','ndx','tech stocks','qqq'],
  dow:  ['dow','djia','dow jones'],
  aapl: ['apple','aapl','iphone'],
  nvda: ['nvidia','nvda','gpu','ai chips'],
  tsla: ['tesla','tsla','elon','ev'],
  gold: ['gold','xau','bullion','precious metal'],
  silver:['silver','xag'],
  platinum:['platinum','xpt'],
  copper:['copper'],
  wti:  ['wti','crude oil','oil','petroleum','barrel'],
  brent:['brent','crude'],
  ng:   ['natural gas','lng','gas price'],
  rbob:   ['gasoline','rbob','fuel'],
  eurusd: ['eur/usd','eurusd','euro dollar','ecb'],
  gbpusd: ['gbp/usd','gbpusd','sterling','pound'],
  usdjpy: ['usd/jpy','usdjpy','yen','bank of japan'],
  audusd: ['aud/usd','audusd','aussie'],
  usdcad: ['usd/cad','usdcad','canadian dollar'],
  usdchf: ['usd/chf','usdchf','swiss franc'],
  usdinr: ['usd/inr','usdinr','indian rupee','rbi'],
}

function parseRSS(xml, source, sector, color) {
  const items = []
  const parser = new DOMParser()
  const doc = parser.parseFromString(xml, 'text/xml')
  const nodes = doc.querySelectorAll('item')
  nodes.forEach((node, i) => {
    if (i >= 6) return
    const title = node.querySelector('title')?.textContent?.trim() || ''
    const link  = node.querySelector('link')?.textContent?.trim() ||
                  node.querySelector('guid')?.textContent?.trim() || '#'
    const pub   = node.querySelector('pubDate')?.textContent?.trim() || ''
    const desc  = node.querySelector('description')?.textContent?.replace(/<[^>]*>/g,'').trim().slice(0,120) || ''

    // Find mentioned assets
    const lower = (title + ' ' + desc).toLowerCase()
    const mentioned = Object.entries(ASSET_KEYWORDS)
      .filter(([,kws]) => kws.some(kw => lower.includes(kw)))
      .map(([id]) => id)

    if (title) {
      items.push({
        id: `${source}-${i}`,
        title,
        link,
        desc,
        source,
        sector,
        color,
        published: pub ? new Date(pub) : new Date(),
        mentionedAssets: mentioned,
      })
    }
  })
  return items
}

async function fetchWithTimeout(url, ms = 10000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  try {
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timer)
    return res
  } catch(e) {
    clearTimeout(timer)
    throw e
  }
}

async function fetchFeed(feed, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const encoded = encodeURIComponent(feed.url)
      const res = await fetchWithTimeout(`${CORS}${encoded}`, 10000)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      if (!json.contents) throw new Error('Empty contents')
      return parseRSS(json.contents, feed.source, feed.sector, feed.color)
    } catch(e) {
      if (attempt === retries) return []
      await new Promise(r => setTimeout(r, 1500 * (attempt + 1)))
    }
  }
  return []
}

export function useNewsSignals() {
  const [news, setNews]             = useState([])
  const [loading, setLoading]       = useState(false)
  const [newsCorrelations, setNewsCorrelations] = useState([])
  const [lastFetch, setLastFetch]   = useState(null)

  async function refresh() {
    setLoading(true)
    try {
      const results = await Promise.allSettled(FEEDS.map(fetchFeed))
      const all = results
        .filter(r => r.status === 'fulfilled')
        .flatMap(r => r.value)
        .sort((a, b) => b.published - a.published)
        .slice(0, 20)

      setNews(all)
      setLastFetch(new Date())

      // Build news-driven correlation pairs
      const pairs = []
      all.forEach(item => {
        const assets = item.mentionedAssets
        if (assets.length >= 2) {
          for (let i = 0; i < assets.length - 1; i++) {
            for (let j = i + 1; j < assets.length; j++) {
              const existing = pairs.find(
                p => (p.a === assets[i] && p.b === assets[j]) ||
                     (p.a === assets[j] && p.b === assets[i])
              )
              if (existing) {
                existing.strength = Math.min(1, existing.strength + 0.25)
                existing.sources.push(item.source)
              } else {
                pairs.push({
                  a: assets[i],
                  b: assets[j],
                  strength: 0.4,
                  sources: [item.source],
                  color: item.color,
                })
              }
            }
          }
        }
      })
      setNewsCorrelations(pairs)
    } catch(e) {
      console.warn('News fetch failed:', e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 30000)
    return () => clearInterval(id)
  }, [])

  return { news, loading, newsCorrelations, lastFetch, refresh }
}
