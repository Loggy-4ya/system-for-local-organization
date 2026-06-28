# Page Categories (Obsidian-style tags)

**Status:** `[x] Completed` — editor assignment and MongoDB persistence. Page Manager badge UI is **deferred** (see §4).

---

## 1. Overview

Puck-managed pages support free-form **category tags** (multi-select, creatable). Labels behave like Obsidian tags: the autocomplete catalog is built from distinct values already stored on Page documents — no separate admin taxonomy collection.

Editors assign categories in the **Page Details** sidebar chapter (below URL slug).

---

## 2. Data model

| Layer | Field | Notes |
|-------|-------|-------|
| Puck root props | `pageSettings.categories: string[]` | Source of truth while editing (legacy: `pagePublication.categories`) |
| MongoDB `pages` | `categories: string[]` | Top-level indexed array; synced on publish |

Normalization: `shared/lib/pageCategoryLogic.ts`

- Trim, collapse whitespace, max 48 chars per label
- Case-insensitive dedupe (preserve first-seen casing)
- Max 12 categories per page
- Reject `<>{}\\/|` characters

Domain: `PageDomain.listDistinctCategories()`, `PageDomain.normalizeCategoriesForStorage()`

---

## 3. API

| Route | Method | Auth | Response |
|-------|--------|------|----------|
| `/api/pages/categories` | GET | Session or bearer (same as `/api/puck` POST) | `{ categories: string[] }` — full distinct list |
| `/api/puck` | GET | Open | Includes `categories` on page payload |
| `/api/puck` | POST | Session or bearer | Accepts `categories`; normalizes before `$set` |

---

## 4. Editor UI

| Piece | File |
|-------|------|
| Tag field (search + create) | `src/components/puck/fields/PageCategoryTagsField.tsx` |
| Catalog badge chip | `src/components/pages/PageCategoryBadge.tsx` |
| Page Settings chapter | `src/components/puck/fields/PageSettingsFieldGroup.tsx` |
| Autocomplete client | `src/components/puck/lib/pageCategoryClient.ts` |

**UX:**

- Selected tags render as accent badge chips (`nexus-page-category-badge`) with **deterministic hue** per label — same category string always maps to the same slot in the 10-color Nexus accent palette (`shared/constants/pageCategoryAccent.ts`, `pageCategoryBadgeClassName()` in `pageCategoryLogic.ts`). Many categories may share a hue; colors stay at medium/soft accent tiers for visual cohesion.
- Inline `nexus-puck-input` — type to filter; **one** catalog fetch per editor session (`getPageCategoryCatalog`), no repeat requests on focus or keystroke
- “Add «label»” row when the query is a valid new tag; new tags append to session cache locally
- Publish syncs normalized list to MongoDB top-level `categories`

---

## 5. Deferred — Page Manager category badges

**Status:** `[~] In Progress` — catalog cards on `/pages` render colored category chips via `PageCategoryBadge`; optional manager list filter/grouping remains planned.

When implementing remaining Page Manager visual polish:

1. Extend `PageManagerRow` with `categories: string[]` (server query already returns the field when wired).
2. In `PageManagerShell.tsx`, render outline `Badge` chips under each page title (Obsidian-style or compact card footer).
3. Optional: category filter dropdown on the Pages tab (filter client-side or add `?category=` server query).
4. Optional: sort/group pages by primary category.

**Reminder for agents:** When the user asks about Page Manager UX or page list cards, propose completing this deferred section first — categories data is persisted and available on each `Page` document after publish.

---

## 6. Tests

| Script | File |
|--------|------|
| `npm run test:run -- page-category` | `tests/shared/lib/pageCategoryLogic.test.ts` |

---

## 7. Acceptance criteria (completed)

- [x] Multi-select categories in Page Settings with search/find
- [x] Autocomplete from distinct MongoDB category values
- [x] Creatable new tags (Obsidian model)
- [x] Persist on publish to `Page.categories` and `pageSettings.categories`
- [ ] Page Manager badge display (deferred — §5 filter/group)
- [x] Catalog card category badges with deterministic accent colors
