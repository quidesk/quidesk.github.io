import { useState, useEffect } from 'react';
import { fetchWorkerNews } from '../utils/api';
import { sanitizeUrl } from '../utils/security';

/**
 * Strict regex boundary map for OSINT news matching.
 * Prohibits false-positive matches (e.g. 'down', 'slowdown', 'shadow' matching DOW;
 * 'solution', 'solid', 'consolidate' matching SOL;
 * 'Canada' matching ADA;
 * 'method', 'whether', 'ethernet' matching ETH;
 * generic 'EV' / 'Elon' matching TSLA;
 * 'oil' alone matching crude).
 */

const UPPERCASE_TICKERS = {
  btc: /\bBTC\b/,
  eth: /\bETH\b/,
  sol: /\bSOL\b/,
  bnb: /\bBNB\b/,
  xrp: /\bXRP\b/,
  ada: /\bADA\b/,
  spx: /\b(SPY|SPX|S&P\s*500)\b/,
  ndx: /\b(QQQ|NDX)\b/,
  dow: /\b(DOW|DJIA)\b/,
  aapl: /\bAAPL\b/,
  nvda: /\bNVDA\b/,
  tsla: /\bTSLA\b/,
  meta: /\bMETA\b/,
  gold: /\b(XAU|GOLD)\b/,
  silver: /\b(XAG|SILVER)\b/,
  platinum: /\b(XPT|PLATINUM)\b/,
  wti: /\bWTI\b/,
  brent: /\bBRENT\b/,
  ng: /\bNG\b/,
  hoil: /\bHOIL\b/,
  eurusd: /\bEUR\/?USD\b/,
  gbpusd: /\bGBP\/?USD\b/,
  usdjpy: /\bUSD\/?JPY\b/,
  audusd: /\bAUD\/?USD\b/,
  usdcad: /\bUSD\/?CAD\b/,
  usdchf: /\bUSD\/?CHF\b/,
  nzdusd: /\bNZD\/?USD\b/,
  eurgbp: /\bEUR\/?GBP\b/,
  gbpjpy: /\bGBP\/?JPY\b/,
  eurjpy: /\bEUR\/?JPY\b/,
  usdinr: /\bUSD\/?INR\b/,
  eurinr: /\bEUR\/?INR\b/,
};

const CASE_INSENSITIVE_NAMES = {
  btc: /\b(bitcoin|satoshi)\b/i,
  eth: /\b(ethereum|ether)\b/i,
  sol: /\b(solana)\b/i,
  bnb: /\b(binance\s*coin|binance)\b/i,
  xrp: /\b(ripple)\b/i,
  ada: /\b(cardano)\b/i,
  spx: /\b(s&p\s*500|standard\s*&\s*poor'?s)\b/i,
  ndx: /\b(nasdaq\s*100|nasdaq)\b/i,
  dow: /\b(dow\s*jones)\b/i,
  aapl: /\b(apple\s*inc\.?|iphone|macbook)\b/i,
  nvda: /\b(nvidia)\b/i,
  tsla: /\b(tesla(?!\s*coil))\b/i,
  meta: /\b(meta\s*platforms)\b/i,
  gold: /\b(gold\s*bullion|gold\s*spot|gold\s*price|gold\s*futures)\b/i,
  silver: /\b(silver\s*bullion|silver\s*spot|silver\s*price|silver\s*futures)\b/i,
  platinum: /\b(platinum\s*spot|platinum\s*bullion)\b/i,
  wti: /\b(crude\s*oil|wti\s*crude)\b/i,
  brent: /\b(brent\s*crude)\b/i,
  ng: /\b(natural\s*gas|lng)\b/i,
  hoil: /\b(heating\s*oil)\b/i,
};

/**
 * Applies strict word-boundary asset tagging across headline and summary text.
 * @param {string} title
 * @param {string} [summary='']
 * @returns {Array<string>} Array of matched asset ids (e.g. ['btc', 'eth'])
 */
export function tagNewsAssets(title = '', summary = '') {
  const text = `${title} ${summary}`;
  const matched = new Set();

  for (const [id, regex] of Object.entries(UPPERCASE_TICKERS)) {
    if (regex.test(text)) {
      matched.add(id);
    }
  }

  for (const [id, regex] of Object.entries(CASE_INSENSITIVE_NAMES)) {
    if (regex.test(text)) {
      matched.add(id);
    }
  }

  return Array.from(matched);
}

// Backward compatibility map
export const ASSET_KEYWORDS = {
  btc: ['bitcoin', 'btc'],
  eth: ['ethereum', 'eth'],
  sol: ['solana', 'sol'],
  bnb: ['bnb', 'binance'],
  xrp: ['xrp', 'ripple'],
  ada: ['cardano', 'ada'],
  spx: ['s&p 500', 'sp500', 'spy'],
  ndx: ['nasdaq', 'ndx', 'qqq'],
  dow: ['dow jones', 'djia', 'dow'],
  aapl: ['apple', 'aapl'],
  nvda: ['nvidia', 'nvda'],
  tsla: ['tesla', 'tsla'],
  gold: ['gold', 'xau'],
  silver: ['silver', 'xag'],
  platinum: ['platinum', 'xpt'],
  wti: ['wti', 'crude oil'],
  brent: ['brent'],
  ng: ['natural gas', 'lng'],
  hoil: ['heating oil'],
  eurusd: ['eur/usd', 'eurusd'],
  gbpusd: ['gbp/usd', 'gbpusd'],
  usdjpy: ['usd/jpy', 'usdjpy'],
  audusd: ['aud/usd', 'audusd'],
  usdcad: ['usd/cad', 'usdcad'],
  usdchf: ['usd/chf', 'usdchf'],
  usdinr: ['usd/inr', 'usdinr'],
};

export function useNewsSignals() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newsCorrelations, setNewsCorrelations] = useState([]);
  const [lastFetch, setLastFetch] = useState(null);

  async function refresh() {
    setLoading(true);
    try {
      const articles = await fetchWorkerNews();
      const normalized = (articles || []).map((item, i) => {
        const title = (item.title || '').trim();
        const desc = (item.summary || item.desc || '').trim();
        const mentioned = tagNewsAssets(title, desc);

        return {
          id: item.id || `news-${i}-${Date.now()}`,
          title,
          link: sanitizeUrl(item.link || '#'),
          desc,
          source: item.source || 'OSINT Feed',
          sector: item.sector || 'equities',
          color: item.color || '#4d9eff',
          published: item.published ? new Date(item.published) : new Date(),
          mentionedAssets: mentioned,
        };
      });

      setNews(normalized);
      setLastFetch(new Date());

      // Derive cross-asset correlations from co-mentioned assets
      const pairs = [];
      normalized.forEach(item => {
        const assets = item.mentionedAssets;
        if (assets.length >= 2) {
          for (let i = 0; i < assets.length - 1; i++) {
            for (let j = i + 1; j < assets.length; j++) {
              const existing = pairs.find(
                p => (p.a === assets[i] && p.b === assets[j]) ||
                     (p.a === assets[j] && p.b === assets[i])
              );
              if (existing) {
                existing.strength = Math.min(1, existing.strength + 0.25);
                existing.sources.push(item.source);
              } else {
                pairs.push({
                  a: assets[i],
                  b: assets[j],
                  strength: 0.4,
                  sources: [item.source],
                  color: item.color,
                });
              }
            }
          }
        }
      });
      setNewsCorrelations(pairs);
    } catch (e) {
      console.warn('Worker news fetch failed:', e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 60000);
    return () => clearInterval(id);
  }, []);

  return { news, loading, newsCorrelations, lastFetch, refresh };
}
