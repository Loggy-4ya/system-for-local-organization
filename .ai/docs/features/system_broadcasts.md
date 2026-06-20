# System Broadcasts & Notifications

**Status:** `[~] In Progress` — API, web toast delivery, and Telegram DM dispatch implemented; admin send UI deferred.

**Related:** [telegram_mini_app_and_bot.md](./telegram_mini_app_and_bot.md), [access_control_and_hierarchy.md](./access_control_and_hierarchy.md), [roadmap.md](../roadmap.md) Phase 3

---

## Overview

Institution administrators can send **system-wide messages** to every user in Nexus through pluggable **delivery channels**:

| Channel | Slug | Behaviour |
|---------|------|-----------|
| **Web toast** | `web_toast` | Fixed bottom-right toast stack after sign-in; dismiss per user |
| **Telegram DM** | `telegram_dm` | Direct message from the Nexus bot to each user with linked `telegramId` |
| *(future)* | `email`, `push`, … | Register slug in `shared/constants/broadcastChannels.ts` and add a dispatcher branch in `BroadcastDomain` |

Broadcasts are persisted in `system_broadcasts`; per-user delivery and dismissals are tracked in `user_broadcast_receipts`.

---

## Permission

| Permission key | Who holds it (defaults) |
|----------------|-------------------------|
| `notifications.broadcast` | System admin (0), self-government admin (1), institution admin (2) |

Legacy `Admin` RBAC role is also accepted at the API gate.

---

## API

### Send broadcast (admin)

`POST /api/admin/broadcasts`

**Auth:** `notifications.broadcast` or legacy Admin.

```json
{
  "title": "Optional headline",
  "body": "Message shown to all users.",
  "variant": "info",
  "channels": ["web_toast", "telegram_dm"],
  "expiresAt": null
}
```

| Field | Type | Notes |
|-------|------|-------|
| `title` | `string \| null` | Optional; max 120 chars |
| `body` | `string` | Required; max 2000 chars |
| `variant` | `info \| success \| warning \| error` | Web toast tone |
| `channels` | `BroadcastChannel[]` | At least one channel |
| `expiresAt` | ISO date \| null | Web toasts auto-hide after this time |

**Response `201`:**

```json
{
  "ok": true,
  "broadcastId": "…",
  "deliveryStats": {
    "totalUsers": 120,
    "webToastEligible": 120,
    "telegramEligible": 45,
    "telegramSent": 44,
    "telegramFailed": 1
  }
}
```

### Active web toasts (signed-in user)

`GET /api/notifications/broadcasts`

Returns undismissed, non-expired broadcasts where `channels` includes `web_toast`.

### Dismiss toast

`POST /api/notifications/broadcasts/{broadcastId}/dismiss`

Marks the toast dismissed for the current user only.

---

## Web client

`SiteBroadcastToastHost` mounts in root `layout.tsx` inside `SessionProvider`:

1. Polls `GET /api/notifications/broadcasts` on sign-in and every 60s.
2. Renders a fixed toast stack (`.site-broadcast-toast-host` in `globals.css`).
3. Dismiss button calls the dismiss API optimistically.

---

## Telegram delivery

When `telegram_dm` is included:

1. `BroadcastDomain` loads all users with non-null `telegramId`.
2. Sends plain text via `TelegramBotDomain.sendDirectMessage()` (Bot API `sendMessage`).
3. Records success/failure per user in `user_broadcast_receipts`.

Requires `TELEGRAM_BOT_TOKEN`. Users must have started a chat with the bot (standard Telegram DM constraint).

**Future:** Move bulk Telegram dispatch to a background worker with rate limiting for large institutions.

---

## Data model

### `system_broadcasts`

| Field | Notes |
|-------|-------|
| `title`, `body`, `variant` | Message content |
| `channels` | Requested delivery channels |
| `createdByUserId` | Sending administrator |
| `expiresAt` | Optional web toast expiry |
| `deliveryStats` | Post-send counters |

### `user_broadcast_receipts`

| Field | Notes |
|-------|-------|
| `broadcastId`, `userId` | Unique pair |
| `webDismissedAt` | Web toast dismissed |
| `telegramDeliveredAt` / `telegramError` | Telegram outcome |

---

## Code map

| Module | Role |
|--------|------|
| `shared/constants/broadcastChannels.ts` | Channel registry |
| `shared/models/SystemBroadcast.ts` | Broadcast persistence |
| `shared/models/UserBroadcastReceipt.ts` | Per-user receipts |
| `shared/validation/broadcastSchemas.ts` | API validation |
| `shared/domains/BroadcastDomain.ts` | Send, list, dismiss |
| `shared/domains/TelegramBotDomain.ts` | `sendDirectMessage()` |
| `src/app/api/admin/broadcasts/route.ts` | Admin send API |
| `src/app/api/notifications/broadcasts/` | User toast read/dismiss |
| `src/components/notifications/SiteBroadcastToastHost.tsx` | Web toast UI |

---

## Extending channels

1. Add slug + label to `broadcastChannels.ts`.
2. Implement dispatch in `BroadcastDomain.sendBroadcast()`.
3. Add client surface if needed (e.g. email template worker).
4. Document in this file and update the permission matrix if a new role gate is required.

---

## Acceptance criteria

- [x] Admin API sends broadcasts to all users with channel selection.
- [x] Web toasts appear for signed-in users until dismissed or expired.
- [x] Telegram DMs sent to users with linked `telegramId`.
- [x] `notifications.broadcast` permission in access-control matrix.
- [ ] Admin UI panel to compose and send broadcasts (Phase 3).
- [ ] Background worker for large-scale Telegram rate limiting.
- [ ] Additional channels (email, mobile push).

---

## Example (curl)

```bash
curl -X POST "$NEXTAUTH_URL/api/admin/broadcasts" \
  -H "Content-Type: application/json" \
  -H "Cookie: <session cookie>" \
  -d '{
    "title": "Council meeting",
    "body": "Student self-government meeting today at 18:00.",
    "variant": "info",
    "channels": ["web_toast", "telegram_dm"]
  }'
```
