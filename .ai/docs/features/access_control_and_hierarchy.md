# Access Control & Hierarchy

**Status:** `[~] In Progress` — singleton settings editor, hierarchy model, and permission resolution implemented; per-user assignment UI deferred.

**Related:** [user_model_and_social_identity.md](./user_model_and_social_identity.md), [auth_and_profiles.md](./auth_and_profiles.md), [roadmap.md](../roadmap.md) Phase 3

---

## Overview

Nexus separates **identity** (who you are — login, name, socium roles) from **authority** (what you may do). Authority is governed by a **seven-tier hierarchy** (index **0 = highest**) plus a configurable **permission matrix** stored in MongoDB singleton `access_control_settings`.

Administrators edit the matrix at **`/admin/user-access`** — patterned after the Global Layout editor (`/admin/global-layout`).

---

## Hierarchy tiers

Lower index = **higher** institutional authority.

| Index | Key | Label | Typical holders |
|-------|-----|-------|-----------------|
| **0** | `system_administrator` | System Administrator | Default seed admin (`ADMIN_SEED_LOGIN`) |
| **1** | `self_government_administration` | Self-Government Administration | Head, deputy, sector heads/deputies |
| **2** | `institution_administration` | Institution Administration | Staff managing self-gov admin roles |
| **3** | `self_government_member` | Self-Government Member | Rank-and-file council members |
| **4** | `starosta` | Starosta (Group Leader) | Academic group leaders |
| **5** | `teacher` | Teacher | Teaching staff (capabilities TBD) |
| **6** | `common_student` | Common Student | Default new registrations |

User documents store `accessLevelIndex` (0–6). Legacy `role` (`Admin` / `StudentCouncil` / `Student`) remains for backward compatibility; `inferAccessLevelIndex()` maps legacy data when the field is unset.

---

## Permission keys

| Key | Purpose |
|-----|---------|
| `access_control.manage_settings` | Edit `/admin/user-access` matrix |
| `users.view_directory` | Browse user directory |
| `users.assign_access_level` | Change another user's hierarchy index |
| `users.assign_socium_roles` | Assign socium role objects |
| `users.assign_affiliations` | Assign activities & organizations |
| `users.delegate_permissions` | Grant permissions downward |
| `tasks.dispatch` | Create/dispatch tasks |
| `tasks.receive` | Receive and acknowledge tasks |
| `news.publish` | Publish news & social interactivity |
| `community.moderate` | Moderate comments and proposals |
| `notifications.broadcast` | Send system-wide broadcasts (web toast, Telegram DM) |

Default matrix values live in `shared/constants/accessControl.ts` (`DEFAULT_LEVEL_PERMISSIONS`, `DEFAULT_GRANT_RULES`).

---

## Core rule — administering roles

> To administer another user's roles or access level, an actor **must**:
> 1. **Outrank** the target (`actor.accessLevelIndex < target.accessLevelIndex`).
> 2. Hold **`users.assign_access_level`** and/or **`users.assign_socium_roles`** (from tier defaults **or** explicit delegation).
> 3. Target's level must appear in the actor's **grant rule** `assignableLevelIndices`.

Delegation follows the same hierarchy constraint:

> To delegate permission `P` to a user below you, the actor must hold `users.delegate_permissions`, `P` must be in the actor's `delegatablePermissions`, and the actor must outrank the target.

System administrator (index **0**) receives all permissions by default and may assign indices **1–6**.

Institution administration (index **2**) may assign self-government administration (index **1**) per default grant rules — matching the requirement that institution staff manage self-gov admin roles.

---

## Data model

### Singleton `access_control_settings`

| Field | Type | Notes |
|-------|------|-------|
| `_id` | `"nexus_access_control"` | Fixed singleton key |
| `levels` | `AccessLevelDefinition[]` | Seven tier metadata rows |
| `levelPermissions` | `Record<0\|1\|…\|6, PermissionKey[]>` | Default permissions per tier |
| `grantRules` | `Record<0\|1\|…\|6, LevelGrantRule>` | Assignable indices + delegatable permissions |

### User extensions

| Field | Type | Notes |
|-------|------|-------|
| `accessLevelIndex` | `number` (0–6) | Primary hierarchy position; default **6** |
| `delegatedPermissions` | `PermissionKey[]` | Explicit grants from higher tiers |

---

## Routes & API

| Route | Purpose | Gate |
|-------|---------|------|
| `/admin/user-access` | Permission matrix editor | `access_control.manage_settings` or legacy `Admin` |
| `/admin/users` | User Directory browser and editor | `users.view_directory` or legacy `Admin` |
| `GET /api/access-control` | Read singleton config | Public read |
| `POST /api/access-control` | Update singleton config | `access_control.manage_settings` or legacy `Admin` |
| `GET /api/admin/users` | Search and list users with field redaction | `users.view_directory` or legacy `Admin` |
| `GET /api/admin/users/[userId]` | Get redacted user details | `users.view_directory` or legacy `Admin` |
| `PATCH /api/admin/users/[userId]` | Update user access / profile fields | Session + strict outrank & permissions |

Middleware: `/admin/global-layout` remains **legacy Admin-only**; `/admin/user-access` and `/admin/users` require authentication — fine-grained check on the page/API.

---

## Domain modules

| Module | Responsibility |
|--------|----------------|
| `shared/constants/accessControl.ts` | Tier definitions, permission keys, defaults |
| `shared/models/AccessControlSettings.ts` | Mongoose singleton schema |
| `shared/lib/accessControlLogic.ts` | Pure hierarchy + permission resolution |
| `shared/domains/AccessControlDomain.ts` | Load/seed/update settings, user checks |

---

## Registration defaults

| Event | `accessLevelIndex` |
|-------|-------------------|
| New student signup | **6** (common student) |
| Signup with Starosta chip | **4** (unless already higher) |
| Admin seed user | **0** |

---

## Acceptance criteria

- [x] Seven-tier hierarchy documented and seeded
- [x] Singleton settings model with permissions matrix and grant rules
- [x] `/admin/user-access` editor (hierarchy, permissions, grant rules tabs)
- [x] `accessLevelIndex` + `delegatedPermissions` on User schema
- [x] Pure logic for outrank checks, effective permissions, role administration
- [x] User directory UI for assigning levels, socium roles, and delegations
- [x] Session/JWT exposes `effectivePermissions` for client-side gating
- [ ] Teacher-specific capabilities (index 5) — spec TBD
- [ ] Common student role capabilities (index 6) — spec TBD

---

## User directory UI & field-level redaction

The user directory at `/admin/users` allows authorized actors to view and search all registered users. To protect sensitive Personal Identifiable Information (PII), field-level redaction is applied dynamically based on the actor's relationship to the target user:

- **Always visible:** `fullName`, `avatar`, `accessLevelIndex`, `accessLevelLabel`, `sociumRoleLabels`, `specialty`, `group`.
- **Outrank only:** `login`, `email`, `phone`, `telegramId` (only visible when actor strictly outranks the target user, or holds the legacy `Admin` role).
- **Outrank + permission only:**
  - `delegatedPermissions` (requires `users.delegate_permissions`)
  - `sociumRoles` (requires `users.assign_socium_roles`)
  - `socialGroupActivities` / `organizations` (requires `users.assign_affiliations`)
