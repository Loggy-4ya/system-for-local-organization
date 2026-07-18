/**
 * @fileoverview Locale routing configuration for next-intl.
 *
 * @module src/i18n/routing
 */

import { defineRouting } from "next-intl/routing";

/** Supported UI locales. */
export const locales = ["en", "uk"] as const;

/** Locale union type derived from {@link locales}. */
export type AppLocale = (typeof locales)[number];

/** Default locale when negotiation cannot resolve a match. */
export const defaultLocale: AppLocale = "uk";

/**
 * next-intl routing — always prefix URLs with locale segment (`/en/...`, `/uk/...`).
 */
export const routing = defineRouting({
  locales: [...locales],
  defaultLocale,
  localePrefix: "always",
});
