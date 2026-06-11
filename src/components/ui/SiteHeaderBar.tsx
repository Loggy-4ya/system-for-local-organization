"use client";

/**
 * @fileoverview Shared responsive site header bar for GlobalHeader and editor preview.
 *
 * Mobile navigation uses Shadcn CommandDialog for filterable site navigation.
 *
 * @module src/components/ui/SiteHeaderBar
 */

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BRAND } from "@/lib/assets";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

/** Navigation link descriptor. */
export interface SiteNavLink {
  href: string;
  label: string;
  adminOnly?: boolean;
}

/** Props for {@link SiteHeaderBar}. */
export interface SiteHeaderBarProps {
  /** Nav links to render. */
  links: SiteNavLink[];
  /** Whether admin-only links are visible. */
  showAdminPanel?: boolean;
  /** Active path matcher. */
  isActive?: (href: string) => boolean;
  /** Optional avatar URL. */
  userAvatar?: string | null;
  /** Disable pointer events (editor preview). */
  preview?: boolean;
  /** Extra label above controls (editor preview). */
  previewBadge?: string;
}

/**
 * Responsive glass header bar — collapses nav into a command palette on small screens.
 *
 * @param props - See {@link SiteHeaderBarProps}.
 * @returns Header bar JSX.
 */
export function SiteHeaderBar({
  links,
  showAdminPanel = false,
  isActive = () => false,
  userAvatar = null,
  preview = false,
  previewBadge,
}: SiteHeaderBarProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const visibleLinks = links.filter((l) => !l.adminOnly || showAdminPanel);

  /**
   * Navigate to a header link and close the mobile command menu.
   *
   * @param href - Destination path.
   */
  const navigateTo = (href: string) => {
    setMenuOpen(false);
    router.push(href);
  };

  return (
    <>
      <div
        className="site-header-bar glass-panel"
        style={{
          maxWidth: "var(--content-width-lg)",
          boxShadow: "0 8px 24px -4px rgba(0,0,0,0.35)",
          pointerEvents: preview ? "none" : undefined,
        }}
      >
        <div className="site-header-bar__main">
          <div className="site-header-bar__left">
            <Link href="/" aria-label="Nexus home" className="site-header-bar__logo">
              <span aria-hidden="true" className="site-header-bar__logo-mark">
                <Image
                  src={BRAND.logo}
                  alt=""
                  width={16}
                  height={16}
                  style={{ filter: "brightness(0) invert(1)" }}
                  priority
                />
              </span>
              <span className="site-header-bar__wordmark">Nexus</span>
            </Link>

            <nav className="site-header-bar__nav" aria-label="Primary navigation">
              <ul className="site-header-bar__nav-list">
                {visibleLinks.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className={
                        isActive(link.href)
                          ? "site-header-bar__nav-link site-header-bar__nav-link--active"
                          : "site-header-bar__nav-link"
                      }
                      aria-current={isActive(link.href) ? "page" : undefined}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          <div className="site-header-bar__actions">
            {previewBadge ? (
              <span className="site-header-bar__preview-badge">{previewBadge}</span>
            ) : null}
            <Link href="/pages" className="site-header-bar__cta">
              + New Page
            </Link>
            <ThemeToggle className="site-header-bar__theme-toggle" />
            <div className="site-header-bar__avatar" aria-label="User profile">
              {userAvatar ? (
                <Image
                  src={userAvatar}
                  alt="User avatar"
                  width={28}
                  height={28}
                  className="site-header-bar__avatar-img"
                />
              ) : (
                <span aria-hidden="true" className="site-header-bar__avatar-fallback" />
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="site-header-bar__menu-btn md:hidden"
              aria-expanded={menuOpen}
              aria-controls="site-header-mobile-menu"
              onClick={() => setMenuOpen(true)}
            >
              ☰
            </Button>
          </div>
        </div>
      </div>

      <CommandDialog
        open={menuOpen}
        onOpenChange={setMenuOpen}
        title="Site navigation"
        description="Search and jump to a page"
        className="top-[12%] max-w-lg"
      >
        <Command>
          <CommandInput placeholder="Search pages…" />
          <CommandList id="site-header-mobile-menu">
            <CommandEmpty>No matching pages.</CommandEmpty>
            <CommandGroup heading="Navigation">
              {visibleLinks.map((link) => (
                <CommandItem
                  key={link.label}
                  value={`${link.label} ${link.href}`}
                  onSelect={() => navigateTo(link.href)}
                >
                  <span className={isActive(link.href) ? "font-medium text-foreground" : undefined}>
                    {link.label}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}

export default SiteHeaderBar;
