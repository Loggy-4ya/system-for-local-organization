/**
 * @fileoverview Shared TypeScript types for User socium identity and profile extensions.
 *
 * Used by {@link User} schema, {@link AuthDomain}, and profile UI.
 *
 * @module shared/models/userTypes
 */

/**
 * Built-in socium role kind discriminator.
 *
 * Custom admin-defined roles use kind `custom` with a catalog `roleKey`.
 */
export type SociumRoleKind =
  | "starosta"
  | "group_deputy"
  | "student"
  | "teacher"
  | "self_government_member"
  | "self_government_head"
  | "self_government_deputy"
  | "custom";

/**
 * Who assigned a socium role to the user.
 */
export type SociumRoleSource = "self" | "admin" | "system";

/**
 * A socium (student-life) role held by the user.
 *
 * Distinct from system RBAC {@link UserRole} on the User document.
 */
export interface IUserSociumRole {
  /** Catalog or built-in role slug. */
  roleKey: string;
  /** Denormalized display label for profile badges. */
  roleLabel: string;
  /** Built-in or custom kind discriminator. */
  kind: SociumRoleKind;
  /** Whether the user, admin, or system assigned this role. */
  source: SociumRoleSource;
  /** Self-government body slug when role is tied to a body. */
  bodyKey?: string | null;
  /** Denormalized self-government body title. */
  bodyTitle?: string | null;
  /** When the role was assigned. */
  assignedAt: Date;
  /** Admin user id when {@link source} is `admin`. */
  assignedByUserId?: string | null;
}

/**
 * Social group activity affiliation on a user profile.
 *
 * Categories are defined in {@link SocialGroupActivityCatalog}.
 */
export interface IUserSocialGroupActivity {
  /** Catalog activity key. */
  activityKey: string;
  /** Denormalized activity label. */
  activityLabel: string;
  /** When the affiliation was recorded. */
  assignedAt: Date;
}

/**
 * External organization membership outside self-government.
 *
 * Organizations are defined in {@link OrganizationCatalog}.
 */
export interface IUserOrganizationMembership {
  /** Catalog organization key. */
  organizationKey: string;
  /** Denormalized organization label. */
  organizationLabel: string;
  /** When the membership was recorded. */
  assignedAt: Date;
}

/**
 * User-authored social media link.
 */
export interface IUserSocialLink {
  /** Platform identifier, e.g. `instagram`, `telegram`, `linkedin`, `custom`. */
  platform: string;
  /** Optional custom label when platform is `custom`. */
  label?: string | null;
  /** Public profile URL. */
  url: string;
}

/**
 * Quality-of-work scores for self-government members.
 *
 * Initialized automatically when {@link IUserSociumRole} kind is
 * `self_government_member`, head, or deputy.
 */
export interface IUserQualityScores {
  /** Rolling average score on a 0–100 scale. */
  averageScore: number;
  /** Number of ratings contributing to the average. */
  ratingCount: number;
  /** When scores were first initialized for this user. */
  initializedAt: Date;
  /** When scores were last updated. */
  lastUpdatedAt: Date;
}

/**
 * Well-known built-in socium role keys synced from registration chips and defaults.
 */
export const BUILTIN_SOCIUM_ROLE_KEYS = {
  starosta: "starosta",
  groupDeputy: "group_deputy",
  student: "student",
  teacher: "teacher",
  selfGovernmentMember: "self_government_member",
  selfGovernmentHead: "self_government_head",
  selfGovernmentDeputy: "self_government_deputy",
} as const;

/**
 * Default labels for built-in socium roles.
 */
export const BUILTIN_SOCIUM_ROLE_LABELS: Record<
  Exclude<SociumRoleKind, "custom">,
  string
> = {
  starosta: "Starosta (Group Leader)",
  group_deputy: "Group Deputy",
  student: "Student",
  teacher: "Teacher",
  self_government_member: "Self-Government Member",
  self_government_head: "Self-Government Head",
  self_government_deputy: "Self-Government Deputy",
};
