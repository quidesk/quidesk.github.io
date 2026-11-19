# Quidesk — Design System & Creative Direction

> **Award-Caliber Sovereign Market Intelligence Terminal**  
> Rooted in the principles of `/awwwards`, `/scroll-craft`, and `/modern-web-guidance`.

---

## 1. Concept Card

* **Idea:** A real-time, sovereign edge market intelligence terminal tracking global financial benchmarks across equities, cryptocurrencies, precious metals, energy commodities, and foreign exchange with zero latency bottlenecks and institutional precision.
* **Metaphor:** The Celestial Astrolabe & High-Density Financial Matrix — fusing ancient navigational precision with modern algorithmic telemetry.
* **Signature Moment:** The **Interactive 3D Orbital Market Map & Correlation Web**: celestial asset orbs with dynamic liquid volume, gravity clamping, and luminous cross-asset correlation lines pulsing with live price action.
* **Emotion:** Instant authority, crystalline lucidity, effortless mastery over global macro complexity.
* **Motion Verb:** *Orbit, pulse, calibrate.* Smooth continuous transitions, zero jarring flashes, tactile magnetic snaps.
* **Poster Frame:** The 4K Terminal Viewport — glowing astrolabe insignia, ambient Egyptian Navy & Obsidian matrix, glowing emerald/scarlet tick ripples, and the orbital market sphere.

---

## 2. Art Direction System

### Color Palette (6-Role Architecture)
| Role | Dark Token | Light Token | Purpose |
| :--- | :--- | :--- | :--- |
| **Canvas / Ground** | `#05080F` (Obsidian Void) | `#F0F4F8` | Deep backdrop with subtle architectural grid mesh |
| **Surface / Card** | `rgba(10, 18, 30, 0.72)` | `rgba(255, 255, 255, 0.90)` | Frosted glass with `inset 0 1px 0 rgba(255,255,255,0.08)` |
| **Line / Border** | `rgba(99, 156, 197, 0.20)` | `rgba(44, 105, 154, 0.18)` | Hairline architectural precision borders |
| **Ink / Primary Text** | `#FFFFFF` (16.5:1 AAA) | `#032035` | Benchmark prices, symbols, titles |
| **Muted / Secondary** | `#94A3B8` (Slate Light) | `#475569` | Asset names, timestamps, market sessions |
| **Accents** | `#D4AF37` (Imperial Gold) / `#10B981` (Bull) / `#EB2F33` (Bear) | Same | Directional triggers, delta badges, stream pulse |

### Typography
* **Brand Wordmark:** `Plus Jakarta Sans`, 800 weight, `-0.025em` tracking.
* **Display / Headings:** `Syne`, 700/800 weight, editorial geometry.
* **Numerical Data / Telemetry:** `DM Mono`, 400/500 weight, tabular numbers.
* **Interface Body & Metadata:** `Inter`, 400/500/600 weight, 1.5 leading.

### Motion Language
* **Easings:** `cubic-bezier(0.16, 1, 0.3, 1)` (fluid natural decel) and `cubic-bezier(0.4, 0, 0.2, 1)`.
* **View Transitions:** Native `document.startViewTransition()` on SPA tab switches with cross-fade morphing.
* **Micro-interactions:** 2px card lift, subtle border glow illumination, magnetic tab active indicator.
* **Reduced Motion:** When `@media (prefers-reduced-motion: reduce)` is active, animations and transitions revert to instant updates.

---

## 3. Modern Web Standards Applied
* **`dark-mode` & `color`: `<meta name="color-scheme" content="light dark">` in `<head>`, `:root { color-scheme: light dark; }`, and `scrollbar-color: var(--border-mid) transparent;` to eliminate FOUC and provide native dark-mode scrollbars.
* **`same-document-transitions`**: Wrapped tab navigations in `document.startViewTransition()` with graceful fallback for seamless view changes.
* **`motion`**: Hardware-accelerated CSS properties (`transform`, `opacity`, `filter`), compositor-only animations, zero layout thrashing.
