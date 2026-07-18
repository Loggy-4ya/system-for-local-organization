/**
 * @fileoverview Locale-aware Puck editor toast copy.
 *
 * @module src/lib/puckEditorToastCopy
 */

import en from "../../messages/en.json";
import uk from "../../messages/uk.json";
import type { AppLocale } from "@/i18n/routing";

/** Message catalogs keyed by locale. */
const CATALOGS = { en, uk } as const;

/**
 * Resolve a namespaced message for a locale with simple `{param}` interpolation.
 *
 * @param locale - Active UI locale.
 * @param namespace - Top-level message namespace.
 * @param key - Dot path within the namespace.
 * @param values - Optional interpolation values.
 * @returns Localized string.
 */
export function formatLocaleMessage(
  locale: AppLocale,
  namespace: keyof typeof en,
  key: string,
  values?: Record<string, string>,
): string {
  const catalog = CATALOGS[locale] ?? CATALOGS.en;
  const section = catalog[namespace] as Record<string, unknown>;
  const parts = key.split(".");
  let current: unknown = section;

  for (const part of parts) {
    if (current == null || typeof current !== "object") {
      return key;
    }
    current = (current as Record<string, unknown>)[part];
  }

  if (typeof current !== "string") {
    return key;
  }

  if (!values) {
    return current;
  }

  return Object.entries(values).reduce(
    (output, [name, value]) => output.replace(`{${name}}`, value),
    current,
  );
}
