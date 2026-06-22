/**
 * @fileoverview Profile hero section — avatar, identity, role tags, sync card.
 *
 * @module src/components/profile/ProfileHero
 */

import Link from "next/link";
import type { PublicUser } from "@shared/domains/AuthDomain";
import type { PublicProfileUser } from "@shared/lib/publicProfileRedaction";
import { formatAcademicGroupSpecialtyLabel } from "@shared/lib/academicCatalogLogic";
import { UserAvatarImage } from "@/components/media/UserAvatarImage";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { UserRole } from "@shared/models/User";
import type { StudentTitle } from "@shared/models/User";

/** Props for {@link ProfileHero}. */
export interface ProfileHeroProps {
  /** Full user record (own profile) or redacted public profile DTO. */
  user: PublicUser | PublicProfileUser;
  /** When true, render the settings link (own profile only). */
  showSettingsLink?: boolean;
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
 * Profile hero block matching Figma ProfileHero section.
 *
 * @param props - See {@link ProfileHeroProps}.
 * @returns Profile hero JSX.
 */
export function ProfileHero({ user, showSettingsLink = false }: ProfileHeroProps) {
  const subtitle =
    formatAcademicGroupSpecialtyLabel(user.specialty, user.group) ?? "No specialty / group assigned";
  const identityLine =
    "sociumRoles" in user ? formatPublicUserIdentities(user) : formatPublicProfileIdentities(user);
  const sociumRoleLabels = resolveSociumRoleLabels(user);
  const studentTitle = user.studentTitle as StudentTitle | null;
  const role = user.role as UserRole;
  const showTelegramSync =
    "telegramId" in user ? Boolean(user.telegramId) : Boolean(user.lastTelegramSyncAt);

  return (
    <div className="flex flex-wrap items-start gap-4">
      <UserAvatarImage
        src={user.avatar}
        size={88}
        className="border-[3px]"
      />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-[28px] font-semibold text-[var(--color-text-primary)]">
              {user.fullName}
            </h1>
            {subtitle && (
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{subtitle}</p>
            )}
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{identityLine}</p>
          </div>
          {showSettingsLink && (
            <Link
              href="/profile/settings"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Edit profile
            </Link>
          )}
        </div>

        <div className="mt-2 flex flex-wrap gap-2">
          {sociumRoleLabels.map((label) => (
            <span key={label} className="badge badge-group">
              {label}
            </span>
          ))}
          {studentTitle && studentTitle !== "Neither" && (
            <span className="badge badge-group">{studentTitle}</span>
          )}
          {formatAcademicGroupSpecialtyLabel(user.specialty, user.group) && (
            <span className="badge badge-group">
              {formatAcademicGroupSpecialtyLabel(user.specialty, user.group)}
            </span>
          )}
          <span className="badge badge-group">{role}</span>
        </div>
      </div>

      {showTelegramSync && user.lastTelegramSyncAt && (
        <div className="glass-panel shrink-0 rounded-[var(--radius-md)] px-3 py-2.5 text-xs">
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
  );
}

export default ProfileHero;
