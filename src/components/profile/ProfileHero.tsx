/**
 * @fileoverview Profile hero section — avatar, identity, role tags, sync card.
 *
 * @module src/components/profile/ProfileHero
 */

import Image from "next/image";
import Link from "next/link";
import type { PublicUser } from "@shared/domains/AuthDomain";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Props for {@link ProfileHero}. */
export interface ProfileHeroProps {
  user: PublicUser;
}

/**
 * Format linked identity summary line.
 *
 * @param user - Public user record.
 * @returns Identity summary string.
 */
function formatIdentities(user: PublicUser): string {
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
export function ProfileHero({ user }: ProfileHeroProps) {
  const subtitle = [user.specialty, user.group ? `Group ${user.group}` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex flex-wrap items-start gap-4">
      <div className="h-[88px] w-[88px] shrink-0 overflow-hidden rounded-full border-[3px] border-[var(--color-accent-user)] bg-[var(--color-bg-elevated)]">
        {user.avatar ? (
          <Image src={user.avatar} alt="" width={88} height={88} className="h-full w-full object-cover" />
        ) : (
          <span
            aria-hidden="true"
            className="block h-full w-full bg-[var(--color-accent-user)] opacity-40"
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-[28px] font-semibold text-[var(--color-text-primary)]">
              {user.fullName}
            </h1>
            {subtitle && (
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{subtitle}</p>
            )}
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
              {formatIdentities(user)}
            </p>
          </div>
          <Link
            href="/profile/settings"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Edit profile
          </Link>
        </div>

        <div className="mt-2 flex flex-wrap gap-2">
          {user.sociumRoles
            .filter((role) => role.kind !== "student")
            .map((role) => (
              <span key={`${role.roleKey}-${role.bodyKey ?? "global"}`} className="badge badge-group">
                {role.roleLabel}
              </span>
            ))}
          {user.studentTitle && user.studentTitle !== "Neither" && (
            <span className="badge badge-group">{user.studentTitle}</span>
          )}
          {user.group && <span className="badge badge-group">Group {user.group}</span>}
          <span className="badge badge-group">{user.role}</span>
        </div>
      </div>

      {user.telegramId && (
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
