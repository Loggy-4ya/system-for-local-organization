# Page Metadata, Publication & Engagement

**Status:** `[~] In Progress` — core schema, Puck publication chapter, scheduled publish handler, views/likes APIs, ownership ACL, and delegated-editor picker implemented; Page Manager badge UI deferred.

**Related:** [scheduled_events.md](./scheduled_events.md), [page_categories.md](./page_categories.md), [page_access_and_paths.md](./page_access_and_paths.md), [access_control_and_hierarchy.md](./access_control_and_hierarchy.md), [media_storage.md](./media_storage.md)

---

## Overview

Puck-managed pages (`pages` collection) carry news-ready metadata beyond layout JSON: description, cover image, author, scheduled publish time, comments flag, view/like counters, and per-page delegated editors.

Publication fields surface in a dedicated Puck root chapter **`pagePublication`** (parity with `pageSettings`, `pageLayout`, `pageBackground`).

---

## Data model (`Page`)

| Field | Type | Notes |
|-------|------|-------|
| `description` | `string` | Short summary (max 2000) |
| `coverImage` | `string` | `/uploads/page-covers/…` — hero tile image |
| `authorUserId` | `ObjectId` | Set on first save |
| `publishAt` | `Date \| null` | Future → hidden until scheduler fires |
| `commentsEnabled` | `boolean` | Gates comment UI (rows in `user_comments`) |
| `viewCount` | `number` | Monotonic; anonymous + auth |
| `likeCount` | `number` | Denormalized from `page_likes` |
| `delegatedEditorUserIds` | `ObjectId[]` | Per-page edit grants — managed in **Publication → Publisher** (+ control) |

Puck props mirror editable fields under `root.props.pagePublication`. Read-only audit fields (created/updated, author name, views, likes) hydrate from MongoDB via `PageEditorMetaProvider`. On new unsaved pages, the **Publisher** badge previews the signed-in user (`name` + `surname`, else `login`) before first publish; after save the persisted `authorUserId` replaces the preview.

---

## Readable settings preview

All {@link MediaUploadField} uploads default to {@link SettingsMediaPreview} — min-height **200px**, `object-fit: contain`, themed border — so text in screenshots stays legible in the Puck sidebar.

---

## Scheduled publishing

When `publishAt` is in the future on Publish:

1. `published: false` until due
2. `SchedulerDomain.scheduleEvent({ eventType: "publish_page", idempotencyKey: "publish_page:<path>" })`
3. {@link handlePublishPage} sets `published: true`, clears `publishAt`

UI: {@link NexusDateTimePicker} (Shadcn {@link Calendar} + time input).

Public visibility: {@link isPagePubliclyVisible} — requires `published` and `publishAt <= now`.

---

## Engagement

| API | Auth | Behaviour |
|-----|------|-----------|
| `POST /api/pages/view` | None | `$inc viewCount`; dedupe cookie 24h |
| `POST /api/pages/like` | Session | Toggle `page_likes`; sync `likeCount` |

Viewer UI: {@link PageLikeButton} — fixed **bottom-left**, heart icon.

---

## Ownership & edit ACL

Permissions: `pages.create`, `pages.edit_own`.

**Default (empty `delegatedEditorUserIds`):** institution RBAC only — not a per-page whitelist.

| Actor | May edit |
|-------|----------|
| System admin (index 0 / legacy `Admin`) | Any page |
| Self-government admin (index 1) | Any page |
| Page author + `pages.edit_own` | Own pages |
| `delegatedEditorUserIds` | **Additionally** granted page only |

Optional **Publisher** roster in Publication adds collaborators via **+**; it does not remove admin or author access. See [page_access_and_paths.md](./page_access_and_paths.md).

Enforced on: `POST/DELETE /api/puck`, `/[path]/edit` route, edit FAB visibility.

Pure rules: `shared/lib/pageEditAccessLogic.ts` — tests `npm run test:page-edit-access-logic`.

---

## Domain & handlers

| Module | Role |
|--------|------|
| `shared/domains/PageDomain.ts` | Upsert, publish, views, likes, metadata DTO |
| `shared/lib/pagePublicationLogic.ts` | Visibility + schedule helpers |
| `shared/lib/scheduledEventHandlers/handlePublishPage.ts` | `publish_page` handler |
| `src/components/puck/fields/PagePublicationFieldGroup.tsx` | Puck sidebar chapter |

---

## Tests

| Script | Module |
|--------|--------|
| `npm run test:page-publication` | `pagePublicationLogic.ts` |
| `npm run test:page-edit-access-logic` | `pageEditAccessLogic.ts` |
| `npm run test:page-edit-access` | `src/lib/pageEditAccess.ts` |
| `npm run test:page-domain` | `PageDomain.ts` |

---

## Deferred

- [ ] Page Manager badge display for categories (see [page_categories.md](./page_categories.md))
- [x] News hub listing via Page Categories Hub + `NexusNewsCatalog` block — see [page_categories_hub.md](./page_categories_hub.md)
- [ ] Comment section block wired to `commentsEnabled` + `UserComment`
