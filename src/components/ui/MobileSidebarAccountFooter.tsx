"use client";

/**
 * @fileoverview Mobile sidebar footer — theme toggle, user badge, and account links panel.
 *
 * User menu links open in a fixed-height panel above the signed-in badge when the
 * chevron on the badge is pressed. Log out stays as a single action below the badge.
 *
 * @module src/components/ui/MobileSidebarAccountFooter
 */

import React, { useId, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown, LogIn, LogOut, User } from "lucide-react";
import { signOut } from "next-auth/react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { resolveLucideIcon, siteChromeLucideProps } from "@/components/global-layout/resolveLucideIcon";
import { type HeaderNavItem } from "@shared/constants/globalLayout";

/** Props for {@link MobileSidebarAccountFooter}. */
export interface MobileSidebarAccountFooterProps {
  /** Signed-in user menu links from global layout settings. */
  userMenuItems: HeaderNavItem[];
  /** Whether the viewer is signed in. */
  isAuthenticated: boolean;
  /** Optional avatar URL. */
  userAvatar?: string | null;
  /** User display name. */
  userName?: string | null;
  /** User email subtitle. */
  userEmail?: string | null;
  /** Active path matcher. */
  isActive?: (href: string) => boolean;
  /** Live-preview chrome: links do not navigate; logout is disabled. */
  preview?: boolean;
  /** Close the mobile drawer after navigation actions. */
  onClose: () => void;
}

/**
 * Sidebar footer with theme toggle and signed-in account controls.
 *
 * @param props - See {@link MobileSidebarAccountFooterProps}.
 * @returns Mobile sidebar account footer JSX.
 */
export function MobileSidebarAccountFooter({
  userMenuItems,
  isAuthenticated,
  userAvatar = null,
  userName = null,
  userEmail = null,
  isActive = () => false,
  preview = false,
  onClose,
}: MobileSidebarAccountFooterProps) {
  const [userLinksOpen, setUserLinksOpen] = useState(false);
  const linksPanelId = useId();
  const hasUserLinks = isAuthenticated && userMenuItems.length > 0;

  const handleLogout = () => {
    if (preview) return;
    onClose();
    void signOut({ callbackUrl: "/" });
  };

  const toggleUserLinks = () => {
    if (!hasUserLinks) return;
    setUserLinksOpen((open) => !open);
  };

  return (
    <div className="site-header-mobile-menu__actions px-2 pb-3">
      <div className="site-header-mobile-menu__meta-row site-header-mobile-menu__meta-row--theme-only">
        <ThemeToggle variant="sidebar" className="site-header-mobile-menu__theme-toggle" />
      </div>

      {isAuthenticated ? (
        <div className="site-header-mobile-menu__account-section">
          {hasUserLinks && userLinksOpen ? (
            <div
              id={linksPanelId}
              className="site-header-mobile-menu__account-links-panel"
              aria-label="Account links"
            >
              <ul className="site-header-mobile-menu__account-links-list">
                {userMenuItems.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <li key={item.id}>
                      <Link
                        href={item.href}
                        onClick={(event) => {
                          if (preview) {
                            event.preventDefault();
                          }
                          onClose();
                        }}
                        className={
                          active
                            ? "site-header-mobile-menu__link site-header-mobile-menu__link--active"
                            : "site-header-mobile-menu__link"
                        }
                        aria-current={active ? "page" : undefined}
                      >
                        {item.icon ? (
                          <span className="site-header-mobile-menu__link-icon" aria-hidden>
                            {resolveLucideIcon(item.icon, siteChromeLucideProps())}
                          </span>
                        ) : null}
                        <span className="site-header-mobile-menu__link-label">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          <div className="site-header-mobile-menu__account-card site-header-mobile-menu__account-card--signed-in">
            <span className="site-header-mobile-menu__account-avatar" aria-hidden="true">
              {userAvatar ? (
                <Image
                  src={userAvatar}
                  alt=""
                  width={32}
                  height={32}
                  className="site-header-mobile-menu__account-avatar-img"
                />
              ) : (
                <span className="site-header-mobile-menu__account-avatar-fallback">
                  <User {...siteChromeLucideProps()} aria-hidden />
                </span>
              )}
            </span>
            <span className="site-header-mobile-menu__account-text">
              <span className="site-header-mobile-menu__account-name">{userName ?? "Account"}</span>
              <span className="site-header-mobile-menu__account-email">
                {userEmail ?? "Signed in"}
              </span>
            </span>
            {hasUserLinks ? (
              <button
                type="button"
                className="site-header-mobile-menu__account-toggle"
                aria-expanded={userLinksOpen}
                aria-controls={linksPanelId}
                aria-label={userLinksOpen ? "Hide account links" : "Show account links"}
                onClick={toggleUserLinks}
              >
                <ChevronDown
                  className="site-header-mobile-menu__account-chevron"
                  size={16}
                  strokeWidth={2}
                  data-open={userLinksOpen ? "true" : "false"}
                  aria-hidden
                />
              </button>
            ) : null}
          </div>

          <button
            type="button"
            className="site-header-mobile-menu__logout-btn"
            onClick={handleLogout}
          >
            <LogOut {...siteChromeLucideProps()} aria-hidden />
            <span>Log out</span>
          </button>
        </div>
      ) : (
        <Link
          href="/login"
          onClick={(event) => {
            if (preview) {
              event.preventDefault();
            }
            onClose();
          }}
          className="site-header-mobile-menu__account-card"
        >
          <span className="site-header-mobile-menu__account-avatar" aria-hidden="true">
            <span className="site-header-mobile-menu__account-avatar-fallback">
              <LogIn {...siteChromeLucideProps()} aria-hidden />
            </span>
          </span>
          <span className="site-header-mobile-menu__account-text">
            <span className="site-header-mobile-menu__account-name">Sign in</span>
            <span className="site-header-mobile-menu__account-email">Access your account</span>
          </span>
        </Link>
      )}
    </div>
  );
}

export default MobileSidebarAccountFooter;
