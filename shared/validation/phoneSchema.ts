/**
 * @fileoverview Phone number validation for user profiles.
 *
 * Strips markup and non-telephone characters before persistence so stored values
 * cannot carry HTML/script payloads even when validation is bypassed.
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

/**
 * Strip markup, control characters, and any non-telephone symbols from raw input.
 *
 * Used by {@link normalizePhoneInput} (server persistence) and
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
 * Normalize a phone string for storage — trim, strip unsafe chars, collapse whitespace.
 *
 * @param raw - User input.
 * @returns Normalized phone or null when empty.
 */
export function normalizePhoneInput(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const stripped = stripPhoneInputToAllowedChars(raw.trim());
  if (stripped === "") return null;
  const normalized = stripped.replace(/\s+/g, " ");
  const digitCount = normalized.replace(/\D/g, "").length;
  if (digitCount === 0) return null;
  return normalized;
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
