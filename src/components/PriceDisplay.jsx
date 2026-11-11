import React from 'react';

/**
 * PriceDisplay — Formats numerical asset prices with strict decimal precision consistency.
 *
 * Rule:
 * - If precision prop is provided, use that precision.
 * - Otherwise:
 *   - prices < 1 use 4 decimals (e.g. ADA 0.1920)
 *   - prices >= 1 use 2 decimals (e.g. XRP 1.31, BTC 80537.38)
 */
export function PriceDisplay({
  value,
  precision,
  prefix = '',
  suffix = '',
  className = '',
  style = {},
}) {
  if (value === null || value === undefined || typeof value !== 'number' || isNaN(value)) {
    return <span className={`tabular-nums ${className}`} style={style}>—</span>;
  }

  const decimals = precision ?? (value < 1 ? 4 : 2);
  const formatted = value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span className={`tabular-nums ${className}`} style={style}>
      {prefix}{formatted}{suffix}
    </span>
  );
}

export default PriceDisplay;
