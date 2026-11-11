import React from 'react';

const RANGES = ['1H', '24H', '1M', '1Y'];

/**
 * TimeRangeToggles — Renders distinct clickable buttons for historical timeframes.
 * Resolves the concatenated text bug where '1H 24H 1M 1Y' rendered as a single string.
 */
export function TimeRangeToggles({
  selected = '24H',
  onChange,
  className = '',
  accentColor,
  disabledRanges = [],
}) {
  return (
    <div
      className={`time-range-toggles flex gap-1 ${className}`}
      style={{ display: 'flex', gap: '4px', alignItems: 'center' }}
    >
      {RANGES.map((r) => {
        const isSelected = selected === r;
        const isDisabled = Array.isArray(disabledRanges) && disabledRanges.includes(r);
        const activeBg = accentColor ? `${accentColor}20` : 'var(--bg-surface, rgba(255,255,255,0.1))';
        const activeColor = accentColor || 'var(--text-primary, #ffffff)';
        const activeBorder = accentColor ? `1px solid ${accentColor}50` : '1px solid var(--accent, #00f5ff)';

        return (
          <button
            key={r}
            type="button"
            disabled={isDisabled}
            onClick={(e) => {
              e.stopPropagation();
              if (!isDisabled && onChange) onChange(r);
            }}
            className={`time-range-btn px-2 py-1 rounded text-xs ${
              isSelected ? 'active bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'
            }`}
            style={{
              padding: '2px 7px',
              borderRadius: '4px',
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: '10px',
              cursor: isDisabled ? 'not-allowed' : 'pointer',
              opacity: isDisabled ? 0.4 : 1,
              border: isSelected ? activeBorder : '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
              background: isSelected ? activeBg : 'var(--bg-overlay, rgba(255,255,255,0.03))',
              color: isSelected ? activeColor : 'var(--text-dim, #8b949e)',
              transition: 'all 0.15s ease',
              lineHeight: '14px',
            }}
            onMouseEnter={(e) => {
              if (!isSelected) {
                e.currentTarget.style.color = 'var(--text-primary, #ffffff)';
                e.currentTarget.style.background = 'var(--bg-surface, rgba(255,255,255,0.06))';
              }
            }}
            onMouseLeave={(e) => {
              if (!isSelected) {
                e.currentTarget.style.color = 'var(--text-dim, #8b949e)';
                e.currentTarget.style.background = 'var(--bg-overlay, rgba(255,255,255,0.03))';
              }
            }}
          >
            {r}
          </button>
        );
      })}
    </div>
  );
}

export default TimeRangeToggles;
