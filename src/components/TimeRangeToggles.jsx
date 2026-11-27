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
        const activeBg = accentColor ? `${accentColor}22` : 'var(--accent-dim)';
        const activeColor = accentColor || 'var(--text-primary)';
        const activeBorder = accentColor ? `1px solid ${accentColor}58` : '1px solid var(--border-accent)';

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
              isSelected ? 'active' : ''
            }`}
            style={{
              padding: '3px 8px',
              minHeight: '22px',
              borderRadius: '4px',
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: '10px',
              fontWeight: isSelected ? 600 : 500,
              cursor: isDisabled ? 'not-allowed' : 'pointer',
              opacity: isDisabled ? 0.4 : 1,
              border: isSelected ? activeBorder : '1px solid var(--border-subtle)',
              background: isSelected ? activeBg : 'var(--sc-surface-elevated)',
              color: isSelected ? activeColor : 'var(--text-dim)',
              transition: 'all 0.16s cubic-bezier(0.22, 1, 0.36, 1)',
              lineHeight: '14px',
            }}
            onMouseEnter={(e) => {
              if (!isSelected) {
                e.currentTarget.style.color = 'var(--text-primary)';
                e.currentTarget.style.background = 'var(--bg-surface)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isSelected) {
                e.currentTarget.style.color = 'var(--text-dim)';
                e.currentTarget.style.background = 'var(--sc-surface-elevated)';
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
