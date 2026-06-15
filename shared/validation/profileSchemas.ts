/**
 * @fileoverview Shared Zod validation schemas for profile settings.
 *
 * Handles validation for profile updates and password changes.
 *
 * @module shared/validation/profileSchemas
 */

import { z } from "zod";

/**
 * Schema for PATCH /api/profile server-side validation.
 */
export const profileUpdateSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Name is required.")
      .max(100, "Name must be under 100 characters.")
      .optional(),
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
    avatar: z
      .string()
      .trim()
      .max(2048, "Avatar URL must be under 2048 characters.")
      .nullable()
      .optional()
      .or(z.literal(""))
      .transform((val) => (val === "" ? null : val))
      .refine((val) => {
        if (!val) return true;
        return val.startsWith("http://") || val.startsWith("https://") || val.startsWith("/");
      }, "Avatar must be a valid URL or path."),
    accentFamily: z
      .enum(["blue", "red", "yellow", "green", "purple"] as const, {
        message: "Invalid accent family.",
      })
      .optional(),
    accentShade: z
      .enum(["soft", "medium", "strong"] as const, {
        message: "Invalid accent shade.",
      })
      .optional(),
    currentPassword: z.string().optional(),
    newPassword: z.string().optional(),
  })
  .superRefine((data, ctx) => {
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
  });

/**
 * Extended schema for client-side settings form validation.
 * Includes password confirmation matching.
 */
export const clientProfileSettingsSchema = profileUpdateSchema
  .extend({
    confirmPassword: z.string().optional(),
  })
  .superRefine((data, ctx) => {
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
