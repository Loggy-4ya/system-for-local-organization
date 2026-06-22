/**
 * @fileoverview Content-Security-Policy builder for Nexus web responses.
 *
 * Supports optional per-request nonces (production) and a dev fallback with
 * `'unsafe-inline'` when nonces are disabled.
 *
 * @module src/lib/contentSecurityPolicy
 *
 * Tests: `npm run test:content-security-policy`
 * Registry: `.ai/docs/testing.md`
 */

/** Request header carrying the CSP nonce for Server Components. */
export const CSP_NONCE_HEADER = "x-nonce";

/** Directives assembled into the CSP header value. */
export interface ContentSecurityPolicyOptions {
  /** When true, allow webpack/eval used by Next.js dev server. */
  isDev?: boolean;
  /** Per-request nonce from middleware (enables `strict-dynamic` script-src). */
  nonce?: string;
}

/**
 * Whether per-request CSP nonces are enabled.
 *
 * Controlled by `CSP_USE_NONCE` (`true` / `false`). Defaults to enabled in
 * production and disabled in development to reduce HMR friction.
 *
 * @returns True when middleware should generate and attach a nonce.
 */
export function isCspNonceEnabled(): boolean {
  const raw = process.env.CSP_USE_NONCE?.trim().toLowerCase();
  if (raw === "true" || raw === "1") return true;
  if (raw === "false" || raw === "0") return false;
  return process.env.NODE_ENV === "production";
}

/**
 * Generate a cryptographically random CSP nonce (Edge + Node safe).
 *
 * @returns Base64 nonce string for `'nonce-…'` directives.
 */
export function generateCspNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

/**
 * Build a Content-Security-Policy header value for Nexus pages.
 *
 * @param options - Environment-specific toggles and optional nonce.
 * @returns CSP directive string.
 */
export function buildContentSecurityPolicy(
  options: ContentSecurityPolicyOptions = {},
): string {
  const scriptSrc = options.nonce
    ? [
        "script-src 'self'",
        `'nonce-${options.nonce}'`,
        "'strict-dynamic'",
        options.isDev ? "'unsafe-eval'" : null,
      ]
        .filter(Boolean)
        .join(" ")
    : options.isDev
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
