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
 * Validates whether the incoming origin is permitted by the CORS allowlist.
 * @param {string} origin
 * @param {object} env
 * @returns {string|null}
 */
export function getCorsOrigin(origin, env) {
  if (!origin) return null;
  const configured = env?.ALLOWED_ORIGINS ? env.ALLOWED_ORIGINS.split(',').map(s => s.trim()) : ALLOWED_ORIGINS_DEFAULT;
  if (configured.includes(origin)) return origin;
  // Support wildcard or localhost variations in dev
  if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) return origin;
  return null;
}

/**
 * Injects standard security and CORS headers into responses.
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

  if (origin) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type, Accept');
    headers.set('Vary', 'Origin');
  } else {
    headers.set('Access-Control-Allow-Origin', '*');
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

export default {
  /**
   * Main HTTP Fetch Handler
   */
  async fetch(request, env, ctx) {
    const origin = request.headers.get('Origin');
    const allowedOrigin = getCorsOrigin(origin, env);

    // Handle CORS Preflight OPTIONS
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': allowedOrigin || '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Accept',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    if (request.method !== 'GET') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(request.url);
    const path = url.pathname;
    const cache = typeof caches !== 'undefined' ? caches.default : null;
    const cacheKey = new Request(url.toString(), request);

    try {
      // 1. GET /v1/quotes (or legacy /api/market)
      if (path === '/v1/quotes' || path === '/api/market') {
        if (cache) {
          const cached = await cache.match(cacheKey);
          if (cached) return withHeaders(cached, allowedOrigin);
        }

        const data = await handleQuotes(request, env);
        _lastQuotesCache = data;
        const res = withHeaders(
          new Response(JSON.stringify(data)),
          allowedOrigin,
          'public, max-age=15, s-maxage=15, stale-while-revalidate=30'
        );

        if (cache && ctx?.waitUntil) {
          ctx.waitUntil(cache.put(cacheKey, res.clone()));
        }
        return res;
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
        if (cache) {
          const cached = await cache.match(cacheKey);
          if (cached) return withHeaders(cached, allowedOrigin);
        }

        const historyData = await handleHistory(request, env);
        const res = withHeaders(
          new Response(JSON.stringify(historyData)),
          allowedOrigin,
          'public, max-age=300, s-maxage=300, stale-while-revalidate=600'
        );

        if (cache && ctx?.waitUntil) {
          ctx.waitUntil(cache.put(cacheKey, res.clone()));
        }
        return res;
      }

      // 4. GET /v1/news
      if (path === '/v1/news') {
        if (cache) {
          const cached = await cache.match(cacheKey);
          if (cached) return withHeaders(cached, allowedOrigin);
        }

        const newsData = await handleNews(request, env);
        const res = withHeaders(
          new Response(JSON.stringify(newsData)),
          allowedOrigin,
          'public, max-age=60, s-maxage=60, stale-while-revalidate=120'
        );

        if (cache && ctx?.waitUntil) {
          ctx.waitUntil(cache.put(cacheKey, res.clone()));
        }
        return res;
      }

      // 5. GET /v1/health
      if (path === '/v1/health') {
        const healthData = handleHealth(_lastQuotesCache?.health || {});
        return withHeaders(
          new Response(JSON.stringify(healthData)),
          allowedOrigin,
          'no-store'
        );
      }

      // 404 Route Not Found
      return withHeaders(
        new Response(JSON.stringify({ error: `Not found: ${path}`, availableRoutes: ['/v1/quotes', '/v1/history', '/v1/news', '/v1/health', '/v1/fx'] }), { status: 404 }),
        allowedOrigin
      );
    } catch (err) {
      return withHeaders(
        new Response(JSON.stringify({ error: 'Internal Worker Exception', message: err.message }), { status: 500 }),
        allowedOrigin
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
