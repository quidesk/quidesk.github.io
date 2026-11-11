import React, { useState } from 'react';
import { Check, Copy, Share2 } from 'lucide-react';

/* ─── Premium Official Vector Logos ─── */
export const XLogo = ({ size = 15, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

export const LinkedInLogo = ({ size = 15, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451c.979 0 1.778-.773 1.778-1.729V1.73C24 .774 23.205 0 22.225 0z"/>
  </svg>
);

export const RedditLogo = ({ size = 15, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true">
    <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.197-2.512-.73a.326.326 0 0 0-.232-.095z"/>
  </svg>
);

export const TelegramLogo = ({ size = 15, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true">
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.121l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.536-.196 1.006.128.832.942z"/>
  </svg>
);

export const WhatsAppLogo = ({ size = 15, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.086 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const PLATFORMS = [
  {
    id: 'x',
    name: 'X',
    icon: XLogo,
    brandColor: '#e7e9ea',
    brandBg: 'rgba(255, 255, 255, 0.08)',
    getUrl: (url, text) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: LinkedInLogo,
    brandColor: '#0a66c2',
    brandBg: 'rgba(10, 102, 194, 0.12)',
    getUrl: (url) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
  },
  {
    id: 'reddit',
    name: 'Reddit',
    icon: RedditLogo,
    brandColor: '#ff4500',
    brandBg: 'rgba(255, 69, 0, 0.12)',
    getUrl: (url, text) => `https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}`,
  },
  {
    id: 'telegram',
    name: 'Telegram',
    icon: TelegramLogo,
    brandColor: '#229ed9',
    brandBg: 'rgba(34, 158, 217, 0.12)',
    getUrl: (url, text) => `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    icon: WhatsAppLogo,
    brandColor: '#25d366',
    brandBg: 'rgba(37, 211, 102, 0.12)',
    getUrl: (url, text) => `https://api.whatsapp.com/send?text=${encodeURIComponent(`${text}\n${url}`)}`,
  },
];

export default function SocialShareBar({
  url = 'https://quidesk.github.io',
  text = 'Quidesk — Live Market Intelligence Terminal | Equities, Crypto, Metals, Energy & Forex',
  layout = 'horizontal', // 'horizontal' | 'grid' | 'inline'
  showLabels = false,
  className = '',
  style = {},
}) {
  const [copied, setCopied] = useState(false);
  const [hoveredId, setHoveredId] = useState(null);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Fallback prompt if clipboard API blocked
      window.prompt('Copy URL to clipboard:', url);
    }
  };

  const handleShareClick = (platform) => {
    const shareHref = platform.getUrl(url, text);
    window.open(shareHref, '_blank', 'noopener,noreferrer,width=600,height=520');
  };

  const isGrid = layout === 'grid';
  const isInline = layout === 'inline';

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: isGrid ? '10px' : isInline ? '6px' : '8px',
        ...(isGrid ? { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))' } : {}),
        ...style,
      }}
    >
      {PLATFORMS.map((p) => {
        const IconComponent = p.icon;
        const isHovered = hoveredId === p.id;

        return (
          <button
            key={p.id}
            onClick={() => handleShareClick(p)}
            onMouseEnter={() => setHoveredId(p.id)}
            onMouseLeave={() => setHoveredId(null)}
            title={`Share on ${p.name}`}
            aria-label={`Share on ${p.name}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: showLabels ? '8px' : '0',
              padding: showLabels ? '8px 14px' : '7px 10px',
              borderRadius: '7px',
              border: `1px solid ${isHovered ? p.brandColor : 'var(--border-subtle)'}`,
              background: isHovered ? p.brandBg : 'var(--bg-card)',
              color: isHovered ? p.brandColor : 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
              transform: isHovered ? 'translateY(-1px)' : 'translateY(0)',
              boxShadow: isHovered ? `0 4px 12px ${p.brandBg}` : 'none',
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 500,
              letterSpacing: '0.02em',
              lineHeight: 1,
              userSelect: 'none',
            }}
          >
            <IconComponent size={showLabels ? 14 : 14} color={isHovered ? p.brandColor : 'currentColor'} />
            {showLabels && <span>{p.name}</span>}
          </button>
        );
      })}

      {/* Copy Link Button */}
      <button
        onClick={handleCopyLink}
        onMouseEnter={() => setHoveredId('copy')}
        onMouseLeave={() => setHoveredId(null)}
        title={copied ? 'Link Copied!' : 'Copy Link to Clipboard'}
        aria-label="Copy Link"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: showLabels ? '8px' : '6px',
          padding: showLabels ? '8px 14px' : '7px 10px',
          borderRadius: '7px',
          border: `1px solid ${copied ? 'var(--bull)' : hoveredId === 'copy' ? 'var(--accent)' : 'var(--border-subtle)'}`,
          background: copied
            ? 'rgba(16, 185, 129, 0.12)'
            : hoveredId === 'copy'
            ? 'var(--bg-card-hover)'
            : 'var(--bg-card)',
          color: copied
            ? 'var(--bull)'
            : hoveredId === 'copy'
            ? 'var(--accent)'
            : 'var(--text-secondary)',
          cursor: 'pointer',
          transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
          transform: hoveredId === 'copy' ? 'translateY(-1px)' : 'translateY(0)',
          boxShadow: copied ? '0 0 10px rgba(16, 185, 129, 0.25)' : 'none',
          fontSize: '12px',
          fontFamily: 'var(--font-mono)',
          fontWeight: 500,
          letterSpacing: '0.02em',
          lineHeight: 1,
          userSelect: 'none',
        }}
      >
        {copied ? <Check size={14} color="var(--bull)" /> : <Copy size={14} />}
        {showLabels && <span>{copied ? 'Copied!' : 'Copy Link'}</span>}
      </button>
    </div>
  );
}
