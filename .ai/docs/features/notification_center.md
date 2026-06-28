# Personal Notification Center

**Status:** `[x] Completed` — unified inbox, header bell, producer wiring; email/push fan-out deferred.

**Related:** [auth_and_profiles.md](./auth_and_profiles.md) (delivery prefs), [system_broadcasts.md](./system_broadcasts.md), [task_management.md](./task_management.md), [list_pagination.md](./list_pagination.md)

---

## Overview

Every signed-in user has a **personal notification center** at `/profile/notifications` — a durable inbox history distinct from ephemeral web toasts. Producers upsert rows into `user_notifications`; the same rows are the extension point for future Telegram/email/push fan-out dispatchers.

| Surface | Path / component |
|---------|------------------|
| Inbox page | `/profile/notifications` — `NotificationCenterShell` |
| Header bell | `NotificationBellButton` in `SiteHeaderBar` (unread badge) |
| Web toasts | `SiteNotificationToastStack` — client (`SiteClientToastHost`), broadcast (`SiteBroadcastToastHost`), and task reminders (`TaskReminderToastHost`) share {@link SiteToastCard} slide-in/out motion |

---

## Data model

Collection: `user_notifications` — `shared/models/UserNotification.ts`

| Field | Purpose |
|-------|---------|
| `userId` | Recipient |
| `kind` | `broadcast` \| `task_reminder` \| `task_group_reminder` \| `institutional_reminder` \| `task_assignment` \| `page_published` \| `page_mention` |
| `deliveryKey` | Idempotent upsert key (`broadcast:{id}`, `task_reminder:{deliveryKey}`, …) |
| `title`, `body`, `variant` | Display copy |
| `actionHref` | Deep link (`/tasks/…`, `/task-groups/…`) |
| `sourceId` | Back-reference to producer document |
| `channels` | `web` \| `telegram` at creation time — future dispatchers read this |
| `readAt` | `null` = unread |

**Planned channels (not implemented):** `email`, `push` — register in `NOTIFICATION_INBOX_CHANNELS_PLANNED` (`shared/constants/notificationInbox.ts`) and add dispatcher branches in `NotificationDomain` without schema migration.

---

## Domain

`shared/domains/NotificationDomain.ts`

| Method | Role |
|--------|------|
| `recordNotification` | Upsert one inbox row (does not clear `readAt` on update) |
| `recordBroadcastInboxRows` | Bulk upsert for all web-eligible users on broadcast send |
| `listForUser` | Paginated inbox + legacy backfill |
| `getUnreadCount` | Header badge polling |
| `markRead` / `markAllRead` | User actions |
| `markReadByDeliveryKey` | Toast dismiss sync |

**Legacy backfill:** On list/count, undismissed `system_broadcasts` and `task_reminder_notifications` are imported idempotently so existing users see history without a migration job.

---

## Producers

| Event | Domain | Inbox kind |
|-------|--------|------------|
| Institution broadcast (web channel) | `BroadcastDomain.sendBroadcast` | `broadcast` |
| Task reminder fire | `TaskDomain`, `TaskGroupDomain`, `InstitutionalCalendarDomain` | `task_reminder` / `task_group_reminder` / `institutional_reminder` |
| Task dispatched to performers | `TaskDomain.dispatchTaskAssignmentNotifications` | `task_assignment` |
| Puck page first go-live | `PageDomain` (`dispatchPageGoLiveNotifications`) | `page_published` — all members except the page author |
| Puck page first go-live — `@` user mentions in body | `PageDomain` (`dispatchPageMentionNotifications`) | `page_mention` |

Toast dismiss APIs also call `markReadByDeliveryKey` so inbox and toasts stay aligned.

---

## API

| Method | Route | Auth |
|--------|-------|------|
| GET | `/api/notifications/inbox` | Session — `page`, `limit`, `unreadOnly` |
| GET | `/api/notifications/inbox/unread-count` | Session |
| POST | `/api/notifications/inbox/[notificationId]/read` | Session |
| POST | `/api/notifications/inbox/read-all` | Session |

Response shape follows [list_pagination.md](./list_pagination.md): `items`, `unreadCount`, `meta.{ page, limit, totalCount, totalPages }`.

---

## Future multi-channel fan-out

1. After `recordNotification`, enqueue outbound delivery jobs per `channels` ∩ user `notificationChannels`.
2. Reuse Telegram paths already used by broadcasts/task reminders.
3. Add `email` / `push` dispatchers as separate branches — **not implemented**.
4. Store per-channel delivery timestamps on inbox rows or a sibling receipt collection when needed.

---

## Tests

```bash
npm run test:run -- notification-inbox
```

Pure logic: `shared/lib/notificationInboxLogic.ts` — delivery keys, kind mapping, channel normalization.

---

## File map

| Path | Role |
|------|------|
| `shared/constants/notificationInbox.ts` | Kinds, variants, channel registry |
| `shared/models/UserNotification.ts` | Mongoose schema |
| `shared/domains/NotificationDomain.ts` | Inbox engine |
| `shared/lib/notificationInboxLogic.ts` | Pure helpers |
| `shared/validation/notificationInboxSchemas.ts` | List query Zod |
| `src/app/(profile)/profile/notifications/page.tsx` | Inbox route |
| `src/app/api/notifications/inbox/**` | REST API |
| `src/components/notifications/NotificationCenterShell.tsx` | Inbox UI |
| `src/components/notifications/NotificationBellButton.tsx` | Header bell |
| `src/lib/notificationInboxClient.ts` | Browser fetch helpers |
