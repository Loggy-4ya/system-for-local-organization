/**
 * @fileoverview Profile identity board — about note, contact details, and social link cards.
 *
 * @module src/components/profile/ProfileIdentityBoard
 */

import { getTranslations } from "next-intl/server";
import {
  ExternalLink,
  Globe,
  Link2,
  Mail,
  MessageCircle,
  Phone,
  StickyNote,
} from "lucide-react";
import type { IUserSocialLink } from "@shared/models/userTypes";
import {
  profileSocialLinkAccentClass,
  resolveSocialLinkPlatformLabel,
} from "@shared/lib/profileBadgeLogic";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

/** Optional contact fields shown when the viewer may see PII. */
export interface ProfileIdentityPersonalInfo {
  login?: string | null;
  email?: string | null;
  phone?: string | null;
  username?: string | null;
  linkedGoogle?: boolean | null;
}

/** Props for {@link ProfileIdentityBoard}. */
export interface ProfileIdentityBoardProps {
  /** Self-authored bio note. */
  about: string | null;
  /** User social profile links. */
  socialLinks: IUserSocialLink[];
  /** Contact fields when visible to the viewer. */
  personalInfo?: ProfileIdentityPersonalInfo;
  /** When true, show empty-state hints for the profile owner. */
  isSelf?: boolean;
}

/**
 * Resolve a lucide icon for a social platform slug.
 *
 * @param platform - Stored platform identifier.
 * @returns Icon component for the link card.
 */
function resolveSocialLinkIcon(platform: string) {
  const normalized = platform.trim().toLowerCase();
  if (normalized === "telegram") return MessageCircle;
  if (normalized === "custom") return Link2;
  return Globe;
}

/**
 * Identity board with about note, personal contact grid, and social link cards.
 *
 * @param props - About, links, and optional personal info.
 * @returns Identity board JSX or null when entirely empty for non-self viewers.
 */
export async function ProfileIdentityBoard({
  about,
  socialLinks,
  personalInfo,
  isSelf = false,
}: ProfileIdentityBoardProps) {
  const t = await getTranslations("profile.identityBoard");

  const personalRows = buildPersonalRows(personalInfo, {
    email: t("email"),
    phone: t("phone"),
    telegram: t("telegram"),
    google: t("google"),
    googleLinked: t("googleLinked"),
  });
  const hasAbout = Boolean(about?.trim());
  const hasLinks = socialLinks.length > 0;
  const hasPersonal = personalRows.length > 0;

  if (!hasAbout && !hasLinks && !hasPersonal && !isSelf) return null;

  return (
    <section className="glass-panel flex flex-col gap-5 rounded-[var(--radius-md)] p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">{t("title")}</h2>
          <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">{t("subtitle")}</p>
        </div>
        {isSelf && (
          <Link href="/profile/settings" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            {t("editProfile")}
          </Link>
        )}
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="flex flex-col gap-4">
          <div className="rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-elevated)] p-4">
            <div className="flex items-center gap-2">
              <StickyNote className="size-4 shrink-0 text-[var(--color-accent-user)]" aria-hidden="true" />
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">{t("about")}</h3>
            </div>
            {hasAbout ? (
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-text-secondary)]">
                {about}
              </p>
            ) : (
              <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
                {isSelf ? t("aboutEmptySelf") : t("aboutEmptyOther")}
              </p>
            )}
          </div>

          {hasPersonal && (
            <div className="rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-elevated)] p-4">
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">{t("contactAccounts")}</h3>
              <ul className="mt-3 grid list-none gap-3 p-0 sm:grid-cols-2">
                {personalRows.map((row) => {
                  const Icon = row.icon;
                  return (
                    <li
                      key={row.key}
                      className="flex min-w-0 items-start gap-2.5 rounded-[var(--radius-sm)] border border-[var(--color-border-default)] bg-[var(--color-bg-panel)] px-3 py-2.5"
                    >
                      <Icon className="mt-0.5 size-4 shrink-0 text-[var(--color-accent-user)]" aria-hidden="true" />
                      <div className="min-w-0">
                        <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-text-secondary)]">
                          {row.label}
                        </p>
                        <p className="truncate text-sm text-[var(--color-text-primary)]">{row.value}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        <div className="rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-elevated)] p-4">
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">{t("links")}</h3>
          {hasLinks ? (
            <ul className="mt-3 grid list-none gap-2 p-0 sm:grid-cols-2">
              {socialLinks.map((link) => {
                const Icon = resolveSocialLinkIcon(link.platform);
                const label = resolveSocialLinkPlatformLabel(link.platform, link.label);
                return (
                  <li key={`${link.platform}-${link.url}`}>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "profile-social-link group flex h-full min-h-[72px] flex-col justify-between gap-2 rounded-[var(--radius-md)] border p-3 transition-colors hover:bg-[var(--color-bg-panel)]",
                        profileSocialLinkAccentClass(link.platform),
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="profile-social-link__icon inline-flex size-8 items-center justify-center rounded-[var(--radius-sm)]">
                          <Icon className="size-4" aria-hidden="true" />
                        </span>
                        <ExternalLink
                          className="size-3.5 shrink-0 text-[var(--color-text-secondary)] opacity-0 transition-opacity group-hover:opacity-100"
                          aria-hidden="true"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[var(--color-text-primary)]">{label}</p>
                        <p className="truncate text-[11px] text-[var(--color-text-secondary)]">{link.url}</p>
                      </div>
                    </a>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
              {isSelf ? t("linksEmptySelf") : t("linksEmptyOther")}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

/**
 * Build read-only personal info rows from optional contact fields.
 *
 * @param personalInfo - Redacted or full contact payload.
 * @param labels - Localized field labels.
 * @returns Ordered row descriptors for the contact grid.
 */
function buildPersonalRows(
  personalInfo: ProfileIdentityPersonalInfo | undefined,
  labels: {
    email: string;
    phone: string;
    telegram: string;
    google: string;
    googleLinked: string;
  },
) {
  if (!personalInfo) return [];

  const rows: Array<{
    key: string;
    label: string;
    value: string;
    icon: typeof Mail;
  }> = [];

  if (personalInfo.email) {
    rows.push({ key: "email", label: labels.email, value: personalInfo.email, icon: Mail });
  }
  if (personalInfo.phone) {
    rows.push({ key: "phone", label: labels.phone, value: personalInfo.phone, icon: Phone });
  }
  if (personalInfo.username) {
    rows.push({
      key: "telegram",
      label: labels.telegram,
      value: `@${personalInfo.username}`,
      icon: MessageCircle,
    });
  }
  if (personalInfo.linkedGoogle) {
    rows.push({ key: "google", label: labels.google, value: labels.googleLinked, icon: Link2 });
  }

  return rows;
}

export default ProfileIdentityBoard;
