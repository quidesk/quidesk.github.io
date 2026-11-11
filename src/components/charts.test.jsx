import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import MiniChart from './MiniChart';
import DetailChart from './DetailChart';
import { detectHotspots } from '../data/markets';

describe('Phase 4: Authentic Charts & Hotspots Suite', () => {
  describe('1. MiniChart Zero-Synthetic & Dashed Baseline Rules', () => {
    it('renders dashed "no chart data" baseline when data is missing or empty', () => {
      const htmlEmpty = renderToStaticMarkup(<MiniChart data={[]} />);
      expect(htmlEmpty).toContain('no chart data');
      expect(htmlEmpty).toContain('stroke-dasharray="4 4"');

      const htmlNull = renderToStaticMarkup(<MiniChart data={null} />);
      expect(htmlNull).toContain('no chart data');

      const htmlSingle = renderToStaticMarkup(<MiniChart data={[100]} />);
      expect(htmlSingle).toContain('no chart data');
    });

    it('renders responsive chart container when 2 or more authentic valid points are provided', () => {
      const html = renderToStaticMarkup(<MiniChart data={[100, 102, 105]} positive={true} change={5} />);
      expect(html).not.toContain('no chart data');
      expect(html).toContain('recharts-responsive-container');
    });

    it('renders empty baseline when fewer than 2 positive points exist', () => {
      const htmlInvalid = renderToStaticMarkup(<MiniChart data={[-5, null, 0]} />);
      expect(htmlInvalid).toContain('no chart data');
    });
  });

  describe('2. DetailChart Authentic Series & Fallback Rules', () => {
    it('renders dashed baseline when asset has no historical chart series', () => {
      const asset = {
        id: 'spx',
        symbol: 'SPY',
        name: 'SPDR S&P 500',
        sector: 'equities',
        price: 766.81,
        change: 0.5,
        history: { '24H': [] },
        chartData: [],
      };
      const html = renderToStaticMarkup(<DetailChart asset={asset} />);
      expect(html).toContain('no chart data available for this timeframe');
    });

    it('renders authentic chart container when historical points are present', () => {
      const asset = {
        id: 'btc',
        symbol: 'BTC',
        name: 'Bitcoin',
        sector: 'crypto',
        price: 80500,
        change: 3.2,
        history: { '24H': [{ time: '10:00', value: 78000 }, { time: '11:00', value: 80500 }] },
      };
      const html = renderToStaticMarkup(<DetailChart asset={asset} />);
      expect(html).toContain('recharts-responsive-container');
      expect(html).not.toContain('no chart data available');
    });
  });

  describe('3. detectHotspots Authentic Timestamps & Session Rollover', () => {
    it('excludes closed assets even if change >= 2.0% to expire across session rollover', () => {
      const assets = [
        { id: 'spy', symbol: 'SPY', change: 2.5, status: 'closed', quoteTs: 1000 },
        { id: 'btc', symbol: 'BTC', change: 3.5, status: 'regular', quoteTs: 2000 },
        { id: 'eth', symbol: 'ETH', change: -2.8, status: 'regular', quoteTs: 3000 },
        { id: 'aapl', symbol: 'AAPL', change: 0.5, status: 'regular', quoteTs: 4000 },
      ];

      const hotspots = detectHotspots(assets);
      expect(hotspots).toHaveLength(2);
      expect(hotspots.some(h => h.symbol === 'SPY')).toBe(false); // Closed asset expired
      expect(hotspots.some(h => h.symbol === 'BTC')).toBe(true);
      expect(hotspots.some(h => h.symbol === 'ETH')).toBe(true);
    });

    it('preserves authentic quote timestamps without synthesizing Date.now()', () => {
      const assets = [
        { id: 'sol', symbol: 'SOL', change: 5.2, status: 'regular', quoteTs: 1730000000000 },
      ];
      const hotspots = detectHotspots(assets);
      expect(hotspots[0].timestamp).toBe(1730000000000);
      expect(hotspots[0].quoteTs).toBe(1730000000000);
      expect(hotspots[0].severity).toBe('high');
      expect(hotspots[0].signal).toBe('bullish_breakout');
    });
  });
});
