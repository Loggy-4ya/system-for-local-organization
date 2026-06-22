/**
 * @fileoverview Zod validation schemas for the User Directory admin API.
 *
 * Handles validation for directory searches, queries, and administrative
 * user profile/access mutations.
 *
 * @module shared/validation/userDirectorySchemas
 */

import { z } from "zod";
import { ALL_PERMISSION_KEYS } from "@shared/constants/accessControl";
import { DEFAULT_LIST_PAGE_SIZE, MAX_LIST_PAGE_SIZE } from "@shared/constants/listPagination";
import {
  adminDirectoryGroupField,
  adminDirectorySpecialtyField,
} from "@shared/validation/academicFieldSchemas";
import { optionalPhoneSchema } from "@shared/validation/phoneSchema";
import { contentPolicyPlainTextRefine } from "@shared/validation/contentPolicySchemas";

/**
 * Validation schema for GET /api/admin/users query parameters.
 */
export const userDirectoryQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .max(100, "Search query must be under 100 characters.")
    .optional()
    .or(z.literal(""))
    .refine(
      (val) => !val || contentPolicyPlainTextRefine.check(val),
      { message: contentPolicyPlainTextRefine.message },
    ),
  level: z
    .preprocess(
      (val) => (val === "" || val === undefined || val === null ? undefined : Number(val)),
      z.number().int().min(0).max(6)
    )
    .optional(),
  cursor: z.string().optional(),
  page: z
    .preprocess(
      (val) => (val === "" || val === undefined || val === null ? undefined : Number(val)),
      z.number().int().min(1),
    )
    .default(1),
  limit: z
    .preprocess(
      (val) => (val === "" || val === undefined || val === null ? undefined : Number(val)),
      z.number().int().min(1).max(MAX_LIST_PAGE_SIZE),
    )
    .default(DEFAULT_LIST_PAGE_SIZE),
});

/**
 * Validation schema for a single socium role assignment.
 */
export const sociumRoleAssignmentSchema = z.object({
  roleKey: z
    .string()
    .trim()
    .min(1, "Role key is required.")
    .max(64, "Role key must be under 64 characters."),
  roleLabel: z
    .string()
    .trim()
    .min(1, "Role label is required.")
    .max(120, "Role label must be under 120 characters.")
    .refine(contentPolicyPlainTextRefine.check, {
      message: contentPolicyPlainTextRefine.message,
    }),
  kind: z.enum([
    "starosta",
    "group_deputy",
    "student",
    "teacher",
    "self_government_member",
    "self_government_head",
    "self_government_deputy",
    "custom",
  ]),
  source: z.enum(["self", "admin", "system"]),
  bodyKey: z
    .string()
    .trim()
    .max(64, "Body key must be under 64 characters.")
    .nullable()
    .optional(),
  bodyTitle: z
    .string()
    .trim()
    .max(120, "Body title must be under 120 characters.")
    .nullable()
    .optional()
    .refine(
      (val) => val == null || val === "" || contentPolicyPlainTextRefine.check(val),
      { message: contentPolicyPlainTextRefine.message },
    ),
  assignedAt: z.preprocess(
    (val) => (val ? new Date(val as string) : new Date()),
    z.date()
  ),
  assignedByUserId: z.string().nullable().optional(),
});

/**
 * Validation schema for a single social group activity affiliation.
 */
export const socialGroupActivitySchema = z.object({
  activityKey: z
    .string()
    .trim()
    .min(1, "Activity key is required.")
    .max(64, "Activity key must be under 64 characters."),
  activityLabel: z
    .string()
    .trim()
    .min(1, "Activity label is required.")
    .max(120, "Activity label must be under 120 characters.")
    .refine(contentPolicyPlainTextRefine.check, {
      message: contentPolicyPlainTextRefine.message,
    }),
  assignedAt: z.preprocess(
    (val) => (val ? new Date(val as string) : new Date()),
    z.date()
  ),
});

/**
 * Validation schema for a single external organization membership.
 */
export const organizationMembershipSchema = z.object({
  organizationKey: z
    .string()
    .trim()
    .min(1, "Organization key is required.")
    .max(64, "Organization key must be under 64 characters."),
  organizationLabel: z
    .string()
    .trim()
    .min(1, "Organization label is required.")
    .max(120, "Organization label must be under 120 characters.")
    .refine(contentPolicyPlainTextRefine.check, {
      message: contentPolicyPlainTextRefine.message,
    }),
  assignedAt: z.preprocess(
    (val) => (val ? new Date(val as string) : new Date()),
    z.date()
  ),
});

/** Admin-editable profile fields on another user (academic assignment + phone). */
export const adminUserProfilePatchSchema = z.object({
  specialty: adminDirectorySpecialtyField,
  group: adminDirectoryGroupField,
  phone: optionalPhoneSchema.optional(),
});

/**
 * Validation schema for admin user mutations (PATCH /api/admin/users/[id]).
 */
export const adminUserUpdateSchema = adminUserProfilePatchSchema.extend({
  accessLevelIndex: z.number().int().min(0).max(6).optional(),
  sociumRoles: z.array(sociumRoleAssignmentSchema).optional(),
  socialGroupActivities: z.array(socialGroupActivitySchema).optional(),
  organizations: z.array(organizationMembershipSchema).optional(),
  delegatedPermissions: z
    .array(z.enum(ALL_PERMISSION_KEYS as [string, ...string[]]))
    .optional(),
});

/** Error codes for fine-grained validation and access control failures. */
export const DIRECTORY_ERROR_CODES = {
  SELF_MODIFICATION_FORBIDDEN: "SELF_MODIFICATION_FORBIDDEN",
  OUTRANK_REQUIRED: "OUTRANK_REQUIRED",
  LEVEL_NOT_ASSIGNABLE: "LEVEL_NOT_ASSIGNABLE",
  PERMISSION_NOT_DELEGATABLE: "PERMISSION_NOT_DELEGATABLE",
  ROLE_ASSIGNMENT_FORBIDDEN: "ROLE_ASSIGNMENT_FORBIDDEN",
  AFFILIATION_ASSIGNMENT_FORBIDDEN: "AFFILIATION_ASSIGNMENT_FORBIDDEN",
  PROFILE_EDIT_FORBIDDEN: "PROFILE_EDIT_FORBIDDEN",
  USER_DELETE_FORBIDDEN: "USER_DELETE_FORBIDDEN",
  LAST_SYSTEM_ADMIN_DELETE_FORBIDDEN: "LAST_SYSTEM_ADMIN_DELETE_FORBIDDEN",
  SPECIALTY_NOT_APPROVED: "SPECIALTY_NOT_APPROVED",
  GROUP_NOT_APPROVED: "GROUP_NOT_APPROVED",
  USER_NOT_FOUND: "USER_NOT_FOUND",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
} as const;

export type DirectoryErrorCode = keyof typeof DIRECTORY_ERROR_CODES;
