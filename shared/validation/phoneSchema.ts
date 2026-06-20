/**
 * @fileoverview Phone number validation for user profiles.
 *
 * @module shared/validation/phoneSchema
 */

import { z } from "zod";

/**
 * Normalize a phone string for storage — trim and collapse internal whitespace.
 *
 * @param raw - User input.
 * @returns Normalized phone or null when empty.
 */
export function normalizePhoneInput(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  return trimmed.replace(/\s+/g, " ");
}

/**
 * Optional phone schema for profile PATCH.
 * Accepts international formats: leading `+`, digits, spaces, dashes, parentheses.
 */
export const optionalPhoneSchema = z.preprocess(
  (value) => {
    if (value === undefined || value === null) return null;
    if (typeof value === "string") return normalizePhoneInput(value);
    return value;
  },
  z.union([
    z.null(),
    z
      .string()
      .min(7, "Phone number is too short.")
      .max(32, "Phone number must be under 32 characters.")
      .regex(
        /^\+?[0-9\s\-()]{7,32}$/,
        "Use digits with optional + prefix (spaces, dashes, parentheses allowed).",
      ),
  ]),
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
  z
    .string()
    .min(7, "Phone number is too short.")
    .max(32, "Phone number must be under 32 characters.")
    .regex(
      /^\+?[0-9\s\-()]{7,32}$/,
      "Use digits with optional + prefix (spaces, dashes, parentheses allowed).",
    ),
);

export type OptionalPhone = z.infer<typeof optionalPhoneSchema>;
