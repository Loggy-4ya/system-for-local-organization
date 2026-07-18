"use client";

/**
 * @fileoverview Signed-in avatar dropdown — configurable user menu links plus logout.
 *
 * @module src/components/ui/HeaderUserMenuDropdown
 */

import React from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { LogOut, User } from "lucide-react";
import { signOut } from "next-auth/react";
import { Link } from "@/i18n/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { resolveLucideIcon, siteChromeLucideProps } from "@/components/global-layout/resolveLucideIcon";
import { visibleNavItems } from "@/components/ui/siteHeaderNavCategories";
import { type HeaderNavItem } from "@shared/constants/globalLayout";

/** Props for {@link HeaderUserMenuDropdown}. */
export interface HeaderUserMenuDropdownProps {
  /** Configurable user menu links from global layout settings. */
  userMenuItems: HeaderNavItem[];
  /** Whether admin-only links are visible. */
  showAdminPanel?: boolean;
  /** Active path matcher. */
  isActive?: (href: string) => boolean;
  /** Optional avatar URL. */
  userAvatar?: string | null;
  /** User display name. */
  userName?: string | null;
  /** User email shown under the name in the dropdown header. */
  userEmail?: string | null;
  /** Live-preview chrome: links do not navigate; logout is disabled. */
  preview?: boolean;
}

/**
 * Desktop avatar trigger that opens a dropdown of user-specific pages and logout.
 *
 * @param props - See {@link HeaderUserMenuDropdownProps}.
 * @returns Avatar dropdown JSX.
 */
export function HeaderUserMenuDropdown({
  userMenuItems,
  showAdminPanel = false,
  isActive = () => false,
  userAvatar = null,
  userName = null,
  userEmail = null,
  preview = false,
}: HeaderUserMenuDropdownProps) {
  const t = useTranslations("header");
  const visibleItems = visibleNavItems(userMenuItems, showAdminPanel);
  const displayName = userName?.trim() || t("account");
  const displayEmail = userEmail?.trim() || null;

  const blockPreviewNavigation = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (preview) {
      event.preventDefault();
    }
  };

  const handleLogout = () => {
    if (preview) return;
    void signOut({ callbackUrl: "/" });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="site-header-bar__avatar site-header-bar__avatar-trigger"
        aria-label={userName ? t("accountMenuFor", { name: userName }) : t("accountMenu")}
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
          <span aria-hidden="true" className="site-header-bar__avatar-fallback">
            <User {...siteChromeLucideProps({ className: "site-header-bar__avatar-fallback-icon" })} />
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="site-header-bar__user-menu-dropdown site-header-bar__nav-dropdown p-1.5 ring-0 shadow-none"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="site-header-bar__user-menu-label">
            <span className="site-header-bar__user-menu-name">{displayName}</span>
            {displayEmail ? (
              <span className="site-header-bar__user-menu-email">{displayEmail}</span>
            ) : null}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        {visibleItems.length > 0 ? <DropdownMenuSeparator /> : null}
        {visibleItems.map((item) => {
          const active = isActive(item.href);
          const isBtn = item.variant === "button";
          return (
            <DropdownMenuItem
              key={item.id}
              render={
                <Link href={item.href} onClick={blockPreviewNavigation} />
              }
              className={
                isBtn
                  ? "site-header-bar__nav-dropdown-item site-header-bar__nav-dropdown-item--button"
                  : active
                    ? "site-header-bar__nav-dropdown-item site-header-bar__nav-dropdown-item--active"
                    : "site-header-bar__nav-dropdown-item"
              }
              aria-current={active ? "page" : undefined}
            >
              {item.icon ? (
                <span className="site-header-bar__nav-dropdown-icon-wrap" aria-hidden>
                  {resolveLucideIcon(
                    item.icon,
                    siteChromeLucideProps({ className: "site-header-bar__nav-dropdown-icon" }),
                  )}
                </span>
              ) : null}
              <span className="site-header-bar__nav-dropdown-label">{item.label}</span>
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          className="site-header-bar__user-menu-logout"
          onClick={handleLogout}
        >
          <LogOut {...siteChromeLucideProps({ className: "site-header-bar__nav-dropdown-icon" })} aria-hidden />
          <span className="site-header-bar__nav-dropdown-label">{t("logOut")}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default HeaderUserMenuDropdown;
