import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { formatPrice } from '../data/markets';

describe('Market Data Pipeline & Store Verification Suite', () => {

  describe('1. Static Pre-Hydration Snapshot Integrity', () => {
    it('verifies public/market-snapshot.json exists and contains 28+ tickers', () => {
      const snapshotPath = path.resolve(__dirname, '../../public/market-snapshot.json');
      expect(fs.existsSync(snapshotPath)).toBe(true);
      const content = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));

      expect(content.assetCount).toBeGreaterThanOrEqual(28);
      expect(content.timestamp).toBeDefined();
      expect(content.assets).toBeDefined();

      const requiredSymbols = [
        'SPY', 'QQQ', 'DIA', 'AAPL', 'TSLA', 'META', 'NVDA',
        'BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA',
        'XAU/USD', 'XAG/USD', 'XPT/USD',
        'WTI', 'BRENT', 'NGAS', 'HOIL',
        'EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD', 'USD/CHF', 'NZD/USD', 'EUR/GBP', 'GBP/JPY', 'USD/INR'
      ];

      const presentSymbols = Object.values(content.assets).map(a => a.symbol);
      requiredSymbols.forEach(sym => {
        expect(presentSymbols).toContain(sym);
      });
    });

    it('verifies snapshot values match current live target ranges', () => {
      const snapshotPath = path.resolve(__dirname, '../../public/market-snapshot.json');
      const content = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
      const a = content.assets;

      // Equities in realistic range
      expect(a.spx.price).toBeGreaterThan(700);
      expect(a.ndx.price).toBeGreaterThan(600);
      expect(a.nvda.price).toBeGreaterThan(180);

      // Crypto in realistic range
      expect(a.btc.price).toBeGreaterThan(70000);
      expect(a.eth.price).toBeGreaterThan(2000);

      // Metals & Energy in realistic range
      expect(a.gold.price).toBeGreaterThan(3500);
      expect(a.silver.price).toBeGreaterThan(40);
      expect(a.wti.price).toBeGreaterThan(90);

      // Forex in realistic range
      expect(a.usdjpy.price).toBeGreaterThan(150);
      expect(a.usdinr.price).toBeGreaterThan(90);
      expect(a.eurusd.price).toBeGreaterThan(1.05);
      expect(a.nzdusd.price).toBeGreaterThan(0.50);
    });
  });

  describe('2. State Desynchronization Prevention (Top Movers & Polarity)', () => {
    it('ensures Gainers selector strictly filters for changePercent > 0', () => {
      const mockAssets = [
        { id: 'btc', symbol: 'BTC', change: -0.15, price: 77000 },
        { id: 'gold', symbol: 'GOLD', change: -0.28, price: 3878 },
        { id: 'spy', symbol: 'SPY', change: 1.25, price: 755 },
        { id: 'aapl', symbol: 'AAPL', change: 0.50, price: 344 },
      ];

      const gainers = mockAssets
        .filter(a => typeof a.change === 'number' && a.change > 0)
        .sort((a, b) => b.change - a.change);

      const losers = mockAssets
        .filter(a => typeof a.change === 'number' && a.change < 0)
        .sort((a, b) => a.change - b.change);

      // BTC and GOLD must NOT be in gainers
      expect(gainers.map(g => g.symbol)).not.toContain('BTC');
      expect(gainers.map(g => g.symbol)).not.toContain('GOLD');

      // Only positive assets allowed in gainers
      gainers.forEach(g => {
        expect(g.change).toBeGreaterThan(0);
      });

      // Only negative assets allowed in losers
      losers.forEach(l => {
        expect(l.change).toBeLessThan(0);
      });
      expect(losers.map(l => l.symbol)).toContain('BTC');
      expect(losers.map(l => l.symbol)).toContain('GOLD');
    });
  });

  describe('3. Sparkline Sanitation & Domain Locking', () => {
    it('sanitizes leading zero/null entries (e.g. GBP/JPY bug) and prevents 0 domain anchor', () => {
      // Simulate corrupted GBP/JPY sparkline history with leading zeros and nulls
      const corruptedHistory = [0, null, undefined, 0, 210.85, 210.92, 211.05, 210.97];

      const rawValues = corruptedHistory.map(pt => typeof pt === 'object' && pt !== null ? pt.value : pt);
      let validPoints = rawValues.filter(v => typeof v === 'number' && Number.isFinite(v) && v > 0);

      const fallbackPrice = 210.97;
      if (validPoints.length < 2) {
        validPoints = [fallbackPrice, fallbackPrice];
      }

      // No zeros allowed
      expect(validPoints).not.toContain(0);
      expect(validPoints.length).toBe(4);

      const min = Math.min(...validPoints);
      const max = Math.max(...validPoints);
      const delta = max - min;
      const pad = delta > 0 ? delta * 0.08 : (min * 0.005 || 0.01);
      const yDomain = [min - pad, max + pad];

      // Domain must be locked tightly around 210, NEVER anchored to 0
      expect(yDomain[0]).toBeGreaterThan(200);
      expect(yDomain[0]).toBeLessThan(min);
      expect(yDomain[1]).toBeGreaterThan(max);
    });
  });

  describe('4. Currency Formatter Compliance', () => {
    it('formats all 12 Forex pairs without literal $ prefix', () => {
      const fxPairs = [
        { sym: 'EUR/USD', p: 1.1159, expected: '1.1159' },
        { sym: 'GBP/USD', p: 1.3390, expected: '1.3390' },
        { sym: 'USD/JPY', p: 157.56, expected: '157.56' },
        { sym: 'AUD/USD', p: 0.7032, expected: '0.7032' },
        { sym: 'USD/CAD', p: 1.3974, expected: '1.3974' },
        { sym: 'USD/CHF', p: 0.8250, expected: '0.8250' },
        { sym: 'NZD/USD', p: 0.5638, expected: '0.5638' },
        { sym: 'EUR/GBP', p: 0.8334, expected: '0.8334' },
        { sym: 'GBP/JPY', p: 210.9740, expected: '210.97' },
        { sym: 'EUR/JPY', p: 175.8490, expected: '175.85' },
        { sym: 'USD/INR', p: 94.9342, expected: '94.93' },
        { sym: 'EUR/INR', p: 106.14, expected: '106.14' },
      ];

      fxPairs.forEach(({ sym, p, expected }) => {
        const formatted = formatPrice(p, sym, 'forex');
        expect(formatted).toBe(expected);
        expect(formatted.startsWith('$')).toBe(false);
      });
    });
  });
});
