/**
 * Quidesk Market Engine — Legacy Binance Provider Adapter
 * Delegates to multi-tier crypto provider in crypto.js.
 */

import { fetchBinanceTier, fetchCoinGeckoTier, CRYPTO_DEFINITIONS } from './crypto.js';

export async function fetchBinanceCrypto(timeoutMs = 4000) {
  return fetchBinanceTier(Object.keys(CRYPTO_DEFINITIONS), timeoutMs);
}

export async function fetchCoinGeckoCrypto(timeoutMs = 4000) {
  return fetchCoinGeckoTier(Object.keys(CRYPTO_DEFINITIONS), null, timeoutMs);
}
