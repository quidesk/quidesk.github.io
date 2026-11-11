import puppeteer from 'puppeteer-core';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logoSvg = (size = 76) => `
<svg
  width="${size}"
  height="${size}"
  viewBox="0 0 64 64"
  fill="none"
  xmlns="http://www.w3.org/2000/svg"
  role="img"
  aria-label="Quidesk Master Sovereign Logo"
>
  <defs>
    <linearGradient id="q-gold-liquid-og" x1="5%" y1="0%" x2="95%" y2="100%">
      <stop offset="0%" stop-color="#FFFDF9" />
      <stop offset="14%" stop-color="#FEEBA4" />
      <stop offset="38%" stop-color="#E2B744" />
      <stop offset="65%" stop-color="#B88616" />
      <stop offset="86%" stop-color="#7C5507" />
      <stop offset="100%" stop-color="#4A3202" />
    </linearGradient>

    <linearGradient id="q-blade-top-og" x1="15%" y1="15%" x2="85%" y2="85%">
      <stop offset="0%" stop-color="#FFFFFF" />
      <stop offset="25%" stop-color="#FFF0BA" />
      <stop offset="60%" stop-color="#D4AF37" />
      <stop offset="100%" stop-color="#8F6710" />
    </linearGradient>

    <linearGradient id="q-blade-bottom-og" x1="20%" y1="20%" x2="90%" y2="90%">
      <stop offset="0%" stop-color="#D4AF37" />
      <stop offset="50%" stop-color="#9C7214" />
      <stop offset="100%" stop-color="#4E3402" />
    </linearGradient>

    <linearGradient id="q-spec-top-og" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.95" />
      <stop offset="35%" stop-color="#FFF3C4" stop-opacity="0.4" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0" />
    </linearGradient>

    <linearGradient id="q-spec-bottom-og" x1="100%" y1="100%" x2="0%" y2="0%">
      <stop offset="0%" stop-color="#FFE8A3" stop-opacity="0.6" />
      <stop offset="40%" stop-color="#D4AF37" stop-opacity="0.2" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0" />
    </linearGradient>

    <linearGradient id="q-core-gold-og" x1="50%" y1="0%" x2="50%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" />
      <stop offset="28%" stop-color="#FDE89F" />
      <stop offset="68%" stop-color="#D4AF37" />
      <stop offset="100%" stop-color="#7A560B" />
    </linearGradient>

    <linearGradient id="q-chassis-bg-og" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#141824" />
      <stop offset="50%" stop-color="#0C1018" />
      <stop offset="100%" stop-color="#05070B" />
    </linearGradient>

    <linearGradient id="q-rim-border-og" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="rgba(255, 255, 255, 0.45)" />
      <stop offset="25%" stop-color="rgba(245, 215, 120, 0.55)" />
      <stop offset="70%" stop-color="rgba(212, 175, 55, 0.15)" />
      <stop offset="100%" stop-color="rgba(255, 255, 255, 0.05)" />
    </linearGradient>

    <radialGradient id="q-ambient-halo-og" cx="50%" cy="47%" r="48%">
      <stop offset="0%" stop-color="#F5D061" stop-opacity="0.25" />
      <stop offset="45%" stop-color="#D4AF37" stop-opacity="0.06" />
      <stop offset="100%" stop-color="#05070B" stop-opacity="0" />
    </radialGradient>
  </defs>

  <rect x="1.5" y="1.5" width="61" height="61" rx="16" fill="url(#q-chassis-bg-og)" stroke="url(#q-rim-border-og)" stroke-width="1.2" />
  <circle cx="32" cy="30" r="22" fill="url(#q-ambient-halo-og)" />
  <line x1="32" y1="4" x2="32" y2="7.5" stroke="url(#q-core-gold-og)" stroke-width="1.2" stroke-linecap="round" opacity="0.65" />
  <line x1="32" y1="52.5" x2="32" y2="56" stroke="url(#q-core-gold-og)" stroke-width="1.2" stroke-linecap="round" opacity="0.4" />
  <line x1="4" y1="30" x2="7.5" y2="30" stroke="url(#q-core-gold-og)" stroke-width="1.2" stroke-linecap="round" opacity="0.65" />
  <line x1="56.5" y1="30" x2="60" y2="30" stroke="url(#q-core-gold-og)" stroke-width="1.2" stroke-linecap="round" opacity="0.3" />
  <circle cx="32" cy="30" r="23" stroke="url(#q-gold-liquid-og)" stroke-width="0.75" stroke-dasharray="1 3" opacity="0.35" />

  <path
    d="M 32 8.5
       C 43.87 8.5, 53.5 18.13, 53.5 30
       C 53.5 35.3, 51.6 40.1, 48.5 43.8
       L 43.5 38.8
       C 45.4 36.3, 46.5 33.3, 46.5 30
       C 46.5 22, 40 15.5, 32 15.5
       C 24 15.5, 17.5 22, 17.5 30
       C 17.5 38, 24 44.5, 32 44.5
       C 35.4 44.5, 38.5 43.3, 41 41.3
       L 45.9 46.2
       C 42 49.5, 37.2 51.5, 32 51.5
       C 20.13 51.5, 10.5 41.87, 10.5 30
       C 10.5 18.13, 20.13 8.5, 32 8.5
       Z"
    fill="url(#q-gold-liquid-og)"
  />

  <path d="M 17 22 C 20.5 14.5, 25.8 11, 32 11 C 38.2 11, 43.5 14.5, 47 22" stroke="url(#q-spec-top-og)" stroke-width="1.6" stroke-linecap="round" />
  <path d="M 23 37 C 25.5 39.5, 28.5 41, 32 41 C 34 41, 35.8 40.5, 37.5 39.5" stroke="url(#q-spec-bottom-og)" stroke-width="1.1" stroke-linecap="round" />

  <path d="M 33 36 L 51 54 L 54 51 L 36 33 Z" fill="url(#q-blade-top-og)" />
  <path d="M 33 36 L 51 54 L 48 57 L 30 39 Z" fill="url(#q-blade-bottom-og)" />
  <line x1="33" y1="36" x2="51" y2="54" stroke="#FFFFFF" stroke-width="1" stroke-linecap="round" opacity="0.95" />

  <line x1="32" y1="15" x2="32" y2="21.5" stroke="url(#q-core-gold-og)" stroke-width="1.5" stroke-linecap="round" />
  <line x1="32" y1="38.5" x2="32" y2="45" stroke="url(#q-core-gold-og)" stroke-width="1.5" stroke-linecap="round" />
  <rect x="28.5" y="21.5" width="7" height="17" rx="2" fill="url(#q-core-gold-og)" />
  <rect x="29.3" y="22.3" width="5.4" height="15.4" rx="1.4" fill="#0C1018" opacity="0.22" />
  <path d="M 29.5 33 L 32 30 L 34.5 33" stroke="#FFFDF9" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
  <circle cx="32" cy="30" r="1.2" fill="#FFFDF9" />
  <circle cx="32" cy="30" r="0.5" fill="#0C1018" />
</svg>
`;

async function generateOgImage() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // 1. Generate OG Banner (1200x630)
  await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });

  const html = `<!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8" />
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        width: 1200px;
        height: 630px;
        background: #080A0F;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        padding: 60px 80px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        color: #ffffff;
        position: relative;
        overflow: hidden;
      }
      .mesh {
        position: absolute;
        top: -150px;
        right: -150px;
        width: 700px;
        height: 700px;
        background: radial-gradient(circle, rgba(212, 175, 55, 0.22) 0%, rgba(8, 10, 15, 0) 70%);
        pointer-events: none;
      }
      .grid {
        position: absolute;
        inset: 0;
        background-image: linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
        background-size: 40px 40px;
        pointer-events: none;
      }
      .top-row {
        display: flex;
        align-items: center;
        gap: 24px;
        z-index: 2;
      }
      .brand-title {
        font-size: 54px;
        font-weight: 900;
        letter-spacing: 0.06em;
        line-height: 1;
      }
      .brand-badge {
        font-family: monospace;
        font-size: 14px;
        color: #D4AF37;
        font-weight: 700;
        letter-spacing: 0.18em;
        background: rgba(212, 175, 55, 0.12);
        border: 1px solid rgba(212, 175, 55, 0.4);
        border-radius: 6px;
        padding: 4px 12px;
        margin-left: 16px;
        vertical-align: middle;
      }
      .middle {
        z-index: 2;
        margin-top: 10px;
      }
      .headline {
        font-size: 38px;
        font-weight: 700;
        color: #F0F4F8;
        line-height: 1.25;
        max-width: 960px;
      }
      .tagline {
        font-size: 20px;
        color: #8899A6;
        margin-top: 14px;
        font-weight: 400;
      }
      .pills {
        display: flex;
        gap: 12px;
        margin-top: 28px;
        flex-wrap: wrap;
      }
      .pill {
        font-family: monospace;
        font-size: 13px;
        font-weight: 600;
        padding: 8px 16px;
        border-radius: 6px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: #CBD5E1;
      }
      .pill.gold {
        color: #D4AF37;
        border-color: rgba(212, 175, 55, 0.35);
        background: rgba(212, 175, 55, 0.08);
      }
      .pill.green {
        color: #22c55e;
        border-color: rgba(34, 197, 94, 0.35);
        background: rgba(34, 197, 94, 0.08);
      }
      .bottom-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        padding-top: 24px;
        z-index: 2;
      }
      .domain {
        font-family: monospace;
        font-size: 18px;
        color: #D4AF37;
        font-weight: 700;
        letter-spacing: 0.08em;
      }
      .meta {
        font-family: monospace;
        font-size: 14px;
        color: #64748B;
      }
    </style>
  </head>
  <body>
    <div class="mesh"></div>
    <div class="grid"></div>
    <div class="top-row">
      ${logoSvg(78)}
      <div>
        <span class="brand-title">QUIDESK</span>
        <span class="brand-badge">MASTER SOVEREIGN</span>
      </div>
    </div>
    <div class="middle">
      <div class="headline">Live Market Intelligence Terminal, served neat and easy</div>
      <div class="tagline">Real-time edge pricing across equities, crypto, metals, energy & foreign exchange with OSINT news signals.</div>
      <div class="pills">
        <div class="pill gold">EQUITIES (SPY, QQQ, NVDA)</div>
        <div class="pill gold">CRYPTO (BTC, ETH, SOL)</div>
        <div class="pill gold">METALS (GOLD, SILVER)</div>
        <div class="pill gold">ENERGY (WTI, BRENT)</div>
        <div class="pill gold">FOREX (EUR/USD, USD/JPY)</div>
        <div class="pill green">● LIVE EDGE CLOUD</div>
      </div>
    </div>
    <div class="bottom-row">
      <div class="domain">quidesk.github.io</div>
      <div class="meta">Free Financial Intelligence · Zero Tracking · No Signup</div>
    </div>
  </body>
  </html>`;

  await page.setContent(html);
  const outOgPath = path.resolve(__dirname, '../public/og-image.png');
  await page.screenshot({ path: outOgPath, type: 'png' });
  console.log(`[OG Generator] Generated verified 1200x630 banner at ${outOgPath}`);

  // 2. Generate Favicon & App Icon (512x512 public/logo.png)
  await page.setViewport({ width: 512, height: 512, deviceScaleFactor: 1 });
  const iconHtml = `<!DOCTYPE html>
  <html>
  <head>
    <style>
      body {
        margin: 0;
        padding: 0;
        width: 512px;
        height: 512px;
        background: transparent;
        display: flex;
        align-items: center;
        justify-content: center;
      }
    </style>
  </head>
  <body>
    ${logoSvg(512)}
  </body>
  </html>`;

  await page.setContent(iconHtml);
  const outLogoPath = path.resolve(__dirname, '../public/logo.png');
  await page.screenshot({ path: outLogoPath, type: 'png', omitBackground: true });
  console.log(`[OG Generator] Generated verified 512x512 logo at ${outLogoPath}`);

  await browser.close();
}

generateOgImage().catch((err) => {
  console.error('[OG Generator] Error:', err);
  process.exit(1);
});
