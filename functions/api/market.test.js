import { describe, it, expect } from 'vitest';
import { onRequest } from './market.js';

describe('Cloudflare Pages Function: /api/market Security Controls', () => {
  it('blocks unauthorized origins with 403 on OPTIONS preflight', async () => {
    const request = new Request('https://example.pages.dev/api/market?symbol=SPY', {
      method: 'OPTIONS',
      headers: { Origin: 'https://malicious-site.com' },
    });
    const res = await onRequest({ request, env: {} });
    expect(res.status).toBe(403);
  });

  it('allows authorized origins on OPTIONS preflight', async () => {
    const request = new Request('https://example.pages.dev/api/market?symbol=SPY', {
      method: 'OPTIONS',
      headers: { Origin: 'https://quidesk.github.io' },
    });
    const res = await onRequest({ request, env: {} });
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://quidesk.github.io');
  });

  it('rejects non-GET methods with 405 Method Not Allowed', async () => {
    const request = new Request('https://example.pages.dev/api/market?symbol=SPY', {
      method: 'POST',
      headers: { Origin: 'https://quidesk.github.io' },
    });
    const res = await onRequest({ request, env: {} });
    expect(res.status).toBe(405);
  });

  it('rejects unapproved symbols or SSRF payloads with 400 Bad Request', async () => {
    const request = new Request('https://example.pages.dev/api/market?symbol=http://169.254.169.254', {
      method: 'GET',
      headers: { Origin: 'https://quidesk.github.io' },
    });
    const res = await onRequest({ request, env: {} });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Invalid or unapproved symbol');
  });

  it('returns 503 when API key is missing from env', async () => {
    const request = new Request('https://example.pages.dev/api/market?symbol=SPY', {
      method: 'GET',
      headers: { Origin: 'https://quidesk.github.io' },
    });
    const res = await onRequest({ request, env: {} });
    expect(res.status).toBe(503);
  });
});
