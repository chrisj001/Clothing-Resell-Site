import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitize user-generated HTML content using DOMPurify.
 *
 * DOMPurify is a battle-tested, DOM-based sanitizer that handles edge cases
 * (nested tags, SVG XSS, mutation XSS, etc.) that regex-based approaches miss.
 * isomorphic-dompurify works in both server-side and client-side contexts.
 *
 * Only a strict allowlist of safe tags and attributes is permitted.
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'b', 'i', 'em', 'strong', 'u', 's',
      'a', 'p', 'br', 'hr',
      'ul', 'ol', 'li',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'blockquote', 'pre', 'code',
      'span', 'div',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
    // Force all links to open safely
    ADD_ATTR: ['target'],
    FORBID_ATTR: ['style', 'onerror', 'onload', 'onclick'],
    // Strip javascript: and data: URIs from href/src
    ALLOW_DATA_ATTR: false,
  });
}
