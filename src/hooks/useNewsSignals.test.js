import { describe, it, expect } from 'vitest';
import { extractStrictAssetTags } from '../../worker/providers/news';
import { normalizeWorkerNewsItem } from './useNewsSignals';

describe('News Tagging (Worker Single Source) & Sponsored Separation', () => {
  it('correctly tags Bitcoin articles without false positives via Worker extractor', () => {
    expect(extractStrictAssetTags('Bitcoin Miner HIVE expands capacity')).toEqual(['btc']);
    expect(extractStrictAssetTags('Bitcoin devs propose new BIP for layer 2')).toEqual(['btc']);
    expect(extractStrictAssetTags('MARA dumps Bitcoin holdings')).toEqual(['btc']);
  });

  it('prohibits false positives for unrelated companies or political news', () => {
    expect(extractStrictAssetTags('Trump Media reports quarterly revenue and losses')).toEqual([]);
    expect(extractStrictAssetTags('White House downplays slowdown concerns')).toEqual([]);
    expect(extractStrictAssetTags("Tether's Tiny AI Agent Beats Models")).toEqual([]);
  });

  it('prohibits false positive substrings for SOL, ADA, ETH, DOW, META, AAPL, and olive oil', () => {
    expect(extractStrictAssetTags('The company plans to consolidate operations and find a new solution with solid backing')).toEqual([]);
    expect(extractStrictAssetTags('Bank of Canada introduces new radar system')).toEqual([]);
    expect(extractStrictAssetTags('New ADA compliance deadline looms')).toEqual([]);
    expect(extractStrictAssetTags('Researchers test novel method and meta analysis on spy thriller')).toEqual([]);
    expect(extractStrictAssetTags('Best autumn Apple pie recipe with olive oil')).toEqual([]);
    expect(extractStrictAssetTags('Markets slowdown as growth drops down')).toEqual([]);
  });

  it('correctly matches valid strict tickers, natural-language phrases, and Forex pairs', () => {
    expect(extractStrictAssetTags('SOL surges 15% as DeFi volume accelerates')).toEqual(['sol']);
    expect(extractStrictAssetTags('ETH breaks $4,000 following spot ETF inflows')).toEqual(['eth']);
    expect(extractStrictAssetTags('Dow Jones falls 300 points amid inflation data')).toEqual(['dow']);
    expect(extractStrictAssetTags('TSLA deliveries exceed Wall Street estimates')).toEqual(['tsla']);
    expect(extractStrictAssetTags('WTI and Brent trade mixed as OPEC meets')).toEqual(expect.arrayContaining(['wti', 'brent']));
    expect(extractStrictAssetTags('European Gas Prices Rebound on Iran War')).toEqual(['ng']);
    expect(extractStrictAssetTags('Natural Gas sinks on mild winter forecast')).toEqual(['ng']);
    expect(extractStrictAssetTags('Gold Bullion edges higher as Treasury yields decline')).toEqual(['gold']);
    expect(extractStrictAssetTags('Silver Spot jumps toward $35')).toEqual(['silver']);
    expect(extractStrictAssetTags('EUR/USD tests resistance as ECB meets')).toContain('eurusd');
    expect(extractStrictAssetTags('USD/JPY drops as BOJ hints hike')).toContain('usdjpy');
    expect(extractStrictAssetTags('GBP/USD rebounds following BoE comments')).toContain('gbpusd');
  });

  it('tags max 3 co-mentioned assets and leaves zero-match stories empty', () => {
    const tagged = extractStrictAssetTags('Bitcoin, Ethereum, Solana, and XRP rally together');
    expect(tagged).toHaveLength(3);
    expect(extractStrictAssetTags('Federal Reserve holds interest rates steady amid inflation')).toEqual([]);
  });

  it('normalizeWorkerNewsItem consumes Worker assetTags and strips tags on sponsored items', () => {
    const regular = normalizeWorkerNewsItem({
      id: 'n1',
      title: 'Bitcoin holds $73k',
      link: 'https://decrypt.co/1',
      source: 'Decrypt',
      sector: 'crypto',
      assetTags: ['btc'],
      isSponsored: false,
    });
    expect(regular.mentionedAssets).toEqual(['btc']);
    expect(regular.isSponsored).toBe(false);

    const sponsored = normalizeWorkerNewsItem({
      id: 's1',
      title: 'Trade Crypto on Binance',
      link: 'https://www.binance.com/register?ref=123',
      source: 'Partner',
      sector: 'crypto',
      assetTags: ['btc', 'bnb'],
      isSponsored: true,
    });
    expect(sponsored.isSponsored).toBe(true);
    expect(sponsored.mentionedAssets).toEqual([]);
  });
});
