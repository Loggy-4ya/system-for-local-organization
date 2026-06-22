/**
 * @fileoverview Shared native attributes for institutional phone number inputs.
 *
 * Ensures mobile browsers open a numeric telephone keypad (`inputMode="numeric"`)
 * instead of a generic QWERTY keyboard when `type="tel"` alone is ignored.
 * Character stripping for XSS-safe persistence lives in {@link filterPhoneInputChange}.
 *
 * @module src/lib/phoneInputProps
 */

import { filterPhoneInputChange, normalizePhoneInput } from "@shared/validation/phoneSchema";

export { filterPhoneInputChange };

/**
 * Apply {@link normalizePhoneInput} autocorrect after the user leaves a phone field.
 *
 * @param raw - Current controlled input value.
 * @returns Canonical stored value, or empty string when undialable.
 */
export function autocorrectPhoneFieldValue(raw: string): string {
  return normalizePhoneInput(raw) ?? "";
}

/** Native `<input>` props shared by signup, profile settings, and admin directory phone fields. */
export const phoneInputProps = {
  type: "tel" as const,
  /** Telephone keypad on mobile — digits with optional leading `+` (see {@link optionalPhoneSchema}). */
  inputMode: "tel" as const,
  autoComplete: "tel" as const,
};

/** Generic placeholder for international phone inputs (no default region). */
export const phoneInputPlaceholder = "+XX XXX XXX XXXX";
