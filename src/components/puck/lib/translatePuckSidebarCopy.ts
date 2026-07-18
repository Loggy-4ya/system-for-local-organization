/**
 * @fileoverview Runtime translation for Puck block field labels and select options.
 *
 * English strings in block `fields` configs remain the source of truth for schema and
 * tests; this module maps them to `puck.fieldLabels` / `puck.fieldOptions` at render time.
 *
 * @module src/components/puck/lib/translatePuckSidebarCopy
 */

import type { useTranslations } from "next-intl";
import { puckCopySlug } from "./puckCopySlug";

type PuckFieldLabelsTranslator = ReturnType<typeof useTranslations<"puck.fieldLabels">>;
type PuckFieldOptionsTranslator = ReturnType<typeof useTranslations<"puck.fieldOptions">>;

/**
 * Resolve a Puck sidebar field or option label for the active locale.
 *
 * Falls back to the original English when no catalog entry exists (forward-compatible
 * while new block fields are added).
 *
 * @param english - Canonical English label from block config.
 * @param t - `puck.fieldLabels` or `puck.fieldOptions` translator.
 * @returns Localized label.
 */
export function translatePuckSidebarCopy(
  english: string,
  t: PuckFieldLabelsTranslator | PuckFieldOptionsTranslator,
): string {
  const trimmed = english.trim();
  if (!trimmed) return english;

  const key = puckCopySlug(trimmed);
  if (t.has(key as never)) {
    return t(key as never);
  }

  return english;
}

/**
 * Map Puck select/radio option rows to localized labels.
 *
 * @param options - Source options from block field config.
 * @param t - `puck.fieldOptions` translator.
 * @returns Options with translated labels (values unchanged).
 */
export function translatePuckSelectOptions<T extends { label: string; value: string; title?: string }>(
  options: T[],
  t: PuckFieldOptionsTranslator,
): T[] {
  return options.map((opt) => ({
    ...opt,
    label: translatePuckSidebarCopy(opt.label, t),
    ...(opt.title ? { title: translatePuckSidebarCopy(opt.title, t) } : {}),
  }));
}

export default translatePuckSidebarCopy;
