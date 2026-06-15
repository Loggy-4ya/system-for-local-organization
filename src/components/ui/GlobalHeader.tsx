"use client";

/**
 * @fileoverview Contained GlobalHeader component for Project Nexus.
 *
 * @module src/components/ui/GlobalHeader
 */

import { usePathname } from "next/navigation";
import { SiteHeaderBar } from "@/components/ui/SiteHeaderBar";
import { GLOBAL_LAYOUT_HEADER_SLOT_CLASS } from "@/components/puck/lib/contentWidthTokens";
import { type HeaderConfig } from "@shared/constants/globalLayout";

/** Props accepted by `GlobalHeader`. */
export interface GlobalHeaderProps {
  header: HeaderConfig;
  showAdminPanel?: boolean;
  /** Whether the stored theme preference is dark (for toggle link visuals). */
  isDarkTheme?: boolean;
  userAvatar?: string | null;
  /** Whether a user session is active. */
  isAuthenticated?: boolean;
  /** Display name for sign-in link label. */
  userName?: string | null;
  /** Email shown under the name in the mobile sidebar account row. */
  userEmail?: string | null;
  /** Content width preset. */
  contentWidth?: string;
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
  contentWidth = "lg",
}: GlobalHeaderProps) {
  const pathname = usePathname();
  const isEditing = pathname === "/edit" || pathname.endsWith("/edit");
  if (isEditing) return null;

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      <header
        className={`${GLOBAL_LAYOUT_HEADER_SLOT_CLASS} flex w-full min-h-[72px] items-center justify-center`}
        role="banner"
      >
        <SiteHeaderBar
          categories={header.categories}
          layout={header.layout}
          showAdminPanel={showAdminPanel}
          isActive={isActive}
          isDarkTheme={isDarkTheme}
          userAvatar={userAvatar}
          isAuthenticated={isAuthenticated}
          userName={userName}
          userEmail={userEmail}
          contentWidth={contentWidth}
        />
      </header>
      {/* Reserves document flow space under the fixed header */}
      <div className="site-header-spacer" aria-hidden="true" />
    </>
  );
}

export default GlobalHeader;
