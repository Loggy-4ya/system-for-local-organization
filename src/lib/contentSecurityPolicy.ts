/**
 * @fileoverview Content-Security-Policy builder for Nexus web responses.
 *
 * Balanced for Next.js (requires `'unsafe-inline'` scripts today) while blocking
 * common XSS gadget vectors (`object-src`, `base-uri`, untrusted frames).
 *
 * @module src/lib/contentSecurityPolicy
 *
 * Tests: `npm run test:content-security-policy`
 * Registry: `.ai/docs/testing.md`
 */

/** Directives assembled into the CSP header value. */
export interface ContentSecurityPolicyOptions {
  /** When true, allow webpack/eval used by Next.js dev server. */
  isDev?: boolean;
}

/**
 * Build a Content-Security-Policy header value for Nexus pages.
 *
 * @param options - Environment-specific toggles.
 * @returns CSP directive string.
 */
export function buildContentSecurityPolicy(
  options: ContentSecurityPolicyOptions = {},
): string {
  const scriptSrc = options.isDev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : "script-src 'self' 'unsafe-inline'";

  const directives = [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://lh3.googleusercontent.com https://t.me https://storage.googleapis.com https://storage.cloud.google.com",
    "media-src 'self' blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https:",
    "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
  ];

  return directives.join("; ");
}
