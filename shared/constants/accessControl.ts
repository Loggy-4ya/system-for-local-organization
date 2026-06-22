/**
 * @fileoverview Access hierarchy levels, permission keys, and default control matrix.
 *
 * Lower {@link AccessLevelIndex} = higher institutional authority.
 *
 * @module shared/constants/accessControl
 */

/** Canonical singleton document id for access control settings. */
export const ACCESS_CONTROL_SETTINGS_ID = "nexus_access_control";

/**
 * Ordered hierarchy indices — **0 is highest** authority.
 *
 * | Index | Key | Audience |
 * |-------|-----|----------|
 * | 0 | `system_administrator` | Default seed admin; full platform control |
 * | 1 | `self_government_administration` | Head/deputy + sector heads/deputies |
 * | 2 | `institution_administration` | Institution staff managing self-gov roles |
 * | 3 | `self_government_member` | Rank-and-file council members (tasks, etc.) |
 * | 4 | `starosta` | Academic group leaders |
 * | 5 | `teacher` | Teaching staff |
 * | 6 | `common_student` | Default enrolled students |
 */
export type AccessLevelIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** Stable slug for each hierarchy tier. */
export type AccessLevelKey =
  | "system_administrator"
  | "self_government_administration"
  | "institution_administration"
  | "self_government_member"
  | "starosta"
  | "teacher"
  | "common_student";

/** All permission keys enforced by the access-control engine. */
export type PermissionKey =
  | "access_control.manage_settings"
  | "users.view_directory"
  | "users.edit_profile"
  | "users.assign_access_level"
  | "users.assign_socium_roles"
  | "users.assign_affiliations"
  | "users.delegate_permissions"
  | "users.delete"
  | "tasks.dispatch"
  | "tasks.receive"
  | "pages.create"
  | "pages.edit_own"
  | "news.publish"
  | "community.moderate"
  | "notifications.broadcast";

/** Registry of every permission key (for matrix validation). */
export const ALL_PERMISSION_KEYS: PermissionKey[] = [
  "access_control.manage_settings",
  "users.view_directory",
  "users.edit_profile",
  "users.assign_access_level",
  "users.assign_socium_roles",
  "users.assign_affiliations",
  "users.delegate_permissions",
  "users.delete",
  "tasks.dispatch",
  "tasks.receive",
  "pages.create",
  "pages.edit_own",
  "news.publish",
  "community.moderate",
  "notifications.broadcast",
];

/** Human-readable permission labels for the admin editor. */
export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  "access_control.manage_settings": "Manage access-control settings",
  "users.view_directory": "View user directory",
  "users.edit_profile": "Edit user general profile fields",
  "users.assign_access_level": "Assign hierarchy level to users",
  "users.assign_socium_roles": "Assign socium roles",
  "users.assign_affiliations": "Assign activities & organizations",
  "users.delegate_permissions": "Delegate permissions downward",
  "users.delete": "Delete user accounts",
  "tasks.dispatch": "Dispatch tasks",
  "tasks.receive": "Receive tasks",
  "pages.create": "Create new Puck pages",
  "pages.edit_own": "Edit pages you authored",
  "news.publish": "Publish news & social interactivity",
  "community.moderate": "Moderate community content",
  "notifications.broadcast": "Send system-wide broadcasts",
};

/** Metadata for one hierarchy tier. */
export interface AccessLevelDefinition {
  /** Numeric index — lower is higher authority. */
  index: AccessLevelIndex;
  /** Stable slug. */
  key: AccessLevelKey;
  /** Display label in admin UI and profile badges. */
  label: string;
  /** Longer description for the settings editor. */
  description: string;
}

/** Grant rule — what a tier may assign or delegate downward. */
export interface LevelGrantRule {
  /** Level indices this actor may assign (each must be strictly greater than actor index). */
  assignableLevelIndices: AccessLevelIndex[];
  /** Permissions this actor may grant to users strictly below them in hierarchy. */
  delegatablePermissions: PermissionKey[];
}

/** Public shape of the singleton access-control settings document. */
export interface AccessControlSettingsConfig {
  /** Hierarchy tier metadata (labels may be customised). */
  levels: AccessLevelDefinition[];
  /** Default permission keys granted to each tier (before delegation). */
  levelPermissions: Record<AccessLevelIndex, PermissionKey[]>;
  /** Downward assignment and delegation rules per tier. */
  grantRules: Record<AccessLevelIndex, LevelGrantRule>;
}

/** Canonical hierarchy tier definitions. */
export const DEFAULT_ACCESS_LEVELS: AccessLevelDefinition[] = [
  {
    index: 0,
    key: "system_administrator",
    label: "System Administrator",
    description:
      "Default seed administrator. Highest authority — full platform control and permission matrix editing.",
  },
  {
    index: 1,
    key: "self_government_administration",
    label: "Self-Government Administration",
    description:
      "Head of self-government, deputy, and heads/deputies of self-government sectors.",
  },
  {
    index: 2,
    key: "institution_administration",
    label: "Institution Administration",
    description:
      "Institution staff who manage self-government administration roles and institutional policy.",
  },
  {
    index: 3,
    key: "self_government_member",
    label: "Self-Government Member",
    description:
      "Common council members — receive tasks and participate in council operations per delegated permissions.",
  },
  {
    index: 4,
    key: "starosta",
    label: "Starosta (Group Leader)",
    description: "Academic group leader — coordinates a student group within the institution.",
  },
  {
    index: 5,
    key: "teacher",
    label: "Teacher",
    description: "Teaching staff — institution role details to be expanded in a future phase.",
  },
  {
    index: 6,
    key: "common_student",
    label: "Common Student",
    description: "Default enrolled student — baseline access; role capabilities defined per permission matrix.",
  },
];

/** Default permissions per hierarchy tier. */
export const DEFAULT_LEVEL_PERMISSIONS: Record<AccessLevelIndex, PermissionKey[]> = {
  0: [...ALL_PERMISSION_KEYS],
  1: [
    "users.view_directory",
    "users.edit_profile",
    "users.assign_access_level",
    "users.assign_socium_roles",
    "users.assign_affiliations",
    "users.delegate_permissions",
    "users.delete",
    "tasks.dispatch",
    "tasks.receive",
    "pages.create",
    "pages.edit_own",
    "news.publish",
    "community.moderate",
    "notifications.broadcast",
  ],
  2: [
    "users.view_directory",
    "users.edit_profile",
    "users.assign_access_level",
    "users.assign_socium_roles",
    "users.assign_affiliations",
    "users.delegate_permissions",
    "users.delete",
    "tasks.dispatch",
    "pages.create",
    "pages.edit_own",
    "news.publish",
    "notifications.broadcast",
  ],
  3: ["users.view_directory", "tasks.receive", "pages.create", "pages.edit_own", "news.publish"],
  4: ["tasks.receive"],
  5: ["users.view_directory", "tasks.dispatch", "tasks.receive"],
  6: ["tasks.receive"],
};

/** Default downward grant rules per tier. */
export const DEFAULT_GRANT_RULES: Record<AccessLevelIndex, LevelGrantRule> = {
  0: {
    assignableLevelIndices: [1, 2, 3, 4, 5, 6],
    delegatablePermissions: [...ALL_PERMISSION_KEYS],
  },
  1: {
    assignableLevelIndices: [2, 3, 4, 5, 6],
    delegatablePermissions: [
      "users.edit_profile",
      "users.assign_access_level",
      "users.assign_socium_roles",
      "users.assign_affiliations",
      "users.delegate_permissions",
      "users.delete",
      "tasks.dispatch",
      "tasks.receive",
      "pages.create",
      "pages.edit_own",
      "news.publish",
      "community.moderate",
      "notifications.broadcast",
    ],
  },
  2: {
    assignableLevelIndices: [1, 3, 4, 5, 6],
    delegatablePermissions: [
      "users.edit_profile",
      "users.assign_access_level",
      "users.assign_socium_roles",
      "users.assign_affiliations",
      "users.delegate_permissions",
      "users.delete",
      "tasks.dispatch",
      "pages.create",
      "pages.edit_own",
      "news.publish",
      "notifications.broadcast",
    ],
  },
  3: {
    assignableLevelIndices: [4, 5, 6],
    delegatablePermissions: ["tasks.receive", "pages.create", "pages.edit_own", "news.publish"],
  },
  4: {
    assignableLevelIndices: [6],
    delegatablePermissions: [],
  },
  5: {
    assignableLevelIndices: [6],
    delegatablePermissions: ["tasks.receive"],
  },
  6: {
    assignableLevelIndices: [],
    delegatablePermissions: [],
  },
};

/** Default singleton configuration seeded on first load. */
export const DEFAULT_ACCESS_CONTROL_SETTINGS: AccessControlSettingsConfig = {
  levels: DEFAULT_ACCESS_LEVELS,
  levelPermissions: DEFAULT_LEVEL_PERMISSIONS,
  grantRules: DEFAULT_GRANT_RULES,
};

/**
 * Validate that a value is a legal hierarchy index.
 *
 * @param value - Candidate index.
 * @returns True when in range 0–6.
 */
export function isAccessLevelIndex(value: number): value is AccessLevelIndex {
  return Number.isInteger(value) && value >= 0 && value <= 6;
}

/**
 * Compare hierarchy rank — lower index means higher authority.
 *
 * @param actorIndex - Acting user's level index.
 * @param targetIndex - Target user's level index.
 * @returns True when actor outranks target (strictly higher in hierarchy).
 */
export function outranksInHierarchy(
  actorIndex: AccessLevelIndex,
  targetIndex: AccessLevelIndex,
): boolean {
  return actorIndex < targetIndex;
}

/**
 * Whether an actor may administer a target at the same tier or below.
 *
 * Lower index = higher authority. Peers share the same `accessLevelIndex`.
 *
 * @param actorIndex - Acting user's level index.
 * @param targetIndex - Target user's level index.
 * @returns True when actor is at or above target in hierarchy (same level allowed).
 */
export function meetsOrOutranksInHierarchy(
  actorIndex: AccessLevelIndex,
  targetIndex: AccessLevelIndex,
): boolean {
  return actorIndex <= targetIndex;
}
