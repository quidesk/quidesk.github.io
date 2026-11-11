/**
 * Quidesk Market Engine — Health Route Handler
 * 
 * Reports runtime operational status, upstream provider availability, and latency.
 * Endpoint: GET /v1/health
 */

const START_TIME = Date.now();

export function handleHealth(quotesHealth = {}) {
  const uptimeSeconds = Math.floor((Date.now() - START_TIME) / 1000);

  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptimeSeconds,
    runtime: 'Cloudflare Workers (workerd)',
    sources: quotesHealth.perSource || {},
  };
}
