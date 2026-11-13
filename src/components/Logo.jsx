import React, { useId } from 'react';

/**
 * Quidesk Edition 2A-II: Imperial Astrolabe & Order-Book Matrix Logo
 *
 * Architectural Features:
 * - Ambient Core Backlight with Radial Halo
 * - Outer Horological Vernier Ring & Cardinal Indices (N, E, S, W)
 * - 24k Gold Q Crescent with 36-Degree Negative-Space Breakout Channel
 * - Inner & Outer Filigree Bevel Lines
 * - 12-Sided Dodecagonal Inner Chamfered Bezel
 * - Astrolabe Guilloche Grid
 * - Order-Book Depth Matrix (Left Ask Gold Rungs / Right Bid Emerald Rungs)
 * - Sparkline Pulse & Sculpted Gold-Rimmed Emerald Q-Tail Spearhead
 *
 * Scoped IDs prevent SVG gradient clobbering across multiple instances.
 */
export default function QuideskLogo({ size = 40, className = '', style = {} }) {
  const rawId = useId();
  const uid = rawId.replace(/[^a-zA-Z0-9_-]/g, '');

  const gold2a2Id = `qd-gold-2a2-${uid}`;
  const goldRimId = `qd-gold-rim-${uid}`;
  const emerald2a2Id = `qd-emerald-2a2-${uid}`;
  const coreGlowId = `qd-core-glow-${uid}`;

  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Quidesk Imperial Astrolabe and Order-Book Matrix Logo"
      className={`shrink-0 select-none ${className}`}
      style={style}
    >
      <title>Quidesk — Edition 2A-II: Imperial Astrolabe & Order-Book Matrix</title>
      <defs>
        <linearGradient id={gold2a2Id} x1="12" y1="10" x2="108" y2="110" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="28%" stopColor="#D4AF37" />
          <stop offset="65%" stopColor="#9A6F1A" />
          <stop offset="100%" stopColor="#FDE047" />
        </linearGradient>
        <linearGradient id={goldRimId} x1="0" y1="120" x2="120" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#B45309" />
          <stop offset="50%" stopColor="#FDE68A" />
          <stop offset="100%" stopColor="#D4AF37" />
        </linearGradient>
        <linearGradient id={emerald2a2Id} x1="36" y1="44" x2="108" y2="108" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6EE7B7" />
          <stop offset="45%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
        <radialGradient id={coreGlowId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#10B981" stopOpacity="0.16" />
          <stop offset="70%" stopColor="#D4AF37" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#080C14" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Ambient Core Backlight */}
      <circle cx="58" cy="58" r="52" fill={`url(#${coreGlowId})`} />

      {/* 1. Outer Horological Vernier Ring & Cardinal Indices */}
      <circle cx="58" cy="58" r="53" stroke={`url(#${goldRimId})`} strokeOpacity="0.35" strokeWidth="0.9" strokeDasharray="3 5" />
      <circle cx="58" cy="58" r="49.5" stroke="#D4AF37" strokeOpacity="0.22" strokeWidth="0.6" />
      {/* Cardinal Diamond Markers (N, E, S, W) */}
      <polygon points="58,3 60,8 58,11 56,8" fill={`url(#${gold2a2Id})`} />
      <polygon points="113,58 108,60 105,58 108,56" fill={`url(#${gold2a2Id})`} />
      <polygon points="58,113 60,108 58,105 56,108" fill={`url(#${gold2a2Id})`} />
      <polygon points="3,58 8,60 11,58 8,56" fill={`url(#${gold2a2Id})`} />

      {/* 2. Primary 24k Gold Q Crescent with 36-Degree Negative-Space Breakout Channel */}
      <path d="M 97.2 77.9 A 44 44 0 1 0 77.9 97.2 L 72.5 87.4 A 33 33 0 1 1 87.4 72.5 Z" fill={`url(#${gold2a2Id})`} stroke={`url(#${goldRimId})`} strokeWidth="0.8" />
      {/* Inner & Outer Filigree Bevel Lines */}
      <path d="M 99.8 79.3 A 47 47 0 1 0 79.3 99.8" stroke="#FEF08A" strokeOpacity="0.45" strokeWidth="0.8" strokeLinecap="round" />

      {/* 3. 12-Sided Dodecagonal Inner Chamfered Bezel */}
      <polygon points="58,27 73.5,31.2 84.8,42.5 89,58 84.8,73.5 73.5,84.8 58,89 42.5,84.8 31.2,73.5 27,58 31.2,42.5 42.5,31.2" stroke={`url(#${gold2a2Id})`} strokeOpacity="0.7" strokeWidth="1.3" fill="#080C14" fillOpacity="0.55" />

      {/* 4. Astrolabe Guilloche Grid */}
      <g stroke="#94A3B8" strokeOpacity="0.2" strokeWidth="0.7">
        <line x1="29" y1="58" x2="87" y2="58" />
        <line x1="58" y1="29" x2="58" y2="87" />
        <ellipse cx="58" cy="58" rx="22" ry="11" />
        <ellipse cx="58" cy="58" rx="11" ry="22" />
      </g>

      {/* 5. Order-Book Depth Matrix (Left Ask Gold Rungs / Right Bid Emerald Rungs) */}
      <g opacity="0.9">
        {/* Left Ask Rungs (Gold) */}
        <rect x="35" y="42" width="14" height="2.4" rx="1" fill="#FDE047" />
        <rect x="33" y="47" width="18" height="2.4" rx="1" fill="#D4AF37" />
        <rect x="37" y="52" width="11" height="2.4" rx="1" fill="#B45309" />
        <rect x="34" y="64" width="15" height="2.4" rx="1" fill="#D4AF37" />
        <rect x="38" y="69" width="10" height="2.4" rx="1" fill="#9A6F1A" />
        {/* Right Bid Rungs (Emerald) */}
        <rect x="65" y="42" width="15" height="2.4" rx="1" fill="#34D399" />
        <rect x="62" y="47" width="19" height="2.4" rx="1" fill="#10B981" />
        <rect x="66" y="52" width="13" height="2.4" rx="1" fill="#059669" />
        <rect x="64" y="64" width="17" height="2.4" rx="1" fill="#10B981" />
        <rect x="67" y="69" width="11" height="2.4" rx="1" fill="#047857" />
      </g>

      {/* 6. Sparkline Pulse & Sculpted Gold-Rimmed Emerald Q-Tail Spearhead */}
      <path d="M 33 58 L 43 58 L 49 44 L 56 72 L 63 49 L 70 60 L 103 93" stroke="#080C14" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M 33 58 L 43 58 L 49 44 L 56 72 L 63 49 L 70 60 L 103 93" stroke={`url(#${emerald2a2Id})`} strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M 33 58 L 43 58 L 49 44 L 56 72 L 63 49 L 70 60 L 103 93" stroke="#FEF08A" strokeOpacity="0.75" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />

      {/* Faceted Breakout Spearhead (Q Tail Tip) */}
      <polygon points="112,102 93,100 99,94 100,88" fill={`url(#${emerald2a2Id})`} stroke={`url(#${gold2a2Id})`} strokeWidth="1.2" strokeLinejoin="round" />
      <circle cx="114" cy="104" r="2.6" fill="#6EE7B7" stroke="#FEF08A" strokeWidth="0.9" />
    </svg>
  );
}

export { QuideskLogo };
