/**
 * @fileoverview Phone number validation for user profiles.
 *
 * Strips markup and non-telephone characters before persistence so stored values
 * cannot carry HTML/script payloads even when validation is bypassed.
 *
 * Autocorrect is region-agnostic: values are sanitized and canonicalized to `+<digits>`
 * without assuming a default country calling code.
 *
 * @module shared/validation/phoneSchema
 *
 * Tests: `npm run test:phone-schema`
 * Registry: `.ai/docs/testing.md`
 */

import { z } from "zod";

/** Allowed telephone characters after XSS/markup stripping. */
const PHONE_ALLOWED_CHAR_REGEX = /[^+0-9\s\-]/g;

/** Control characters stripped before storage. */
const PHONE_CONTROL_CHAR_REGEX = /[\u0000-\u001F\u007F-\u009F]/g;

/** Post-strip format guard shared by optional and required schemas. */
const PHONE_FORMAT_SCHEMA = z
  .string()
  .min(7, "Phone number is too short.")
  .max(32, "Phone number must be under 32 characters.")
  .regex(
    /^\+?[0-9\s\-]{7,32}$/,
    "Use digits with optional + prefix (spaces and dashes allowed).",
  );

/** Minimum and maximum inclusive digit counts for stored international numbers. */
const PHONE_MIN_DIGITS = 7;
const PHONE_MAX_DIGITS = 15;

/**
 * Strip markup, control characters, and any non-telephone symbols from raw input.
 *
 * Used by {@link autocorrectPhoneInput}, {@link normalizePhoneInput}, and
 * {@link filterPhoneInputChange} (client controlled inputs).
 *
 * @param raw - User-typed or pasted phone string.
 * @returns String containing only `+`, digits, spaces, and dashes.
 */
export function stripPhoneInputToAllowedChars(raw: string): string {
  let text = raw.replace(PHONE_CONTROL_CHAR_REGEX, "");
  text = text.replace(/<script\b[\s\S]*?<\/script>/gi, "");
  text = text.replace(/<style\b[\s\S]*?<\/style>/gi, "");
  text = text.replace(/<[^>]+>/g, "");
  return text.replace(PHONE_ALLOWED_CHAR_REGEX, "");
}

/**
 * Live client-side filter — keep controlled phone inputs aligned with server normalization.
 *
 * @param raw - Current input value.
 * @returns Sanitised value safe to store in React state.
 */
export function filterPhoneInputChange(raw: string): string {
  return stripPhoneInputToAllowedChars(raw);
}

/**
 * Autocorrect dial strings to canonical `+<digits>` E.164-style storage.
 *
 * Region-agnostic: strips formatting and ensures a leading `+` without inferring
 * a local country calling code. Live typing uses {@link filterPhoneInputChange} only;
 * call this on blur and before persistence.
 *
 * @param raw - User input.
 * @returns Canonical `+<digits>` string, or null when no dialable number remains.
 */
export function autocorrectPhoneInput(raw: string | null | undefined): string | null {
  if (raw == null) return null;

  const stripped = stripPhoneInputToAllowedChars(raw.trim());
  if (stripped === "") return null;

  const digits = stripped.replace(/\D/g, "");
  if (digits.length < PHONE_MIN_DIGITS || digits.length > PHONE_MAX_DIGITS) {
    return null;
  }

  return `+${digits}`;
}

/**
 * Normalize a phone string for storage — sanitize, autocorrect, and canonicalize to `+<digits>`.
 *
 * @param raw - User input.
 * @returns Normalized phone or null when empty / undialable.
 */
export function normalizePhoneInput(raw: string | null | undefined): string | null {
  return autocorrectPhoneInput(raw);
}

/**
 * Optional phone schema for profile PATCH.
 * Accepts international formats: leading `+`, digits, spaces, dashes.
 */
export const optionalPhoneSchema = z.preprocess(
  (value) => {
    if (value === undefined || value === null) return null;
    if (typeof value === "string") return normalizePhoneInput(value);
    return value;
  },
  z.union([z.null(), PHONE_FORMAT_SCHEMA]),
);

/**
 * Required phone schema — used when validating self-government members and OAuth onboarding.
 */
export const requiredPhoneSchema = z.preprocess(
  (value) => {
    if (value === undefined || value === null) return null;
    if (typeof value === "string") return normalizePhoneInput(value);
    return value;
  },
  PHONE_FORMAT_SCHEMA,
);

export type OptionalPhone = z.infer<typeof optionalPhoneSchema>;
