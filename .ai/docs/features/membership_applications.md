# Self-Government Membership Applications

**Status:** `[x] Completed` — user application surface and admin review queue.

**Related:** [auth_and_profiles.md](./auth_and_profiles.md), [user_model_and_social_identity.md](./user_model_and_social_identity.md), [access_control_and_hierarchy.md](./access_control_and_hierarchy.md), [signin_identity_matrix.md](./signin_identity_matrix.md)

---

## Outcome

Students apply for self-government membership after completing required profile fields. Reviewers holding `users.assign_socium_roles` approve or reject applications from a dedicated admin queue. Approval assigns the `self_government_member` socium role, initializes `qualityScores`, and clears `selfGovernmentApplicationIntent`.

---

## User flow

| Step | Surface | Behavior |
|------|---------|----------|
| Signup intent | `/signup` checkbox | Sets `selfGovernmentApplicationIntent` when profile prerequisites are met at registration |
| Readiness banner | `/profile` → `ProfileMembershipReadiness` | Lists gaps; links to `/profile/membership` |
| Application | `/profile/membership` | Submit / withdraw application; blocks submit until `isProfileReadyForMembershipApplication()` |
| Status API | `GET /api/membership-application` | Returns `isMember`, `hasActiveApplication`, `readyForSubmission`, `missingFieldLabels` |

### Submit rules

- Applicant must not already hold a self-government socium role.
- Profile must include surname, phone, specialty, group, and avatar (Telegram **not** required to apply).
- `POST /api/membership-application` sets `selfGovernmentApplicationIntent: true`.
- `DELETE /api/membership-application` clears intent (withdraw).

---

## Admin review

| Element | Implementation |
|---------|----------------|
| Hub tile | **Membership Applications** — visible when actor has `users.assign_socium_roles` or legacy `Admin` |
| Route | `/admin/membership-applications` |
| Shell | `MembershipApplicationsEditorShell` — paginated list, search, Approve / Reject |
| List API | `GET /api/admin/membership-applications?page&limit&search` |
| Approve | `POST /api/admin/membership-applications/[userId]/approve` |
| Reject | `POST /api/admin/membership-applications/[userId]/reject` (optional `note` in body) |

### Approve side effects

1. Append `self_government_member` socium role (`source: admin`, `assignedByUserId`).
2. Call `ensureQualityScoresInitialized()`.
3. Clear `selfGovernmentApplicationIntent`.
4. Record `UserDirectoryAudit` row (`membershipApplicationAction: approve` in metadata).

Approved members **without** a linked `telegramId` may browse the site but see `ProfileMemberTelegramBanner` and are redirected from `/tasks` and `/task-groups` to `/profile/settings?onboarding=member-telegram` until Telegram is connected.

### Permission model

Uses existing **`users.assign_socium_roles`** — no new permission key. Peer-tier reviewers may act on applicants at the same or lower hierarchy index per [access_control_and_hierarchy.md](./access_control_and_hierarchy.md) § administering roles.

---

## Domain

**`shared/domains/MembershipApplicationDomain.ts`** — list queue, submit, withdraw, approve, reject.

**Validation:** `shared/validation/membershipApplicationSchemas.ts`

**Tests:** `npm run test:membership-application` (`shared/lib/membershipApplicationLogic.ts`)

---

## Acceptance criteria

- [x] `/profile/membership` submit/withdraw with profile readiness gate
- [x] `/admin/membership-applications` paginated queue with approve/reject
- [x] Approve assigns member role + quality scores + clears intent
- [x] Audit rows recorded via `UserDirectoryAuditDomain`
- [x] Hub tile gated by `users.assign_socium_roles`
