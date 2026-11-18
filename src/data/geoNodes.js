export const SOURCE_NODES = {
  'Decrypt': [-122.4194, 37.7749],      // San Francisco
  'CryptoSlate': [-0.1276, 51.5072],    // London
  'MarketWatch': [-74.0060, 40.7128],   // New York
  'CNBC Finance': [-74.0060, 40.7128],  // New York
  'Mining.com': [-123.1207, 49.2827],   // Vancouver
  'OilPrice': [-95.3698, 29.7604],      // Houston
  'ForexLive': [139.6917, 35.6895],     // Tokyo
  'Investing.com': [34.7818, 32.0853],  // Tel Aviv
};

export const ASSET_NODES = {
  // Crypto -> Miami
  btc: [-80.1918, 25.7617],
  eth: [-80.1918, 25.7617],
  sol: [-80.1918, 25.7617],
  bnb: [-80.1918, 25.7617],
  xrp: [-80.1918, 25.7617],
  ada: [-80.1918, 25.7617],

  // Equities -> New York
  spx:  [-74.0060, 40.7128],
  ndx:  [-74.0060, 40.7128],
  dow:  [-74.0060, 40.7128],
  aapl: [-74.0060, 40.7128],
  nvda: [-74.0060, 40.7128],
  tsla: [-74.0060, 40.7128],
  meta: [-74.0060, 40.7128],

  // Metals -> Sydney
  gold:     [151.2093, -33.8688],
  silver:   [151.2093, -33.8688],
  platinum: [151.2093, -33.8688],

  // Energy -> Dubai
  wti:   [55.2708, 25.2048],
  brent: [55.2708, 25.2048],
  ng:    [55.2708, 25.2048],
  hoil:  [55.2708, 25.2048],

  // Forex -> Financial Centers
  eurusd: [-0.1276, 51.5072],   // London
  gbpusd: [-0.1276, 51.5072],   // London
  eurgbp: [-0.1276, 51.5072],   // London
  usdjpy: [139.6917, 35.6895],  // Tokyo
  gbpjpy: [139.6917, 35.6895],  // Tokyo
  eurjpy: [139.6917, 35.6895],  // Tokyo
  audusd: [151.2093, -33.8688], // Sydney
  nzdusd: [174.7633, -36.8485], // Auckland
  usdcad: [-79.3832, 43.6532],  // Toronto
  usdchf: [8.5417, 47.3769],    // Zurich
  usdinr: [72.8777, 19.0760],   // Mumbai
  eurinr: [72.8777, 19.0760],   // Mumbai
};

export function getSourceCoords(source) {
  return SOURCE_NODES[source];
}

export function getAssetCoords(asset) {
  return ASSET_NODES[String(asset || '').toLowerCase()];
}
