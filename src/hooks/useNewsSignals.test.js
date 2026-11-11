import { describe, it, expect } from 'vitest';
import { tagNewsAssets } from './useNewsSignals';

describe('tagNewsAssets - Strict Word Boundary & Case Matching', () => {
  it('correctly tags Bitcoin articles without false positives', () => {
    expect(tagNewsAssets('Bitcoin Miner HIVE expands capacity')).toEqual(['btc']);
    expect(tagNewsAssets('Bitcoin devs propose new BIP for layer 2')).toEqual(['btc']);
    expect(tagNewsAssets('MARA dumps Bitcoin holdings')).toEqual(['btc']);
  });

  it('prohibits false positives for unrelated companies or political news', () => {
    expect(tagNewsAssets('Trump Media reports quarterly revenue and losses')).toEqual([]);
    expect(tagNewsAssets('White House downplays slowdown concerns')).toEqual([]);
  });

  it('prohibits false positive substrings for SOL', () => {
    expect(tagNewsAssets('The company plans to consolidate operations and find a new solution with solid backing')).toEqual([]);
    expect(tagNewsAssets('Tech insolvencies rise across Europe')).toEqual([]);
  });

  it('prohibits false positive substrings for ADA', () => {
    expect(tagNewsAssets('Bank of Canada introduces new radar system for financial monitoring')).toEqual([]);
    expect(tagNewsAssets('Madame Tussauds adds new exhibit')).toEqual([]);
  });

  it('prohibits false positive substrings for ETH', () => {
    expect(tagNewsAssets('Researchers test novel method to determine whether ethernet cables degrade')).toEqual([]);
    expect(tagNewsAssets('Ethical guidelines issued for algorithmic trading')).toEqual([]);
  });

  it('prohibits false positive substrings for DOW', () => {
    expect(tagNewsAssets('Markets trend down as slowdown fears cast a long shadow on growth')).toEqual([]);
    expect(tagNewsAssets('Window cleaning company opens franchise down town')).toEqual([]);
  });

  it('prohibits "oil" alone from tagging WTI or crude', () => {
    expect(tagNewsAssets('Olive oil prices spike after poor Mediterranean harvest')).toEqual([]);
    expect(tagNewsAssets('Essential oil market grows globally')).toEqual([]);
  });

  it('correctly matches valid uppercase ticker occurrences', () => {
    expect(tagNewsAssets('SOL surges 15% as DeFi volume accelerates')).toContain('sol');
    expect(tagNewsAssets('ETH breaks $4,000 following spot ETF inflows')).toContain('eth');
    expect(tagNewsAssets('DOW drops 300 points amid inflation data')).toContain('dow');
    expect(tagNewsAssets('TSLA deliveries exceed Wall Street estimates')).toContain('tsla');
    expect(tagNewsAssets('WTI and BRENT trade mixed as OPEC meets')).toEqual(expect.arrayContaining(['wti', 'brent']));
  });

  it('correctly matches natural language sector references', () => {
    expect(tagNewsAssets('Crude oil futures rise 2% on Middle East supply risk')).toEqual(['wti']);
    expect(tagNewsAssets('Natural gas sinks to multi-month low on mild winter forecast')).toEqual(['ng']);
    expect(tagNewsAssets('Gold bullion edges higher as treasury yields decline')).toEqual(['gold']);
    expect(tagNewsAssets('Silver spot jumps toward $35')).toEqual(['silver']);
    expect(tagNewsAssets('Heating oil demand weakens across northeastern terminals')).toEqual(['hoil']);
  });

  it('correctly tags Forex currency pairs with and without slash', () => {
    expect(tagNewsAssets('EUR/USD tests key resistance at 1.09')).toContain('eurusd');
    expect(tagNewsAssets('USDJPY drops toward 150 as BOJ hints rate hike')).toContain('usdjpy');
    expect(tagNewsAssets('GBP/USD rebounds following Bank of England comments')).toContain('gbpusd');
  });

  it('tags multiple assets when co-mentioned', () => {
    const tagged = tagNewsAssets('Bitcoin and Ethereum rally while Solana lags behind');
    expect(tagged).toEqual(expect.arrayContaining(['btc', 'eth', 'sol']));
    expect(tagged).toHaveLength(3);
  });
});
