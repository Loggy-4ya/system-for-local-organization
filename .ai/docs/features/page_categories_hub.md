# Page Categories Hub & News Catalog

**Status:** `[x] Completed` — Unified `/pages` catalog, drag reorder, cross-domain move confirmation, gallery images, numbered page variables.

**Related:** [page_categories.md](./page_categories.md), [page_access_and_paths.md](./page_access_and_paths.md), [page_metadata_and_engagement.md](./page_metadata_and_engagement.md), [nexus_page_variables.md](./nexus_page_variables.md)

---

## Overview

All visitors browse published Puck pages grouped by **path domain** at **`/pages`** (read-only). Publishers curate layout at **`/pages/edit`** (drag reorder, new-page FAB, save toolbar). A **Manage catalog** button on `/pages` links to the editor for authorized users.

Page publishers curate which domains appear and page display order on **`/pages/edit`** via drag-and-drop. **Add domain section** / **Remove domain** controls manage hub sections; **Admins** deleting a real path domain persist to MongoDB via `DELETE /api/pages/path-domains?scope=catalog` — the domain is hidden in `page_path_settings`, every page under it is renamed to an uncategorized flat path (e.g. `/news/article` → `/article`), and the hub section row is removed. **Catalog visibility** per section (`catalogVisibility`: `public` | `hidden` | `level` + `catalogVisibleThroughLevel`) filters what signed-in visitors see on `/pages`; anonymous users only see `public` sections. Visibility select uses `PageCatalogSelect` / `PageCatalogDomainVisibilityField`. The editor auto-inserts hub rows for domains that already have pages (empty domains stay manual via **Add domain section**). Public `/pages` auto-covers every known path domain via `ensureHubSectionsCoverDomains`. **Cross-domain** card drops that would change a page URL (e.g. `/news/foo` → `/surveys/foo`) open a **confirmation dialog** before `POST /api/pages/move-domain` runs. Flat pages outside `/domain/*` paths appear under **Other pages** — that section cannot be removed.

**New page FAB** (`NewPagePopover`) on **`/pages/edit`** is visible only to Admins, Student Council, and users with `pages.create`. The popover collects **domain** (select existing or **Add domain** inline), **title**, and **URL slug** (slug auto-fills from the title), then opens `/<domain>/<slug>/edit?title=…` in Puck with the title pre-filled.

**Catalog preview settings** — images per card, featured vs standard size — live in each page's **Publication** chapter. When a section has no hand-picked pages, the catalog **auto-lists all matching pages** under that domain (newest first), merged with any curated order. Publishers also see **draft** pages in the manager grid (green/gray status dot). **Section titles** on `/pages/edit` are editable per domain (`sectionLabel` in hub settings); the public `/pages` catalog uses that override instead of the domain root page title when set.

**Island rhythm** — stacked `glass-panel` blocks on `/pages` and `/pages/edit` use `page-catalog-island-stack` with CSS token `--page-catalog-island-gap` (`var(--spacing-lg)` / 24px). Do not collapse header and section islands into one panel.

**Carousel + pagination** — public sections with **≥ 4 pages** use an auto-advancing horizontal carousel (1/2/3 visible cards by breakpoint, pauses on hover/focus). Smaller sections use a larger static grid (`minmax(280px, 1fr)`). Static grids paginate at **6 cards per page** when needed. Constants: `shared/constants/pageCatalogDisplay.ts`; logic: `shared/lib/pageCatalogDisplayLogic.ts`; UI: `PageCatalogSectionView`.

Obsidian-style **page category tags** (`Page.categories`) appear as badges on cards — they do **not** drive catalog tabs.

The **News Catalog** Puck block (`NexusNewsCatalog`) reuses the same hub payload and stacked layout on embedded pages (e.g. `/news`).

---

## Routes

| Route | Audience | Purpose |
|-------|----------|---------|
| `/` | **Public** | Redirects to `/pages` |
| `/pages` | **Public** | Read-only catalog browse |
| `/pages/edit` | Page publishers | Drag-reorder, domain curation, new-page FAB |
| `/pages/categories` | Legacy | Redirect → `/pages` |
| `/pages/categories/edit` | Legacy | Redirect → `/pages/edit` |
| `/admin/page-categories` | Legacy | Redirect → `/pages/edit` |

---

| Component | Path | Role |
|-----------|------|------|
| `PagesBrowseShell` | `src/app/pages/PagesBrowseShell.tsx` | Read-only `/pages` catalog + Manage catalog link |
| `PageManagerShell` | `src/app/pages/PageManagerShell.tsx` | Publisher editor shell at `/pages/edit` |
| `PageManagerCatalogView` | `src/components/pages/PageManagerCatalogView.tsx` | Stacked sections, save toolbar, drag |
| `PageCatalogCard` | `src/components/pages/PageCatalogCard.tsx` | Flush-top image, title, categories, animated description |
| `PageCatalogSectionView` | `src/components/pages/PageCatalogSectionView.tsx` | Grid, pagination, or auto-carousel per section |
| `NewPagePopover` | `src/components/pages/NewPagePopover.tsx` | Bottom-right create-page popover |
| `CrossDomainMoveDialog` | `src/components/pages/CrossDomainMoveDialog.tsx` | Confirm URL domain change |
| `PageManagerPageSortableProvider` | `src/components/pages/PageManagerPageSortableProvider.tsx` | Cross-section page drag |
| `NexusNewsCatalogRender` | `src/components/puck/blocks/news/NexusNewsCatalogRender.tsx` | Shared stacked catalog renderer |

---

## Data model

| Layer | Storage | Notes |
|-------|---------|-------|
| Hub settings | `page_categories_settings` singleton (`_id: nexus-page-categories`) | `sections[]` keyed by path domain |
| Page gallery | `pages.galleryImages: string[]` | Up to 3 extra URLs beyond cover |
| Page cover | `pages.coverImage` | Primary image (`image1`) |
| Catalog preview | `pages.catalogImagesPerCard`, `pages.catalogCardVariant` | Synced from Puck `pagePublication` on publish |

Domain: `PageCategoriesDomain` (`resolveHubPayload`, `resolveManagerPayload`)  
Logic: `shared/lib/pageCategoriesHubLogic.ts`, `shared/lib/pageManagerCatalogLogic.ts`

---

## API

| Route | Method | Auth | Response |
|-------|--------|------|----------|
| `/api/page-categories/settings` | GET | Page publisher | `{ config, availableDomains }` |
| `/api/page-categories/settings` | POST | Page publisher | `{ ok, config, availableDomains }` |
| `/api/page-categories/hub` | GET | Public | `{ sections: NewsCatalogHubSection[] }` |
| `/api/pages/move-domain` | POST | Page publisher | `{ ok, path, config }` — renames page path after cross-domain drag confirm |

---

## Puck block

| Block | Category | File |
|-------|----------|------|
| `NexusNewsCatalog` | News & Cards | `src/components/puck/blocks/news/NexusNewsCatalog.tsx` |

Drop on a landing page (e.g. `/news`). Fetches `/api/page-categories/hub` client-side — same data as `/pages`.

---

## Tests

| Script | Module |
|--------|--------|
| `npm run test:page-categories-hub-logic` | `pageCategoriesHubLogic.ts` |
| `npm run test:page-manager-catalog-logic` | `pageManagerCatalogLogic.ts` |
| `npm run test:page-catalog-display-logic` | `pageCatalogDisplayLogic.ts` |
| `npm run test:page-path-logic` | `pagePathLogic.ts` |
