# Quidesk — Design System & Creative Direction

> **Suave Obsidian Slate & Champagne Brass Market Intelligence Terminal**  
> Guided by `/awwwards`, `/scroll-craft`, `/landing-page-design`, and `/modern-web-guidance`.

---

## 1. Concept Card

* **Idea:** An architectural multi-asset market intelligence desk tracking global benchmarks across equities, cryptocurrencies, precious metals, energy commodities, and foreign exchange with sub-second clarity and restrained typographic calm.
* **Metaphor:** Swiss Precision Horology & Carbon-Slate Telemetry Desk — clean graphite planes, hairline rules, champagne brass markers, and tabular numerals without visual noise.
* **Signature Moment:** The **Telemetry Vernier (`data-sc-vernier`) & Interactive Global Asset Atlas**: calibrated micro-graduations tracking horizontal ledger exploration alongside an orbital multi-asset correlation web.
* **Emotion:** Quiet mastery, instant legibility, zero visual fatigue across long analytical sessions.
* **Motion Verb:** *Calibrate, glide, settle.* Weighted deceleration (`cubic-bezier(0.22, 1, 0.36, 1)`), compositor-only transforms, and static parity under reduced motion.
* **Poster Frame:** Desktop viewport with top TickerTape & Header seamlessly aligned to the Market Pulse strip, Sector summary chips, Live Global Multi-Asset Map, and Top Movers rail above the fold.

---

## 2. Art Direction System

### Color Palette (6-Role Architecture — WCAG AA/AAA Verified)
| Role | Dark Token (`#0B0C0F`) | Light Token (`#F6F7F8`) | Purpose |
| :--- | :--- | :--- | :--- |
| **Canvas / Ground** | `#0B0C0F` (Carbon Obsidian) | `#F6F7F8` (Architectural Stone) | Clean matte backdrop with zero muddy hue cast |
| **Surface / Card** | `#13151A` / `#1A1D24` | `#FFFFFF` / `#EDEEF1` | Flat-machined cards with 1px hairline separation |
| **Line / Border** | `rgba(255,255,255,0.08)` / `0.22` | `rgba(17,19,23,0.09)` / `0.26` | Crisp full-perimeter containment |
| **Ink / Primary** | `#F4F4F5` (16.2:1) / `#B4B8C2` / `#8E939E` | `#111317` (18.6:1) / `#434956` / `#5C6370` | Tabular prices, asset names, readable captions |
| **Accent** | `#D2B47C` (Champagne Brass) / `#E08262` (Copper) | `#7D5D23` / `#B84A27` | Active indicators, vernier hair-rule, primary focus |
| **Semantics** | `#36C982` (Sage Bull) / `#F06A64` (Coral Bear) | `#157F47` / `#C42B2B` | Directional delta badges paired with icons (`▲`/`▼`) |

### Typography
* **UI, Display & Wordmark:** `Plus Jakarta Sans`, 400–800 weight, zero italics, `text-wrap: balance` on headings.
* **Numeric Telemetry & Metadata:** `JetBrains Mono`, 400–700 weight, `font-variant-numeric: tabular-nums lining-nums`.

### Modern Web Standards Applied
* **`color` & `dark-mode`:** `<meta name="color-scheme" content="light dark">`, dual-mode `light-dark()` + explicit `[data-theme]` tokens, `scrollbar-color`, and `@media (forced-colors: active)` fallbacks.
* **`accessibility` & `motion`:** Single `.visually-hidden` `<h1>`, skip-to-content link, `>= 24px` target sizing, `:focus-visible` outline rings, and compositor-only animations scoped under `@media (prefers-reduced-motion: no-preference)`.
