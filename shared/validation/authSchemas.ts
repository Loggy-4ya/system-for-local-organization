/**
 * @fileoverview Shared Zod validation schemas for authentication flows.
 *
 * Consolidates login, signup, and registration input validation rules.
 * Credentials sign-in uses a unique {@link loginHandleSchema} — email is optional at signup.
 *
 * @module shared/validation/authSchemas
 */

import { z } from "zod";
import { optionalPhoneSchema } from "@shared/validation/phoneSchema";
import { getPasswordStrengthError } from "@shared/lib/passwordStrength";
import type { StudentTitle } from "@shared/models/User";

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
 */
export const newPasswordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(128, "Password must be under 128 characters.");

/**
 * Signup socium role — self-assignable at registration.
 */
export const signupSociumRoleSchema = z.enum(["Student", "Starosta", "Teacher"] as const, {
  message: "Invalid socium role.",
});

/**
 * Schema for credentials login.
 */
export const loginSchema = z.object({
  login: loginHandleSchema,
  password: z.string().min(1, "Password is required."),
});

/** Shared specialty field transform for signup. */
const signupSpecialtyField = z
  .string()
  .trim()
  .max(120, "Specialty must be under 120 characters.")
  .optional()
  .transform((val) => (!val || val === "" ? null : val));

/** Shared group field — numeric group number only (1–4 digits). */
const signupGroupField = z.preprocess(
  (value) => {
    if (value === undefined || value === null) return null;
    if (typeof value === "string" && value.trim() === "") return null;
    if (typeof value === "string") return value.trim();
    return value;
  },
  z.union([
    z.null(),
    z
      .string()
      .regex(/^\d{1,4}$/, "Group must be a number (e.g. 42)."),
  ]),
);

/**
 * Apply password match and strength refinements to signup payloads.
 *
 * @param data - Parsed signup object before transform.
 * @param ctx - Zod refinement context.
 */
function refineSignupPasswords(
  data: { login: string; password: string; confirmPassword: string },
  ctx: z.RefinementCtx,
): void {
  if (data.password !== data.confirmPassword) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["confirmPassword"],
      message: "Passwords do not match.",
    });
  }

  const strengthError = getPasswordStrengthError(data.password, data.login);
  if (strengthError) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["password"],
      message: strengthError,
    });
  }
}

/**
 * Map self-assignable socium chip to legacy {@link StudentTitle}.
 *
 * @param signupSociumRole - Student or Starosta chip from the form.
 * @returns Student title stored on the user document.
 */
export function mapSignupSociumRoleToStudentTitle(
  signupSociumRole: z.infer<typeof signupSociumRoleSchema>,
): StudentTitle {
  return signupSociumRole === "Starosta" ? "Starosta" : "Neither";
}

/** Raw signup object before password confirm strip. */
const signupObjectSchema = z.object({
  login: loginHandleSchema,
  email: optionalLinkedEmailSchema,
  password: newPasswordSchema,
  confirmPassword: z.string().min(1, "Please confirm your password."),
  name: z
    .string()
    .trim()
    .max(100, "Name must be under 100 characters.")
    .optional()
    .transform((val) => (!val || val === "" ? undefined : val)),
  surname: z
    .string()
    .trim()
    .max(100, "Surname must be under 100 characters.")
    .nullable()
    .optional()
    .or(z.literal(""))
    .transform((val) => (val === "" || val === undefined ? null : val)),
  phone: optionalPhoneSchema,
  specialty: signupSpecialtyField,
  group: signupGroupField,
  signupSociumRole: signupSociumRoleSchema.default("Student"),
  applyForSelfGovernment: z.boolean().default(false),
  personalDataConsent: z.literal(true, {
    message: "You must consent to personal data processing to create an account.",
  }),
});

/**
 * Schema for student signup (client form).
 */
export const signupSchema = signupObjectSchema
  .superRefine(refineSignupPasswords)
  .transform((data) => {
    const { confirmPassword: _confirm, signupSociumRole, ...rest } = data;
    return {
      ...rest,
      signupSociumRole,
      studentTitle: mapSignupSociumRoleToStudentTitle(signupSociumRole),
    };
  });

/**
 * Schema for credentials-based registration (JSON API).
 */
export const registerSchema = signupObjectSchema
  .extend({
    name: z
      .string()
      .trim()
      .min(1, "Name is required.")
      .max(100, "Name must be under 100 characters.")
      .optional(),
  })
  .superRefine(refineSignupPasswords)
  .transform((data) => {
    const { confirmPassword: _confirm, signupSociumRole, ...rest } = data;
    return {
      ...rest,
      signupSociumRole,
      studentTitle: mapSignupSociumRoleToStudentTitle(signupSociumRole),
    };
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
