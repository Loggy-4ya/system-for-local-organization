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
import { useTranslations } from "next-intl";
import { LogIn, Menu, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { HeaderUserMenuDropdown } from "@/components/ui/HeaderUserMenuDropdown";
import { MobileSidebarAccountFooter } from "@/components/ui/MobileSidebarAccountFooter";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { LocaleSwitcher } from "@/components/ui/LocaleSwitcher";
import { NotificationBellButton } from "@/components/notifications/NotificationBellButton";
import { siteChromeLucideProps } from "@/components/global-layout/resolveLucideIcon";
import {
  DesktopHeaderNavZones,
  MobileHeaderNavCategory,
  isCategoryVisible,
  visibleNavItems,
} from "@/components/ui/siteHeaderNavCategories";
import {
  type HeaderCategory,
  type HeaderLayout,
  type HeaderNavItem,
} from "@shared/constants/globalLayout";
import { contentWidthContainerStyle, GLOBAL_LAYOUT_CONTENT_WIDTH } from "@/components/puck/lib/contentWidthTokens";

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
  /** Signed-in avatar dropdown links from global layout settings. */
  userMenuItems?: HeaderNavItem[];
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
  userMenuItems,
  isActive,
  isAuthenticated,
  userAvatar,
  userName,
  userEmail,
  showAdminPanel,
  onClose,
  preview = false,
  navAriaLabel,
}: {
  categories: HeaderCategory[];
  userMenuItems: HeaderNavItem[];
  isActive: (href: string) => boolean;
  isAuthenticated: boolean;
  userAvatar: string | null;
  userName: string | null;
  userEmail: string | null;
  showAdminPanel: boolean;
  onClose: () => void;
  preview?: boolean;
  navAriaLabel: string;
}) {
  const visibleUserLinks = visibleNavItems(userMenuItems, showAdminPanel);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <nav className="site-header-mobile-panel__scroll px-2 pb-2" aria-label={navAriaLabel}>
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
      <MobileSidebarAccountFooter
        userMenuItems={visibleUserLinks}
        isAuthenticated={isAuthenticated}
        userAvatar={userAvatar}
        userName={userName}
        userEmail={userEmail}
        isActive={isActive}
        preview={preview}
        onClose={onClose}
      />
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
  userMenuItems = [],
  contentWidth = GLOBAL_LAYOUT_CONTENT_WIDTH,
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
  const t = useTranslations("header");
  const tc = useTranslations("common");
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
            ? "site-header-bar site-header-bar--preview glass-panel flex w-full rounded-[var(--radius-lg)] px-3 py-2.5 shadow-[0_8px_24px_-4px_rgba(0,0,0,0.35)]"
            : "site-header-bar glass-panel flex w-full rounded-[var(--radius-lg)] px-3 py-2.5 shadow-[0_8px_24px_-4px_rgba(0,0,0,0.35)]"
        }
      >
        <div className="flex w-full min-w-0 items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <Link
              href="/"
              aria-label={t("homeAria")}
              className="site-header-bar__logo inline-flex shrink-0 items-center no-underline"
              onClick={blockPreviewNavigation}
            >
              <span className="site-header-bar__wordmark">Nexus</span>
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
            <LocaleSwitcher className="hidden lg:inline-flex" />
            {isAuthenticated ? (
              <NotificationBellButton isAuthenticated preview={preview} />
            ) : null}
            {isAuthenticated ? (
              <HeaderUserMenuDropdown
                userMenuItems={userMenuItems}
                showAdminPanel={showAdminPanel}
                isActive={isActive}
                userAvatar={userAvatar}
                userName={userName}
                userEmail={userEmail}
                preview={preview}
              />
            ) : (
              <Link
                href="/login"
                className="site-header-bar__signin hidden rounded-[var(--radius-md)] border border-[var(--color-border-default)] px-2.5 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] no-underline hover:text-[var(--color-text-primary)] lg:inline-flex"
                aria-label={t("signInAria")}
                title={tc("signIn")}
                onClick={blockPreviewNavigation}
              >
                <LogIn {...siteChromeLucideProps({ className: "site-header-bar__signin-icon" })} aria-hidden />
                <span className="site-header-bar__signin-label">{tc("signIn")}</span>
              </Link>
            )}

            <div className="site-header-mobile-details lg:hidden">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!menuOpen)}
                className="site-header-bar__menu-btn site-header-bar__menu-btn--mobile-only"
                aria-label={menuOpen ? t("closeMenu") : t("openMenu")}
                aria-expanded={menuOpen}
                aria-controls={menuOpen ? "site-header-mobile-menu" : undefined}
              >
                <Menu className="size-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {menuMounted ? (
        <>
          <div
            className={
              menuVisible
                ? "site-header-mobile-backdrop site-header-mobile-backdrop--open fixed inset-0 bg-black/40 dark:bg-black/60 z-[1099]"
                : "site-header-mobile-backdrop fixed inset-0 bg-black/40 dark:bg-black/60 z-[1099]"
            }
            onClick={() => setMobileMenuOpen(false)}
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
              <div className="site-header-mobile-panel__toolbar px-2 pt-3">
                <button
                  type="button"
                  className="site-header-mobile-panel__close-btn"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label={t("closeMenu")}
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </div>
              <MobileNavPanel
                categories={visibleCategories}
                userMenuItems={userMenuItems}
                isActive={isActive}
                isAuthenticated={isAuthenticated}
                userAvatar={userAvatar}
                userName={userName}
                userEmail={userEmail}
                showAdminPanel={showAdminPanel}
                onClose={() => setMobileMenuOpen(false)}
                preview={preview}
                navAriaLabel={t("mobileNavAria")}
              />
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

export default SiteHeaderBar;
