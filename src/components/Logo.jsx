import React, { useId } from 'react';

/**
 * Quidesk Astrolabe and Order-Book Matrix Logo (Carbon & Champagne Brass)
 */
export default function QuideskLogo({ size = 42, className = '', style = {} }) {
  const rawId = useId();
  const uid = rawId.replace(/[^a-zA-Z0-9_-]/g, '');

  const brassId = `qd-brass-${uid}`;
  const rimId = `qd-brass-rim-${uid}`;
  const sageId = `qd-sage-${uid}`;
  const coreGlowId = `qd-core-glow-${uid}`;

  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Quidesk Astrolabe and Order-Book Matrix Logo"
      className={`shrink-0 select-none ${className}`}
      style={style}
    >
      <defs>
        <linearGradient id={brassId} x1="12" y1="10" x2="108" y2="110" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#EDE0C4" />
          <stop offset="32%" stopColor="#D2B47C" />
          <stop offset="70%" stopColor="#9A7D4A" />
          <stop offset="100%" stopColor="#E6CE9E" />
        </linearGradient>
        <linearGradient id={rimId} x1="0" y1="120" x2="120" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#8C6D3B" />
          <stop offset="50%" stopColor="#E6CE9E" />
          <stop offset="100%" stopColor="#C4A46A" />
        </linearGradient>
        <linearGradient id={sageId} x1="36" y1="44" x2="108" y2="108" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6CE2A6" />
          <stop offset="48%" stopColor="#36C982" />
          <stop offset="100%" stopColor="#1B8F56" />
        </linearGradient>
        <radialGradient id={coreGlowId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#36C982" stopOpacity="0.14" />
          <stop offset="70%" stopColor="#D2B47C" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#0B0C0F" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="58" cy="58" r="52" fill={`url(#${coreGlowId})`} />
      <circle cx="58" cy="58" r="53" stroke={`url(#${rimId})`} strokeOpacity="0.35" strokeWidth="0.9" strokeDasharray="3 5" />
      <circle cx="58" cy="58" r="49.5" stroke="#D2B47C" strokeOpacity="0.22" strokeWidth="0.6" />
      <polygon points="58,3 60,8 58,11 56,8" fill={`url(#${brassId})`} />
      <polygon points="113,58 108,60 105,58 108,56" fill={`url(#${brassId})`} />
      <polygon points="58,113 60,108 58,105 56,108" fill={`url(#${brassId})`} />
      <polygon points="3,58 8,60 11,58 8,56" fill={`url(#${brassId})`} />
      <path d="M 97.2 77.9 A 44 44 0 1 0 77.9 97.2 L 72.5 87.4 A 33 33 0 1 1 87.4 72.5 Z" fill={`url(#${brassId})`} stroke={`url(#${rimId})`} strokeWidth="0.8" />
      <path d="M 99.8 79.3 A 47 47 0 1 0 79.3 99.8" stroke="#EDE0C4" strokeOpacity="0.45" strokeWidth="0.8" strokeLinecap="round" />
      <polygon points="58,27 73.5,31.2 84.8,42.5 89,58 84.8,73.5 73.5,84.8 58,89 42.5,84.8 31.2,73.5 27,58 31.2,42.5 42.5,31.2" stroke={`url(#${brassId})`} strokeOpacity="0.7" strokeWidth="1.3" fill="#0B0C0F" fillOpacity="0.6" />
      <g stroke="#8E939E" strokeOpacity="0.22" strokeWidth="0.7">
        <line x1="29" y1="58" x2="87" y2="58" />
        <line x1="58" y1="29" x2="58" y2="87" />
        <ellipse cx="58" cy="58" rx="22" ry="11" />
        <ellipse cx="58" cy="58" rx="11" ry="22" />
      </g>
      <g opacity="0.9">
        <rect x="35" y="42" width="14" height="2.4" rx="1" fill="#E6CE9E" />
        <rect x="33" y="47" width="18" height="2.4" rx="1" fill="#D2B47C" />
        <rect x="37" y="52" width="11" height="2.4" rx="1" fill="#9A7D4A" />
        <rect x="34" y="64" width="15" height="2.4" rx="1" fill="#D2B47C" />
        <rect x="38" y="69" width="10" height="2.4" rx="1" fill="#8C6D3B" />
        <rect x="65" y="42" width="15" height="2.4" rx="1" fill="#6CE2A6" />
        <rect x="62" y="47" width="19" height="2.4" rx="1" fill="#36C982" />
        <rect x="66" y="52" width="13" height="2.4" rx="1" fill="#23AA6A" />
        <rect x="64" y="64" width="17" height="2.4" rx="1" fill="#36C982" />
        <rect x="67" y="69" width="11" height="2.4" rx="1" fill="#1B8F56" />
      </g>
      <path d="M 33 58 L 43 58 L 49 44 L 56 72 L 63 49 L 70 60 L 103 93" stroke="#0B0C0F" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M 33 58 L 43 58 L 49 44 L 56 72 L 63 49 L 70 60 L 103 93" stroke={`url(#${sageId})`} strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M 33 58 L 43 58 L 49 44 L 56 72 L 63 49 L 70 60 L 103 93" stroke="#EDE0C4" strokeOpacity="0.7" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
      <polygon points="112,102 93,100 99,94 100,88" fill={`url(#${sageId})`} stroke={`url(#${brassId})`} strokeWidth="1.2" strokeLinejoin="round" />
      <circle cx="114" cy="104" r="2.6" fill="#6CE2A6" stroke="#EDE0C4" strokeWidth="0.9" />
    </svg>
  );
}
