"use client";

/**
 * @fileoverview Shared responsive site header bar for GlobalHeader and editor preview.
 *
 * Mobile navigation uses collapsible category sections (closed by default) and a
 * full-height right sidebar drawer.
 *
 * @module src/components/ui/SiteHeaderBar
 */

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronsUpDown, LogIn, Menu, User } from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { siteChromeLucideProps } from "@/components/global-layout/resolveLucideIcon";
import {
  DesktopHeaderNavZones,
  MobileHeaderNavCategory,
  isCategoryVisible,
} from "@/components/ui/siteHeaderNavCategories";
import { shouldUseDenseHeaderNav } from "@/components/global-layout/lib/headerNavAlignLogic";
import {
  type HeaderCategory,
  type HeaderLayout,
} from "@shared/constants/globalLayout";
import { contentWidthContainerStyle } from "@/components/puck/lib/contentWidthTokens";

/** Navigation link descriptor (legacy). */
export interface SiteNavLink {
  href: string;
  label: string;
  adminOnly?: boolean;
}

/** Props for {@link SiteHeaderBar}. */
export interface SiteHeaderBarProps {
  /** Nav links to render (legacy fallback). */
  links?: SiteNavLink[];
  /** Configurable header categories. */
  categories?: HeaderCategory[];
  /** Configurable header layout. */
  layout?: HeaderLayout;
  /** Content width preset. */
  contentWidth?: string;
  /** Whether admin-only links are visible. */
  showAdminPanel?: boolean;
  /** Active path matcher. */
  isActive?: (href: string) => boolean;
  /** Whether the stored theme is dark (for the server-safe toggle link). */
  isDarkTheme?: boolean;
  /** Optional avatar URL. */
  userAvatar?: string | null;
  /** Whether user is signed in. */
  isAuthenticated?: boolean;
  /** User display name. */
  userName?: string | null;
  /** User email for sidebar account row subtitle. */
  userEmail?: string | null;
  /** Live-preview chrome: nav menus work; logo/profile links do not navigate away. */
  preview?: boolean;
  /** Extra label above controls (editor preview). */
  previewBadge?: string;
}

/**
 * Mobile nav panel links shared by the `<details>` menu.
 *
 * @returns Nav list markup.
 */
function MobileNavPanel({
  categories,
  isActive,
  isAuthenticated,
  userAvatar,
  userName,
  userEmail,
  showAdminPanel,
  onClose,
  preview = false,
}: {
  categories: HeaderCategory[];
  isActive: (href: string) => boolean;
  isAuthenticated: boolean;
  userAvatar: string | null;
  userName: string | null;
  userEmail: string | null;
  showAdminPanel: boolean;
  onClose: () => void;
  preview?: boolean;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <nav className="site-header-mobile-panel__scroll px-2 pb-2" aria-label="Mobile navigation">
        {categories.map((category) => (
          <MobileHeaderNavCategory
            key={category.id}
            category={category}
            isActive={isActive}
            showAdminPanel={showAdminPanel}
            onClose={onClose}
            preview={preview}
          />
        ))}
      </nav>
      <div className="site-header-mobile-menu__actions px-2 pb-3">
        <div className="site-header-mobile-menu__meta-row">
          <span className="site-header-mobile-menu__meta-label">Theme</span>
          <ThemeToggle
            variant="sidebar"
            className="site-header-mobile-menu__theme-toggle"
          />
        </div>
        <Link
          href={isAuthenticated ? "/profile" : "/login"}
          onClick={(event) => {
            if (preview) {
              event.preventDefault();
            }
            onClose();
          }}
          className="site-header-mobile-menu__account-card"
        >
          <span className="site-header-mobile-menu__account-avatar" aria-hidden="true">
            {isAuthenticated && userAvatar ? (
              <Image
                src={userAvatar}
                alt=""
                width={32}
                height={32}
                className="site-header-mobile-menu__account-avatar-img"
              />
            ) : isAuthenticated ? (
              <span className="site-header-mobile-menu__account-avatar-fallback">
                <User {...siteChromeLucideProps()} aria-hidden />
              </span>
            ) : (
              <span className="site-header-mobile-menu__account-avatar-fallback">
                <LogIn {...siteChromeLucideProps()} aria-hidden />
              </span>
            )}
          </span>
          <span className="site-header-mobile-menu__account-text">
            <span className="site-header-mobile-menu__account-name">
              {isAuthenticated ? userName ?? "Profile" : "Sign in"}
            </span>
            <span className="site-header-mobile-menu__account-email">
              {isAuthenticated
                ? userEmail ?? "View your profile"
                : "Access your account"}
            </span>
          </span>
          <ChevronsUpDown
            className="site-header-mobile-menu__account-chevron"
            size={16}
            strokeWidth={2}
            aria-hidden
          />
        </Link>
      </div>
    </div>
  );
}

/**
 * Responsive glass header bar — collapses nav into a native details menu on small screens.
 *
 * @param props - See {@link SiteHeaderBarProps}.
 * @returns Header bar JSX.
 */
export function SiteHeaderBar({
  links,
  categories,
  layout,
  contentWidth = "lg",
  showAdminPanel = false,
  isActive = () => false,
  isDarkTheme = true,
  userAvatar = null,
  isAuthenticated = false,
  userName = null,
  userEmail = null,
  preview = false,
  previewBadge,
}: SiteHeaderBarProps) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [menuMounted, setMenuMounted] = React.useState(false);
  const [menuVisible, setMenuVisible] = React.useState(false);

  /** Opens/closes the drawer; close keeps the panel mounted until the exit animation finishes. */
  const setMobileMenuOpen = React.useCallback((nextOpen: boolean) => {
    setMenuOpen(nextOpen);
  }, []);

  React.useEffect(() => {
    if (!menuOpen) {
      setMenuVisible(false);
      return;
    }

    setMenuMounted(true);
    setMenuVisible(false);

    let innerFrame = 0;
    const outerFrame = window.requestAnimationFrame(() => {
      innerFrame = window.requestAnimationFrame(() => {
        setMenuVisible(true);
      });
    });

    return () => {
      window.cancelAnimationFrame(outerFrame);
      window.cancelAnimationFrame(innerFrame);
    };
  }, [menuOpen]);

  React.useEffect(() => {
    if (menuVisible || !menuMounted) return;

    const timer = window.setTimeout(() => {
      setMenuMounted(false);
    }, 320);

    return () => window.clearTimeout(timer);
  }, [menuVisible, menuMounted]);

  // Map legacy links to categories for backward compatibility
  const categoriesToRender: HeaderCategory[] = categories || [
    {
      id: "main",
      items: (links || []).map((link, idx) => ({
        id: `legacy-${idx}`,
        href: link.href,
        label: link.label,
        adminOnly: link.adminOnly,
      })),
    },
  ];

  const widthStyle = contentWidthContainerStyle(contentWidth);
  const visibleCategories = categoriesToRender.filter((category) =>
    isCategoryVisible(category, showAdminPanel),
  );
  const denseNav = shouldUseDenseHeaderNav(visibleCategories);

  const blockPreviewNavigation = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (preview) {
      event.preventDefault();
    }
  };

  return (
    <div 
      className="site-header-bar-root relative mx-auto w-full"
      style={widthStyle}
    >
      <div
        className={
          preview
            ? `site-header-bar site-header-bar--preview glass-panel w-full rounded-[var(--radius-lg)] px-3 py-2.5 shadow-[0_8px_24px_-4px_rgba(0,0,0,0.35)]${denseNav ? " site-header-bar--dense-nav flex flex-col gap-2.5" : " flex"}`
            : `site-header-bar glass-panel w-full rounded-[var(--radius-lg)] px-3 py-2.5 shadow-[0_8px_24px_-4px_rgba(0,0,0,0.35)]${denseNav ? " site-header-bar--dense-nav flex flex-col gap-2.5" : " flex"}`
        }
      >
        {denseNav ? (
          <>
            <div className="site-header-bar__top-row flex w-full min-w-0 items-center justify-between gap-3">
              <Link
                href="/"
                aria-label="Nexus home"
                className="site-header-bar__logo inline-flex shrink-0 items-center no-underline"
                onClick={blockPreviewNavigation}
              >
                <span className="site-header-bar__wordmark">Nexus</span>
              </Link>
              <div className="site-header-bar__actions flex shrink-0 items-center gap-2">
                {previewBadge ? (
                  <span className="site-header-bar__preview-badge text-[10px] uppercase tracking-wide text-[var(--color-text-secondary)]">
                    {previewBadge}
                  </span>
                ) : null}
                <ThemeToggle className="site-header-bar__theme-toggle hidden lg:inline-flex" />
                {isAuthenticated ? (
                  <Link
                    href="/profile"
                    className="site-header-bar__avatar hidden lg:inline-flex"
                    aria-label={userName ? `${userName} profile` : "User profile"}
                    onClick={blockPreviewNavigation}
                  >
                    {userAvatar ? (
                      <Image
                        src={userAvatar}
                        alt=""
                        width={28}
                        height={28}
                        className="site-header-bar__avatar-img"
                      />
                    ) : (
                      <span aria-hidden="true" className="site-header-bar__avatar-fallback" />
                    )}
                  </Link>
                ) : (
                  <Link
                    href="/login"
                    className="site-header-bar__signin hidden rounded-[var(--radius-md)] border border-[var(--color-border-default)] px-2.5 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] no-underline hover:text-[var(--color-text-primary)] lg:inline-flex"
                    aria-label="Sign in"
                    title="Sign in"
                    onClick={blockPreviewNavigation}
                  >
                    <LogIn {...siteChromeLucideProps({ className: "site-header-bar__signin-icon" })} aria-hidden />
                    <span className="site-header-bar__signin-label">Sign in</span>
                  </Link>
                )}
                <div className="site-header-mobile-details lg:hidden">
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(!menuOpen)}
                    className="site-header-bar__menu-btn site-header-bar__menu-btn--mobile-only"
                    aria-label={menuOpen ? "Close site menu" : "Open site menu"}
                    aria-expanded={menuOpen}
                    aria-controls={menuOpen ? "site-header-mobile-menu" : undefined}
                  >
                    <Menu className="size-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
            <DesktopHeaderNavZones
              categories={visibleCategories}
              layout={layout}
              isActive={isActive}
              showAdminPanel={showAdminPanel}
              preview={preview}
            />
          </>
        ) : (
        <div className="flex w-full min-w-0 items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <Link
              href="/"
              aria-label="Nexus home"
              className="site-header-bar__logo inline-flex shrink-0 items-center no-underline"
              onClick={blockPreviewNavigation}
            >
              <span className="site-header-bar__wordmark">
                Nexus
              </span>
            </Link>

            <DesktopHeaderNavZones
              categories={visibleCategories}
              layout={layout}
              isActive={isActive}
              showAdminPanel={showAdminPanel}
              preview={preview}
            />
          </div>

          <div className="site-header-bar__actions flex shrink-0 items-center gap-2">
            {previewBadge ? (
              <span className="site-header-bar__preview-badge text-[10px] uppercase tracking-wide text-[var(--color-text-secondary)]">
                {previewBadge}
              </span>
            ) : null}
            <ThemeToggle className="site-header-bar__theme-toggle hidden lg:inline-flex" />
            {isAuthenticated ? (
              <Link
                href="/profile"
                className="site-header-bar__avatar hidden lg:inline-flex"
                aria-label={userName ? `${userName} profile` : "User profile"}
                onClick={blockPreviewNavigation}
              >
                {userAvatar ? (
                  <Image
                    src={userAvatar}
                    alt=""
                    width={28}
                    height={28}
                    className="site-header-bar__avatar-img"
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className="site-header-bar__avatar-fallback"
                  />
                )}
              </Link>
            ) : (
              <Link
                href="/login"
                className="site-header-bar__signin hidden rounded-[var(--radius-md)] border border-[var(--color-border-default)] px-2.5 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] no-underline hover:text-[var(--color-text-primary)] lg:inline-flex"
                aria-label="Sign in"
                title="Sign in"
                onClick={blockPreviewNavigation}
              >
                <LogIn {...siteChromeLucideProps({ className: "site-header-bar__signin-icon" })} aria-hidden />
                <span className="site-header-bar__signin-label">Sign in</span>
              </Link>
            )}

            <div className="site-header-mobile-details lg:hidden">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!menuOpen)}
                className="site-header-bar__menu-btn site-header-bar__menu-btn--mobile-only"
                aria-label={menuOpen ? "Close site menu" : "Open site menu"}
                aria-expanded={menuOpen}
                aria-controls={menuOpen ? "site-header-mobile-menu" : undefined}
              >
                <Menu className="size-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
        )}
      </div>

      {menuMounted ? (
        <>
          <div
            className={
              menuVisible
                ? "site-header-mobile-backdrop site-header-mobile-backdrop--open fixed inset-0 bg-black/40 dark:bg-black/60 z-[1099]"
                : "site-header-mobile-backdrop fixed inset-0 bg-black/40 dark:bg-black/60 z-[1099]"
            }
            onClick={preview ? undefined : () => setMobileMenuOpen(false)}
            data-preview-chrome={preview ? "true" : undefined}
            aria-hidden="true"
          />
          <div
            id="site-header-mobile-menu"
            className={
              menuVisible
                ? "site-header-mobile-panel site-header-mobile-panel--open glass-panel z-[1100]"
                : "site-header-mobile-panel glass-panel z-[1100]"
            }
          >
            <div className="site-header-mobile-panel__inner">
              <MobileNavPanel
                categories={visibleCategories}
                isActive={isActive}
                isAuthenticated={isAuthenticated}
                userAvatar={userAvatar}
                userName={userName}
                userEmail={userEmail}
                showAdminPanel={showAdminPanel}
                onClose={() => setMobileMenuOpen(false)}
                preview={preview}
              />
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

export default SiteHeaderBar;
