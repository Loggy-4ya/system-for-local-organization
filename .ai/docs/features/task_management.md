# Task Management Engine

**Status:** `[~] In Progress` — core model, domain, APIs, scheduler hooks, `/tasks` UI, media uploads, category tags, start/reopen, General Rules delegation limits, and **web/Telegram reminder delivery** completed; rich-text editor and `/members` browse deferred.

**Related:** [scheduled_events.md](./scheduled_events.md), [page_categories.md](./page_categories.md), [access_control_and_hierarchy.md](./access_control_and_hierarchy.md), [general_rules.md](./general_rules.md), [task_groups.md](./task_groups.md), [roadmap.md](../roadmap.md) Phase 5

---

## Overview

Self-government administrations dispatch tasks to institution members. Tasks support rich metadata, multi-performer assignments, completion reports with proof media, per-performer scoring, periodic reminders, and delegation with per-tier quotas.

---

## Data model

Collection: `tasks` — `shared/models/Task.ts`

| Field | Type | Notes |
|-------|------|-------|
| `title` | string | Required headline |
| `description` | string | Rich HTML via `NexusRichTextEditor` — sanitized on save, rendered with `NexusRichTextView` |
| `status` | enum | `draft` → `dispatched` → `acknowledged` → `in_progress` → `submitted` → `completed` / `overdue` / `cancelled` |
| `explanationMedia[]` | `{ url, kind, mimeType? }` | Photos/videos — `task-report` upload purpose |
| `tags[]` | string[] | Optional extra labels (page category catalog) |
| `categoryId` / `categoryLabel` | string? | Institutional task category — allowed base score (B) range |
| `baseScore` | number? | Base score (B) set by assigner when scoring — visible only to author |
| `assignmentNotifyTargets` | `telegram_dm` \| `telegram_group`[] | Where performers are notified on dispatch |
| `dueAt` | Date? | Deadline; triggers `task_overdue` scheduler event |
| `completedAtHistory[]` | Date[] | Supports redo cycles |
| `authorUserId` | ObjectId | Task creator / assigner |
| `performers[]` | subdocs | Assignee, role label, acknowledgement, `qualityPercent` / `timePercent` (0–200%), final `score`, report |
| `reminderSettings` | `{ enabled, mode, value, unit, channels[], repeatUntilDue?, atTime?, weekdays? }` | Flexible periodic / before-deadline / `ongoing` reminders |
| `groupId` / `groupTitle` | ObjectId? / string? | Optional link to a multi-part project — see [task_groups.md](./task_groups.md) |
| `delegationCount` | number | Enforces per-tier delegation quota |

---

## Permissions

| Key | Capability |
|-----|------------|
| `tasks.dispatch` | Create tasks, list all institution tasks |
| `tasks.receive` | Be assigned, acknowledge, submit reports |

Pure rules: `shared/lib/taskAccessLogic.ts` — tests `npm run test:task-access-logic`.

Status transitions: `shared/lib/taskStatusLogic.ts` — tests `npm run test:task-status-logic`.

Reminder scheduling: `shared/lib/taskReminderLogic.ts` — tests `npm run test:task-reminder-logic`. Supports:

- `every`, `before_due`, `ongoing`, **`on_dates`** (calendar date array + optional yearly repeat)

| Mode | Behavior |
|------|----------|
| `every` | Repeat every N minutes / hours / days / weeks |
| `before_due` | Remind once N units before deadline; optional repeat until due |
| `ongoing` | Project-level repeat until all parts done (groups) |
| `on_dates` | Explicit calendar dates (`scheduledDates[]`); optional `repeatYearlyOnDates` |

Day/week schedules may include optional local clock anchor `atTime` (`HH:mm`). Week-based schedules also accept `weekdays[]` (JavaScript `0=Sun … 6=Sat`) — reminders fire on each selected day at `atTime`, spaced by N weeks per weekday. Legacy `intervalHours` migrates to `{ mode: every, value, unit: hours }`.

---

## Delegation limits

Defaults in `shared/constants/taskSettings.ts` → `DEFAULT_TASK_DELEGATION_LIMITS` (per `AccessLevelIndex`).

| Index | Default quota |
|-------|---------------|
| 0 (system admin) | unlimited |
| 1 (self-gov admin) | unlimited |
| 2 | 10 |
| 3 | 3 |
| 4 (starosta) | 1 |
| 5 (teacher) | 5 |
| 6 (student) | 0 |

**Admin overrides:** General Rules → **Tasks** tab — `taskDelegationLimits` and **`taskCategories`** (label, base score min/max, default Q/T percents, enabled flag). Delegation normalization: `shared/lib/taskDelegationLimitsLogic.ts`. Category normalization: `shared/lib/taskCategoriesSettingsLogic.ts`.

### Scoring

**Visibility:** Base score (B), Q/T coefficients, and final performer scores are included in task detail for everyone who can view the task — performers use them to compare assignments.

**Editing:** Users with `tasks.dispatch` (institution admins) may set or revise B, Q, and T via `canScoreTask` in `shared/lib/taskAccessLogic.ts`. This includes **completed** tasks — saving scores again does not append a new completion timestamp.

Formula: **Final = B × (Q% ÷ 100) × (T% ÷ 100)** — implemented in `shared/lib/taskScoreLogic.ts`.

| Field | Meaning |
|-------|---------|
| `baseScore` (B) | Task value set manually by the assigner when scoring; must fall within the task category's `baseScoreMin`–`baseScoreMax` |
| `qualityPercent` (Q) | Quality coefficient 0–200% (how well the work was done) |
| `timePercent` (T) | Time coefficient 0–200% (timeliness vs deadline / expectations) |
| `score` | Stored rounded final per performer |

Categories (e.g. *Fabrication / 3D print*, *Creative*) define the allowed B range and default Q/T when opening the score panel. Configure under General Rules → Tasks.

Scoring UI is shown to dispatch admins once the task is **acknowledged or later** (`acknowledged`, `in_progress`, `submitted`, `overdue`, `completed`). API: `POST /api/tasks/[taskId]/score` with `{ baseScore, scores: [{ userId, qualityPercent, timePercent }], complete? }`.

### Assignment Telegram notifications

On dispatch (`create` with `dispatch: true` or status transition to `dispatched`), `TaskDomain` sends Telegram messages per `assignmentNotifyTargets`:

| Target | Behavior |
|--------|----------|
| `telegram_dm` | Bot DM to each performer with task title + link |
| `telegram_group` | Message in linked project workspace group when `groupId` has an active Telegram workspace |

Default for new tasks: `telegram_dm` only. Configure on task create via `assignmentNotifyTargets`.

---

## Domain & scheduler

| Module | Role |
|--------|------|
| `shared/domains/TaskDomain.ts` | CRUD, acknowledge, start, reopen, report, score, delegate |
| `handleTaskReminder.ts` | Deliver web/Telegram reminders, reschedule next fire |
| `handleTaskOverdue.ts` | Mark task `overdue` when due |

---

## API routes

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/tasks` | Paginated list (`scope`, `assigneeUserId`, `tag`, `categoryId`, `status`) |
| POST | `/api/tasks` | Create (`dispatch: true` to send, `false` for draft) |
| GET/PATCH/DELETE | `/api/tasks/[taskId]` | Detail, update, cancel |
| POST | `/api/tasks/[taskId]/acknowledge` | Performer confirms receipt |
| POST | `/api/tasks/[taskId]/start` | Performer marks task in progress |
| POST | `/api/tasks/[taskId]/reopen` | Author reopens completed task for redo |
| POST | `/api/tasks/[taskId]/report` | Submit completion report + media |
| POST | `/api/tasks/[taskId]/delegate` | Assign additional performer |
| POST | `/api/tasks/[taskId]/score` | Author sets `baseScore` + per-performer Q/T percents (`complete: false` to skip completion) |
| GET | `/api/tasks/categories` | Enabled task categories from general rules |
| GET | `/api/notifications/task-reminders` | Active web reminder toasts for performers |
| POST | `/api/notifications/task-reminders/[id]/dismiss` | Dismiss one reminder toast |
| GET | `/api/users/search?q=` | Autocomplete users by name, login, group, email |

Validation: `shared/validation/taskSchemas.ts`.

Picker UI: `TaskPerformerPicker` / `UserSearchPicker` in `src/components/users/UserSearchPicker.tsx`.

Media UI: `TaskMediaAttachmentsField`, `TaskMediaGallery` in `src/components/tasks/`.

Reminder UI: `TaskReminderSettingsField` — mode, amount, unit, repeat-until-due, clock time, channels.

Web delivery: `TaskReminderToastHost` in `SiteNotificationToastStack` — polls `GET /api/notifications/task-reminders` every 60s (+ on window focus). Scheduler fires create rows in `task_reminder_notifications` and optional Telegram DMs.

Tags UI: `TaskCategoryTagsField` — reuses `/api/pages/categories` catalog.

---

## UI routes

| Route | Audience |
|-------|----------|
| `/tasks` | Dispatchers + performers — paginated list |
| `/tasks/new` | `tasks.dispatch` — compose form (draft or dispatch) |
| `/tasks/[taskId]` | Author, performers, dispatchers — detail + actions |
| Profile panels | `ProfileTasksPanel` — assigned tasks for any profile |

---

## Deferred

- [ ] Rich-text description editor (plain textarea today)
- [ ] Admin Calendar / Tasks Stack modes (roadmap Phase 3)
- [ ] `/members` institutional browse (Phase 1 follow-up)

---

## Tests

```bash
npm run test:task-access-logic
npm run test:task-score-logic
npm run test:task-categories-settings-logic
npm run test:task-delegation-limits-logic
npm run test:task-reminder-logic
npm run test:task-reminder-notification-copy
npm run test:task-status-logic
npm run test:user-search-logic
```
