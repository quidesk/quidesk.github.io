import { useState, useEffect, useCallback } from 'react';
import { fetchWorkerNews } from '../utils/api';
import { sanitizeUrl } from '../utils/security';

/**
 * Normalizes a Worker /v1/news item for UI rendering.
 * Asset tagging lives strictly in the Worker (worker/providers/news.js);
 * the client never runs keyword/regex matching. Sponsored items never carry asset tags.
 *
 * @param {object} item
 * @param {number} [index=0]
 * @returns {object}
 */
export function normalizeWorkerNewsItem(item = {}, index = 0) {
  const title = (item.title || '').trim();
  const desc = (item.summary || item.desc || '').trim();
  const isSponsored = Boolean(item.isSponsored) || /\bbinance\.com\b/i.test(item.link || '');
  const assetTags = !isSponsored && Array.isArray(item.assetTags)
    ? item.assetTags.map((t) => String(t).toLowerCase()).slice(0, 3)
    : [];

  return {
    id: item.id || `news-${index}-${Date.now()}`,
    title,
    link: sanitizeUrl(item.link || '#'),
    desc,
    source: item.source || 'OSINT Feed',
    sector: item.sector || 'equities',
    color: item.color || '#4d9eff',
    published: item.published ? new Date(item.published) : new Date(),
    mentionedAssets: assetTags,
    isSponsored,
  };
}

export function useNewsSignals(isLive = true) {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newsCorrelations, setNewsCorrelations] = useState([]);
  const [lastFetch, setLastFetch] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const articles = await fetchWorkerNews();
      const normalized = (articles || []).map((item, i) => normalizeWorkerNewsItem(item, i));

      setNews(normalized);
      setLastFetch(new Date());

      // Derive cross-asset correlations strictly from non-sponsored Worker-tagged items
      const pairs = [];
      normalized.forEach(item => {
        if (item.isSponsored) return;
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
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!isLive) return;
    const id = setInterval(refresh, 60000);
    return () => clearInterval(id);
  }, [isLive, refresh]);

  return { news, loading, newsCorrelations, lastFetch, refresh };
}
