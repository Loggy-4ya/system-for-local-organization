/**
 * @fileoverview Profile hero section — avatar, identity, role tags, contact actions.
 *
 * @module src/components/profile/ProfileHero
 */

import type { PublicUser } from "@shared/domains/AuthDomain";
import type { PublicProfileUser } from "@shared/lib/publicProfileRedaction";
import { DEFAULT_ACCESS_LEVELS } from "@shared/constants/accessControl";
import type { AccessLevelIndex } from "@shared/constants/accessControl";
import { formatAcademicGroupSpecialtyLabel } from "@shared/lib/academicCatalogLogic";
import { resolveProfileContactOptions } from "@shared/lib/profileContactLogic";
import { UserAvatarImage } from "@/components/media/UserAvatarImage";
import { Badge } from "@/components/ui/badge";
import { ProfileHeroActions } from "@/components/profile/ProfileHeroActions";
import type { UserRole } from "@shared/models/User";
import type { StudentTitle } from "@shared/models/User";

/** Props for {@link ProfileHero}. */
export interface ProfileHeroProps {
  /** Full user record (own profile) or redacted public profile DTO. */
  user: PublicUser | PublicProfileUser;
  /** When true, render owner settings actions. */
  showSettingsLink?: boolean;
  /** Explicit self flag for public profile route (falls back to DTO `isSelf`). */
  isSelf?: boolean;
}

/**
 * Format linked identity summary for a full {@link PublicUser}.
 *
 * @param user - Public user record.
 * @returns Identity summary string.
 */
function formatPublicUserIdentities(user: PublicUser): string {
  const parts: string[] = [];
  if (user.login) parts.push(`@${user.login}`);
  if (user.email) parts.push(user.email);
  if (user.phone) parts.push(user.phone);
  if (user.telegramId && user.username) parts.push(`Telegram @${user.username}`);
  if (user.googleId) parts.push("Google linked");
  if (user.appleId) parts.push("Apple linked");
  return parts.join(" · ") || "No linked accounts";
}

/**
 * Format linked identity summary for a redacted {@link PublicProfileUser}.
 *
 * @param user - Redacted profile DTO.
 * @returns Identity summary string.
 */
function formatPublicProfileIdentities(user: PublicProfileUser): string {
  const parts: string[] = [];
  if (user.login) parts.push(`@${user.login}`);
  if (user.email) parts.push(user.email);
  if (user.phone) parts.push(user.phone);
  if (user.username) parts.push(`Telegram @${user.username}`);
  if (user.linkedGoogle) parts.push("Google linked");
  if (user.linkedApple) parts.push("Apple linked");
  return parts.join(" · ") || "Institution member";
}

/**
 * Resolve socium role badge labels from either profile shape.
 *
 * @param user - Profile user payload.
 * @returns Badge label strings.
 */
function resolveSociumRoleLabels(user: PublicUser | PublicProfileUser): string[] {
  if ("sociumRoleLabels" in user) return user.sociumRoleLabels;
  return user.sociumRoles.filter((role) => role.kind !== "student").map((role) => role.roleLabel);
}

/**
 * Resolve hierarchy access level label for badge display.
 *
 * @param index - Access level index on the profile user.
 * @returns Human-readable tier label.
 */
function resolveAccessLevelLabel(index: AccessLevelIndex): string {
  return DEFAULT_ACCESS_LEVELS.find((level) => level.index === index)?.label ?? "Member";
}

/**
 * Format last Telegram sync relative label.
 *
 * @param date - Last sync timestamp.
 * @returns Human-readable sync label.
 */
function formatSync(date: Date | null): string {
  if (!date) return "Never synced";
  const diffMin = Math.floor((Date.now() - date.getTime()) / 60_000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return date.toLocaleDateString();
}

/**
 * Map legacy RBAC role to badge variant styling.
 *
 * @param role - User RBAC role.
 * @returns Shadcn badge variant name.
 */
function roleBadgeVariant(role: UserRole): "default" | "secondary" | "outline" {
  if (role === "Admin") return "default";
  if (role === "StudentCouncil") return "secondary";
  return "outline";
}

/**
 * Profile hero block with identity, badges, and contact actions.
 *
 * @param props - See {@link ProfileHeroProps}.
 * @returns Profile hero JSX.
 */
export function ProfileHero({ user, showSettingsLink = false, isSelf }: ProfileHeroProps) {
  const academicLabel = formatAcademicGroupSpecialtyLabel(user.specialty, user.group);
  const subtitle = academicLabel ?? "No specialty / group assigned";
  const identityLine =
    "sociumRoles" in user ? formatPublicUserIdentities(user) : formatPublicProfileIdentities(user);
  const sociumRoleLabels = resolveSociumRoleLabels(user);
  const studentTitle = user.studentTitle as StudentTitle | null;
  const role = user.role as UserRole;
  const viewerIsSelf = isSelf ?? ("isSelf" in user ? user.isSelf : showSettingsLink);
  const showTelegramSync =
    "telegramId" in user ? Boolean(user.telegramId) : Boolean(user.lastTelegramSyncAt);
  const accessLevelIndex = user.accessLevelIndex as AccessLevelIndex;
  const contact = resolveProfileContactOptions({
    username: user.username,
    email: user.email,
    socialLinks: user.socialLinks ?? [],
  });
  const publicProfilePath = `/users/${user.id}`;

  return (
    <section className="glass-panel rounded-[var(--radius-md)] p-4">
      <div className="flex flex-wrap items-start gap-4">
        <UserAvatarImage src={user.avatar} size={96} className="border-[3px] border-[var(--color-border-default)]" />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-[28px] font-semibold text-[var(--color-text-primary)]">{user.fullName}</h1>
                {viewerIsSelf && (
                  <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                    You
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{subtitle}</p>
              <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{identityLine}</p>
            </div>

            {(showSettingsLink || !viewerIsSelf) && (
              <ProfileHeroActions
                isSelf={viewerIsSelf}
                publicProfilePath={publicProfilePath}
                contact={contact}
              />
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant={roleBadgeVariant(role)}>{role}</Badge>
            <Badge variant="outline">{resolveAccessLevelLabel(accessLevelIndex)}</Badge>
            {studentTitle && studentTitle !== "Neither" && (
              <Badge variant="secondary">{studentTitle}</Badge>
            )}
            {academicLabel && <Badge variant="outline">{academicLabel}</Badge>}
            {sociumRoleLabels.map((label) => (
              <span key={label} className="badge badge-group">
                {label}
              </span>
            ))}
            {user.warnings > 0 && (
              <span className="badge badge-warning">
                {user.warnings} warning{user.warnings === 1 ? "" : "s"}
              </span>
            )}
          </div>
        </div>

        {showTelegramSync && user.lastTelegramSyncAt && (
          <div className="glass-panel shrink-0 rounded-[var(--radius-md)] border border-[var(--color-border-default)] px-3 py-2.5 text-xs">
            <p className="font-medium text-[var(--color-text-secondary)]">Last sync</p>
            <p className="mt-0.5 text-[var(--color-text-primary)]">
              Telegram bot · {formatSync(user.lastTelegramSyncAt)}
            </p>
            {user.phone && (
              <p className="mt-0.5 text-[var(--color-text-secondary)]">
                Phone {user.phone.slice(0, 4)}… · Avatar updated
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

export default ProfileHero;
