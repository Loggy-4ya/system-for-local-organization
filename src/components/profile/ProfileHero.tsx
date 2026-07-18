/**
 * @fileoverview Profile hero section — avatar, identity, role tags, contact actions.
 *
 * @module src/components/profile/ProfileHero
 */

import { getTranslations } from "next-intl/server";
import type { PublicUser } from "@shared/domains/AuthDomain";
import type { PublicProfileUser } from "@shared/lib/publicProfileRedaction";
import { formatAcademicGroupSpecialtyLabel } from "@shared/lib/academicCatalogLogic";
import { isTeacherUser } from "@shared/lib/userSociumHelpers";
import {
  resolveProfileAccessLevelLabel,
  resolveProfileSystemRoleLabel,
} from "@shared/lib/profileBadgeLogic";
import { resolveProfileContactOptions } from "@shared/lib/profileContactLogic";
import { UserAvatarImage } from "@/components/media/UserAvatarImage";
import { ProfileBadge } from "@/components/profile/ProfileBadge";
import { ProfileHeroActions } from "@/components/profile/ProfileHeroActions";
import type { AccessLevelIndex } from "@shared/constants/accessControl";
import type { UserRole } from "@shared/models/User";
import type { StudentTitle } from "@shared/models/User";
import { buildUserProfileHref } from "@shared/lib/userProfilePathLogic";

/** Props for {@link ProfileHero}. */
export interface ProfileHeroProps {
  /** Full user record (own profile) or redacted public profile DTO. */
  user: PublicUser | PublicProfileUser;
  /** When true, render owner settings actions. */
  showSettingsLink?: boolean;
  /** Explicit self flag for public profile route (falls back to DTO `isSelf`). */
  isSelf?: boolean;
  /** Canonical `/users/{login|id}` path — defaults to id-only when omitted. */
  publicProfilePath?: string;
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
 * Profile hero block with identity, badges, and contact actions.
 *
 * @param props - See {@link ProfileHeroProps}.
 * @returns Profile hero JSX.
 */
export async function ProfileHero({
  user,
  showSettingsLink = false,
  isSelf,
  publicProfilePath,
}: ProfileHeroProps) {
  const t = await getTranslations("profile.hero");

  /**
   * Format last Telegram sync relative label.
   *
   * @param date - Last sync timestamp.
   * @returns Human-readable sync label.
   */
  function formatSync(date: Date | null): string {
    if (!date) return t("neverSynced");
    const diffMin = Math.floor((Date.now() - date.getTime()) / 60_000);
    if (diffMin < 1) return t("justNow");
    if (diffMin < 60) return t("minutesAgo", { count: diffMin });
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return t("hoursAgo", { count: diffHr });
    return date.toLocaleDateString();
  }

  /**
   * Format linked identity summary for a full {@link PublicUser}.
   *
   * @param publicUser - Public user record.
   * @returns Identity summary string.
   */
  function formatPublicUserIdentities(publicUser: PublicUser): string {
    const parts: string[] = [];
    if (publicUser.login) parts.push(`@${publicUser.login}`);
    if (publicUser.email) parts.push(publicUser.email);
    if (publicUser.phone) parts.push(publicUser.phone);
    if (publicUser.telegramId && publicUser.username) {
      parts.push(`Telegram @${publicUser.username}`);
    }
    if (publicUser.googleId) parts.push(t("googleLinked"));
    return parts.join(" · ") || t("noLinkedAccounts");
  }

  /**
   * Format linked identity summary for a redacted {@link PublicProfileUser}.
   *
   * @param publicUser - Redacted profile DTO.
   * @returns Identity summary string.
   */
  function formatPublicProfileIdentities(publicUser: PublicProfileUser): string {
    const parts: string[] = [];
    if (publicUser.login) parts.push(`@${publicUser.login}`);
    if (publicUser.email) parts.push(publicUser.email);
    if (publicUser.phone) parts.push(publicUser.phone);
    if (publicUser.username) parts.push(`Telegram @${publicUser.username}`);
    if (publicUser.linkedGoogle) parts.push(t("googleLinked"));
    return parts.join(" · ") || t("institutionMember");
  }

  const academicLabel = formatAcademicGroupSpecialtyLabel(user.specialty, user.group);
  const isTeacher = "sociumRoles" in user ? isTeacherUser(user.sociumRoles) : false;
  const subtitle = isTeacher
    ? academicLabel ?? t("teacher")
    : academicLabel ?? t("noSpecialtyGroup");
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
  const resolvedPublicProfilePath =
    publicProfilePath ??
    buildUserProfileHref({
      id: user.id,
      login: user.login,
    });
  const accessLevelLabel = resolveProfileAccessLevelLabel(accessLevelIndex);
  const systemRoleLabel = resolveProfileSystemRoleLabel(role);

  return (
    <section className="glass-panel rounded-[var(--radius-md)] p-4">
      <div className="flex flex-wrap items-start gap-4">
        <UserAvatarImage src={user.avatar} size={96} className="border-[3px] border-[var(--color-border-default)]" />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-[28px] font-semibold text-[var(--color-text-primary)]">{user.fullName}</h1>
                {viewerIsSelf && <ProfileBadge kind="self">{t("youBadge")}</ProfileBadge>}
              </div>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{subtitle}</p>
              <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{identityLine}</p>
            </div>

            {(showSettingsLink || !viewerIsSelf) && (
              <ProfileHeroActions
                isSelf={viewerIsSelf}
                publicProfilePath={resolvedPublicProfilePath}
                contact={contact}
              />
            )}
          </div>

          <div className="mt-4 rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-elevated)] p-3">
            <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-text-secondary)]">
              {t("roleInSystem")}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <ProfileBadge kind="access_level">{accessLevelLabel}</ProfileBadge>
              <ProfileBadge kind="system_role">{systemRoleLabel}</ProfileBadge>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {studentTitle && studentTitle !== "Neither" && (
              <ProfileBadge kind="student_title">{studentTitle}</ProfileBadge>
            )}
            {academicLabel && <ProfileBadge kind="academic">{academicLabel}</ProfileBadge>}
            {sociumRoleLabels.map((label) => (
              <ProfileBadge key={label} kind="socium_role">
                {label}
              </ProfileBadge>
            ))}
            {user.warnings > 0 && (
              <ProfileBadge kind="warning">{t("warnings", { count: user.warnings })}</ProfileBadge>
            )}
          </div>
        </div>

        {showTelegramSync && user.lastTelegramSyncAt && (
          <div className="glass-panel shrink-0 rounded-[var(--radius-md)] border border-[var(--color-border-default)] px-3 py-2.5 text-xs">
            <p className="font-medium text-[var(--color-text-secondary)]">{t("lastSync")}</p>
            <p className="mt-0.5 text-[var(--color-text-primary)]">
              {t("telegramBotSync", { time: formatSync(user.lastTelegramSyncAt) })}
            </p>
            {user.phone && (
              <p className="mt-0.5 text-[var(--color-text-secondary)]">
                {t("phoneAvatarUpdated", { phonePrefix: user.phone.slice(0, 4) })}
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

export default ProfileHero;
