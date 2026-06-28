# Public User Profiles

**Status:** `[x] Completed` — `/users/[ref]` member profile route (login or MongoDB id), PII redaction, mention links live.

**Related:** [auth_and_profiles.md](./auth_and_profiles.md), [user_model_and_social_identity.md](./user_model_and_social_identity.md)

---

## Overview

Authenticated institution members can browse each other's profiles at `/users/{login}` when the member has a credentials login, or `/users/{userId}` as a fallback. `@` mention badges in the rich text editor resolve to login-based URLs when available via `buildUserMentionHref()` / `buildUserProfileHref()`.

Own dashboard remains at `/profile`; public route reuses shared profile components with redacted contact fields.

The `/users` path prefix is **reserved** for member profiles — Puck pages cannot use `users` as a path domain or first slug segment (see [page_access_and_paths.md](./page_access_and_paths.md)).

---

## Access

| Route | Auth | Purpose |
|-------|------|---------|
| `/users/[ref]` | Session required | Read-only member profile (`ref` = login or MongoDB id) |
| `GET /api/users/[ref]` | Session required | Redacted profile JSON (login or id) |
| `GET /api/users/search?q=` | Session + task/directory access | User autocomplete for task pickers |

Middleware protects `/users/*` alongside `/profile` and `/tasks`.

---

## PII redaction

Pure rules: `shared/lib/publicProfileRedaction.ts` — tests `npm run test:run -- public-profile-redaction`.

| Field | Peer viewer | Self | Outranking admin |
|-------|-------------|------|------------------|
| Name, avatar, about, socium badges | Visible | Visible | Visible |
| login, email, phone, Telegram sync | Hidden | Visible | Visible |

Domain helper: `AuthDomain.getPublicProfileForViewer(viewer, targetUserId)`.

---

## UI reuse

| Component | Notes |
|-----------|-------|
| `ProfileHero` | Avatar, name, **Role in the system** callout (hierarchy + RBAC), typed `ProfileBadge` chips |
| `ProfileIdentityBoard` | Personal board: about note, contact grid (when PII visible), social link cards with platform accents |
| `ProfileAffiliationsSection` | Socium roles, activities, organizations — each category uses a distinct `ProfileBadge` color |
| `ProfileBadge` | Typed identity chips via `shared/lib/profileBadgeLogic.ts` (`npm run test:run -- profile-badge-logic`) |
| `ProfileHeroActions` | Message via Telegram DM or `mailto:` when contact is visible; public social links work for peers when PII is redacted |
| `ProfileAboutSection` | Thin wrapper over `ProfileIdentityBoard` (legacy import path) |
| `ProfilePublishedSection` | Published news/social feed when author is eligible |
| `ProfileTasksPanel` | Live open assigned tasks via `/api/tasks?scope=assigned`; urgency sort, category/tags, status strip |
| `ProfileActivityColumn` | Recent open tasks + 30-day completion snapshot from `TaskDomain.getProfileTaskSnapshot` |
| `ProfileStatsRow` | Stars, open task count, warnings, optional quality score |

### Contact / Message button

Peers cannot see login, email, or Telegram username unless they outrank the target or are Admin. The **Message** action still works when the profile owner published a **Telegram social link** (always visible). Otherwise the button is disabled with “Message unavailable”.

Pure rules: `shared/lib/profileContactLogic.ts` — tests `npm run test:run -- profile-contact-logic`.

---

## Acceptance

- [x] `/users/[ref]` renders for authenticated members (`ref` = login or MongoDB id)
- [x] Canonical redirect to `/users/{login}` when the member has a login handle
- [x] `users` path domain reserved — Puck pages cannot publish under `/users/*`
- [x] Mention `@` user links navigate correctly (login preferred when available)
- [x] PII hidden between peers; visible to self and outranking admins
- [ ] `/members` browse directory (deferred — use User Directory for admins, mentions for discovery)
