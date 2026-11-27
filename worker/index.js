/**
 * Quidesk Market Engine — Cloudflare Worker Entry Point
 * 
 * High-performance edge aggregator replacing all client-side multi-API polling.
 * Enforces strict CORS, Edge Cache API with stale-while-revalidate, and 1-minute cron pre-warming.
 */

import { ALLOWED_ORIGINS_DEFAULT } from './config.js';
import { handleQuotes, handleFx } from './routes/quotes.js';
import { handleHistory } from './routes/history.js';
import { handleNews } from './routes/news.js';
import { handleHealth } from './routes/health.js';

let _lastQuotesCache = null;

/**
 * Validates whether the incoming origin is permitted by the strict CORS allowlist.
 * Parses Origin with strict URL validation to block userinfo/subdomain lookalikes.
 * Dynamic loopback fallback is disabled when env.ENVIRONMENT === 'production'.
 * @param {string} origin
 * @param {object} env
 * @returns {string|null}
 */
export function getCorsOrigin(origin, env) {
  if (!origin || typeof origin !== 'string') return null;

  let parsed;
  try {
    parsed = new URL(origin);
  } catch {
    return null;
  }

  if (
    (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') ||
    parsed.username !== '' ||
    parsed.password !== '' ||
    parsed.pathname !== '/' ||
    parsed.search !== '' ||
    parsed.hash !== '' ||
    parsed.origin !== origin
  ) {
    return null;
  }

  const configured = env?.ALLOWED_ORIGINS
    ? env.ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean)
    : ALLOWED_ORIGINS_DEFAULT;
  if (configured.includes(parsed.origin)) return parsed.origin;

  // Dynamic loopback ports permitted strictly outside production environment
  if (
    env?.ENVIRONMENT !== 'production' &&
    parsed.protocol === 'http:' &&
    (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')
  ) {
    return parsed.origin;
  }

  return null;
}

/**
 * Injects hardened security and CORS headers into JSON API responses.
 * @param {Response} response
 * @param {string|null} origin
 * @param {string} [cacheControl]
 * @returns {Response}
 */
export function withHeaders(response, origin, cacheControl) {
  const headers = new Headers(response.headers);
  headers.set('Content-Type', 'application/json; charset=utf-8');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('Permissions-Policy', 'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()');
  headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  headers.set('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
  headers.set('Vary', 'Origin');

  if (origin) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type, Accept');
  } else {
    headers.delete('Access-Control-Allow-Origin');
  }

  if (cacheControl) {
    headers.set('Cache-Control', cacheControl);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Derives an origin-independent, header-free canonical cache key so arbitrary
 * query string cache-busters or caller headers cannot bypass or poison caches.
 * @param {URL} requestUrl
 * @param {string} pathname
 * @param {string} [normalizedQuery='']
 * @returns {Request}
 */
export function buildNormalizedCacheKey(requestUrl, pathname, normalizedQuery = '') {
  return new Request(`${requestUrl.origin}${pathname}${normalizedQuery}`, { method: 'GET' });
}

export default {
  /**
   * Main HTTP Fetch Handler
   */
  async fetch(request, env, ctx) {
    const origin = request.headers.get('Origin');
    const allowedOrigin = getCorsOrigin(origin, env);

    // Handle CORS Preflight OPTIONS
    if (request.method === 'OPTIONS') {
      const headers = {
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Accept',
        'Access-Control-Max-Age': '86400',
        'Vary': 'Origin',
      };
      if (allowedOrigin) {
        headers['Access-Control-Allow-Origin'] = allowedOrigin;
      }
      return new Response(null, {
        status: allowedOrigin || !origin ? 204 : 403,
        headers,
      });
    }

    if (request.method !== 'GET') {
      const denied = new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { Allow: 'GET, OPTIONS' },
      });
      return withHeaders(denied, allowedOrigin, 'no-store');
    }

    const url = new URL(request.url);
    const path = url.pathname;
    const cache = typeof caches !== 'undefined' ? caches.default : null;

    try {
      // 1. GET /v1/quotes (or legacy /api/market)
      if (path === '/v1/quotes' || path === '/api/market') {
        const quotesCacheKey = buildNormalizedCacheKey(url, '/v1/quotes');
        if (cache) {
          const cached = await cache.match(quotesCacheKey);
          if (cached) {
            if (!_lastQuotesCache) {
              try { _lastQuotesCache = await cached.clone().json(); } catch {}
            }
            return withHeaders(cached, allowedOrigin);
          }
        }

        const data = await handleQuotes(request, env);
        _lastQuotesCache = data;
        const jsonBody = JSON.stringify(data);
        const cacheCtrl = 'public, max-age=15, s-maxage=15, stale-while-revalidate=30';

        if (cache && ctx?.waitUntil) {
          const cacheableRes = withHeaders(new Response(jsonBody), null, cacheCtrl);
          ctx.waitUntil(cache.put(quotesCacheKey, cacheableRes));
        }
        return withHeaders(new Response(jsonBody), allowedOrigin, cacheCtrl);
      }

      // 2. GET /v1/fx (derived canonical FX matrix)
      if (path === '/v1/fx') {
        const quotesData = _lastQuotesCache || await handleQuotes(request, env);
        const fxData = handleFx(quotesData);
        return withHeaders(
          new Response(JSON.stringify(fxData)),
          allowedOrigin,
          'public, max-age=15, s-maxage=15, stale-while-revalidate=30'
        );
      }

      // 3. GET /v1/history
      if (path === '/v1/history') {
        const rawId = (url.searchParams.get('id') || 'spx').toLowerCase().trim();
        const rawRange = (url.searchParams.get('range') || '24H').toUpperCase().trim();
        const canNormalizeKey = /^[a-z0-9_-]{1,20}$/.test(rawId) && ['1H', '24H', '1D', '5D', '1M', '1Y'].includes(rawRange);
        const historyCacheKey = canNormalizeKey
          ? buildNormalizedCacheKey(url, '/v1/history', `?id=${encodeURIComponent(rawId)}&range=${encodeURIComponent(rawRange)}`)
          : null;

        if (cache && historyCacheKey) {
          const cached = await cache.match(historyCacheKey);
          if (cached) return withHeaders(cached, allowedOrigin);
        }

        const historyData = await handleHistory(request, env);
        const status = historyData?.statusCode || 200;
        const isSuccess = status === 200 && Array.isArray(historyData?.points) && historyData.points.length > 0;
        const jsonBody = JSON.stringify(historyData);
        const cacheCtrl = isSuccess ? 'public, max-age=300, s-maxage=300, stale-while-revalidate=600' : 'no-store';

        if (cache && historyCacheKey && isSuccess && ctx?.waitUntil) {
          const cacheableRes = withHeaders(new Response(jsonBody, { status }), null, cacheCtrl);
          ctx.waitUntil(cache.put(historyCacheKey, cacheableRes));
        }
        return withHeaders(new Response(jsonBody, { status }), allowedOrigin, cacheCtrl);
      }

      // 4. GET /v1/news
      if (path === '/v1/news') {
        const newsCacheKey = buildNormalizedCacheKey(url, '/v1/news');
        if (cache) {
          const cached = await cache.match(newsCacheKey);
          if (cached) return withHeaders(cached, allowedOrigin);
        }

        const newsData = await handleNews(request, env);
        const jsonBody = JSON.stringify(newsData);
        const cacheCtrl = 'public, max-age=60, s-maxage=60, stale-while-revalidate=120';

        if (cache && ctx?.waitUntil) {
          const cacheableRes = withHeaders(new Response(jsonBody), null, cacheCtrl);
          ctx.waitUntil(cache.put(newsCacheKey, cacheableRes));
        }
        return withHeaders(new Response(jsonBody), allowedOrigin, cacheCtrl);
      }

      // 5. GET /v1/health
      if (path === '/v1/health') {
        if (!_lastQuotesCache && cache) {
          try {
            const cachedQuotes = await cache.match(buildNormalizedCacheKey(url, '/v1/quotes'));
            if (cachedQuotes) {
              _lastQuotesCache = await cachedQuotes.clone().json();
            }
          } catch {}
        }
        const healthData = handleHealth(_lastQuotesCache?.health || {});
        return withHeaders(
          new Response(JSON.stringify(healthData)),
          allowedOrigin,
          'no-store'
        );
      }

      // 404 Route Not Found (avoid echoing raw request path)
      return withHeaders(
        new Response(JSON.stringify({ error: 'Not found', availableRoutes: ['/v1/quotes', '/v1/history', '/v1/news', '/v1/health', '/v1/fx'] }), { status: 404 }),
        allowedOrigin,
        'no-store'
      );
    } catch {
      return withHeaders(
        new Response(JSON.stringify({ error: 'Internal Worker Exception' }), { status: 500 }),
        allowedOrigin,
        'no-store'
      );
    }
  },

  /**
   * 1-Minute Cron Handler for Cache Pre-Warming
   */
  async scheduled(event, env, ctx) {
    try {
      const data = await handleQuotes(new Request('https://worker.internal/v1/quotes'), env);
      _lastQuotesCache = data;
    } catch {
      // scheduled job resilient fail
    }
  },
};
