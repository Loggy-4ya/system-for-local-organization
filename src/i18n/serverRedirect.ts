/**
 * @fileoverview Server-only locale-aware redirect helpers.
 *
 * Kept separate from {@link ./navigation} so client components can import
 * `Link` / `useRouter` without pulling in `next-intl/server`.
 *
 * @module src/i18n/serverRedirect
 */

import { getLocale } from "next-intl/server";
import { redirect as intlRedirect } from "@/i18n/navigation";

/** Href accepted by next-intl server redirect. */
type RedirectHref = Parameters<typeof intlRedirect>[0]["href"];

/** Optional Next.js redirect type argument for next-intl `redirect`. */
type RedirectTypeArg = Parameters<typeof intlRedirect>[1];

/**
 * Locale-aware server redirect.
 *
 * Resolves the active request locale via {@link getLocale} so callers can pass
 * bare locale-unprefixed paths (`/login`) without repeating `{ locale }`.
 *
 * @param href - Locale-unprefixed path string or pathname/query object.
 * @param type - Optional Next.js redirect type.
 * @returns Never — throws a Next.js redirect response.
 */
export async function redirect(
  href: RedirectHref,
  type?: RedirectTypeArg,
): Promise<never> {
  const locale = await getLocale();
  return intlRedirect({ href, locale }, type);
}
