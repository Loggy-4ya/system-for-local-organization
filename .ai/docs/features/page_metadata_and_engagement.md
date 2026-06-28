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
| `description` | `string` | Short summary (max 2000) — shown on news catalog preview cards |
| `coverImage` | `string` | `/uploads/page-covers/…` — hero tile image |
| `galleryImages` | `string[]` | Extra publication images (`image2`–`image4`) |
| `catalogImagesPerCard` | `1`–`4` | How many publication images appear on this page's catalog card (capped by available images) |
| `catalogCardVariant` | `tile` \| `featured` | Catalog preview size — `featured` may use the section hero slot when three or more pages are listed |
| `authorUserId` | `ObjectId` | Set on first save |
| `publishAt` | `Date \| null` | Future → hidden until scheduler fires |
| `notifyOnPublish` | `boolean` | When true, first public go-live notifies members (master switch); default `true` |
| `notifyWebOnPublish` | `boolean` | When master notify is on, write web inbox rows; default `true` |
| `notifyTelegramOnPublish` | `boolean` | When master notify is on, send Telegram DMs; default `true` |
| `commentsEnabled` | `boolean` | Derived on save from **`NexusComments`** block presence + block **Enable comments** toggle; gates comment APIs (`user_comments`). Form Input blocks are unaffected. |
| `viewCount` | `number` | Monotonic; anonymous + auth |
| `likeCount` | `number` | Denormalized from `page_likes` |
| `dislikeCount` | `number` | Denormalized from `page_dislikes` |
| `delegatedEditorUserIds` | `ObjectId[]` | Per-page edit grants — managed in **Publication → Publisher** (+ control) |

Puck props mirror editable fields under `root.props.pagePublication`. Read-only audit fields (created/updated, author name, views, likes) hydrate from MongoDB via `PageEditorMetaProvider`. On new unsaved pages, the **Publisher** badge previews the signed-in user (`name` + `surname`, else `login`) before first publish; after save the persisted `authorUserId` replaces the preview.

---

## Readable settings preview

All {@link MediaUploadField} uploads default to {@link SettingsMediaPreview} — min-height **200px**, `object-fit: contain`, themed border — so text in screenshots stays legible in the Puck sidebar.

---

## Scheduled publishing

When `publishAt` is in the future on **Publish** (not draft save):

1. `published: false` until due
2. `SchedulerDomain.scheduleEvent({ eventType: "publish_page", idempotencyKey: "publish_page:<path>" })`
3. {@link handlePublishPage} sets `published: true`, clears `publishAt`, and may fan out member notifications

UI: {@link NexusDateTimePicker} (Shadcn {@link Calendar} + time input).

### Member notifications on go-live

When a page becomes **public for the first time** (immediate publish or scheduled `publish_page` fire) and **Notify members** is enabled in the Publication chapter:

1. {@link PageDomain} upserts inbox rows (`kind: page_published`) for every user who accepts the **web** channel in profile notification settings — **except the page author**.
2. Users with **Telegram** enabled and a linked `telegramId` receive a bot DM using the `pagePublishedAnnouncement` template from **General Rules** (`{title}`, `{body}`, `{url}`) — **except the page author**.
3. Republishing an already-live page does **not** re-notify. Draft saves never notify.

**@mention notifications on go-live:** When a page becomes public for the first time, every **user** `@` mention embedded in Puck rich text (`NexusText`, list step labels, etc.) receives a personal inbox row (`kind: page_mention`) and optional Telegram DM — independent of the **Notify members** master switch. The **page author** is never notified, even when they mention themselves. Republishing does not re-notify mentions. Pure rules: `shared/lib/pageMentionNotificationLogic.ts` — tests `npm run test:run -- page-mention-notification`.

Editors configure member notifications in **Publication → Member notifications** (`notifyOnPublish` master switch plus per-channel **Web inbox** / **Telegram DM** toggles). A live Telegram preview uses the institutional `pagePublishedAnnouncement` template. Admins edit default bot copy at **`/admin/telegram-bot`** (also under General Rules → Telegram bot). Delivery still respects per-user channel prefs at `/profile/settings#notifications`.

Pure rules: `shared/lib/pagePublishNotificationLogic.ts` — tests `npm run test:run -- page-publish-notification`.

Public visibility: {@link isPagePubliclyVisible} — requires `published` and `publishAt <= now`.

### Draft save vs publish

| Editor action | API `published` | Effect |
|---------------|-------------------|--------|
| **Save draft** (`NexusSaveButton`) | `false` | Persists layout + metadata; keeps existing `published` / `publishAt` on already-live pages; new pages stay `published: false` |
| **Publish** (`NexusPublishButton`) | `true` | Applies immediate or scheduled go-live via {@link resolvePublicationStateOnSave} |

Draft preview: unpublished pages return `404` to anonymous users. Editors, delegated collaborators, and institution administrators (`canViewUnpublishedPage`) may open the public viewer URL for a draft.

---

## Engagement

| API | Auth | Behaviour |
|-----|------|-----------|
| `POST /api/pages/view` | None | `$inc viewCount`; dedupe cookie 24h |
| `POST /api/pages/like` | Session | Toggle `page_likes`; sync `likeCount` |
| `POST /api/pages/dislike` | Session | Toggle `page_dislikes`; sync `dislikeCount` |
| `GET /api/pages/comments` | None | Paginated threaded comments when `commentsEnabled` |
| `POST /api/pages/comments` | Session | Create comment or reply on a published page |
| `POST /api/pages/comments/vote` | Session | Toggle like/dislike on a comment |
| `POST /api/pages/comments/author-heart` | Session (page author) | Toggle creator heart on a comment (`authorHearted` on `user_comments`) |
| `GET /api/pages/comments/top-liked` | None | Top liked comments for preview strip |

Viewer UI: {@link PageLikeButton} — fixed **bottom-right** heart launcher for **signed-in** users only; tap to open a compact like/dislike toolbar (close with **×**). Stacks above the edit FAB when both are visible.

Page body: drop **`NexusComments`** (Content category) for a compact launcher chip that opens a YouTube-style bottom drawer — comment, reply, like/dislike per row. Use the block's **Behavior → Enable comments** switch to pause discussion without removing the block. MongoDB `commentsEnabled` is synced from the block on save ({@link module:shared/lib/pageCommentsBlockLogic}). **Form Input** blocks are independent. **Compose:** {@link PageCommentComposer} uses {@link NexusRichTextEditor} (`variant="default"`) via {@link PageCommentBodyField} — bold/italic/links, `@` mentions, `/` slash commands. **Read:** {@link NexusRichTextView} renders stored HTML; legacy plain-text rows still display correctly. **Content policy:** bodies are sanitized ({@link module:shared/lib/nexusRichTextSanitize}) then scanned against the institutional blocklist ({@link module:shared/lib/contentPolicy}) on both client (composer, via `GET /api/general-rules/effective`) and server (`CommentDomain.createPageComment` after `GeneralRulesDomain.ensureLoaded`). Admins maintain live terms at `/admin/general-rules`. Comments from the **page author** show an **Author** badge; the page author can **heart** comments (creator love).

**`NexusComments` block settings:** **View** — `launcher` (default chip) or `topLiked` (auto-rotating preview of most-liked comments, non-scrollable, click opens drawer); **Width** — full / medium / narrow band inside the page container; **Alignment** — left / center / right when narrower than the container; **Preview rotation** — 3–12s interval for `topLiked` mode.

**Performance:** Comment count is hydrated on the server when `commentsEnabled` (`commentCount` on page metadata). The launcher uses {@link useLazyVisible} + `requestIdleCallback` for non-critical fetches, hover prefetch ({@link prefetchPageCommentsRegion}), client TTL cache ({@link module:src/lib/pageCommentsClientCache}), and lazy drawer mount. The drawer loads page 1 on open only; replies are lazy per thread. Server: compound MongoDB indexes, lean field projection, 30s in-process count cache ({@link module:shared/lib/pageCommentCountCache}), `Cache-Control` on `GET /api/pages/comments/count`.

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

Pure rules: `shared/lib/pageEditAccessLogic.ts` — tests `npm run test:run -- page-edit-access-logic`.

---

## Domain & handlers

| Module | Role |
|--------|------|
| `shared/domains/PageDomain.ts` | Upsert, publish, views, likes, dislikes, metadata DTO |
| `shared/domains/CommentDomain.ts` | Page comment list/create/vote |
| `shared/lib/pagePublicationLogic.ts` | Visibility + schedule helpers |
| `shared/lib/pagePublishNotificationLogic.ts` | First go-live notification gating + copy |
| `shared/lib/scheduledEventHandlers/handlePublishPage.ts` | `publish_page` handler |
| `src/components/puck/fields/PagePublicationFieldGroup.tsx` | Puck sidebar chapter |

---

## Tests

| Script | Module |
|--------|--------|
| `npm run test:run -- page-publication` | `pagePublicationLogic.ts` |
| `npm run test:run -- page-publish-notification` | `pagePublishNotificationLogic.ts` |
| `npm run test:run -- page-mention-notification` | `pageMentionNotificationLogic.ts` |
| `npm run test:run -- page-edit-access-logic` | `pageEditAccessLogic.ts` |
| `npm run test:run -- page-edit-access` | `src/lib/pageEditAccess.ts` |
| `npm run test:run -- page-domain` | `PageDomain.ts` |
| `npm run test:run -- page-comment-logic` | `pageCommentLogic.ts` |

---

## Deferred

- [ ] Page Manager badge display for categories (see [page_categories.md](./page_categories.md))
- [x] News hub listing via Page Categories Hub + `NexusNewsCatalog` block — see [page_categories_hub.md](./page_categories_hub.md)
- [x] Comment section block wired to `commentsEnabled` + `UserComment` — **`NexusComments`** + {@link CommentDomain}
