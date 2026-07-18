"use client";

/**
 * @fileoverview Mobile sidebar footer — theme toggle, user badge, and account links panel.
 *
 * @module src/components/ui/MobileSidebarAccountFooter
 */

import React, { useId, useState } from "react";
import Image from "next/image";
import { ChevronDown, LogIn, LogOut, User } from "lucide-react";
import { useTranslations } from "next-intl";
import { signOut } from "next-auth/react";
import { Link } from "@/i18n/navigation";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { LocaleSwitcher } from "@/components/ui/LocaleSwitcher";
import { resolveLucideIcon, siteChromeLucideProps } from "@/components/global-layout/resolveLucideIcon";
import { type HeaderNavItem } from "@shared/constants/globalLayout";

/** Props for {@link MobileSidebarAccountFooter}. */
export interface MobileSidebarAccountFooterProps {
  userMenuItems: HeaderNavItem[];
  isAuthenticated: boolean;
  userAvatar?: string | null;
  userName?: string | null;
  userEmail?: string | null;
  isActive?: (href: string) => boolean;
  preview?: boolean;
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
  const t = useTranslations("header");
  const tc = useTranslations("common");
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
      <div className="site-header-mobile-menu__meta-row flex items-center gap-2">
        <ThemeToggle variant="sidebar" className="site-header-mobile-menu__theme-toggle" />
        <LocaleSwitcher variant="sidebar" />
      </div>

      {isAuthenticated ? (
        <div className="site-header-mobile-menu__account-section">
          {hasUserLinks && userLinksOpen ? (
            <div
              id={linksPanelId}
              className="site-header-mobile-menu__account-links-panel"
              aria-label={t("accountLinks")}
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
              <span className="site-header-mobile-menu__account-name">{userName ?? t("account")}</span>
              <span className="site-header-mobile-menu__account-email">
                {userEmail ?? t("signedIn")}
              </span>
            </span>
            {hasUserLinks ? (
              <button
                type="button"
                className="site-header-mobile-menu__account-toggle"
                aria-expanded={userLinksOpen}
                aria-controls={linksPanelId}
                aria-label={userLinksOpen ? t("hideAccountLinks") : t("showAccountLinks")}
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
            <span>{tc("signOut")}</span>
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
            <span className="site-header-mobile-menu__account-name">{tc("signIn")}</span>
            <span className="site-header-mobile-menu__account-email">{t("accessAccount")}</span>
          </span>
        </Link>
      )}
    </div>
  );
}

export default MobileSidebarAccountFooter;
