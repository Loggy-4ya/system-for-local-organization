"use client";

/**
 * @fileoverview Shared responsive site header bar for GlobalHeader and editor preview.
 *
 * @module src/components/ui/SiteHeaderBar
 */

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { BRAND } from "@/lib/assets";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

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
 * Responsive glass header bar — collapses nav into mobile menu on small screens.
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
  const [menuOpen, setMenuOpen] = useState(false);
  const visibleLinks = links.filter((l) => !l.adminOnly || showAdminPanel);

  return (
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
          <button
            type="button"
            className="site-header-bar__menu-btn"
            aria-expanded={menuOpen}
            aria-controls="site-header-mobile-menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {menuOpen ? (
        <nav
          id="site-header-mobile-menu"
          className="site-header-bar__mobile-nav"
          aria-label="Mobile navigation"
        >
          <ul className="site-header-bar__mobile-list">
            {visibleLinks.map((link) => (
              <li key={link.label}>
                <Link
                  href={link.href}
                  className={
                    isActive(link.href)
                      ? "site-header-bar__mobile-link site-header-bar__mobile-link--active"
                      : "site-header-bar__mobile-link"
                  }
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </div>
  );
}

export default SiteHeaderBar;
