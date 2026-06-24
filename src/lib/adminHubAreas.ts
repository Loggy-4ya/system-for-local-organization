/**
 * @fileoverview Admin hub area registry and per-user visibility resolution.
 *
 * @module src/lib/adminHubAreas
 */

import type { IUser } from "@shared/models/User";
import { AccessControlDomain } from "@shared/domains/AccessControlDomain";
import {
  canManageAccessControlSettings,
  hasPermission,
} from "@shared/lib/accessControlLogic";

/** Serializable icon key for admin hub tiles (mapped to Lucide in the shell). */
export type AdminHubIconKey =
  | "layout"
  | "shield"
  | "shield-alert"
  | "megaphone"
  | "message-circle"
  | "graduation-cap"
  | "users"
  | "book-open"
  | "calendar"
  | "server"
  | "user-check";

/** Lifecycle state for an admin hub tile. */
export type AdminHubAreaStatus = "active" | "coming_soon";

/** One administration area shown on `/admin`. */
export interface AdminHubArea {
  /** Stable identifier. */
  id: string;
  /** Route when `status` is `active`. */
  href?: string;
  /** Tile title. */
  title: string;
  /** Short description for the surface card. */
  description: string;
  /** Lucide icon key resolved client-side. */
  icon: AdminHubIconKey;
  /** Whether the area is navigable or shown as upcoming. */
  status: AdminHubAreaStatus;
}

/** Canonical list of administration areas (order = display order). */
export const ADMIN_HUB_AREAS: AdminHubArea[] = [
  {
    id: "user-directory",
    href: "/admin/users",
    title: "User Directory",
    description:
      "Browse the institutional user roster, manage hierarchy levels, assign socium roles, and delegate permissions.",
    icon: "users",
    status: "active",
  },
  {
    id: "global-layout",
    href: "/admin/global-layout",
    title: "Global Layout",
    description:
      "Configure site-wide header navigation, user menu, and footer columns with live preview.",
    icon: "layout",
    status: "active",
  },
  {
    id: "user-access",
    href: "/admin/user-access",
    title: "User Access & Permissions",
    description:
      "Edit the seven-tier hierarchy, default permission matrix, and downward grant rules.",
    icon: "shield",
    status: "active",
  },
  {
    id: "general-rules",
    href: "/admin/general-rules",
    title: "General Rules",
    description:
      "Blocked words, weak-password denylist, user-facing validation messages, and Telegram bot copy.",
    icon: "book-open",
    status: "active",
  },
  {
    id: "telegram-bot",
    href: "/admin/telegram-bot",
    title: "Telegram Bot Messages",
    description:
      "Default /start, broadcast, page go-live, and registration prompts sent by the Nexus bot.",
    icon: "message-circle",
    status: "active",
  },
  {
    id: "institutional-calendar",
    href: "/admin/institutional-calendar",
    title: "Institutional Calendar",
    description:
      "Yearly recurring reminders and auto-created tasks for socium roles and access tiers.",
    icon: "calendar",
    status: "active",
  },
  {
    id: "security-audits",
    href: "/admin/logs",
    title: "System Logs",
    description:
      "Browse institutional audit trails: Puck content sanitization events and User Directory admin mutations.",
    icon: "shield-alert",
    status: "active",
  },
  {
    id: "telegram-workspaces",
    href: "/admin/telegram-workspaces",
    title: "Telegram Workspaces",
    description:
      "Ephemeral Telegram groups for multi-part projects — provisioning policy, templates, and dismantle rules.",
    icon: "megaphone",
    status: "active",
  },
  {
    id: "hosting",
    href: "/admin/hosting",
    title: "Hosting & Deployment",
    description:
      "Resolved hosting mode, scheduler policy, and environment validation for this instance.",
    icon: "server",
    status: "active",
  },
  {
    id: "membership-applications",
    href: "/admin/membership-applications",
    title: "Membership Applications",
    description:
      "Review self-government membership requests, approve applicants, or clear rejected intents.",
    icon: "user-check",
    status: "active",
  },
  {
    id: "broadcasts",
    title: "System Broadcasts",
    description:
      "Send institution-wide messages as in-app toasts and Telegram direct messages.",
    icon: "megaphone",
    status: "coming_soon",
  },
  {
    id: "academic-catalog",
    title: "Academic Catalog Review",
    description:
      "Approve or reject student-submitted specialty and group labels from registration.",
    icon: "graduation-cap",
    status: "coming_soon",
  },
];

/**
 * Resolve which admin hub areas the signed-in user may see.
 *
 * @param user - Authenticated MongoDB user document.
 * @returns Filtered area list for the hub grid.
 */
export async function resolveAdminHubAreasForUser(user: IUser): Promise<AdminHubArea[]> {
  const isLegacyAdmin = user.role === "Admin";
  const settingsDoc = await AccessControlDomain.loadOrSeed();
  const settings = AccessControlDomain.toPublicConfig(settingsDoc);
  const userSlice = AccessControlDomain.userSliceFromDocument(user);

  const canManageAccess =
    isLegacyAdmin || canManageAccessControlSettings(userSlice, settings);
  const canBroadcast =
    isLegacyAdmin || hasPermission(userSlice, settings, "notifications.broadcast");
  const canViewDirectory =
    isLegacyAdmin || hasPermission(userSlice, settings, "users.view_directory");
  const canAssignSocium =
    isLegacyAdmin || hasPermission(userSlice, settings, "users.assign_socium_roles");

  return ADMIN_HUB_AREAS.filter((area) => {
    switch (area.id) {
      case "user-directory":
        return canViewDirectory;
      case "global-layout":
        return isLegacyAdmin;
      case "user-access":
        return isLegacyAdmin || canManageAccess;
      case "general-rules":
        return isLegacyAdmin;
      case "telegram-bot":
        return isLegacyAdmin;
      case "institutional-calendar":
        return isLegacyAdmin;
      case "telegram-workspaces":
        return isLegacyAdmin;
      case "hosting":
        return isLegacyAdmin;
      case "membership-applications":
        return canAssignSocium;
      case "security-audits":
        return isLegacyAdmin;
      case "broadcasts":
        return isLegacyAdmin || canBroadcast;
      case "academic-catalog":
        return isLegacyAdmin;
      default:
        return false;
    }
  }).map((area) => ({
    id: area.id,
    href: area.href,
    title: area.title,
    description: area.description,
    icon: area.icon,
    status: area.status,
  }));
}
