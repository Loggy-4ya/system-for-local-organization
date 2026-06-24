# Page Access Grants & Path Link Helpers

**Status:** `[x] Completed` — delegated editor picker in Page Settings, path domain helpers, slug badge preview.

**Related:** [page_metadata_and_engagement.md](./page_metadata_and_engagement.md), [page_categories.md](./page_categories.md), [access_control_and_hierarchy.md](./access_control_and_hierarchy.md)

---

## Overview

Puck page settings support:

1. **Publisher roster (optional)** — primary author badge plus **+** control to search and add extra publishers (`delegatedEditorUserIds`).
2. **Page link helpers** — shared path normalisation, badge labels (`/news`), and catalog APIs.

---

## Default edit access (no per-page roster)

Pages do **not** default to whitelist-only editing. When `delegatedEditorUserIds` is **empty**, normal institution RBAC applies:

| Actor | May edit |
|-------|----------|
| System admin (index 0 / legacy `Admin`) | Any page |
| Self-government admin (index 1) | Any page |
| Page author + `pages.edit_own` | Own pages |
| Everyone else | No (unless listed below) |

Pure rules: `shared/lib/pageEditAccessLogic.ts`.

---

## Optional additive grants

`delegatedEditorUserIds` **adds** collaborators — it does **not** replace or restrict default admin/author access.

| Layer | Field | Notes |
|-------|-------|-------|
| Puck `pagePublication` | `delegatedEditors: { userId, displayName }[]` | Edited in Publication → Publisher; synced on publish |
| MongoDB `pages` | `delegatedEditorUserIds: ObjectId[]` | Author excluded automatically on save |

When the roster is empty, the page behaves exactly like a page with no access list configured.

---

## Who may manage the roster

Pure rules: `shared/lib/pageAccessLogic.ts` — `canManagePageAccess()`

| Actor | May assign extra editors |
|-------|--------------------------|
| Anyone who can edit the page **except** delegate-only editors | Yes |
| Delegate-only editors (not author / not global admin) | No |

---

## Path domain

| Module | Role |
|--------|------|
| `shared/lib/pagePathLogic.ts` | `normalizePagePath`, `formatPagePathLabel`, `splitPageAddress`, `composePageAddress`, `formatPageDomainLabel`, `buildPagePublicHref`, `filterPagePathCatalog` |
| `shared/lib/pagePathDomainListLogic.ts` | Hidden domain filtering for the page editor picker |
| `shared/constants/pagePathDomains.ts` | Default domain segments (`news`, `surveys`); reserved segments include `users` (member profiles only) |
| `shared/models/PagePathSettings.ts` | Singleton `hiddenDomains` + `customDomains` for the editor picker |
| `discoverPagePathDomainsFromPaths()` | Derive domain segments from multi-segment paths only (flat `/slug` pages excluded) |
| `PageDomain.listReservedPagePaths()` | Slug collision list |
| `PageDomain.hidePagePathDomain()` | Persist hidden domain labels |
| `PageDomain.addPagePathDomain()` | Persist custom domain labels |

---

## API

| Route | Method | Auth | Response |
|-------|--------|------|----------|
| `/api/mentions/search` | GET | Session | User search when adding publishers via **+** |
| `/api/pages/editor-candidates?q=&pagePath=` | GET | Session + manage access | `{ users: PageAccessEditorCandidate[] }` — server-gated alternative |
| `/api/pages/paths?catalog=1&q=` | GET | Open | `{ catalog: PagePathCatalogEntry[] }` |
| `/api/pages/paths?domains=1` | GET | Open | `{ domains: string[] }` — domain badge options (respects hidden list) |
| `/api/pages/paths?domains=1&include=news` | GET | Open | Same, but keeps listed domains visible for the active page |
| `/api/pages/path-domains?domain=news` | DELETE | Session + page-create permission | `{ domains, pageCount }` — hide domain from picker |
| `/api/pages/path-domains` | POST | Session + page-create permission | `{ domains }` — add custom domain (`{ domain }` body) |
| `/api/pages/paths` | GET | Open | `{ paths: string[] }` (legacy slug validation) |
| `/api/puck` | POST | Session | Accepts `delegatedEditors` |

---

## Editor UI

| Piece | File |
|-------|------|
| Publisher roster (+ reveals search) | `PageAccessEditorsField.tsx` (Publication → Publisher) |
| Category tags | `PageCategoryTagsField.tsx` (Page Details chapter) |
| Slug domain + page slug | `PagePathDomainSlugField.tsx` — collapsible domain list + `/domain/page_slug` row; add/remove domains when the editor has `pages.create` |
| Slug link preview | `PagePathDomainSlugField.tsx` (`PageMetaBadge` + `formatPagePathLabel`) |
| Search client | `pageAccessClient.ts` → `/api/mentions/search` |

Publisher UX: author badge always visible; **+** opens the same `nexus-puck-input` combobox used for categories. Category tags stay in **Page Details** with the always-visible search field.

**Auto slug:** Page Details includes an **Auto slug from title** switch (default on, persisted in `localStorage`). When enabled, title edits slugify into the page slug segment while preserving the selected domain (`derivePageSlugFromTitle` in `pagePathLogic.ts`).

**Invite links:** see [page_publisher_invite_links.md](./page_publisher_invite_links.md) — shareable `/pages/join/[token]` URLs that add collaborators on open.

---

## Tests

| Script | Module |
|--------|--------|
| `npm run test:page-access-logic` | `pageAccessLogic.ts` |
| `npm run test:page-path-logic` | `pagePathLogic.ts` |
