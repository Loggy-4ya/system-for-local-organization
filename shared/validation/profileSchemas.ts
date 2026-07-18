/**
 * @fileoverview Shared Zod validation schemas for profile settings.
 *
 * Handles validation for profile updates and password changes.
 *
 * @module shared/validation/profileSchemas
 */

import { z } from "zod";
import { optionalPhoneSchema, requiredPhoneSchema } from "@shared/validation/phoneSchema";
import { addContentPolicyPlainTextIssue } from "@shared/validation/contentPolicySchemas";

/** Optional avatar URL/path stored on user profiles. */
export const optionalAvatarUrlSchema = z.preprocess(
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
      .max(2048, "Avatar URL must be under 2048 characters.")
      .refine(
        (val) =>
          val.startsWith("http://") ||
          val.startsWith("https://") ||
          val.startsWith("/") ||
          val.startsWith("blob:"),
        "Avatar must be a valid URL or path.",
      ),
  ]),
);

/** Shared social link entry validation. */
export const socialLinkSchema = z
  .object({
    platform: z
      .string()
      .trim()
      .toLowerCase()
      .min(1, "Platform is required.")
      .max(32, "Platform must be under 32 characters."),
    label: z
      .string()
      .trim()
      .max(64, "Label must be under 64 characters.")
      .nullable()
      .optional()
      .or(z.literal(""))
      .transform((val) => (val === "" || val === undefined ? null : val)),
    url: z
      .string()
      .trim()
      .url("Social link must be a valid URL.")
      .max(2048, "URL must be under 2048 characters."),
  })
  .superRefine((data, ctx) => {
    addContentPolicyPlainTextIssue(ctx, data.label, ["label"]);
  });

/** Base profile object — no refinements so {@link clientProfileSettingsSchema} can extend. */
const profileUpdateObjectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required.")
    .max(100, "Name must be under 100 characters.")
    .optional(),
  surname: z
    .string()
    .trim()
    .max(100, "Surname must be under 100 characters.")
    .nullable()
    .optional()
    .or(z.literal(""))
    .transform((val) => (val === "" || val === undefined ? null : val)),
  phone: optionalPhoneSchema.optional(),
  specialty: z
    .string()
    .trim()
    .max(120, "Specialty must be under 120 characters.")
    .nullable()
    .optional()
    .or(z.literal(""))
    .transform((val) => (val === "" ? null : val)),
  group: z
    .string()
    .trim()
    .max(120, "Group must be under 120 characters.")
    .nullable()
    .optional()
    .or(z.literal(""))
    .transform((val) => (val === "" ? null : val)),
  studentTitle: z
    .enum(["Starosta", "Deputy", "Neither"] as const, {
      message: "Invalid student title.",
    })
    .nullable()
    .optional(),
  avatar: optionalAvatarUrlSchema.optional(),
  about: z
    .string()
    .trim()
    .max(2000, "About must be under 2000 characters.")
    .nullable()
    .optional()
    .or(z.literal(""))
    .transform((val) => (val === "" || val === undefined ? null : val)),
  socialLinks: z.array(socialLinkSchema).max(10, "Maximum 10 social links.").optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().optional(),
  /** When true, validates required OAuth onboarding fields and consent. */
  completeOAuthOnboarding: z.boolean().optional(),
  /** Required when {@link completeOAuthOnboarding} is true. */
  personalDataConsent: z.boolean().optional(),
  notificationChannels: z
    .array(z.enum(["web", "telegram"] as const))
    .min(1, "Select at least one notification channel.")
    .optional(),
  preferredLocale: z.enum(["en", "uk"]).nullable().optional(),
  recordWebNotificationPrompt: z.boolean().optional(),
  /** Server-injected flag — teachers skip specialty/group during OAuth onboarding. */
  profileIsTeacher: z.boolean().optional(),
});

/**
 * Apply profile content-policy and password rules.
 *
 * @param data - Parsed profile payload.
 * @param ctx - Zod refinement context.
 */
function refineProfileUpdate(data: z.infer<typeof profileUpdateObjectSchema>, ctx: z.RefinementCtx): void {
  addContentPolicyPlainTextIssue(ctx, data.name, ["name"]);
  addContentPolicyPlainTextIssue(ctx, data.surname, ["surname"]);
  addContentPolicyPlainTextIssue(ctx, data.about, ["about"]);
  // specialty / group: catalog or numeric identifiers — skip language policy.

  if (data.completeOAuthOnboarding) {
    if (!data.surname?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Surname is required.",
        path: ["surname"],
      });
    }

    const phoneResult = requiredPhoneSchema.safeParse(data.phone ?? null);
    if (!phoneResult.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: phoneResult.error.issues[0]?.message ?? "Phone number is required.",
        path: ["phone"],
      });
    }

    if (!data.specialty?.trim() && !data.profileIsTeacher) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Specialty is required.",
        path: ["specialty"],
      });
    }

    if (!data.group?.trim() && !data.profileIsTeacher) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Group is required.",
        path: ["group"],
      });
    }

    if (data.personalDataConsent !== true) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "You must consent to personal data processing.",
        path: ["personalDataConsent"],
      });
    }
  }

  if (data.newPassword && !data.currentPassword) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Current password is required to set a new password.",
      path: ["currentPassword"],
    });
  }
  if (data.newPassword && data.newPassword.length < 8) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "New password must be at least 8 characters.",
      path: ["newPassword"],
    });
  }
}

/**
 * Schema for PATCH /api/profile server-side validation.
 */
export const profileUpdateSchema = profileUpdateObjectSchema.superRefine(refineProfileUpdate);

/**
 * Extended schema for client-side settings form validation.
 * Includes password confirmation matching.
 */
export const clientProfileSettingsSchema = profileUpdateObjectSchema
  .extend({
    confirmPassword: z.string().optional(),
    personalDataConsent: z.boolean().optional(),
    completeOAuthOnboarding: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    refineProfileUpdate(data, ctx);

    if (data.newPassword && data.newPassword !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "New passwords do not match.",
        path: ["confirmPassword"],
      });
    }
  });

export type ProfileUpdatePayload = z.infer<typeof profileUpdateSchema>;
export type ClientProfileSettingsInput = z.infer<typeof clientProfileSettingsSchema>;
