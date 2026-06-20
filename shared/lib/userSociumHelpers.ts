/**
 * @fileoverview Pure helpers for User socium roles, full name, and quality scores.
 *
 * Tests: `tests/shared/lib/userSociumHelpers.test.ts` — `npm run test:user-socium`
 *
 * @module shared/lib/userSociumHelpers
 */

import type { StudentTitle, UserRole } from "@shared/models/User";
import type {
  IUserQualityScores,
  IUserSociumRole,
  SociumRoleKind,
  SociumRoleSource,
} from "@shared/models/userTypes";
import {
  BUILTIN_SOCIUM_ROLE_KEYS,
  BUILTIN_SOCIUM_ROLE_LABELS,
} from "@shared/models/userTypes";

/** Minimal user shape for helper functions. */
export interface UserSociumProfileSlice {
  name: string;
  surname: string | null;
  role: UserRole;
  studentTitle: StudentTitle | null;
  sociumRoles: IUserSociumRole[];
  qualityScores: IUserQualityScores | null;
}

/**
 * Format a user's full display name from given name and surname.
 *
 * @param name - Given / first name.
 * @param surname - Optional surname.
 * @returns Combined full name or trimmed given name only.
 */
export function formatUserFullName(name: string, surname: string | null): string {
  const parts = [name.trim(), surname?.trim()].filter(Boolean);
  return parts.join(" ");
}

/**
 * Whether the user holds any self-government socium role.
 *
 * @param sociumRoles - User socium role assignments.
 * @returns True when member, head, or deputy role is present.
 */
export function isSelfGovernmentMember(sociumRoles: IUserSociumRole[]): boolean {
  return sociumRoles.some((role) =>
    role.kind === "self_government_member" ||
    role.kind === "self_government_head" ||
    role.kind === "self_government_deputy",
  );
}

/**
 * Whether the user may publish news or social interactivity shown on profile.
 *
 * @param user - Profile slice with system role and socium roles.
 * @returns True for Admin, StudentCouncil, or self-government socium roles.
 */
export function canPublishCommunityContent(user: UserSociumProfileSlice): boolean {
  if (user.role === "Admin" || user.role === "StudentCouncil") {
    return true;
  }
  return isSelfGovernmentMember(user.sociumRoles);
}

/**
 * Build a socium role assignment object.
 *
 * @param params - Role assignment fields.
 * @returns Normalised socium role object.
 */
export function buildSociumRoleAssignment(params: {
  roleKey: string;
  roleLabel: string;
  kind: SociumRoleKind;
  source: SociumRoleSource;
  bodyKey?: string | null;
  bodyTitle?: string | null;
  assignedByUserId?: string | null;
  assignedAt?: Date;
}): IUserSociumRole {
  return {
    roleKey: params.roleKey,
    roleLabel: params.roleLabel,
    kind: params.kind,
    source: params.source,
    bodyKey: params.bodyKey ?? null,
    bodyTitle: params.bodyTitle ?? null,
    assignedAt: params.assignedAt ?? new Date(),
    assignedByUserId: params.assignedByUserId ?? null,
  };
}

/**
 * Ensure baseline `student` socium role exists on a new user.
 *
 * @param sociumRoles - Existing socium roles (may be empty).
 * @returns Roles array with student baseline when missing.
 */
export function ensureBaselineStudentRole(sociumRoles: IUserSociumRole[]): IUserSociumRole[] {
  const hasStudent = sociumRoles.some((role) => role.kind === "student");
  if (hasStudent) return sociumRoles;

  return [
    ...sociumRoles,
    buildSociumRoleAssignment({
      roleKey: BUILTIN_SOCIUM_ROLE_KEYS.student,
      roleLabel: BUILTIN_SOCIUM_ROLE_LABELS.student,
      kind: "student",
      source: "system",
    }),
  ];
}

/**
 * Sync registration chip {@link StudentTitle} into self-assignable socium roles.
 *
 * Removes prior self-assigned `starosta` / `group_deputy` entries and applies
 * the current chip selection. Does not touch admin-assigned roles.
 *
 * @param sociumRoles - Current socium roles.
 * @param studentTitle - Registration chip value.
 * @returns Updated socium roles array.
 */
export function syncSociumRolesFromStudentTitle(
  sociumRoles: IUserSociumRole[],
  studentTitle: StudentTitle | null,
): IUserSociumRole[] {
  const preserved = sociumRoles.filter(
    (role) =>
      role.source !== "self" ||
      (role.kind !== "starosta" && role.kind !== "group_deputy"),
  );

  const withBaseline = ensureBaselineStudentRole(preserved);

  if (studentTitle === "Starosta") {
    return [
      ...withBaseline,
      buildSociumRoleAssignment({
        roleKey: BUILTIN_SOCIUM_ROLE_KEYS.starosta,
        roleLabel: BUILTIN_SOCIUM_ROLE_LABELS.starosta,
        kind: "starosta",
        source: "self",
      }),
    ];
  }

  if (studentTitle === "Deputy") {
    return [
      ...withBaseline,
      buildSociumRoleAssignment({
        roleKey: BUILTIN_SOCIUM_ROLE_KEYS.groupDeputy,
        roleLabel: BUILTIN_SOCIUM_ROLE_LABELS.group_deputy,
        kind: "group_deputy",
        source: "self",
      }),
    ];
  }

  return withBaseline;
}

/**
 * Initialise quality scores when user becomes a self-government member.
 *
 * @param sociumRoles - Current socium roles after mutation.
 * @param qualityScores - Existing scores or null.
 * @returns Scores object — unchanged when already set or not eligible.
 */
export function ensureQualityScoresInitialized(
  sociumRoles: IUserSociumRole[],
  qualityScores: IUserQualityScores | null,
): IUserQualityScores | null {
  if (qualityScores) return qualityScores;
  if (!isSelfGovernmentMember(sociumRoles)) return null;

  const now = new Date();
  return {
    averageScore: 0,
    ratingCount: 0,
    initializedAt: now,
    lastUpdatedAt: now,
  };
}

/**
 * Apply socium role sync and quality score init after student title change.
 *
 * @param user - Mutable profile slice.
 */
export function applyStudentTitleSociumSync(user: {
  studentTitle: StudentTitle | null;
  sociumRoles: IUserSociumRole[];
  qualityScores: IUserQualityScores | null;
}): void {
  user.sociumRoles = syncSociumRolesFromStudentTitle(user.sociumRoles, user.studentTitle);
  user.qualityScores = ensureQualityScoresInitialized(user.sociumRoles, user.qualityScores);
}

/**
 * Self-assignable socium role selected at signup.
 */
export type SignupSociumRole = "Student" | "Starosta" | "Teacher";

/**
 * Seed socium state for a newly registered user from signup role selection.
 *
 * @param signupRole - Student, Starosta, or Teacher chip from the signup form.
 * @returns Initial socium roles and quality scores.
 */
export function buildInitialSociumStateFromSignupRole(signupRole: SignupSociumRole): {
  sociumRoles: IUserSociumRole[];
  qualityScores: IUserQualityScores | null;
} {
  if (signupRole === "Teacher") {
    return {
      sociumRoles: [
        buildSociumRoleAssignment({
          roleKey: BUILTIN_SOCIUM_ROLE_KEYS.teacher,
          roleLabel: BUILTIN_SOCIUM_ROLE_LABELS.teacher,
          kind: "teacher",
          source: "self",
        }),
      ],
      qualityScores: null,
    };
  }

  const studentTitle: StudentTitle = signupRole === "Starosta" ? "Starosta" : "Neither";
  return buildInitialStudentSociumState(studentTitle);
}

/**
 * Seed socium state for a newly registered student.
 *
 * @param studentTitle - Registration chip selection.
 * @returns Initial socium roles and quality scores.
 */
export function buildInitialStudentSociumState(studentTitle: StudentTitle | null): {
  sociumRoles: IUserSociumRole[];
  qualityScores: IUserQualityScores | null;
} {
  const sociumRoles = syncSociumRolesFromStudentTitle([], studentTitle);
  const qualityScores = ensureQualityScoresInitialized(sociumRoles, null);
  return { sociumRoles, qualityScores };
}
