/**
 * Quidesk Market Engine — News Route Handler
 * 
 * Supplies directly ingested, link-deduplicated, strictly tagged OSINT news.
 * Endpoint: GET /v1/news
 */

import { fetchAggregatedNews } from '../providers/news.js';

/**
 * Handles GET /v1/news
 * @param {Request} request
 * @param {object} env
 * @returns {Promise<object>}
 */
export async function handleNews(request, env) {
  const articles = await fetchAggregatedNews();
  return {
    schemaVersion: '1.0.0',
    generatedAt: new Date().toISOString(),
    count: articles.length,
    articles,
  };
}
