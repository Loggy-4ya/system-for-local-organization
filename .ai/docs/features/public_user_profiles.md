# Public User Profiles

**Status:** `[x] Completed` — `/users/[userId]` member profile route, PII redaction, mention links live.

**Related:** [auth_and_profiles.md](./auth_and_profiles.md), [user_model_and_social_identity.md](./user_model_and_social_identity.md)

---

## Overview

Authenticated institution members can browse each other's profiles at `/users/{userId}`. `@` mention badges in the rich text editor already resolve to this route via `buildUserMentionHref()`.

Own dashboard remains at `/profile`; public route reuses shared profile components with redacted contact fields.

---

## Access

| Route | Auth | Purpose |
|-------|------|---------|
| `/users/[userId]` | Session required | Read-only member profile |
| `GET /api/users/[userId]` | Session required | Redacted profile JSON |
| `GET /api/users/search?q=` | Session + task/directory access | User autocomplete for task pickers |

Middleware protects `/users/*` alongside `/profile` and `/tasks`.

---

## PII redaction

Pure rules: `shared/lib/publicProfileRedaction.ts` — tests `npm run test:public-profile-redaction`.

| Field | Peer viewer | Self | Outranking admin |
|-------|-------------|------|------------------|
| Name, avatar, about, socium badges | Visible | Visible | Visible |
| login, email, phone, Telegram sync | Hidden | Visible | Visible |

Domain helper: `AuthDomain.getPublicProfileForViewer(viewer, targetUserId)`.

---

## UI reuse

| Component | Notes |
|-----------|-------|
| `ProfileHero` | Accepts `PublicUser \| PublicProfileUser`; `showSettingsLink` on own profile |
| `ProfileAboutSection` | `about` + `socialLinks` props |
| `ProfilePublishedSection` | Published news/social feed when author is eligible |
| `ProfileTasksPanel` | Live assigned tasks via `/api/tasks?scope=assigned` |

---

## Acceptance

- [x] `/users/[userId]` renders for authenticated members
- [x] Mention `@` user links navigate correctly
- [x] PII hidden between peers; visible to self and outranking admins
- [ ] `/members` browse directory (deferred — use User Directory for admins, mentions for discovery)
