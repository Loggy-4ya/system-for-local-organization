"use client";

/**
 * @fileoverview Contained GlobalHeader component for Project Nexus.
 *
 * @module src/components/ui/GlobalHeader
 */

import { usePathname } from "next/navigation";
import { SiteHeaderBar, type SiteNavLink } from "@/components/ui/SiteHeaderBar";

/** Props accepted by `GlobalHeader`. */
export interface GlobalHeaderProps {
  showAdminPanel?: boolean;
  userAvatar?: string | null;
}

const NAV_LINKS: SiteNavLink[] = [
  { href: "/news", label: "News" },
  { href: "/council-apply", label: "Council Apply" },
  { href: "/propose-activity", label: "Propose Activity" },
  { href: "/pages", label: "Create Page" },
  { href: "/admin", label: "Admin", adminOnly: true },
];

/**
 * Global site header — rendered inside the root layout above all page content.
 *
 * @param props - See `GlobalHeaderProps`.
 * @returns The full header JSX subtree.
 */
export function GlobalHeader({
  showAdminPanel = false,
  userAvatar = null,
}: GlobalHeaderProps) {
  const pathname = usePathname();
  const isEditing = pathname === "/edit" || pathname.endsWith("/edit");
  if (isEditing) return null;

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="site-header-slot" role="banner">
      <SiteHeaderBar
        links={NAV_LINKS}
        showAdminPanel={showAdminPanel}
        isActive={isActive}
        userAvatar={userAvatar}
      />
    </header>
  );
}

export default GlobalHeader;
