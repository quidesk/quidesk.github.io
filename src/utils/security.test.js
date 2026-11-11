import { describe, it, expect } from 'vitest';
import { sanitizeUrl, stripHtml } from './security';

describe('Security Utilities', () => {
  describe('sanitizeUrl', () => {
    it('blocks javascript: URLs', () => {
      expect(sanitizeUrl('javascript:alert(document.cookie)')).toBe('#');
      expect(sanitizeUrl('JAVASCRIPT:alert(1)')).toBe('#');
      expect(sanitizeUrl('  javascript:void(0)')).toBe('#');
    });

    it('blocks data: and vbscript: URLs', () => {
      expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBe('#');
      expect(sanitizeUrl('vbscript:msgbox("hello")')).toBe('#');
      expect(sanitizeUrl('file:///etc/passwd')).toBe('#');
    });

    it('permits valid https: and http: URLs', () => {
      expect(sanitizeUrl('https://decrypt.co/feed')).toBe('https://decrypt.co/feed');
      expect(sanitizeUrl('http://example.com/news?id=10')).toBe('http://example.com/news?id=10');
    });

    it('permits valid internal relative paths', () => {
      expect(sanitizeUrl('/sector/crypto')).toBe('/sector/crypto');
    });

    it('blocks protocol-relative URLs that could bypass scheme checks', () => {
      expect(sanitizeUrl('//evil.com/payload')).toBe('#');
    });

    it('handles null, undefined, or empty values with fallback', () => {
      expect(sanitizeUrl(null)).toBe('#');
      expect(sanitizeUrl(undefined)).toBe('#');
      expect(sanitizeUrl('', 'https://quidesk.github.io')).toBe('https://quidesk.github.io');
    });
  });

  describe('stripHtml', () => {
    it('strips HTML tags cleanly', () => {
      expect(stripHtml('<script>alert("xss")</script>Hello')).toBe('Hello');
      expect(stripHtml('<b>Bold</b> text')).toBe('Bold text');
    });

    it('handles null and undefined', () => {
      expect(stripHtml(null)).toBe('');
      expect(stripHtml(undefined)).toBe('');
    });
  });
});
