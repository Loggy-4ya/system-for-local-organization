# Page Categories Hub & News Catalog

**Status:** `[x] Completed` — Public catalog page, publisher curation editor, Figma-style layout, gallery images, numbered page variables.

**Related:** [page_categories.md](./page_categories.md), [page_access_and_paths.md](./page_access_and_paths.md), [page_metadata_and_engagement.md](./page_metadata_and_engagement.md), [nexus_page_variables.md](./nexus_page_variables.md)

---

## Overview

All visitors browse published Puck pages grouped by **path domain** at **`/pages/categories`** (News, Surveys, …).

Page publishers optionally curate which domains appear and which pages show (order + layout) at **`/pages/categories/edit`**. When a section has no hand-picked pages, the public catalog **auto-lists all published child pages** under that domain (newest first).

Obsidian-style **page category tags** (`Page.categories`) remain available in Page Settings for metadata — they do **not** drive catalog tabs.

The **News Catalog** Puck block (`NexusNewsCatalog`) reuses the same hub payload and layout on embedded pages (e.g. `/news`).

---

## Routes

| Route | Audience | Purpose |
|-------|----------|---------|
| `/` | **Public** | Redirects to `/pages/categories` |
| `/pages/categories` | **Public** (all users) | Browse published pages by path domain |
| `/pages/categories/edit` | Page publishers | Curate domains, page order, card layout |
| `/admin/page-categories` | Legacy redirect → `/pages/categories/edit` | |

Page Manager links: **View catalog** → `/pages/categories`, **Configure catalog** → `/pages/categories/edit`.

---

## Data model

| Layer | Storage | Notes |
|-------|---------|-------|
| Hub settings | `page_categories_settings` singleton (`_id: nexus-page-categories`) | `sections[]` keyed by path domain |
| Page gallery | `pages.galleryImages: string[]` | Up to 3 extra URLs beyond cover |
| Page cover | `pages.coverImage` | Primary image (`image1`) |

### Hub section shape

| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` | Stable row id |
| `domain` | `string` | Path domain segment (`news` → `/news/*`) |
| `pagePaths` | `string[]` | Curated child page paths (empty = auto-discover published pages) |
| `cardLayout` | `featured-grid` \| `uniform-grid` | Featured layout highlights first page |
| `imagesPerCard` | `1`–`4` | Publication images shown per preview card |

Domain: `PageCategoriesDomain`  
Logic: `shared/lib/pageCategoriesHubLogic.ts`

---

## API

| Route | Method | Auth | Response |
|-------|--------|------|----------|
| `/api/page-categories/settings` | GET | Page publisher | `{ config, availableDomains }` |
| `/api/page-categories/settings` | POST | Page publisher | `{ ok, config, availableDomains }` |
| `/api/page-categories/hub` | GET | Public | `{ sections: NewsCatalogHubSection[] }` with resolved page cards |

Only **publicly visible** pages (`published` + schedule) appear in the payload. Tab labels use the domain root page title (e.g. `/news` → “News”).

---

## Puck block

| Block | Category | File |
|-------|----------|------|
| `NexusNewsCatalog` | News & Cards | `src/components/puck/blocks/news/NexusNewsCatalog.tsx` |

Drop on a landing page (e.g. `/news`). Fetches `/api/page-categories/hub` client-side — same data as `/pages/categories`.

---

## Tests

| Script | Module |
|--------|--------|
| `npm run test:page-categories-hub-logic` | `pageCategoriesHubLogic.ts` |
| `npm run test:page-path-logic` | `pagePathLogic.ts` |
| `npm run test:nexus-page-variables` | `nexusPageVariables.ts` |
