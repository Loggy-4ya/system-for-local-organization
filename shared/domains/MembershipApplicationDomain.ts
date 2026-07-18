/**
 * @fileoverview Self-government membership application queue and review engine.
 *
 * Users submit applications from `/profile/membership`. Reviewers with
 * {@link PermissionKey | users.assign_socium_roles} approve or reject pending
 * applicants from `/admin/membership-applications`.
 *
 * Tests: `tests/shared/lib/membershipApplicationLogic.test.ts` — `npm run test:membership-application`
 *
 * @module shared/domains/MembershipApplicationDomain
 */

import connectDB from "@shared/lib/db";
import { DEFAULT_LIST_PAGE_SIZE } from "@shared/constants/listPagination";
import {
  clampListPageSize,
  computeTotalPages,
  pageToSkip,
} from "@shared/lib/listPaginationLogic";
import {
  buildMembershipApplicationStatus,
  canSubmitMembershipApplication,
  type MembershipApplicationStatusDto,
} from "@shared/lib/membershipApplicationLogic";
import {
  buildProfileCompletenessSummary,
  isProfileReadyForMembershipApplication,
  type ProfileCompletenessField,
} from "@shared/lib/userProfileCompleteness";
import { AccessControlDomain } from "@shared/domains/AccessControlDomain";
import { UserDirectoryAuditDomain } from "@shared/domains/UserDirectoryAuditDomain";
import {
  canActorAssignSociumRoles,
  hasPermission,
  inferAccessLevelIndex,
  type AccessControlUserSlice,
} from "@shared/lib/accessControlLogic";
import { meetsOrOutranksInHierarchy } from "@shared/constants/accessControl";
import {
  buildSociumRoleAssignment,
  ensureBaselineStudentRole,
  ensureQualityScoresInitialized,
  formatUserFullName,
  isSelfGovernmentMember,
  isTeacherUser,
} from "@shared/lib/userSociumHelpers";
import {
  BUILTIN_SOCIUM_ROLE_KEYS,
  BUILTIN_SOCIUM_ROLE_LABELS,
} from "@shared/models/userTypes";
import User, { type IUser } from "@shared/models/User";

/** Serializable application status for the authenticated applicant. */
export type { MembershipApplicationStatusDto } from "@shared/lib/membershipApplicationLogic";

/** One row in the admin membership application queue. */
export interface MembershipApplicationRowDto {
  /** Target user id. */
  id: string;
  /** Combined display name. */
  fullName: string;
  /** Avatar URL when set. */
  avatar: string | null;
  /** Academic specialty. */
  specialty: string | null;
  /** Student group. */
  group: string | null;
  /** Login handle — null when redacted for the actor. */
  login: string | null;
  /** Phone — null when redacted for the actor. */
  phone: string | null;
  /** Profile ready for reviewer decision. */
  readyForReview: boolean;
  /** Missing field labels when profile is incomplete (English — prefer {@link missingFields} in UI). */
  missingFieldLabels: string[];
  /** Missing field keys for client-side i18n. */
  missingFields: ProfileCompletenessField[];
  /** Whether the actor may approve this applicant. */
  canApprove: boolean;
  /** Whether the actor may reject this applicant. */
  canReject: boolean;
  /** Applicant category for admin queue display. */
  applicantType: "teacher" | "student";
}

/** Paginated admin queue result. */
export interface MembershipApplicationListResult {
  applications: MembershipApplicationRowDto[];
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

/**
 * Build MongoDB filter for users with an active membership application.
 *
 * @returns Query filter for pending applicants.
 */
function pendingApplicationFilter(search?: string): Record<string, unknown> {
  const filter: Record<string, unknown> = {
    selfGovernmentApplicationIntent: true,
    sociumRoles: {
      $not: {
        $elemMatch: {
          kind: {
            $in: ["self_government_member", "self_government_head", "self_government_deputy"],
          },
        },
      },
    },
  };

  const term = search?.trim();
  if (term) {
    const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [
      { name: regex },
      { surname: regex },
      { login: regex },
      { specialty: regex },
      { group: regex },
    ];
  }

  return filter;
}

/**
 * Map a user document into an admin queue row with actor-scoped capabilities.
 *
 * @param actorSlice - Acting reviewer access slice.
 * @param target - Applicant user document.
 * @param settings - Access-control configuration.
 * @returns Queue row DTO.
 */
function toApplicationRow(
  actorSlice: AccessControlUserSlice,
  target: IUser,
  settings: ReturnType<typeof AccessControlDomain.toPublicConfig>,
): MembershipApplicationRowDto {
  const targetSlice = AccessControlDomain.userSliceFromDocument(target);
  const actorIndex = inferAccessLevelIndex(actorSlice);
  const targetIndex = inferAccessLevelIndex(targetSlice);
  const canAdminister =
    actorSlice.role === "Admin" || meetsOrOutranksInHierarchy(actorIndex, targetIndex);
  const canReview = canActorAssignSociumRoles(actorSlice, targetSlice, settings);

  const summary = buildProfileCompletenessSummary({
    name: target.name,
    surname: target.surname,
    phone: target.phone,
    specialty: target.specialty,
    group: target.group,
    avatar: target.avatar,
    sociumRoles: target.sociumRoles ?? [],
    selfGovernmentApplicationIntent: target.selfGovernmentApplicationIntent,
    telegramId: target.telegramId,
    teacherAccessApproved: target.teacherAccessApproved,
  });

  return {
    id: target._id.toString(),
    fullName: formatUserFullName(target.name, target.surname),
    avatar: target.avatar,
    specialty: target.specialty,
    group: target.group,
    login: canAdminister ? target.login : null,
    phone: canAdminister ? target.phone : null,
    readyForReview: summary.readyForMembershipApplication,
    missingFieldLabels: summary.missingFieldLabels,
    missingFields: summary.missingFields,
    canApprove: canReview,
    canReject: canReview,
    applicantType: isTeacherUser(target.sociumRoles ?? []) ? "teacher" : "student",
  };
}

/** Consolidated membership application domain. */
export const MembershipApplicationDomain = {
  /**
   * Resolve the authenticated user's membership application status.
   *
   * @param user - Applicant user document.
   * @returns Status DTO for profile UI.
   */
  getStatusForUser(user: IUser): MembershipApplicationStatusDto {
    return buildMembershipApplicationStatus({
      name: user.name,
      surname: user.surname,
      phone: user.phone,
      specialty: user.specialty,
      group: user.group,
      avatar: user.avatar,
      sociumRoles: user.sociumRoles ?? [],
      selfGovernmentApplicationIntent: user.selfGovernmentApplicationIntent,
      telegramId: user.telegramId,
      teacherAccessApproved: user.teacherAccessApproved,
    });
  },

  /**
   * Submit a self-government membership application for the authenticated user.
   *
   * @param user - Applicant user document (mutated and saved).
   * @returns Updated status DTO.
   * @throws `ALREADY_MEMBER` | `PROFILE_INCOMPLETE`
   */
  async submitApplication(user: IUser): Promise<MembershipApplicationStatusDto> {
    const slice = {
      name: user.name,
      surname: user.surname,
      phone: user.phone,
      specialty: user.specialty,
      group: user.group,
      avatar: user.avatar,
      sociumRoles: user.sociumRoles ?? [],
      selfGovernmentApplicationIntent: user.selfGovernmentApplicationIntent,
      telegramId: user.telegramId,
      teacherAccessApproved: user.teacherAccessApproved,
    };

    if (!canSubmitMembershipApplication(slice)) {
      throw new Error(
        isSelfGovernmentMember(user.sociumRoles ?? []) ? "ALREADY_MEMBER" : "PROFILE_INCOMPLETE",
      );
    }

    await connectDB();
    user.selfGovernmentApplicationIntent = true;
    await user.save();

    return MembershipApplicationDomain.getStatusForUser(user);
  },

  /**
   * Withdraw an active membership application.
   *
   * @param user - Applicant user document (mutated and saved).
   * @returns Updated status DTO.
   */
  async withdrawApplication(user: IUser): Promise<MembershipApplicationStatusDto> {
    await connectDB();
    user.selfGovernmentApplicationIntent = false;
    await user.save();
    return MembershipApplicationDomain.getStatusForUser(user);
  },

  /**
   * List pending membership applications for admin review.
   *
   * @param actor - Reviewing user document.
   * @param params - Pagination and optional search.
   * @returns Paginated queue rows.
   * @throws `FORBIDDEN` when actor lacks review permission.
   */
  async listPendingApplications(
    actor: IUser,
    params: { page?: number; limit?: number; search?: string } = {},
  ): Promise<MembershipApplicationListResult> {
    await connectDB();
    const settings = AccessControlDomain.toPublicConfig(await AccessControlDomain.loadOrSeed());
    const actorSlice = AccessControlDomain.userSliceFromDocument(actor);

    if (actor.role !== "Admin" && !hasPermission(actorSlice, settings, "users.assign_socium_roles")) {
      throw new Error("FORBIDDEN");
    }

    const page = Math.max(1, params.page ?? 1);
    const limit = clampListPageSize(params.limit, DEFAULT_LIST_PAGE_SIZE);
    const skip = pageToSkip(page, limit);
    const filter = pendingApplicationFilter(params.search);

    const [docs, totalCount] = await Promise.all([
      User.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(filter),
    ]);

    const totalPages = computeTotalPages(totalCount, limit);
    const applications = docs.map((doc) => toApplicationRow(actorSlice, doc, settings));

    return {
      applications,
      page,
      limit,
      totalCount,
      totalPages,
    };
  },

  /**
   * Approve a pending membership application.
   *
   * @param actor - Reviewing admin user.
   * @param targetUserId - Applicant user id.
   * @returns Updated queue row for the applicant.
   * @throws `FORBIDDEN` | `USER_NOT_FOUND` | `NOT_PENDING` | `PROFILE_INCOMPLETE`
   */
  async approveApplication(
    actor: IUser,
    targetUserId: string,
  ): Promise<MembershipApplicationRowDto> {
    await connectDB();
    const settings = AccessControlDomain.toPublicConfig(await AccessControlDomain.loadOrSeed());
    const actorSlice = AccessControlDomain.userSliceFromDocument(actor);

    if (actor._id.toString() === targetUserId) {
      throw new Error("SELF_MODIFICATION_FORBIDDEN");
    }

    const target = await User.findById(targetUserId);
    if (!target) {
      throw new Error("USER_NOT_FOUND");
    }

    const targetSlice = AccessControlDomain.userSliceFromDocument(target);
    if (!canActorAssignSociumRoles(actorSlice, targetSlice, settings)) {
      throw new Error("FORBIDDEN");
    }

    if (!target.selfGovernmentApplicationIntent || isSelfGovernmentMember(target.sociumRoles ?? [])) {
      throw new Error("NOT_PENDING");
    }

    const profileSlice = {
      name: target.name,
      surname: target.surname,
      phone: target.phone,
      specialty: target.specialty,
      group: target.group,
      avatar: target.avatar,
      sociumRoles: target.sociumRoles ?? [],
      selfGovernmentApplicationIntent: target.selfGovernmentApplicationIntent,
      telegramId: target.telegramId,
      teacherAccessApproved: target.teacherAccessApproved,
    };

    if (!isProfileReadyForMembershipApplication(profileSlice)) {
      throw new Error("PROFILE_INCOMPLETE");
    }

    if (isTeacherUser(target.sociumRoles ?? [])) {
      target.teacherAccessApproved = true;
      target.selfGovernmentApplicationIntent = false;
      await target.save();

      await UserDirectoryAuditDomain.recordSuccessfulUpdate(actor, target, {
        teacherAccessApproved: true,
        selfGovernmentApplicationIntent: false,
        membershipApplicationAction: "approve_teacher",
      }).catch((error) => {
        console.error("[MembershipApplication] Failed to record teacher approve audit:", error);
      });

      return toApplicationRow(actorSlice, target, settings);
    }

    const sociumRoles = ensureBaselineStudentRole(target.sociumRoles ?? []);
    const hasMemberRole = sociumRoles.some((role) => role.kind === "self_government_member");

    target.sociumRoles = hasMemberRole
      ? sociumRoles
      : [
          ...sociumRoles,
          buildSociumRoleAssignment({
            roleKey: BUILTIN_SOCIUM_ROLE_KEYS.selfGovernmentMember,
            roleLabel: BUILTIN_SOCIUM_ROLE_LABELS.self_government_member,
            kind: "self_government_member",
            source: "admin",
            assignedByUserId: actor._id.toString(),
          }),
        ];
    target.qualityScores = ensureQualityScoresInitialized(
      target.sociumRoles,
      target.qualityScores,
    );
    target.selfGovernmentApplicationIntent = false;
    await target.save();

    await UserDirectoryAuditDomain.recordSuccessfulUpdate(actor, target, {
      sociumRoles: target.sociumRoles,
      selfGovernmentApplicationIntent: false,
      membershipApplicationAction: "approve",
    }).catch((error) => {
      console.error("[MembershipApplication] Failed to record approve audit:", error);
    });

    return toApplicationRow(actorSlice, target, settings);
  },

  /**
   * Reject a pending membership application.
   *
   * @param actor - Reviewing admin user.
   * @param targetUserId - Applicant user id.
   * @param note - Optional reviewer note (stored in audit metadata only).
   * @returns Updated queue row for the applicant.
   * @throws `FORBIDDEN` | `USER_NOT_FOUND` | `NOT_PENDING`
   */
  async rejectApplication(
    actor: IUser,
    targetUserId: string,
    note?: string,
  ): Promise<MembershipApplicationRowDto> {
    await connectDB();
    const settings = AccessControlDomain.toPublicConfig(await AccessControlDomain.loadOrSeed());
    const actorSlice = AccessControlDomain.userSliceFromDocument(actor);

    if (actor._id.toString() === targetUserId) {
      throw new Error("SELF_MODIFICATION_FORBIDDEN");
    }

    const target = await User.findById(targetUserId);
    if (!target) {
      throw new Error("USER_NOT_FOUND");
    }

    const targetSlice = AccessControlDomain.userSliceFromDocument(target);
    if (!canActorAssignSociumRoles(actorSlice, targetSlice, settings)) {
      throw new Error("FORBIDDEN");
    }

    if (!target.selfGovernmentApplicationIntent || isSelfGovernmentMember(target.sociumRoles ?? [])) {
      throw new Error("NOT_PENDING");
    }

    target.selfGovernmentApplicationIntent = false;
    await target.save();

    await UserDirectoryAuditDomain.record({
      action: "user_update",
      success: true,
      actorUserId: actor._id.toString(),
      actorLogin: actor.login,
      targetUserId: target._id.toString(),
      targetDisplayName: formatUserFullName(target.name, target.surname),
      summary: "Membership application rejected.",
      changedFields: ["selfGovernmentApplicationIntent"],
      metadata: {
        membershipApplicationAction: "reject",
        note: note?.trim() || null,
      },
    }).catch((error) => {
      console.error("[MembershipApplication] Failed to record reject audit:", error);
    });

    return toApplicationRow(actorSlice, target, settings);
  },
};
