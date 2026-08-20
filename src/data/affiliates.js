/**
 * Quidesk — Affiliate Link Registry
 *
 * Each asset can have one or more contextual affiliate links.
 * These appear as subtle "Trade / Buy" CTAs on asset cards and
 * in the currency tooltip on hover — never as banners or pop-ups.
 *
 * All links use ref/partner codes — replace YOURCODE with your
 * actual referral ID from each platform's affiliate programme.
 *
 * Programmes to sign up for:
 *   Binance:  https://www.binance.com/en/activity/referral
 *   Coinbase: https://www.coinbase.com/affiliates
 *   Kraken:   https://www.kraken.com/affiliate
 *   OANDA:    https://www.oanda.com/us-en/trading/affiliate/
 *   eToro:    https://www.etoro.com/partners/
 */

export const AFFILIATE_LINKS = {
  // ── Crypto ───────────────────────────────────────────────────────────
  btc: [
    { label:'Buy BTC', platform:'Binance',  url:'https://www.binance.com/en/trade/BTC_USDT?ref=YOURCODE',   logo:'B' },
    { label:'Buy BTC', platform:'Coinbase', url:'https://www.coinbase.com/price/bitcoin?utm_source=quidesk&ref=YOURCODE', logo:'C' },
  ],
  eth: [
    { label:'Buy ETH', platform:'Binance',  url:'https://www.binance.com/en/trade/ETH_USDT?ref=YOURCODE',   logo:'B' },
    { label:'Buy ETH', platform:'Coinbase', url:'https://www.coinbase.com/price/ethereum?utm_source=quidesk&ref=YOURCODE', logo:'C' },
  ],
  sol: [
    { label:'Buy SOL', platform:'Binance',  url:'https://www.binance.com/en/trade/SOL_USDT?ref=YOURCODE',   logo:'B' },
    { label:'Buy SOL', platform:'Kraken',   url:'https://www.kraken.com/prices/sol-solana-price-chart/usd?utm_source=quidesk', logo:'K' },
  ],
  bnb: [
    { label:'Buy BNB', platform:'Binance',  url:'https://www.binance.com/en/trade/BNB_USDT?ref=YOURCODE',   logo:'B' },
  ],
  xrp: [
    { label:'Buy XRP', platform:'Binance',  url:'https://www.binance.com/en/trade/XRP_USDT?ref=YOURCODE',   logo:'B' },
    { label:'Buy XRP', platform:'Kraken',   url:'https://www.kraken.com/prices/xrp-ripple-price-chart/usd?utm_source=quidesk', logo:'K' },
  ],
  ada: [
    { label:'Buy ADA', platform:'Binance',  url:'https://www.binance.com/en/trade/ADA_USDT?ref=YOURCODE',   logo:'B' },
  ],

  // ── Equities ─────────────────────────────────────────────────────────
  spx: [
    { label:'Trade S&P', platform:'eToro',  url:'https://www.etoro.com/markets/spx500?utm_source=quidesk', logo:'e' },
  ],
  ndx: [
    { label:'Trade NASDAQ', platform:'eToro', url:'https://www.etoro.com/markets/nsdq100?utm_source=quidesk', logo:'e' },
  ],
  aapl: [
    { label:'Trade AAPL', platform:'eToro',  url:'https://www.etoro.com/markets/aapl?utm_source=quidesk',  logo:'e' },
  ],
  nvda: [
    { label:'Trade NVDA', platform:'eToro',  url:'https://www.etoro.com/markets/nvda?utm_source=quidesk',  logo:'e' },
  ],
  tsla: [
    { label:'Trade TSLA', platform:'eToro',  url:'https://www.etoro.com/markets/tsla?utm_source=quidesk',  logo:'e' },
  ],
  dow: [
    { label:'Trade DOW', platform:'eToro',   url:'https://www.etoro.com/markets/dji?utm_source=quidesk',   logo:'e' },
  ],

  // ── Metals ───────────────────────────────────────────────────────────
  gold: [
    { label:'Trade Gold',   platform:'OANDA', url:'https://www.oanda.com/us-en/trading/instruments/xauusd/?utm_source=quidesk', logo:'O' },
    { label:'Trade Gold',   platform:'eToro', url:'https://www.etoro.com/markets/gold?utm_source=quidesk', logo:'e' },
  ],
  silver: [
    { label:'Trade Silver', platform:'OANDA', url:'https://www.oanda.com/us-en/trading/instruments/xagusd/?utm_source=quidesk', logo:'O' },
  ],
  platinum: [
    { label:'Trade Platinum', platform:'OANDA', url:'https://www.oanda.com/us-en/trading/?utm_source=quidesk', logo:'O' },
  ],
  copper: [
    { label:'Trade Copper', platform:'eToro',   url:'https://www.etoro.com/markets/copper?utm_source=quidesk', logo:'e' },
  ],

  // ── Energy ───────────────────────────────────────────────────────────
  wti: [
    { label:'Trade WTI',   platform:'OANDA', url:'https://www.oanda.com/us-en/trading/instruments/usoil/?utm_source=quidesk', logo:'O' },
    { label:'Trade WTI',   platform:'eToro', url:'https://www.etoro.com/markets/oil?utm_source=quidesk', logo:'e' },
  ],
  brent: [
    { label:'Trade Brent', platform:'OANDA', url:'https://www.oanda.com/us-en/trading/instruments/ukoil/?utm_source=quidesk', logo:'O' },
  ],
  ng: [
    { label:'Trade Nat Gas', platform:'eToro', url:'https://www.etoro.com/markets/natgas?utm_source=quidesk', logo:'e' },
  ],
  rbob: [
    { label:'Trade RBOB',  platform:'OANDA', url:'https://www.oanda.com/us-en/trading/?utm_source=quidesk', logo:'O' },
  ],
}

// Platform brand colours — used for the subtle pill styling
export const PLATFORM_COLORS = {
  Binance:  { bg:'rgba(240,185,11,0.10)', border:'rgba(240,185,11,0.25)', text:'#f0b90b' },
  Coinbase: { bg:'rgba(0,82,255,0.10)',   border:'rgba(0,82,255,0.22)',   text:'#0052ff' },
  Kraken:   { bg:'rgba(95,47,255,0.10)',  border:'rgba(95,47,255,0.22)',  text:'#5f2fff' },
  OANDA:    { bg:'rgba(255,102,0,0.10)',  border:'rgba(255,102,0,0.22)',  text:'#ff6600' },
  eToro:    { bg:'rgba(9,172,81,0.10)',   border:'rgba(9,172,81,0.22)',   text:'#09ac51' },
}

export function getAffiliateLinks(assetId) {
  return AFFILIATE_LINKS[assetId] || []
}
