import React, { useId } from 'react';

/**
 * Quidesk Master Sovereign Fluid Logo — Haute Horlogerie Edition
 *
 * Architectural Features:
 * - Machined Titanium/Obsidian Chassis with Chamfered Gold Rim
 * - Ambient Core Light Well (Radial Halo)
 * - Cardinal Precision Alignment Axis Notches
 * - Concentric Hairline Chronometer Orbital Dial Ring
 * - Continuous Fluid Q Toroid with 45° Architectural Micro-Channels
 * - Specular Crescent Ridge Highlight & Counter-Reflective Inner Rim
 * - Dual-Faceted 3D Prismatic Breakout Blade (Fin) with Razor Ridge Gleam
 * - Suspended Crystalline Candlestick Core with Epistemic Open-Book V-Chevron
 * - Centroid Chronometer Jewel Pivot
 *
 * Scoped IDs prevent SVG gradient clobbering across multiple instances.
 */
export default function QuideskLogo({ size = 40, className = "", style = {} }) {
  const rawId = useId();
  const uid = rawId.replace(/[^a-zA-Z0-9_-]/g, '');

  const goldLiquidId = `q-gold-liquid-${uid}`;
  const bladeTopId = `q-blade-top-${uid}`;
  const bladeBottomId = `q-blade-bottom-${uid}`;
  const specTopId = `q-spec-top-${uid}`;
  const specBottomId = `q-spec-bottom-${uid}`;
  const coreGoldId = `q-core-gold-${uid}`;
  const chassisBgId = `q-chassis-bg-${uid}`;
  const rimBorderId = `q-rim-border-${uid}`;
  const ambientHaloId = `q-ambient-halo-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Quidesk Master Sovereign Logo"
      className={`shrink-0 select-none ${className}`}
      style={style}
    >
      <title>Quidesk — Master Sovereign Edition</title>
      <defs>
        {/* 18K Sovereign Liquid Champagne Gold (Continuous Curvature Sweep) */}
        <linearGradient id={goldLiquidId} x1="5%" y1="0%" x2="95%" y2="100%">
          <stop offset="0%" stopColor="#FFFDF9" />
          <stop offset="14%" stopColor="#FEEBA4" />
          <stop offset="38%" stopColor="#E2B744" />
          <stop offset="65%" stopColor="#B88616" />
          <stop offset="86%" stopColor="#7C5507" />
          <stop offset="100%" stopColor="#4A3202" />
        </linearGradient>

        {/* 3D Facet Blade Primary Lighting (Upper Reflected Chamfer) */}
        <linearGradient id={bladeTopId} x1="15%" y1="15%" x2="85%" y2="85%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="25%" stopColor="#FFF0BA" />
          <stop offset="60%" stopColor="#D4AF37" />
          <stop offset="100%" stopColor="#8F6710" />
        </linearGradient>

        {/* 3D Facet Blade Secondary Shading (Lower Bevel) */}
        <linearGradient id={bladeBottomId} x1="20%" y1="20%" x2="90%" y2="90%">
          <stop offset="0%" stopColor="#D4AF37" />
          <stop offset="50%" stopColor="#9C7214" />
          <stop offset="100%" stopColor="#4E3402" />
        </linearGradient>

        {/* Specular Outer Rim Gleam */}
        <linearGradient id={specTopId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
          <stop offset="35%" stopColor="#FFF3C4" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </linearGradient>

        {/* Specular Inner Rim Counter-Reflectance */}
        <linearGradient id={specBottomId} x1="100%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#FFE8A3" stopOpacity="0.6" />
          <stop offset="40%" stopColor="#D4AF37" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </linearGradient>

        {/* Candlestick Core Luminous Gradient */}
        <linearGradient id={coreGoldId} x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="28%" stopColor="#FDE89F" />
          <stop offset="68%" stopColor="#D4AF37" />
          <stop offset="100%" stopColor="#7A560B" />
        </linearGradient>

        {/* Obsidian/Titanium Chassis Gradient */}
        <linearGradient id={chassisBgId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#141824" />
          <stop offset="50%" stopColor="#0C1018" />
          <stop offset="100%" stopColor="#05070B" />
        </linearGradient>

        {/* Precision Metallic Rim Chamfer */}
        <linearGradient id={rimBorderId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(255, 255, 255, 0.45)" />
          <stop offset="25%" stopColor="rgba(245, 215, 120, 0.55)" />
          <stop offset="70%" stopColor="rgba(212, 175, 55, 0.15)" />
          <stop offset="100%" stopColor="rgba(255, 255, 255, 0.05)" />
        </linearGradient>

        {/* Ambient Internal Halo */}
        <radialGradient id={ambientHaloId} cx="50%" cy="47%" r="48%">
          <stop offset="0%" stopColor="#F5D061" stopOpacity="0.25" />
          <stop offset="45%" stopColor="#D4AF37" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#05070B" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* 1. Machined Titanium/Obsidian Chassis */}
      <rect
        x="1.5"
        y="1.5"
        width="61"
        height="61"
        rx="16"
        fill={`url(#${chassisBgId})`}
        stroke={`url(#${rimBorderId})`}
        strokeWidth="1.2"
      />

      {/* 2. Ambient Internal Light Well */}
      <circle cx="32" cy="30" r="22" fill={`url(#${ambientHaloId})`} />

      {/* 3. Architectural Precision Cardinal Alignment Notches */}
      <line x1="32" y1="4" x2="32" y2="7.5" stroke={`url(#${coreGoldId})`} strokeWidth="1.2" strokeLinecap="round" opacity="0.65" />
      <line x1="32" y1="52.5" x2="32" y2="56" stroke={`url(#${coreGoldId})`} strokeWidth="1.2" strokeLinecap="round" opacity="0.4" />
      <line x1="4" y1="30" x2="7.5" y2="30" stroke={`url(#${coreGoldId})`} strokeWidth="1.2" strokeLinecap="round" opacity="0.65" />
      <line x1="56.5" y1="30" x2="60" y2="30" stroke={`url(#${coreGoldId})`} strokeWidth="1.2" strokeLinecap="round" opacity="0.3" />

      {/* 4. Concentric Hairline Orbital Chronometer Dial Ring */}
      <circle cx="32" cy="30" r="23" stroke={`url(#${goldLiquidId})`} strokeWidth="0.75" strokeDasharray="1 3" opacity="0.35" />

      {/* 5. Main Fluid Q Toroid with 45-degree Architectural Micro-Channels */}
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
        fill={`url(#${goldLiquidId})`}
      />

      {/* 6. Outer Specular Crescent Reflection Arc (Top Ridge Highlight) */}
      <path
        d="M 17 22 C 20.5 14.5, 25.8 11, 32 11 C 38.2 11, 43.5 14.5, 47 22"
        stroke={`url(#${specTopId})`}
        strokeWidth="1.6"
        strokeLinecap="round"
      />

      {/* 7. Inner Rim Specular Reflectance (Bottom Counter-Highlight) */}
      <path
        d="M 23 37 C 25.5 39.5, 28.5 41, 32 41 C 34 41, 35.8 40.5, 37.5 39.5"
        stroke={`url(#${specBottomId})`}
        strokeWidth="1.1"
        strokeLinecap="round"
      />

      {/* 8. Dual-Faceted 3D Prismatic Breakout Blade (Fin) */}
      {/* Upper Reflected Facet */}
      <path
        d="M 33 36 L 51 54 L 54 51 L 36 33 Z"
        fill={`url(#${bladeTopId})`}
      />
      {/* Lower Reflected Facet */}
      <path
        d="M 33 36 L 51 54 L 48 57 L 30 39 Z"
        fill={`url(#${bladeBottomId})`}
      />
      {/* Precision Razor Centerline Gleam */}
      <line x1="33" y1="36" x2="51" y2="54" stroke="#FFFFFF" strokeWidth="1" strokeLinecap="round" opacity="0.95" />

      {/* 9. Suspended Crystalline Candlestick Core */}
      {/* Needle Wicks */}
      <line x1="32" y1="15" x2="32" y2="21.5" stroke={`url(#${coreGoldId})`} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="32" y1="38.5" x2="32" y2="45" stroke={`url(#${coreGoldId})`} strokeWidth="1.5" strokeLinecap="round" />

      {/* Slender Candlestick Lozenge Body */}
      <rect x="28.5" y="21.5" width="7" height="17" rx="2" fill={`url(#${coreGoldId})`} />
      <rect x="29.3" y="22.3" width="5.4" height="15.4" rx="1.4" fill="#0C1018" opacity="0.22" />

      {/* 10. Sovereign Epistemic Open-Book V-Chevron */}
      <path
        d="M 29.5 33 L 32 30 L 34.5 33"
        stroke="#FFFDF9"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 11. Centroid Chronometer Jewel Node */}
      <circle cx="32" cy="30" r="1.2" fill="#FFFDF9" />
      <circle cx="32" cy="30" r="0.5" fill="#0C1018" />
    </svg>
  );
}

export { QuideskLogo };
