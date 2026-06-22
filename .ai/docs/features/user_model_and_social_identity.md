# User Model & Social Identity

**Status:** `[~] In Progress` — core schema, catalogs, profile fields, and engagement stubs implemented; admin assignment UI and news hub integration remain Phase 5.

**Related:** [auth_and_profiles.md](./auth_and_profiles.md), [roadmap.md](../roadmap.md) Phase 2 / Phase 5

---

## Overview

The Nexus `users` collection is the single identity record for every person in the institution. It merges **credentials** (login + password), **OAuth** (Google, Apple, Telegram), **system RBAC**, **socium roles** (student-life identity), **catalog-linked affiliations**, **self-authored profile content**, and **quality scores** for self-government members.

Community participation (comments on news/proposals, surveys, quizzes) is stored in separate engagement collections keyed by `userId`, with a published-content feed surfaced on eligible user profile pages.

---

## Identity layers

| Layer | Field(s) | Who sets it | Notes |
|-------|----------|-------------|-------|
| Credentials | `login`, `passwordHash` | User at signup; admin seed | Login uses a **partial unique index** (only when set). Omitted — not stored as `null`. Password is bcrypt; never exposed in APIs. |
| Linked email | `email` | OAuth link; optional at signup | Partial unique index when non-empty (`partialFilterExpression: { email: { $gt: "" } }`). Omitted when unset — never persist `email: null` (prevents E11000). |
| Contact | `phone` | User in settings; Telegram bot sync | Optional for students (recommended). **Required** for self-government members and applicants. |
| Telegram | `telegramId`, `username` | Login Widget / Mini App / `POST /api/profile/telegram` | Optional for general students. **Required** for self-government members and applicants. |
| Legal name | `name`, `surname` | User in signup/settings | Display via `formatUserFullName()` — `"Name Surname"`. Surname required before membership application. |
| System RBAC | `role` | Server / admin only | `Admin` · `StudentCouncil` · `Student`. Legacy dashboard gate; see [access_control_and_hierarchy.md](./access_control_and_hierarchy.md). |
| Access hierarchy | `accessLevelIndex` | Admin / authorised actors | **0 = highest** — system admin through common student (index 6). |
| Delegated permissions | `delegatedPermissions[]` | Higher tiers downward | Explicit grants on top of tier defaults. |
| Socium roles | `sociumRoles[]` | Self (allowed kinds), admin, system | Array of role assignment objects — see below. |
| Group activity | `socialGroupActivities[]` | Admin when assigning student roles | Keys reference `social_group_activity_catalog`. |
| External orgs | `organizations[]` | Admin when assigning student roles | Keys reference `organization_catalog`. Outside self-government. |
| Social links | `socialLinks[]` | User in profile settings | Platform + URL pairs (Instagram, Telegram, LinkedIn, custom). |
| About | `about` | User in profile settings | Self-note; plain text, max 2000 chars. |
| Quality scores | `qualityScores` | System auto-init | Created when user receives `self_government_member` socium role. |

Legacy field `studentTitle` (`Starosta` / `Deputy` / `Neither`) remains for registration chips and is **synced** into `sociumRoles` on signup and profile update via `syncSociumRolesFromStudentTitle()`.

---

## Socium role assignment object

```typescript
interface IUserSociumRole {
  roleKey: string;           // Catalog key or built-in slug
  roleLabel: string;         // Denormalized display label
  kind: SociumRoleKind;      // starosta | group_deputy | student | self_government_member | self_government_head | self_government_deputy | custom
  source: SociumRoleSource;    // self | admin | system
  bodyKey?: string | null;   // Self-government body slug (head/deputy/member in a body)
  bodyTitle?: string | null; // Denormalized body name
  assignedAt: Date;
  assignedByUserId?: string | null;
}
```

### Built-in kinds

| Kind | Label (default) | Self-assignable | Notes |
|------|-----------------|-----------------|-------|
| `starosta` | Starosta (Group Leader) | Yes (signup chip) | Maps from `studentTitle: "Starosta"`. |
| `group_deputy` | Group Deputy | No (admin / profile settings) | Removed from signup chips; maps from `studentTitle: "Deputy"` in profile. |
| `student` | Student | Yes (implicit signup default) | Baseline for every enrolled user. |
| `self_government_member` | Self-Government Member | No | Admin/system only; triggers `qualityScores` init. |
| `self_government_head` | Self-Government Head | No | Admin assigns to a body (`bodyKey` / `bodyTitle`). |
| `self_government_deputy` | Self-Government Deputy | No | Admin assigns to a body. |
| `custom` | (from catalog) | Per catalog flag | Additional roles added via administration panel. |

Admin-configurable role definitions live in **`socium_role_catalog`** (`shared/models/SociumCatalog.ts`).

---

## Catalog collections (administration panel)

| Collection | Model | Purpose |
|------------|-------|---------|
| `academic_catalog` | `AcademicCatalog` | Approved + pending specialty and group labels for signup dropdowns. |
| `socium_role_catalog` | `SociumRoleCatalog` | Custom socium roles (`assignableBySelf`, `kind: custom`). |
| `social_group_activity_catalog` | `SocialGroupActivityCatalog` | Activity categories (sport, volunteer, academic club, …). |
| `organization_catalog` | `OrganizationCatalog` | External organizations outside self-government. |

User documents store **denormalized key + label** snapshots on `socialGroupActivities[]` and `organizations[]` so profile reads do not require joins. Admin reassignment updates both catalog and user snapshots (future admin UI).

---

## Quality scores

When a user receives a `self_government_member` socium role, `ensureQualityScoresInitialized()` sets:

```typescript
interface IUserQualityScores {
  averageScore: number;   // 0–100 rolling average
  ratingCount: number;
  initializedAt: Date;
  lastUpdatedAt: Date;
}
```

Individual rating events are deferred to Phase 5 admin dashboard. Until then, scores display as `0/100 · 0 ratings` on profile.

---

## Community engagement (Phase 5 foundation)

| Collection | Model | Purpose |
|------------|-------|---------|
| `user_comments` | `UserComment` | Comments on news posts and proposals (`targetType`: `news` \| `proposal`). |
| `survey_participations` | `SurveyParticipation` | Survey and quiz submissions (`participationType`: `survey` \| `quiz`). |
| `user_published_content` | `UserPublishedContent` | News and social interactivity authored by users with publish permission. |

### Profile published feed

Users with `canPublishCommunityContent(user)` — system role `Admin` or `StudentCouncil`, or socium kind `self_government_member` / head / deputy — show a **Published** panel on `/profile` listing recent `user_published_content` rows.

Comments and survey history panels remain placeholder until News Hub ships (Phase 5).

---

## API & domain touchpoints

| Surface | Module | Notes |
|---------|--------|-------|
| Signup / register | `AuthDomain.registerWithCredentials` | Phone, consent timestamp, membership intent, creatable specialty/group with pending catalog queue; socium Student/Starosta chips. |
| Profile PATCH | `AuthDomain.updateProfile` | Editable: `name`, `surname`, `phone`, `about`, `socialLinks`, existing fields. Socium roles / catalogs admin-only. |
| Profile completeness | `GET /api/profile/completeness` | Membership readiness gaps |
| Public user DTO | `AuthDomain.toPublicUser` | Includes all new profile fields except `passwordHash`. |
| Helpers | `shared/lib/userSociumHelpers.ts` | Full name, socium sync, scores init, publish eligibility. |

---

## Phone number & membership readiness

| Audience | Phone requirement |
|----------|-------------------|
| Common students | Optional but **recommended** in profile settings |
| Self-government members | **Required** — cannot be cleared while member role is active |
| Membership applicants | Must complete phone, profile photo, specialty, group, surname, and **Telegram** before application is considered ready |

Helpers in `shared/lib/userProfileCompleteness.ts`:

- `getMembershipProfileGaps()` — missing fields for application (includes `telegram` when required)
- `isProfileReadyForMembershipApplication()` — gate for future apply flow
- `phoneIsRequiredForUser()` — blocks clearing phone for active members
- `telegramIsRequiredForUser()` — blocks unlinking Telegram for members and applicants
- `userNeedsSelfGovernmentProfileCompliance()` — redirects incomplete applicants to settings

Profile UI:

- `/profile/settings` — editable phone field with contextual hint
- `/profile` — `ProfileMembershipReadiness` banner listing gaps
- `GET /api/profile/completeness` — JSON summary for apply forms

Telegram bot contact harvest (Phase 4) may pre-fill `phone`; users can override in settings.

---

## Validation rules

- **Name:** 1–100 chars, trimmed.
- **Surname:** optional; max 100 chars; empty → `null`. Required before membership application.
- **Phone:** optional for general users; 7–32 chars, international format (`+`, digits, spaces, dashes, parentheses). Required for self-government members.
- **About:** optional; max 2000 chars.
- **Social links:** max 10 entries; `platform` 1–32 chars; `url` valid http(s) URL, max 2048 chars.
- **Socium roles / activities / orgs:** not user-editable via profile PATCH (admin routes planned).

---

## Acceptance criteria

- [x] User schema includes login, password hash, name, surname, system role, socium roles array, social group activities, organizations, social links, about, quality scores.
- [x] Catalog models for admin-configurable roles, activities, and organizations.
- [x] Engagement stub models for comments, survey participation, published content.
- [x] Registration and profile settings capture name + surname; settings capture about + social links.
- [x] Profile settings capture phone; membership readiness banner on `/profile`
- [x] Membership application flow blocks submit until `isProfileReadyForMembershipApplication()` — enforced on `POST /api/membership-application` and `/profile/membership`.
- [x] Registration captures phone, password confirmation, socium role (Student/Starosta), membership intent, personal data consent.
- [ ] Admin panel: review `academic_catalog` pending entries — see [signin_identity_matrix.md](./signin_identity_matrix.md).
- [x] Membership application submit/review — see [membership_applications.md](./membership_applications.md).
- [ ] News Hub wires `UserComment` and `UserPublishedContent` to live content.
- [ ] Survey/quiz UI writes `SurveyParticipation` records.
