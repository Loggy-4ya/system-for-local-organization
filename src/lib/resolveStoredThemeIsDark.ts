/**
 * @fileoverview Resolves whether the active theme should render as dark on the server.
 *
 * Aligns header toggle visuals with the theme cookie and, when the cookie is
 * `system`, the `Sec-CH-Prefers-Color-Scheme` client hint.
 *
 * @module src/lib/resolveStoredThemeIsDark
 */

import { getTheme, readColorSchemeHint } from "@teispace/next-themes/server";
import { headers } from "next/headers";

/** Theme names accepted by Nexus layouts and the toggle route. */
export const NEXUS_THEME_OPTIONS = ["light", "dark", "system"] as const;

/**
 * Determine whether UI should render the dark-theme variant for the current request.
 *
 * @param defaultTheme - Fallback when cookie and client hint are unavailable.
 * @returns `true` when the resolved stored theme is dark or system-resolved dark.
 */
export async function resolveStoredThemeIsDark(
  defaultTheme: "light" | "dark" = "dark"
): Promise<boolean> {
  const headerStore = await headers();
  const storedTheme =
    (await getTheme({
      themes: [...NEXUS_THEME_OPTIONS],
      headers: headerStore,
    })) ?? defaultTheme;

  if (storedTheme === "light") return false;
  if (storedTheme === "dark") return true;

  const hint = readColorSchemeHint(headerStore);
  if (hint === "light") return false;
  if (hint === "dark") return true;

  return defaultTheme !== "light";
}
