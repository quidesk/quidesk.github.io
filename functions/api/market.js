/**
 * Cloudflare Pages Function: /api/market
 * Hardened Edge API proxy for market quotes.
 * 
 * Security Controls Implemented:
 *  1. Origin-Locked CORS (no wildcard '*').
 *  2. Strict Symbol Allowlist (SSRF & injection prevention).
 *  3. Secrets strictly read from `env` parameters (never hardcoded).
 *  4. Enforced HTTP GET method and payload limits.
 *  5. Hardened security response headers.
 */

const ALLOWED_ORIGINS = new Set([
  'https://quidesk.github.io',
  'http://localhost:3000',
  'http://localhost:4173',
  'http://localhost:5173',
]);

const ALLOWED_SYMBOLS = new Set([
  'SPY', 'QQQ', 'DIA', 'AAPL', 'TSLA', 'META', 'NVDA',
  'CL=F', 'BZ=F', 'NG=F', 'HO=F'
]);

function getCorsHeaders(requestOrigin) {
  const isAllowed = ALLOWED_ORIGINS.has(requestOrigin);
  return {
    'Access-Control-Allow-Origin': isAllowed ? requestOrigin : 'null',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
  };
}

export async function onRequest(context) {
  const { request, env } = context;
  const origin = request.headers.get('Origin') || '';

  // 1. Preflight CORS handling
  if (request.method === 'OPTIONS') {
    if (origin && !ALLOWED_ORIGINS.has(origin)) {
      return new Response('Forbidden Origin', { status: 403 });
    }
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(origin),
    });
  }

  // 2. Enforce GET method only
  if (request.method !== 'GET') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: { ...getCorsHeaders(origin), 'Allow': 'GET, OPTIONS' }
    });
  }

  // 3. Origin verification for actual requests (when Origin header is present)
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return new Response(JSON.stringify({ error: 'Unauthorized Origin' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(origin) }
    });
  }

  // 4. Validate query parameters & symbol allowlist (Prevent SSRF / Parameter Tampering)
  const url = new URL(request.url);
  const symbol = (url.searchParams.get('symbol') || '').toUpperCase().trim();

  if (!symbol || !ALLOWED_SYMBOLS.has(symbol)) {
    return new Response(JSON.stringify({ error: 'Invalid or unapproved symbol' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(origin) }
    });
  }

  // 5. Read API keys strictly from Worker environment variables (never committed to git)
  const apiKey = env.FINNHUB_KEY || env.VITE_FINNHUB_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Market data provider key not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(origin) }
    });
  }

  // 6. Upstream fetch to authorized external provider
  try {
    const upstreamUrl = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}`;
    const upstreamRes = await fetch(upstreamUrl, {
      headers: { 'X-Finnhub-Token': apiKey },
      signal: AbortSignal.timeout(6000),
    });

    if (!upstreamRes.ok) {
      return new Response(JSON.stringify({ error: `Upstream returned status ${upstreamRes.status}` }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', ...getCorsHeaders(origin) }
      });
    }

    const data = await upstreamRes.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=15, stale-while-revalidate=30',
        ...getCorsHeaders(origin)
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Gateway timeout querying market provider' }), {
      status: 504,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(origin) }
    });
  }
}
