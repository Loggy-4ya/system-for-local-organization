/**
 * @fileoverview Redacted public profile DTO for member-to-member profile viewing.
 *
 * Authenticated institution members may browse `/users/[ref]` (`ref` = login or MongoDB id). PII (login, email,
 * phone, linked providers) is shown only when the viewer is the profile owner or
 * strictly outranks the target in the access hierarchy.
 *
 * Tests: `npm run test:public-profile-redaction`
 * Registry: `.ai/docs/testing.md`
 *
 * @module shared/lib/publicProfileRedaction
 */

import type { AccessLevelIndex } from "@shared/constants/accessControl";
import { outranksInHierarchy } from "@shared/constants/accessControl";
import { inferAccessLevelIndex, type AccessControlUserSlice } from "@shared/lib/accessControlLogic";
import { formatUserFullName } from "@shared/lib/userSociumHelpers";
import type { IUser } from "@shared/models/User";
import type { IUserSocialLink } from "@shared/models/userTypes";

/** Safe profile fields exposed on `/users/[ref]`. */
export interface PublicProfileUser {
  /** MongoDB user id. */
  id: string;
  /** Combined display name. */
  fullName: string;
  /** Given name. */
  name: string;
  /** Family name when present. */
  surname: string | null;
  /** Avatar URL. */
  avatar: string | null;
  /** Academic specialty label. */
  specialty: string | null;
  /** Student group label. */
  group: string | null;
  /** Self-authored about note. */
  about: string | null;
  /** User-authored social links. */
  socialLinks: IUserSocialLink[];
  /** Denormalized socium role labels for badges. */
  sociumRoleLabels: string[];
  /** Denormalized activity labels. */
  socialGroupActivityLabels: string[];
  /** Denormalized organization labels. */
  organizationLabels: string[];
  /** Student council title chip. */
  studentTitle: IUser["studentTitle"];
  /** Legacy RBAC role label. */
  role: IUser["role"];
  /** Hierarchy index for badge display. */
  accessLevelIndex: AccessLevelIndex;
  /** Gamification stars total. */
  stars: number;
  /** Active warning count. */
  warnings: number;
  /** Self-government quality scores when initialized. */
  qualityScores: IUser["qualityScores"];
  /** Whether the viewer is viewing their own profile. */
  isSelf: boolean;

  /** Login handle — null when redacted. */
  login: string | null;
  /** Email — null when redacted. */
  email: string | null;
  /** Phone — null when redacted. */
  phone: string | null;
  /** Telegram username — null when redacted. */
  username: string | null;
  /** Whether Google is linked — null when redacted. */
  linkedGoogle: boolean | null;
  /** Whether Apple is linked — null when redacted. */
  linkedApple: boolean | null;
  /** Last Telegram sync — null when redacted. */
  lastTelegramSyncAt: Date | null;
}

/**
 * Whether a viewer may see another user's contact PII on the public profile route.
 *
 * @param viewer - Acting user slice (null when unauthenticated).
 * @param target - Profile owner document.
 * @returns True when login, email, phone, and provider links may be shown.
 */
export function canViewerSeeProfilePii(
  viewer: AccessControlUserSlice | null,
  target: IUser,
): boolean {
  if (!viewer) return false;

  const viewerId = (viewer as AccessControlUserSlice & { id?: string }).id;
  const targetId = String(target._id);
  if (viewerId && viewerId === targetId) return true;

  if (viewer.role === "Admin") return true;

  const viewerIndex = inferAccessLevelIndex(viewer);
  const targetIndex = inferAccessLevelIndex(target);
  return outranksInHierarchy(viewerIndex, targetIndex);
}

/**
 * Map a target user into a redacted {@link PublicProfileUser} for the public profile route.
 *
 * @param viewer - Acting user slice, or null when unauthenticated.
 * @param target - Profile owner MongoDB document.
 * @returns Redacted profile DTO.
 */
export function toPublicProfileUser(
  viewer: (AccessControlUserSlice & { id?: string }) | null,
  target: IUser,
): PublicProfileUser {
  const targetId = String(target._id);
  const isSelf = Boolean(viewer?.id && viewer.id === targetId);
  const canSeePii = isSelf || canViewerSeeProfilePii(viewer, target);
  const targetIndex = inferAccessLevelIndex(target);

  const sociumRoleLabels = (target.sociumRoles ?? [])
    .filter((role) => role.kind !== "student")
    .map((role) => role.roleLabel);

  return {
    id: targetId,
    fullName: formatUserFullName(target.name, target.surname),
    name: target.name,
    surname: target.surname ?? null,
    avatar: target.avatar ?? null,
    specialty: target.specialty ?? null,
    group: target.group ?? null,
    about: target.about ?? null,
    socialLinks: target.socialLinks ?? [],
    sociumRoleLabels,
    socialGroupActivityLabels: (target.socialGroupActivities ?? []).map((a) => a.activityLabel),
    organizationLabels: (target.organizations ?? []).map((o) => o.organizationLabel),
    studentTitle: target.studentTitle ?? null,
    role: target.role,
    accessLevelIndex: targetIndex,
    stars: target.stars ?? 0,
    warnings: target.warnings ?? 0,
    qualityScores: target.qualityScores,
    isSelf,
    login: canSeePii ? (target.login ?? null) : null,
    email: canSeePii ? (target.email ?? null) : null,
    phone: canSeePii ? (target.phone ?? null) : null,
    username: canSeePii ? (target.username ?? null) : null,
    linkedGoogle: canSeePii ? Boolean(target.googleId) : null,
    linkedApple: canSeePii ? Boolean(target.appleId) : null,
    lastTelegramSyncAt: canSeePii ? (target.lastTelegramSyncAt ?? null) : null,
  };
}
