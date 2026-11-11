/**
 * Quidesk Market Engine — Direct RSS News Provider & Strict OSINT Tagging
 * 
 * Ingests 8 authoritative financial RSS feeds directly without third-party proxies.
 * Deduplicates by canonical link, normalizes publication dates to ISO strings,
 * and executes strict word-boundary asset tagging.
 */

import { RSS_FEEDS } from '../config.js';

/**
 * Strict regex boundary definitions for OSINT financial news tagging.
 * Uppercase ticker codes are case-sensitive. Names are case-insensitive.
 * Excludes generic words like 'ev', 'elon', bare 'eth', 'oil', 'crude', 'gas price', 'crypto'.
 */
export const STRICT_ASSET_TAGGERS = [
  // Crypto
  { symbol: 'BTC', regex: /\b(Bitcoin|BTC|Satoshi)\b/i },
  { symbol: 'ETH', regex: /\b(Ethereum|Ether)\b/i }, // bare 'eth' excluded
  { symbol: 'SOL', regex: /(?:\bSolana\b|\bSOL\b)/ }, // 'SOL' case-sensitive; 'Solana' case-insensitive
  { symbol: 'BNB', regex: /(?:\bBinance\s*Coin\b|\bBNB\b)/ },
  { symbol: 'XRP', regex: /\b(Ripple|XRP)\b/i },
  { symbol: 'ADA', regex: /(?:\bCardano\b|\bADA\b)/ }, // 'ADA' case-sensitive; prevents matching 'Canada'

  // Equities
  { symbol: 'SPY', regex: /\b(S&P\s*500|SP500|SPY)\b/i },
  { symbol: 'QQQ', regex: /\b(Nasdaq\s*100|QQQ)\b/i },
  { symbol: 'DIA', regex: /(?:\bDow\s*Jones\b|\bDJIA\b)/i }, // DOW requires "Dow Jones" or "DJIA"
  { symbol: 'AAPL', regex: /(?:\bApple\s*Inc\b|\bAAPL\b)/i },
  { symbol: 'NVDA', regex: /\b(NVIDIA|NVDA)\b/i },
  { symbol: 'TSLA', regex: /(?:\bTesla\b|\bTSLA\b)/ }, // bare 'ev' / 'elon' removed

  // Metals
  { symbol: 'XAU/USD', regex: /\b(Gold\s*Bullion|Gold\s*Price|XAU)\b/i },
  { symbol: 'XAG/USD', regex: /\b(Silver\s*Bullion|Silver\s*Price|XAG)\b/i },
  { symbol: 'XPT/USD', regex: /\b(Platinum\s*Bullion|XPT)\b/i },

  // Energy (bare 'oil', 'crude', 'gas price' removed)
  { symbol: 'WTI', regex: /\b(WTI\s*Crude|WTI\s*Oil|West\s*Texas\s*Intermediate)\b/i },
  { symbol: 'BRENT', regex: /\b(Brent\s*Crude|Brent\s*Oil)\b/i },
  { symbol: 'NGAS', regex: /\b(Natural\s*Gas\s*Futures|Henry\s*Hub|LNG\s*export)\b/i },
  { symbol: 'HOIL', regex: /\b(Heating\s*Oil\s*Futures|ULSD)\b/i },

  // Forex
  { symbol: 'EUR/USD', regex: /\b(EUR\/USD|EURUSD)\b/i },
  { symbol: 'GBP/USD', regex: /\b(GBP\/USD|GBPUSD)\b/i },
  { symbol: 'USD/JPY', regex: /\b(USD\/JPY|USDJPY)\b/i },
  { symbol: 'AUD/USD', regex: /\b(AUD\/USD|AUDUSD)\b/i },
  { symbol: 'USD/CAD', regex: /\b(USD\/CAD|USDCAD)\b/i },
  { symbol: 'USD/CHF', regex: /\b(USD\/CHF|USDCHF)\b/i },
  { symbol: 'USD/INR', regex: /\b(USD\/INR|USDINR)\b/i },
  { symbol: 'EUR/INR', regex: /\b(EUR\/INR|EURINR)\b/i },
];

/**
 * Extracts matching asset tags from title and summary.
 * @param {string} text
 * @returns {string[]} Max 3 tags
 */
export function extractStrictAssetTags(text) {
  if (!text || typeof text !== 'string') return [];
  const matches = [];

  for (const tagger of STRICT_ASSET_TAGGERS) {
    if (tagger.regex.test(text)) {
      matches.push(tagger.symbol);
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
      assetTags: assetTags.length > 0 ? assetTags : [sector.toUpperCase()],
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
