import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { useMarketStore } from '../store/marketStore';
import { detectHotspots } from '../data/markets';
import { getFreshnessLevel, deriveFeedStatus } from '../lib/freshness';
import { FreshnessBadge } from './FreshnessBadge';
import TickerTape from './TickerTape';
import AssetCard from './AssetCard';
import MarketCard from './MarketCard';
import SectorPage from '../pages/SectorPage';
import MapPage from '../pages/MapPage';
import Navbar from './Navbar';
import NewsSignals from './NewsSignals';

describe('Phase 3 — Client Data Semantics & DOM Consistency', () => {
  const now = Date.UTC(2026, 10, 11, 15, 30, 0); // 10:30 AM EST

  const sampleAssets = [
    {
      id: 'nvda', symbol: 'NVDA', name: 'NVIDIA Corp.', sector: 'equities', unit: 'USD',
      price: 175.20, prevClose: 185.34, change: -5.47, changePercent: -5.47,
      status: 'live', source: 'yahoo', quoteTs: now - 30000, timestamp: now - 30000,
      spark1d: [], chartData: [],
    },
    {
      id: 'btc', symbol: 'BTC', name: 'Bitcoin', sector: 'crypto', unit: 'USD',
      price: 73850.00, prevClose: 72048.78, change: 2.50, changePercent: 2.50,
      status: 'live', source: 'binance', quoteTs: now - 5000, timestamp: now - 5000,
      spark1d: [], chartData: [],
    },
    {
      id: 'meta', symbol: 'META', name: 'Meta Platforms', sector: 'equities', unit: 'USD',
      price: 590.00, prevClose: 590.00, change: 0.002, changePercent: 0.002,
      status: 'live', source: 'yahoo', quoteTs: now - 30000, timestamp: now - 30000,
      spark1d: [], chartData: [],
    },
    {
      id: 'spx', symbol: 'SPY', name: 'S&P 500 ETF', sector: 'equities', unit: 'USD',
      price: 600.00, prevClose: 602.23, change: -0.37, changePercent: -0.37,
      status: 'closed', tradingPeriod: 'closed', source: 'yahoo', quoteTs: now - 3600000, timestamp: now - 3600000,
      spark1d: [], chartData: [],
    },
    {
      id: 'eurusd', symbol: 'EUR/USD', name: 'Euro / US Dollar', sector: 'forex', unit: 'USD',
      price: 1.1187, prevClose: 1.1170, change: 0.15, changePercent: 0.15,
      status: 'delayed', source: 'ECB daily ref', quoteTs: now - 7200000, timestamp: now - 7200000,
      spark1d: [], chartData: [],
    },
    {
      id: 'usdinr', symbol: 'USD/INR', name: 'US Dollar / INR', sector: 'forex', unit: 'INR',
      price: 93.96, prevClose: 93.96, change: 0.00, changePercent: 0.00,
      status: 'live', source: 'yahoo', quoteTs: now - 30000, timestamp: now - 30000,
      spark1d: [], chartData: [],
    },
    {
      id: 'xrp', symbol: 'XRP', name: 'XRP', sector: 'crypto', unit: 'USD',
      price: null, prevClose: null, change: null, changePercent: null,
      status: 'unavailable', source: 'none', quoteTs: null, timestamp: null,
      spark1d: [], chartData: [],
    },
  ];

  beforeEach(() => {
    const assetsMap = {};
    sampleAssets.forEach((a) => {
      assetsMap[a.id] = a;
    });
    useMarketStore.getState().applySnapshot({
      generatedAt: new Date(now).toISOString(),
      assets: assetsMap,
      health: { perSource: { yahoo: { ok: true, latencyMs: 120 } } },
    });
  });

  it('DOM-level test: renders identical signed/flat/missing % for every symbol across TickerTape, MarketCard, AssetCard, SectorPage, and MapPage', () => {
    const tickerHtml = renderToStaticMarkup(<TickerTape allAssets={sampleAssets} />);
    const sectorHtml = renderToStaticMarkup(
      <SectorPage
        sector="equities"
        assets={sampleAssets.filter((a) => a.sector === 'equities')}
      />
    );
    const mapHtml = renderToStaticMarkup(
      <MapPage
        data={{}}
        allAssets={sampleAssets}
        hotspots={[]}
        newsSignals={{ news: [], loading: false, newsCorrelations: [], lastFetch: null, refresh: () => {} }}
      />
    );

    const nvdaAsset = sampleAssets[0];
    const btcAsset = sampleAssets[1];
    const metaAsset = sampleAssets[2];
    const xrpAsset = sampleAssets[6];

    const assetCardNvda = renderToStaticMarkup(<AssetCard asset={nvdaAsset} />);
    const marketCardNvda = renderToStaticMarkup(<MarketCard asset={nvdaAsset} />);
    const assetCardBtc = renderToStaticMarkup(<AssetCard asset={btcAsset} />);
    const marketCardBtc = renderToStaticMarkup(<MarketCard asset={btcAsset} />);
    const assetCardMeta = renderToStaticMarkup(<AssetCard asset={metaAsset} />);
    const assetCardXrp = renderToStaticMarkup(<AssetCard asset={xrpAsset} />);

    // NVDA (-5.47%) identical across all widgets
    for (const html of [tickerHtml, assetCardNvda, marketCardNvda, sectorHtml, mapHtml]) {
      expect(html).toContain('NVDA');
      expect(html).toContain('-5.47%');
    }

    // BTC (+2.50%) identical across all widgets
    for (const html of [tickerHtml, assetCardBtc, marketCardBtc, mapHtml]) {
      expect(html).toContain('BTC');
      expect(html).toContain('+2.50%');
    }

    // Flat META (|0.002| < 0.005): neutral 0.00% in dim grey with zero directional arrow
    expect(assetCardMeta).toContain('0.00%');
    expect(assetCardMeta).toContain('var(--text-dim');
    expect(assetCardMeta).not.toContain('badge-bull');
    expect(assetCardMeta).not.toContain('badge-bear');
    expect(assetCardMeta).not.toContain('>▲<');
    expect(assetCardMeta).not.toContain('>▼<');

    // Unavailable XRP: shows "—" instead of a fabricated number
    expect(assetCardXrp).toContain('—');
    expect(assetCardXrp).not.toContain('badge-bull');
    expect(assetCardXrp).not.toContain('badge-bear');
  });

  it('derives asset status chips from Worker status without poll-age false staleness', () => {
    const recentWorkerLive = {
      price: 180,
      status: 'live',
      sector: 'equities',
      session: 'regular',
      quoteTs: Date.now() - 30000, // 30s old (>15s client threshold, <900s Worker limit)
    };
    expect(getFreshnessLevel(recentWorkerLive)).toBe('fresh');

    const closedHtml = renderToStaticMarkup(
      <FreshnessBadge level="closed" status="closed" timestamp={Date.now() - 3600000} />
    );
    expect(closedHtml).toContain('CLOSED · last close');
    expect(closedHtml).toContain('1h ago');

    const delayedHtml = renderToStaticMarkup(
      <FreshnessBadge level="delayed" status="delayed" timestamp={Date.now() - 7200000} />
    );
    expect(delayedHtml).toContain('ECB daily');
    expect(delayedHtml).toContain('2h ago');

    const staleHtml = renderToStaticMarkup(
      <FreshnessBadge level="stale" status="stale" timestamp={null} />
    );
    expect(staleHtml).toContain('STALE');
    expect(staleHtml).not.toContain('undefined');

    const unavailHtml = renderToStaticMarkup(
      <FreshnessBadge level="unavailable" status="unavailable" />
    );
    expect(unavailHtml).toContain('—');
  });

  it('reflects Live/Delayed/Closed/Offline/Paused accurately in Navbar and shows timezone', () => {
    expect(deriveFeedStatus({ isLive: false, isWorkerOnline: true, allAssets: sampleAssets }).label).toBe('Paused');
    expect(deriveFeedStatus({ isLive: true, isWorkerOnline: false, allAssets: sampleAssets }).label).toBe('Offline');

    const closedAll = sampleAssets
      .filter((a) => a.status !== 'unavailable')
      .map((a) => ({ ...a, status: 'closed', tradingPeriod: 'closed' }));
    expect(deriveFeedStatus({ isLive: true, isWorkerOnline: true, allAssets: closedAll }).label).toBe('Closed');

    // sampleAssets includes delayed EUR/USD -> aggregate Navbar pill shows Delayed
    expect(deriveFeedStatus({ isLive: true, isWorkerOnline: true, allAssets: sampleAssets }).label).toBe('Delayed');

    const liveAll = sampleAssets
      .filter((a) => a.status !== 'unavailable')
      .map((a) => ({ ...a, status: 'live', tradingPeriod: 'open', quoteTs: Date.now() - 5000 }));
    expect(deriveFeedStatus({ isLive: true, isWorkerOnline: true, allAssets: liveAll }).label).toBe('Live');

    const navHtml = renderToStaticMarkup(
      <Navbar
        active="map"
        setActive={() => {}}
        isLive={true}
        setIsLive={() => {}}
        hotspotCount={0}
        alertCount={0}
        theme="dark"
        onToggleTheme={() => {}}
        allAssets={liveAll}
        generatedAt="2026-11-11T15:30:00.000Z"
        oldestQuoteTs={Date.UTC(2026, 10, 11, 15, 29, 0)}
        sourcesHealth={{ yahoo: { ok: true } }}
        isWorkerOnline={true}
      />
    );
    expect(navHtml).toContain('LAST UPDATED');
    expect(navHtml).toContain('Live');
    expect(navHtml).toContain('Oldest quoteTs:');
  });

  it('expires NVDA breakdown hotspots on NY session rollover or rebound', () => {
    // Active current NY session breakdown at 10:30 ET on Nov 11
    const curSessionTs = Date.UTC(2026, 10, 11, 15, 0, 0);
    // Prior NY session breakdown from 15:45 ET on Nov 10 (only ~18.5h earlier, still across session boundary)
    const priorSessionTs = Date.UTC(2026, 10, 10, 20, 45, 0);

    const activeList = [
      { id: 'nvda', symbol: 'NVDA', sector: 'equities', change: -4.2, status: 'live', quoteTs: curSessionTs },
    ];
    expect(detectHotspots(activeList, now)).toHaveLength(1);
    expect(detectHotspots(activeList, now)[0].quoteTs).toBe(curSessionTs);

    // Rolled-over prior NY session quote must expire cleanly
    const priorList = [
      { id: 'nvda', symbol: 'NVDA', sector: 'equities', change: -4.2, status: 'live', quoteTs: priorSessionTs },
    ];
    expect(detectHotspots(priorList, now)).toEqual([]);

    // Rebounded NVDA (+0.65%) must also clear immediately
    const reboundedList = [
      { id: 'nvda', symbol: 'NVDA', sector: 'equities', change: 0.65, status: 'live', quoteTs: now - 10000 },
    ];
    expect(detectHotspots(reboundedList, now)).toEqual([]);
  });

  it('removes Binance affiliate tile from news list and isolates sponsored items with Sponsored label only', () => {
    const regularHtml = renderToStaticMarkup(
      <NewsSignals
        news={[
          {
            id: 'r1',
            title: 'Nvidia chips lead AI demand',
            link: 'https://reuters.com/nvda',
            source: 'Reuters',
            sector: 'equities',
            published: new Date(now),
            mentionedAssets: ['nvda'],
            isSponsored: false,
          },
          {
            id: 's1',
            title: 'Promoted Crypto Exchange Offer',
            link: 'https://example.com/promo',
            source: 'Sponsor',
            sector: 'crypto',
            published: new Date(now),
            mentionedAssets: [],
            isSponsored: true,
          },
        ]}
        loading={false}
        lastFetch={new Date(now)}
        onRefresh={() => {}}
      />
    );

    expect(regularHtml).not.toContain('Trade Crypto on Binance');
    expect(regularHtml).toContain('Nvidia chips lead AI demand');
    expect(regularHtml).toContain('Promoted Crypto Exchange Offer');
    expect(regularHtml).toContain('>Sponsored<');

    // Only one Share button exists (for the regular item), NOT on the sponsored item
    const shareCount = (regularHtml.match(/title="Share Insight"/g) || []).length;
    expect(shareCount).toBe(1);
  });
});
