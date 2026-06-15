/**
 * @fileoverview Shared Zod validation schemas for authentication flows.
 *
 * Consolidates login, signup, and registration input validation rules.
 *
 * @module shared/validation/authSchemas
 */

import { z } from "zod";

/**
 * Base email schema.
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
  email: emailSchema,
  password: z.string().min(1, "Password is required."),
});

/**
 * Schema for student signup (progressive enhancement form).
 * Derives user name from the email local-part on the server.
 */
export const signupSchema = z.object({
  email: emailSchema,
  password: newPasswordSchema,
  specialty: z
    .string()
    .trim()
    .max(120, "Specialty must be under 120 characters.")
    .nullable()
    .or(z.literal(""))
    .transform((val) => (val === "" ? null : val)),
  group: z
    .string()
    .trim()
    .max(120, "Group must be under 120 characters.")
    .nullable()
    .or(z.literal(""))
    .transform((val) => (val === "" ? null : val)),
  studentTitle: z
    .enum(["Starosta", "Deputy", "Neither"] as const, {
      message: "Invalid student title.",
    })
    .default("Neither"),
});

/**
 * Schema for credentials-based registration (JSON API).
 * Includes an optional or derived name.
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
