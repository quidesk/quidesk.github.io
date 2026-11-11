/**
 * Quidesk Market Engine — Direct RSS News Provider & Strict OSINT Tagging
 * 
 * Ingests 8 authoritative financial RSS feeds directly without third-party proxies.
 * Deduplicates by canonical link, normalizes publication dates to ISO strings,
 * and executes strict word-boundary asset tagging.
 */

import { RSS_FEEDS } from '../config.js';

/**
 * Strict word-boundary ticker -> asset-id rules for OSINT financial news tagging.
 * Uppercase tickers are case-sensitive unless noted; names use exact phrases/word boundaries.
 * Zero substring keywords ('ev', 'elon', 'eth', 'sol', 'ada', 'dow', 'oil', 'crude', 'gas price').
 */
export const STRICT_ASSET_TAGGERS = [
  // Crypto
  { id: 'btc', regex: /\b(BTC|Bitcoin)\b/i },
  { id: 'eth', regex: /\b(ETH|Ethereum)\b/i },
  { id: 'sol', regex: /\b(SOL|Solana)\b/ },
  { id: 'bnb', regex: /\b(BNB|Binance\s+Coin)\b/i },
  { id: 'xrp', regex: /\b(XRP|Ripple)\b/i },
  { id: 'ada', regex: /\bCardano\b|\bADA\b(?!\s+compliance)/ },

  // Equities
  { id: 'nvda', regex: /\b(NVDA|Nvidia)\b/i },
  { id: 'tsla', regex: /\b(TSLA|Tesla)\b/i },
  { id: 'aapl', regex: /\b(AAPL|Apple\s+Inc|Apple['’]s)\b/ },
  { id: 'meta', regex: /\b(META|Meta\s+Platforms)\b/ },
  { id: 'spx', regex: /\b(SPY|S&P\s+500|SPX)\b/ },
  { id: 'ndx', regex: /\b(QQQ|Nasdaq)\b/i },
  { id: 'dow', regex: /\b(DIA|DJIA|Dow\s+Jones)\b/ },

  // Energy
  { id: 'wti', regex: /\b(WTI|West\s+Texas)\b/i },
  { id: 'brent', regex: /\bBrent\b/i },
  { id: 'ng', regex: /\b(NGAS|Natural\s+Gas|LNG|European\s+Gas)\b/i },
  { id: 'hoil', regex: /\b(HOIL|Heating\s+Oil)\b/i },

  // Metals
  { id: 'gold', regex: /\b(Gold|XAU|Bullion)\b/ },
  { id: 'silver', regex: /\b(Silver|XAG)\b/ },
  { id: 'platinum', regex: /\b(XPT|Platinum)\b/ },

  // Forex
  { id: 'usdinr', regex: /\b(USD\/INR|Rupee|RBI)\b/i },
  { id: 'usdjpy', regex: /\b(USD\/JPY|Yen|BOJ)\b/i },
  { id: 'eurusd', regex: /\b(EUR\/USD|ECB)\b/i },
  { id: 'gbpusd', regex: /\b(GBP\/USD|BoE)\b/i },
  { id: 'audusd', regex: /\bAUD\/USD\b/i },
  { id: 'usdcad', regex: /\bUSD\/CAD\b/i },
  { id: 'usdchf', regex: /\bUSD\/CHF\b/i },
  { id: 'nzdusd', regex: /\bNZD\/USD\b/i },
  { id: 'eurgbp', regex: /\bEUR\/GBP\b/i },
  { id: 'gbpjpy', regex: /\bGBP\/JPY\b/i },
  { id: 'eurjpy', regex: /\bEUR\/JPY\b/i },
  { id: 'eurinr', regex: /\bEUR\/INR\b/i },
];

/**
 * Extracts matching asset IDs from title and summary (max 3 tags, no defaults).
 * @param {string} text
 * @returns {string[]} Max 3 canonical asset IDs
 */
export function extractStrictAssetTags(text) {
  if (!text || typeof text !== 'string') return [];
  const matches = [];

  for (const tagger of STRICT_ASSET_TAGGERS) {
    if (tagger.regex.test(text)) {
      matches.push(tagger.id);
      if (matches.length >= 3) break;
    }
  }

  return matches;
}

/**
 * Unescapes basic HTML entities and strips XML CDATA.
 * @param {string} str
 * @returns {string}
 */
function cleanXmlText(str) {
  if (!str) return '';
  return str
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parses RSS / Atom XML string into article objects.
 * @param {string} xml
 * @param {string} sourceName
 * @param {string} sector
 * @returns {Array<object>}
 */
export function parseRssXml(xml, sourceName, sector) {
  if (!xml || typeof xml !== 'string') return [];
  const articles = [];

  // Match <item>...</item> or <entry>...</entry>
  const itemMatches = xml.match(/<(?:item|entry)[\s\S]*?<\/(?:item|entry)>/gi) || [];

  for (const block of itemMatches) {
    const titleMatch = block.match(/<title[\s\S]*?>([\s\S]*?)<\/title>/i);
    const linkMatch = block.match(/<link[\s\S]*?href=["']([^"']+)["']/i) || block.match(/<link[\s\S]*?>([\s\S]*?)<\/link>/i);
    const dateMatch = block.match(/<(?:pubDate|published|updated)[\s\S]*?>([\s\S]*?)<\/(?:pubDate|published|updated)>/i);
    const descMatch = block.match(/<(?:description|summary|content)[\s\S]*?>([\s\S]*?)<\/(?:description|summary|content)>/i);

    const title = cleanXmlText(titleMatch ? titleMatch[1] : '');
    let link = linkMatch ? cleanXmlText(linkMatch[1]) : '';
    const rawDate = dateMatch ? cleanXmlText(dateMatch[1]) : '';
    const desc = cleanXmlText(descMatch ? descMatch[1] : '');

    if (!title || !link) continue;

    // Normalize link
    link = link.replace(/\?.*$/, ''); // strip tracking query params

    let publishedAt;
    try {
      const parsed = Date.parse(rawDate);
      publishedAt = isNaN(parsed) ? new Date().toISOString() : new Date(parsed).toISOString();
    } catch {
      publishedAt = new Date().toISOString();
    }

    const combinedText = `${title} ${desc}`;
    const assetTags = extractStrictAssetTags(combinedText);

    articles.push({
      title,
      link,
      publishedAt,
      source: sourceName,
      sector,
      summary: desc.slice(0, 280),
      assetTags,
      isSponsored: false,
    });
  }

  return articles;
}

/**
 * Fetches and aggregates articles from all 8 RSS feeds.
 * Deduplicates by URL link and caps at 20 items sorted chronologically.
 * @returns {Promise<Array<object>>}
 */
export async function fetchAggregatedNews() {
  const feedPromises = RSS_FEEDS.map(async (feed) => {
    try {
      const res = await fetch(feed.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; QuideskNewsBot/1.0; +https://quidesk.github.io)',
          'Accept': 'application/rss+xml, application/xml, text/xml',
        },
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) return [];
      const xml = await res.text();
      return parseRssXml(xml, feed.source, feed.sector);
    } catch {
      return [];
    }
  });

  const settled = await Promise.allSettled(feedPromises);
  const allArticles = [];
  const seenLinks = new Set();

  settled.forEach((res) => {
    if (res.status === 'fulfilled' && Array.isArray(res.value)) {
      for (const item of res.value) {
        if (!seenLinks.has(item.link)) {
          seenLinks.add(item.link);
          allArticles.push(item);
        }
      }
    }
  });

  // Sort descending by publication date
  allArticles.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));

  return allArticles.slice(0, 20);
}
