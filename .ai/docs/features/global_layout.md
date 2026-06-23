# Global Layout — Configurable Header & Footer

**Status:** `[x] Completed`

---

## Overview

Global Layout refers to the global layout elements that frame every standard (non-Puck-editor) page in Project Nexus. This feature replaces hardcoded navigation with a MongoDB-backed, Admin-configurable header and footer.

---

## Data Model

The global layout configuration is stored as a singleton document in MongoDB (`_id: "nexus-site"`, collection `global_layout`). On first load after the rename, data is copied automatically from the legacy `site_chrome` collection when present.

### Schema Definitions

```typescript
type NavItemVariant = "link" | "button";

interface HeaderLayout {
  gap: "sm" | "md" | "lg" | "xl" | "2xl"; // Spacing between groups + nav band edge inset (8px–48px)
  align: "start" | "center" | "end"; // Default desktop nav zone (left / center / right)
}

interface HeaderNavItem {
  id: string;
  href: string;
  label: string;
  icon?: AllowedLucideIcon;     // Lucide icon name from whitelist
  variant?: NavItemVariant;     // "link" or "button" (accent pill)
  adminOnly?: boolean;          // Visible only to Admin/StudentCouncil
}

interface HeaderCategory {
  id: string;
  label?: string;               // Desktop: dropdown trigger label. Mobile: accordion heading. Omit to render items inline.
  icon?: AllowedLucideIcon;     // Shown before label on desktop/mobile category triggers
  align?: "start" | "center" | "end"; // Desktop nav zone override; inherits HeaderLayout.align when unset
  variant?: NavItemVariant;     // Pill-style category trigger (same flags as nav links)
  adminOnly?: boolean;          // Hide entire category unless viewer has admin panel access
  items: HeaderNavItem[];
}

interface HeaderConfig {
  layout: HeaderLayout;
  categories: HeaderCategory[];
  /** Signed-in avatar dropdown links (User Menu chapter in Global Layout editor). */
  userMenu: HeaderNavItem[];
}

interface FooterLink {
  id: string;
  href: string;
  label: string;
  external?: boolean;           // Opens in new tab with arrow indicator
}

interface FooterSocialLink {
  id: string;
  href: string;
  label: string;
  icon: AllowedLucideIcon;
}

interface FooterSection {
  id: string;
  title?: string;
  links: FooterLink[];
}

interface FooterConfig {
  layout?: FooterLayout;
  sections: FooterSection[];
  socialLinks: FooterSocialLink[];
  mention?: string;             // e.g. "Built by Your Company 2026"
  copyright?: string;
}

interface FooterLayout {
  columns: 2 | 3 | 4;           // Link columns on desktop footer (brand block is separate)
}
```

---

## Icon sizes

Whitelisted header/footer Lucide icons use a single **site chrome** tier: **18px** size, **2.25** stroke. Implementation details, Puck editor tiers, and agent rules are documented in [icon_sizes.md](../icon_sizes.md).

Summary:

| Token | Value | Usage |
|-------|-------|-------|
| `SITE_CHROME_ICON_SIZE` | `18` | TS constant in `shared/constants/globalLayout.ts` |
| `SITE_CHROME_ICON_STROKE` | `2.25` | Paired stroke weight |
| `--site-chrome-icon-size` | `18px` | CSS variable in `globals.css` |
| `siteChromeLucideProps()` | — | Helper in `resolveLucideIcon.tsx` |

Icons appear **before** link and category labels on desktop and mobile. Chevron disclosure icons (14px) are UI affordances, not content icons — see icon_sizes.md §4.

---

## Route Map

| Route | Type | Purpose |
|-------|------|---------|
| `/api/global-layout` | API | `GET` (public config), `POST` (Admin-only update) |
| `/admin/global-layout` | Page | Admin Global Layout Editor (Header & Footer tabs) |

---

## Authorization & Security

1. **API Protection:** `POST /api/global-layout` is guarded by `requireAdminRole()`, requiring a valid session where `user.role === "Admin"`.
2. **Route Protection:** `/admin/*` is protected by `src/middleware.ts`, redirecting non-admin users to `/profile`.

---

## Acceptance Criteria

- [x] Singleton global layout config stored in MongoDB (`_id: "nexus-site"`).
- [x] Default settings seeded on first access (header nav categories start empty; user menu defaults to Profile + Settings).
- [x] Legacy factory header presets (Explore/Manage dropdowns) are cleared automatically on load when the stored document still matches the old seed unchanged.
- [x] Header categories and items are fully configurable by Admins.
- [x] Header supports link and button variants, Lucide icons, and role-based visibility.
- [x] Site chrome Lucide glyphs use a single size token — see [icon_sizes.md](../icon_sizes.md) (`SITE_CHROME_ICON_SIZE` / `--site-chrome-icon-size`: **18px**, stroke **2.25**).
- [x] Header categories support optional section icons (desktop dropdown trigger + mobile accordion head) via `HeaderCategory.icon`.
- [x] Footer supports multiple link columns, social media icons, company mention, and copyright.
- [x] Footer `layout.columns` (2 / 3 / 4) controls published footer link grid; editor columns stack full-width in a single column.
- [x] Social handle rows use the same stretched icon-first grid as header nav items (responsive on phone).
- [x] Admin Global Layout Editor at `/admin/global-layout` with live preview below settings and tabbed configuration.
- [x] Header/Footer tab bar uses a sliding pill indicator plus panel fade/slide transition (`global-layout-editor.css` tokens).
- [x] Live preview header nav is interactive: desktop category dropdowns, signed-in avatar user-menu dropdown, and mobile burger/accordion sections open inside the preview frame; nav links do not navigate away from the editor. Preview canvas stays scrollable while menus are open.
- [x] Live preview mock page content uses the global layout band (`GLOBAL_LAYOUT_CONTENT_WIDTH` → 1400px), same as header/footer; viewport device toggles (phone / tablet / desktop) remain in the toolbar.
- [x] Published Puck pages use `.global-layout-page-content-slot` (gutter outside) + per-page inner `pageLayout.contentWidth` (default 1400px `xl`; optional `full` or narrower presets). Header/footer chrome **do not** read page layout — they use `GLOBAL_LAYOUT_CONTENT_WIDTH`.
- [x] Static routes (`/`, `/pages`, `/admin`, `/profile`, auth) use `StaticPageShell` at **1400px** (`STATIC_DEFAULT_CONTENT_WIDTH` / `GLOBAL_LAYOUT_CONTENT_WIDTH` / `xl`) — same band as header/footer chrome.
- [x] Published Puck pages drop `min-height: 100vh` so global footer follows content; `.global-layout-footer-slot` adds `--spacing-sm` (8px) above footer chrome (matches root block margin token).
- [x] Header collapses to burger + sidebar below `1024px` (`lg`); phone and tablet preview frames both use the mobile header; desktop preview uses horizontal nav.
- [x] Desktop header categories with a label render as shadcn `DropdownMenu` triggers; items without a category label stay as inline top-level links.
- [x] Mobile sidebar categories with a label are collapsible accordions (closed by default) with grid-height animation (`--site-nav-accordion-*` tokens in `globals.css`).
- [x] Global header and footer automatically hide on Puck editor routes (`/*/edit`).
- [x] Site-wide `glass-panel` surfaces use solid opaque `--color-bg-panel` (no grid bleed-through on static/admin pages).
- [x] Short editor flags (Pill Button, Admin Only, External) use Shadcn `Badge` tags for compact, colored status.
- [x] Layout pickers (spacing gap, default alignment) use `EditorOptionBadgeGroup` — Shadcn badge single-select (not Puck `SegmentedControl`, which requires `puck-editor.css`). Default alignment supports left, center, and right desktop nav zones.
- [x] Each header category can override desktop alignment (Default / Left / Center / Right) via `HeaderCategory.align`; `DesktopHeaderNavZones` renders three flex zones in `SiteHeaderBar`.
- [x] When five or more desktop categories are visible, nav zones use compact horizontal grid cells (`site-header-bar__nav-zone-grid--dense`) while the header stays a single row (logo + nav + actions).
- [x] Dedicated `global-layout-editor.css` + `EditorField` / `EditorSectionHeader` provide aligned typography and spacing on `/admin/global-layout` without importing Puck editor styles.
- [x] Editor island rhythm uses `--global-layout-island-gap` (`--spacing-sm` / 8px) for page panels, chapters, category cards, item rows, and preview sections via `global-layout-editor__stack` / `__island-grid`.
- [x] Header categories and footer columns use `EditorCollapsibleIsland` (closed by default, chevron toggle) to fit more settings on screen.
- [x] Nav link rows show pill/admin state inline on the label input (accent fill / admin border) — no summary badges under the label; flag toggles are icon-only (`EditorFlagBadge` + Lucide glyphs).
- [x] `LucideIconPicker` is icon-only (compact trigger + icon grid menu). Phone breakpoint compacts inputs, cards, and action labels in `global-layout-editor.css`.
- [x] Categories, nav links, footer columns, social links, and footer links reorder via pointer drag (`EditorDragHandle` + `useEditorSortableList`).
- [x] Header nav links support cross-category drag moves (`HeaderNavItemSortableProvider`) with animated drop slots (`EditorDropSlot`).
- [x] All Global Layout Editor pointer drags auto-scroll the viewport and nested overflow containers when the pointer rests near an edge (`useDragAutoScroll` in `src/lib/`).
- [x] Editor inputs and selects use unified `--color-bg-elevated` / `--color-border-default` tokens (no one-off dark zinc fills).
- [x] Save success and error alerts animate in/out smoothly (`GlobalLayoutEditorStatusBanner`); success auto-dismisses after ~4.5s.
- [x] Mobile nav opens as a full-viewport-height right sidebar (`100dvh`/`100svh`); burger menu is hidden at `≥768px` via CSS (overrides `.site-header-mobile-details { display: inline-flex }`).
- [x] Mobile sidebar nav starts flush under the safe-area inset (no header-offset gap); section accordions support optional category icons.
- [x] Signed-in profile avatar in the header uses square-rounded corners (`--radius-md`), matching the logo mark style.
- [x] On mobile (`<768px`), theme toggle lives in the sidebar footer; header shows profile (or sign-in icon) directly before the burger menu.
- [x] On mobile, header is logo + burger only; **Theme** toggle (no label) and **Account** rows live in the sidebar footer.
- [x] Mobile sidebar **Account** row matches Shadcn sidebar user pattern: circular avatar, name + email stack, chevron on the right (full-width link).
- [x] Mobile sidebar theme toggle uses `variant="sidebar"` (36×68px, 14px icons) for proportional scale next to the Theme label.
- [x] Mobile sidebar nav links use horizontal icon + label layout (`display: flex` on `.site-header-mobile-menu__link`).
- [x] Desktop header vertical rhythm: wordmark `line-height: 1`, avatar `inline-flex` + `box-sizing: border-box` aligned with CTA and theme toggle.
- [x] Signed-in desktop avatar opens a dropdown (`HeaderUserMenuDropdown`) with the user's name/email, configurable **User Menu** links (`HeaderConfig.userMenu`), and a fixed **Log out** action (`signOut` via Auth.js).
- [x] **User Menu** is edited in `/admin/global-layout` → Header tab → **User Menu** chapter (`HeaderUserMenuEditor`); defaults to Profile + Settings. Log out is not configurable and is always appended in the UI. User menu rows support pointer drag reorder.
- [x] `HeaderLayout.gap` applies between nav groups and as horizontal inset from the nav band edges (`padding-inline` + `gap` on `.site-header-bar__nav-zones`).
- [x] Mobile sidebar account footer shows name/email and a single **Log out** button; configurable user menu links open in a fixed-height panel above the user badge when the chevron on the badge is pressed (not duplicated in nav accordions).
