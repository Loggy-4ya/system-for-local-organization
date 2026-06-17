"use client";

/**
 * @fileoverview Desktop dropdown and mobile accordion renderers for header nav categories.
 *
 * Labeled categories use shadcn {@link DropdownMenu} on desktop and a grid-accordion
 * collapse (closed by default) in the mobile sidebar.
 *
 * @module src/components/ui/siteHeaderNavCategories
 */

import React, { useEffect, useId, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  groupHeaderCategoriesByAlign,
  headerNavGapCssValue,
  shouldUseDenseHeaderNav,
} from "@/components/global-layout/lib/headerNavAlignLogic";
import { resolveLucideIcon, siteChromeLucideProps } from "@/components/global-layout/resolveLucideIcon";
import { cn } from "@/lib/utils";
import {
  type HeaderCategory,
  type HeaderLayout,
  type HeaderNavItem,
} from "@shared/constants/globalLayout";

/** Returns visible nav items, respecting admin-only flags. */
export function visibleNavItems(
  items: HeaderNavItem[],
  showAdminPanel: boolean,
): HeaderNavItem[] {
  return items.filter((item) => !item.adminOnly || showAdminPanel);
}

/** Returns visible nav items for a category, respecting admin-only flags. */
export function visibleCategoryItems(
  category: HeaderCategory,
  showAdminPanel: boolean,
): HeaderNavItem[] {
  return visibleNavItems(category.items, showAdminPanel);
}

/** Whether a labeled category should render at all for the current viewer. */
export function isCategoryVisible(category: HeaderCategory, showAdminPanel: boolean): boolean {
  if (category.adminOnly && !showAdminPanel) {
    return false;
  }
  return visibleCategoryItems(category, showAdminPanel).length > 0;
}

/** Whether a category should render as a labeled group (dropdown / accordion). */
export function hasCategoryLabel(category: HeaderCategory): boolean {
  return Boolean(category.label?.trim());
}

/** Desktop category trigger classes reflecting active, pill, and admin flags. */
function categoryTriggerClass(category: HeaderCategory, categoryActive: boolean): string {
  return cn(
    "site-header-bar__nav-trigger",
    categoryActive && "site-header-bar__nav-trigger--active",
    category.variant === "button" && "site-header-bar__nav-trigger--button",
  );
}

/** Mobile category accordion head classes. */
function mobileCategoryHeadClass(category: HeaderCategory, categoryActive: boolean): string {
  return cn(
    "site-header-mobile-menu__category-head",
    categoryActive && "site-header-mobile-menu__category-head--active",
    category.variant === "button" && "site-header-mobile-menu__category-head--button",
  );
}

/** Shared desktop nav link class names for a header item. */
function desktopNavLinkClass(active: boolean, isBtn: boolean): string {
  if (isBtn) {
    return "inline-flex items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--color-accent-user)] px-2.5 py-1 text-xs font-medium text-white no-underline hover:opacity-90 transition-opacity";
  }
  if (active) {
    return "site-header-bar__nav-link site-header-bar__nav-link--active text-[13px] font-medium text-[var(--color-text-primary)] no-underline flex items-center gap-1.5";
  }
  return "site-header-bar__nav-link text-[13px] text-[var(--color-text-secondary)] no-underline transition-colors duration-150 hover:text-[var(--color-text-primary)] flex items-center gap-1.5";
}

/** Shared mobile nav link class names for a header item. */
function mobileNavLinkClass(active: boolean): string {
  return active
    ? "site-header-mobile-menu__link site-header-mobile-menu__link--active"
    : "site-header-mobile-menu__link";
}

/** Prevents route changes when the header is rendered inside the layout editor preview. */
function previewNavClick(
  preview: boolean,
  onAfterClick?: () => void,
): React.MouseEventHandler<HTMLAnchorElement> | undefined {
  if (!preview && !onAfterClick) {
    return onAfterClick;
  }

  return (event) => {
    if (preview) {
      event.preventDefault();
    }
    onAfterClick?.();
  };
}

/** Desktop inline nav link row. */
function DesktopNavItem({
  item,
  isActive,
  preview = false,
}: {
  item: HeaderNavItem;
  isActive: (href: string) => boolean;
  preview?: boolean;
}) {
  const active = isActive(item.href);
  const isBtn = item.variant === "button";

  return (
    <li key={item.id}>
      <Link
        href={item.href}
        className={desktopNavLinkClass(active, isBtn)}
        aria-current={active ? "page" : undefined}
        onClick={previewNavClick(preview)}
      >
        {item.icon ? (
          <span className="site-header-bar__nav-link-icon" aria-hidden>
            {resolveLucideIcon(item.icon, siteChromeLucideProps())}
          </span>
        ) : null}
        <span className="site-header-bar__nav-link-label">{item.label}</span>
      </Link>
    </li>
  );
}

/** Desktop dropdown menu for a labeled category. */
export function DesktopHeaderNavCategory({
  category,
  isActive,
  showAdminPanel,
  preview = false,
}: {
  category: HeaderCategory;
  isActive: (href: string) => boolean;
  showAdminPanel: boolean;
  preview?: boolean;
}) {
  const visibleItems = visibleCategoryItems(category, showAdminPanel);
  if (visibleItems.length === 0) return null;

  if (!hasCategoryLabel(category)) {
    return (
      <>
        {visibleItems.map((item) => (
          <DesktopNavItem key={item.id} item={item} isActive={isActive} preview={preview} />
        ))}
      </>
    );
  }

  const categoryActive = visibleItems.some((item) => isActive(item.href));

  return (
    <li className="site-header-bar__nav-category">
      <DropdownMenu>
        <DropdownMenuTrigger className={categoryTriggerClass(category, categoryActive)}>
          {category.icon ? (
            <span className="site-header-bar__nav-category-icon" aria-hidden>
              {resolveLucideIcon(category.icon, siteChromeLucideProps())}
            </span>
          ) : null}
          <span className="site-header-bar__nav-trigger-label">{category.label}</span>
          <ChevronDown className="site-header-bar__nav-trigger-chevron" aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          sideOffset={6}
          className="site-header-bar__nav-dropdown p-1.5 ring-0 shadow-none"
        >
          {visibleItems.map((item) => {
            const active = isActive(item.href);
            const isBtn = item.variant === "button";
            return (
              <DropdownMenuItem
                key={item.id}
                render={
                  <Link href={item.href} onClick={previewNavClick(preview)} />
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
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}

/** Mobile sidebar link row. */
function MobileNavItem({
  item,
  isActive,
  onClose,
  preview = false,
}: {
  item: HeaderNavItem;
  isActive: (href: string) => boolean;
  onClose: () => void;
  preview?: boolean;
}) {
  const active = isActive(item.href);
  const isBtn = item.variant === "button";

  return (
    <li key={item.id}>
      <Link
        href={item.href}
        onClick={previewNavClick(preview, onClose)}
        className={mobileNavLinkClass(active)}
        aria-current={active ? "page" : undefined}
      >
        {item.icon ? (
          <span className="site-header-mobile-menu__link-icon" aria-hidden>
            {resolveLucideIcon(item.icon, siteChromeLucideProps())}
          </span>
        ) : null}
        <span className="site-header-mobile-menu__link-label">{item.label}</span>
        {isBtn ? (
          <span className="site-header-mobile-menu__link-badge" aria-hidden="true" />
        ) : null}
      </Link>
    </li>
  );
}

/** Mobile accordion section for a labeled category (closed by default). */
export function MobileHeaderNavCategory({
  category,
  isActive,
  showAdminPanel,
  onClose,
  preview = false,
}: {
  category: HeaderCategory;
  isActive: (href: string) => boolean;
  showAdminPanel: boolean;
  onClose: () => void;
  preview?: boolean;
}) {
  const visibleItems = visibleCategoryItems(category, showAdminPanel);
  const labeled = hasCategoryLabel(category);
  const [open, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const panelId = useId();

  useEffect(() => {
    setHydrated(true);
  }, []);

  if (visibleItems.length === 0) return null;

  if (!labeled) {
    return (
      <ul className="site-header-mobile-menu__list">
        {visibleItems.map((item) => (
          <MobileNavItem
            key={item.id}
            item={item}
            isActive={isActive}
            onClose={onClose}
            preview={preview}
          />
        ))}
      </ul>
    );
  }

  const categoryActive = visibleItems.some((item) => isActive(item.href));

  return (
    <div
      className="site-header-mobile-menu__category"
      data-open={open ? "true" : "false"}
      {...(hydrated ? { "data-site-nav-hydrated": true } : {})}
    >
      <button
        type="button"
        className={mobileCategoryHeadClass(category, categoryActive)}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((prev) => !prev)}
      >
        {category.icon ? (
          <span className="site-header-mobile-menu__category-icon" aria-hidden>
            {resolveLucideIcon(category.icon, siteChromeLucideProps())}
          </span>
        ) : null}
        <span className="site-header-mobile-menu__category-label">{category.label}</span>
        <ChevronDown className="site-header-mobile-menu__category-chevron" aria-hidden />
      </button>
      <div
        id={panelId}
        className="site-header-mobile-menu__category-collapse"
        aria-hidden={!open}
      >
        <div className="site-header-mobile-menu__category-body">
          <ul className="site-header-mobile-menu__list">
            {visibleItems.map((item) => (
              <MobileNavItem
                key={item.id}
                item={item}
                isActive={isActive}
                onClose={onClose}
                preview={preview}
              />
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/** Resolve Tailwind gap class for header nav clusters. */
export function headerNavGapClass(layout?: HeaderLayout): string {
  if (layout?.gap === "sm") {
    return "gap-2";
  }

  if (layout?.gap === "lg") {
    return "gap-6";
  }

  if (layout?.gap === "xl") {
    return "gap-9";
  }

  if (layout?.gap === "2xl") {
    return "gap-12";
  }

  return "gap-4";
}

/**
 * Desktop primary navigation with left, center, and right alignment zones.
 *
 * @param props - Zone render props.
 * @returns Desktop nav zones markup.
 */
export function DesktopHeaderNavZones({
  categories,
  layout,
  isActive,
  showAdminPanel,
  preview = false,
}: {
  categories: HeaderCategory[];
  layout?: HeaderLayout;
  isActive: (href: string) => boolean;
  showAdminPanel: boolean;
  preview?: boolean;
}) {
  const gapStyle = {
    "--site-header-nav-gap": headerNavGapCssValue(layout?.gap),
  } as React.CSSProperties;
  const grouped = groupHeaderCategoriesByAlign(categories, layout?.align ?? "start");
  const denseNav = shouldUseDenseHeaderNav(categories);

  const renderZone = (zoneCategories: HeaderCategory[]) =>
    zoneCategories.map((category) => (
      <DesktopHeaderNavCategory
        key={category.id}
        category={category}
        isActive={isActive}
        showAdminPanel={showAdminPanel}
        preview={preview}
      />
    ));

  return (
    <nav
      className={cn(
        "site-header-bar__nav-zones hidden min-w-0 flex-1 lg:flex",
        denseNav && "site-header-bar__nav-zones--compact",
      )}
      aria-label="Primary navigation"
      style={gapStyle}
    >
      <ul
        className={cn(
          "site-header-bar__nav-zone site-header-bar__nav-zone--start site-header-bar__nav-zone-grid m-0 list-none p-0",
          denseNav && "site-header-bar__nav-zone-grid--dense",
        )}
      >
        {renderZone(grouped.start)}
      </ul>
      <ul
        className={cn(
          "site-header-bar__nav-zone site-header-bar__nav-zone--center site-header-bar__nav-zone-grid m-0 min-w-0 flex-1 list-none p-0",
          denseNav && "site-header-bar__nav-zone-grid--dense",
        )}
      >
        {renderZone(grouped.center)}
      </ul>
      <ul
        className={cn(
          "site-header-bar__nav-zone site-header-bar__nav-zone--end site-header-bar__nav-zone-grid m-0 list-none p-0",
          denseNav && "site-header-bar__nav-zone-grid--dense",
        )}
      >
        {renderZone(grouped.end)}
      </ul>
    </nav>
  );
}
