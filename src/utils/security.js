/**
 * Security and sanitization utilities for Quidesk.
 * Mitigates DOM XSS, protocol injection (javascript: / data:), and malicious payloads.
 */

/**
 * Validates and sanitizes dynamic URLs to prevent javascript:, data:, and vbscript: execution.
 * Only explicit http: and https: schemes (or relative paths) are permitted.
 * 
 * @param {string} url - Target URL to sanitize.
 * @param {string} [fallback='#'] - Fallback URL if target fails security validation.
 * @returns {string} Sanitized URL safe for href/src attributes.
 */
function hasControlChars(str) {
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code <= 0x1f || code === 0x7f) return true;
  }
  return false;
}

export function sanitizeUrl(url, fallback = '#') {
  if (!url || typeof url !== 'string') return fallback;
  const trimmed = url.trim();
  if (!trimmed || hasControlChars(trimmed)) {
    return fallback;
  }

  // Block dangerous pseudoprotocols explicitly
  if (/^(javascript|data|vbscript|file):/i.test(trimmed)) {
    return fallback;
  }

  // Allow strictly internal single-slash relative paths
  if (trimmed.startsWith('/') && !trimmed.startsWith('//') && !trimmed.startsWith('/\\')) {
    return trimmed;
  }

  // Enforce standard http/https URL scheme via structured URL parser
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        return trimmed;
      }
    } catch {
      return fallback;
    }
  }

  return fallback;
}

/**
 * Strips HTML tags and controls dangerous characters from untrusted strings.
 * 
 * @param {string} input - Raw user or feed input.
 * @returns {string} Plain text with HTML tags stripped.
 */
export function stripHtml(input) {
  if (!input || typeof input !== 'string') return '';
  return input
    .slice(0, 16384)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]*>/g, '')
    .trim();
}
