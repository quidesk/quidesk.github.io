import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import MiniChart, { buildChartSeries, normalizeWorkerHistoryPoints } from './MiniChart';
import DetailChart from './DetailChart';
import { detectHotspots } from '../data/markets';

const TEN_UP_POINTS = [100, 101, 102, 103, 104, 105, 106, 107, 108, 109];

describe('Phase 5: Authentic Charts & Hotspots Suite', () => {
  describe('1. MiniChart < 10 Real Points & Dashed Baseline Rules', () => {
    it('renders dashed "no chart data" baseline when fewer than 10 real points exist', () => {
      const htmlEmpty = renderToStaticMarkup(<MiniChart data={[]} />);
      expect(htmlEmpty).toContain('no chart data');
      expect(htmlEmpty).toContain('stroke-dasharray="4 4"');

      const htmlNull = renderToStaticMarkup(<MiniChart data={null} />);
      expect(htmlNull).toContain('no chart data');

      const htmlNine = renderToStaticMarkup(<MiniChart data={[100, 101, 102, 103, 104, 105, 106, 107, 108]} />);
      expect(htmlNine).toContain('no chart data');
    });

    it('renders responsive chart container when 10 or more real points are provided', () => {
      const html = renderToStaticMarkup(
        <MiniChart data={TEN_UP_POINTS} prevClose={99} currentPrice={110} change={11.11} />
      );
      expect(html).not.toContain('no chart data');
      expect(html).toContain('recharts-responsive-container');
    });

    it('renders empty baseline when non-positive/invalid points leave < 10 real points', () => {
      const htmlInvalid = renderToStaticMarkup(<MiniChart data={[-5, null, 0, 10, 11, 12]} />);
      expect(htmlInvalid).toContain('no chart data');
    });

    it('builds [prevClose, ...realPoints, livePrice] with unrounded floats and distinct series per asset', () => {
      const ngSeries = buildChartSeries({
        data: [2.8511, 2.8524, 2.8531, 2.8538, 2.8542, 2.8547, 2.8551, 2.8556, 2.8562, 2.8569],
        prevClose: 2.8495,
        currentPrice: 2.8574,
      });
      const wtiSeries = buildChartSeries({
        data: [70.11, 70.25, 70.32, 70.44, 70.51, 70.63, 70.72, 70.85, 70.91, 71.02],
        prevClose: 70.05,
        currentPrice: 71.15,
      });

      expect(ngSeries.valid).toBe(true);
      expect(ngSeries.points).toHaveLength(12);
      expect(ngSeries.points[0].value).toBe(2.8495);
      expect(ngSeries.points[1].value).toBe(2.8511); // Unrounded float preserved
      expect(ngSeries.points[ngSeries.points.length - 1].value).toBe(2.8574);
      expect(ngSeries.prevClose).toBe(2.8495);

      // No two assets share a series reference or identical values
      expect(ngSeries.points).not.toBe(wtiSeries.points);
      expect(ngSeries.values).not.toEqual(wtiSeries.values);
    });

    it('uses neutral grey stroke when change is flat or null, and draws dashed prevClose ReferenceLine', () => {
      const htmlFlat = renderToStaticMarkup(
        <MiniChart data={TEN_UP_POINTS} prevClose={100} currentPrice={100} change={0.002} width={220} height={60} />
      );
      expect(htmlFlat).toContain('#8b949e');
      expect(htmlFlat).toContain('recharts-reference-line');

      const htmlNull = renderToStaticMarkup(
        <MiniChart data={TEN_UP_POINTS} prevClose={100} currentPrice={100} change={null} width={220} height={60} />
      );
      expect(htmlNull).toContain('#8b949e');
    });

    it('strictly increasing input renders its last point above its first (smaller SVG y)', () => {
      const html = renderToStaticMarkup(
        <MiniChart
          data={TEN_UP_POINTS}
          prevClose={99}
          currentPrice={110}
          change={11.11}
          width={220}
          height={60}
        />
      );
      const match = html.match(/<path[^>]*class="recharts-curve recharts-area-curve"[^>]*d="([^"]+)"/);
      expect(match).not.toBeNull();
      const coords = [...match[1].matchAll(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g)].map((m) => ({
        x: parseFloat(m[1]),
        y: parseFloat(m[2]),
      }));
      expect(coords.length).toBeGreaterThanOrEqual(2);
      const first = coords[0];
      const last = coords[coords.length - 1];
      expect(last.x).toBeGreaterThan(first.x);
      expect(last.y).toBeLessThan(first.y); // Above initial point in SVG coordinate space
    });
  });

  describe('2. DetailChart Authentic Series, Ranges & Fallback Rules', () => {
    it('renders dashed baseline when asset has fewer than 10 points', () => {
      const asset = {
        id: 'spx',
        symbol: 'SPY',
        name: 'SPDR S&P 500',
        sector: 'equities',
        price: 766.81,
        change: 0.5,
        history: { '24H': [{ time: '10:00', value: 765 }, { time: '11:00', value: 766.81 }] },
        chartData: [],
      };
      const html = renderToStaticMarkup(<DetailChart asset={asset} />);
      expect(html).toContain('no chart data available for this timeframe');
    });

    it('renders authentic chart container when 10+ historical points are present', () => {
      const pts = TEN_UP_POINTS.map((v, i) => ({ time: `10:${10 + i}`, value: 78000 + v * 25 }));
      const asset = {
        id: 'btc',
        symbol: 'BTC',
        name: 'Bitcoin',
        sector: 'crypto',
        price: 81000,
        prevClose: 79000,
        change: 2.53,
        history: { '24H': pts },
      };
      const html = renderToStaticMarkup(<DetailChart asset={asset} />);
      expect(html).toContain('recharts-responsive-container');
      expect(html).not.toContain('no chart data available');
    });

    it('normalizes Worker ms timestamps without multiplying by 1000 and slices 1H cleanly', () => {
      const baseMs = Date.UTC(2026, 4, 1, 14, 0, 0);
      const workerPoints = Array.from({ length: 20 }, (_, i) => ({
        time: baseMs + i * 5 * 60 * 1000, // 5m intervals in ms
        close: 100 + i * 0.25,
      }));
      const res1H = normalizeWorkerHistoryPoints({ points: workerPoints, previousClose: 99.5 }, '1H');
      // Last 60m includes 13 points (t=35m..95m inclusive)
      expect(res1H.points.length).toBeGreaterThanOrEqual(12);
      expect(res1H.points[0].ts).toBeGreaterThanOrEqual(baseMs);
      expect(new Date(res1H.points[0].ts).getUTCFullYear()).toBe(2026);
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
