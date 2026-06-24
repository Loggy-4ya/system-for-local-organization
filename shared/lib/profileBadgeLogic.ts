/**
 * @fileoverview Profile badge taxonomy — consistent type colors across profile surfaces.
 *
 * Maps institutional identity chips (RBAC, hierarchy, socium, affiliations) to stable
 * CSS modifier classes so `/profile` and `/users/[userId]` render the same palette.
 *
 * Tests: `npm run test:profile-badge-logic`
 * Registry: `.ai/docs/testing.md`
 *
 * @module shared/lib/profileBadgeLogic
 */

import type { AccessLevelIndex } from "@shared/constants/accessControl";
import { DEFAULT_ACCESS_LEVELS } from "@shared/constants/accessControl";
import type { UserRole } from "@shared/models/User";

/** Canonical profile badge categories with distinct accent colors. */
export type ProfileBadgeKind =
  | "system_role"
  | "access_level"
  | "socium_role"
  | "activity"
  | "organization"
  | "academic"
  | "student_title"
  | "warning"
  | "self";

/** CSS modifier token for {@link profileBadgeClassName}. */
export const PROFILE_BADGE_KIND_CLASS: Record<ProfileBadgeKind, string> = {
  system_role: "badge-profile--system-role",
  access_level: "badge-profile--access-level",
  socium_role: "badge-profile--socium-role",
  activity: "badge-profile--activity",
  organization: "badge-profile--organization",
  academic: "badge-profile--academic",
  student_title: "badge-profile--student-title",
  warning: "badge-profile--warning",
  self: "badge-profile--self",
};

/**
 * Compose the shared profile badge class list for a badge kind.
 *
 * @param kind - Badge taxonomy entry.
 * @returns Space-separated class string (`badge badge-profile …`).
 */
export function profileBadgeClassName(kind: ProfileBadgeKind): string {
  return `badge badge-profile ${PROFILE_BADGE_KIND_CLASS[kind]}`;
}

/**
 * Resolve the human-readable hierarchy label for an access level index.
 *
 * @param index - Hierarchy index (0 = highest authority).
 * @returns Tier label from {@link DEFAULT_ACCESS_LEVELS}.
 */
export function resolveProfileAccessLevelLabel(index: AccessLevelIndex): string {
  return DEFAULT_ACCESS_LEVELS.find((level) => level.index === index)?.label ?? "Member";
}

/**
 * Resolve the display label for a legacy RBAC role.
 *
 * @param role - Stored user role.
 * @returns User-facing RBAC label.
 */
export function resolveProfileSystemRoleLabel(role: UserRole): string {
  if (role === "StudentCouncil") return "Student Council";
  return role;
}

/**
 * Map a social link platform slug to a display label.
 *
 * @param platform - Stored platform identifier.
 * @param customLabel - Optional user-provided label.
 * @returns Platform label for link cards.
 */
export function resolveSocialLinkPlatformLabel(platform: string, customLabel?: string | null): string {
  const normalized = platform.trim().toLowerCase();
  if (customLabel?.trim()) return customLabel.trim();

  const known: Record<string, string> = {
    telegram: "Telegram",
    instagram: "Instagram",
    linkedin: "LinkedIn",
    facebook: "Facebook",
    github: "GitHub",
    youtube: "YouTube",
    tiktok: "TikTok",
    x: "X",
    twitter: "X",
    custom: "Link",
  };

  return known[normalized] ?? platform;
}

/**
 * CSS modifier for a social link card accent (platform-colored border/icon).
 *
 * @param platform - Stored platform identifier.
 * @returns Modifier class token (`profile-social-link--telegram`, etc.).
 */
export function profileSocialLinkAccentClass(platform: string): string {
  const normalized = platform.trim().toLowerCase();
  const allowed = new Set([
    "telegram",
    "instagram",
    "linkedin",
    "facebook",
    "github",
    "youtube",
    "tiktok",
    "x",
    "twitter",
  ]);
  if (allowed.has(normalized)) return `profile-social-link--${normalized === "twitter" ? "x" : normalized}`;
  return "profile-social-link--custom";
}
