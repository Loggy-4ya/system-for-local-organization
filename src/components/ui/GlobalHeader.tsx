"use client";

/**
 * @fileoverview Contained GlobalHeader component for Project Nexus.
 *
 * @module src/components/ui/GlobalHeader
 */

import { usePathname } from "@/i18n/navigation";
import { useOptionalSiteProfile } from "@/components/auth/SiteProfileProvider";
import { SiteHeaderBar } from "@/components/ui/SiteHeaderBar";
import { isPuckEditorRoutePath } from "@/components/puck/lib/pageSlugValidation";
import { GLOBAL_LAYOUT_HEADER_SLOT_CLASS, GLOBAL_LAYOUT_CONTENT_WIDTH } from "@/components/puck/lib/contentWidthTokens";
import { stripLocalePrefix } from "@/lib/localePathLogic";
import { type HeaderConfig } from "@shared/constants/globalLayout";

/** Props accepted by `GlobalHeader`. */
export interface GlobalHeaderProps {
  header: HeaderConfig;
  showAdminPanel?: boolean;
  isDarkTheme?: boolean;
  userAvatar?: string | null;
  isAuthenticated?: boolean;
  userName?: string | null;
  userEmail?: string | null;
  contentWidth?: string;
  preview?: boolean;
}

/**
 * Global site header — rendered inside the root layout above all page content.
 *
 * @param props - See `GlobalHeaderProps`.
 * @returns The full header JSX subtree.
 */
export function GlobalHeader({
  header,
  showAdminPanel = false,
  isDarkTheme = true,
  userAvatar = null,
  isAuthenticated = false,
  userName = null,
  userEmail = null,
  contentWidth = GLOBAL_LAYOUT_CONTENT_WIDTH,
  preview = false,
}: GlobalHeaderProps) {
  const pathname = usePathname();
  const siteProfile = useOptionalSiteProfile();
  if (isPuckEditorRoutePath(pathname)) return null;

  const resolvedProfile = preview ? null : siteProfile?.profile ?? null;
  const resolvedShowAdminPanel = preview
    ? showAdminPanel
    : siteProfile?.showAdminPanel ?? showAdminPanel;
  const resolvedIsAuthenticated = preview
    ? isAuthenticated
    : siteProfile?.isAuthenticated ?? isAuthenticated;
  const resolvedUserAvatar = preview
    ? userAvatar
    : resolvedProfile?.avatar ?? userAvatar;
  const resolvedUserName = preview
    ? userName
    : resolvedProfile?.fullName ?? userName;
  const resolvedUserEmail = preview
    ? userEmail
    : resolvedProfile?.email ?? userEmail;

  const pathnameWithoutLocale = stripLocalePrefix(pathname);
  const isActive = (href: string) =>
    href === "/"
      ? pathnameWithoutLocale === "/"
      : pathnameWithoutLocale.startsWith(href);

  return (
    <>
      <header
        className={`${GLOBAL_LAYOUT_HEADER_SLOT_CLASS} flex w-full min-h-[72px] items-center justify-center`}
        role="banner"
      >
        <SiteHeaderBar
          categories={header.categories}
          layout={header.layout}
          userMenuItems={header.userMenu}
          showAdminPanel={resolvedShowAdminPanel}
          isActive={isActive}
          isDarkTheme={isDarkTheme}
          userAvatar={resolvedUserAvatar}
          isAuthenticated={resolvedIsAuthenticated}
          userName={resolvedUserName}
          userEmail={resolvedUserEmail}
          preview={preview}
          contentWidth={contentWidth}
        />
      </header>
      <div className="site-header-spacer" aria-hidden="true" />
    </>
  );
}

export default GlobalHeader;
