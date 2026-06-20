/**
 * @fileoverview Safe hyperlink validation for user-authored URLs.
 *
 * @module shared/lib/safeHref
 *
 * Tests: `npm run test:safe-href`
 * Registry: `.ai/docs/testing.md`
 */

/** URL protocols permitted in user-authored links. */
const SAFE_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"]);

/**
 * Validate whether a hyperlink target is safe to render or persist.
 *
 * Allows same-origin relative paths (`/news`), fragment links (`#section`),
 * and `http`/`https`/`mailto`/`tel` absolute URLs. Rejects `javascript:`,
 * `data:`, protocol-relative URLs (`//evil.com`), and other schemes.
 *
 * @param href - Raw href attribute or link field value.
 * @returns True when the URL is allowed.
 */
export function isSafeHref(href: string): boolean {
  const trimmed = href.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("//")) return false;
  if (trimmed.startsWith("#")) return true;
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return true;

  try {
    const url = new URL(trimmed, "https://example.com");
    return SAFE_PROTOCOLS.has(url.protocol);
  } catch {
    return false;
  }
}

/**
 * Return a trimmed safe href or empty string when disallowed.
 *
 * @param href - Raw user link value.
 * @returns Safe href for `<a href>` or empty string.
 */
export function sanitizeUserHref(href: string | undefined | null): string {
  if (!href?.trim()) return "";
  const trimmed = href.trim();
  return isSafeHref(trimmed) ? trimmed : "";
}
