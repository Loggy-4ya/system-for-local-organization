/**
 * @fileoverview Shared native attributes for institutional phone number inputs.
 *
 * Ensures mobile browsers open a numeric telephone keypad (`inputMode="numeric"`)
 * instead of a generic QWERTY keyboard when `type="tel"` alone is ignored.
 * Character stripping for XSS-safe persistence lives in {@link filterPhoneInputChange}.
 *
 * @module src/lib/phoneInputProps
 */

import { filterPhoneInputChange } from "@shared/validation/phoneSchema";

export { filterPhoneInputChange };

/** Native `<input>` props shared by signup, profile settings, and admin directory phone fields. */
export const phoneInputProps = {
  type: "tel" as const,
  /** Telephone keypad on mobile — digits with optional leading `+` (see {@link optionalPhoneSchema}). */
  inputMode: "numeric" as const,
  autoComplete: "tel" as const,
};
