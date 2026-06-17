/**
 * @fileoverview Shared Zod validation schemas for authentication flows.
 *
 * Consolidates login, signup, and registration input validation rules.
 * Credentials sign-in uses a unique {@link loginHandleSchema} — email is optional at signup.
 *
 * @module shared/validation/authSchemas
 */

import { z } from "zod";

/**
 * Unique login handle for credentials sign-in.
 * Lowercase alphanumeric plus `.`, `-`, `_`.
 */
export const loginHandleSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Login must be at least 3 characters.")
  .max(32, "Login must be under 32 characters.")
  .regex(
    /^[a-z0-9._-]+$/,
    "Login may only contain letters, numbers, dots, dashes, and underscores.",
  );

/**
 * Linked email schema — valid email format when provided.
 * Enforces trimmed, lowercase, valid email format with maximum length.
 */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Email is required.")
  .email("Invalid email address.")
  .max(254, "Email must be under 254 characters.");

/**
 * Optional linked email for signup — omitted or blank values map to `null`.
 */
export const optionalLinkedEmailSchema = z.preprocess(
  (value) => {
    if (value === undefined || value === null) return null;
    if (typeof value === "string" && value.trim() === "") return null;
    if (typeof value === "string") return value.trim().toLowerCase();
    return value;
  },
  z.union([z.null(), emailSchema]),
);

/**
 * Base password schema for new accounts / password changes.
 * Enforces minimum length of 8 characters and maximum of 128.
 */
export const newPasswordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(128, "Password must be under 128 characters.");

/**
 * Schema for credentials login.
 * Does not enforce strength rules on the password to prevent account enumeration/leaks.
 */
export const loginSchema = z.object({
  login: loginHandleSchema,
  password: z.string().min(1, "Password is required."),
});

/**
 * Schema for student signup (progressive enhancement form).
 * Display name defaults from login on the server when omitted.
 */
export const signupSchema = z.object({
  login: loginHandleSchema,
  email: optionalLinkedEmailSchema,
  password: newPasswordSchema,
  specialty: z
    .string()
    .trim()
    .max(120, "Specialty must be under 120 characters.")
    .optional()
    .transform((val) => (!val || val === "" ? null : val)),
  group: z
    .string()
    .trim()
    .max(120, "Group must be under 120 characters.")
    .optional()
    .transform((val) => (!val || val === "" ? null : val)),
  studentTitle: z
    .enum(["Starosta", "Deputy", "Neither"] as const, {
      message: "Invalid student title.",
    })
    .default("Neither"),
});

/**
 * Schema for credentials-based registration (JSON API).
 * Includes an optional display name.
 */
export const registerSchema = signupSchema.extend({
  name: z
    .string()
    .trim()
    .min(1, "Name is required.")
    .max(100, "Name must be under 100 characters.")
    .optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
