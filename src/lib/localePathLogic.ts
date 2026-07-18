/**
 * @fileoverview Pure helpers for locale-prefixed URL pathnames.
 *
 * @module src/lib/localePathLogic
 */

import { locales, type AppLocale } from "@/i18n/routing";

/** Regex matching a leading locale segment (`/en`, `/uk`). */
const LOCALE_PREFIX_RE = new RegExp(`^/(${locales.join("|")})(?=/|$)`);

/**
 * Strip a leading locale segment from a pathname.
 *
 * @param pathname - Full pathname including optional locale prefix.
 * @returns Pathname without locale prefix; `/` when input is only `/en` or `/uk`.
 */
export function stripLocalePrefix(pathname: string): string {
  const stripped = pathname.replace(LOCALE_PREFIX_RE, "");
  return stripped.length > 0 ? stripped : "/";
}

/**
 * Read the locale prefix from a pathname when present.
 *
 * @param pathname - Full pathname.
 * @returns Matched locale or `null` when absent.
 */
export function localeFromPathname(pathname: string): AppLocale | null {
  const match = pathname.match(LOCALE_PREFIX_RE);
  const candidate = match?.[1];
  if (candidate && (locales as readonly string[]).includes(candidate)) {
    return candidate as AppLocale;
  }
  return null;
}

/**
 * Prefix an internal path with a locale segment.
 *
 * @param locale - Target locale.
 * @param pathname - Internal path starting with `/` (without locale).
 * @returns Locale-prefixed path.
 */
export function withLocalePrefix(locale: AppLocale, pathname: string): string {
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (normalized === "/") {
    return `/${locale}`;
  }
  return `/${locale}${normalized}`;
}
