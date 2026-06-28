# Task groups (multi-part projects)

## Overview

Task groups let dispatchers organize related tasks into a single **project**. Each child task remains a full Nexus task (performers, reports, scoring, per-task reminders). The group adds:

- Shared title, description, tags, and optional **project deadline**
- **Long-run reminders** (`ongoing` mode) that fire on an interval until all parts are completed
- Consolidated web/Telegram notifications listing each performer's **open parts**

## Data model

| Collection | Purpose |
|------------|---------|
| `task_groups` | Project shell — `TaskGroup` model |
| `tasks.groupId` / `tasks.groupTitle` | Denormalized link from child task to parent |
| `task_reminder_notifications.kind` | `task` or `group` delivery rows |

Group statuses: `draft` → `active` → `completed` | `cancelled`.

Auto-completion: when every child task is `completed` or `cancelled`, the group moves to `completed`.

## Planned project roster

Dispatchers can declare the **full project team upfront** before any child tasks exist:

| Field | Location | Purpose |
|-------|----------|---------|
| `plannedRoster[]` | `task_groups` | Pre-declared members (`userId`, `displayName`, `avatar`, `roleLabel`, `addedAt`) |
| `performerUserIds` | `task_groups` | Union of **roster** + performers on all child tasks (used for Telegram invites and aggregates) |

**API:** `POST/PATCH /api/task-groups` accept optional `roster: [{ userId, roleLabel? }]` (same shape as task performers).

**UI:**

- `/task-groups/new` — roster section on create form
- `/task-groups/[groupId]` — editable “Project team” panel (PATCH on save)
- `/tasks/new?groupId=` — “Add from project team” quick-pick when assigning performers

Roster-only members count toward `minPerformersForAutoGroup` for Telegram workspace provisioning.

**Telegram:** With `telegram-worker` + operator session, Nexus auto-creates the project supergroup, enables forum topics, and invites the roster. See [telegram_project_workspaces.md](./telegram_project_workspaces.md).

## Reminder modes

| Mode | Use on |
|------|--------|
| `every` | Single-task repeat interval |
| `before_due` | Deadline-relative (requires due date) |
| `ongoing` | **Project-level** repeat until all parts done (default for groups) |

Scheduler event: `task_group_reminder` with idempotency key `task_group_reminder:{groupId}`.

On fire: `TaskGroupDomain.executeGroupReminder()` builds **one notification per performer** summarizing their open child tasks, then reschedules the next tick.

## API

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/task-groups` | Paginated list (`scope`: all, authored, involved) |
| POST | `/api/task-groups` | Create project (optional `roster`) |
| GET | `/api/task-groups/[groupId]` | Detail + child task rows + roster |
| PATCH | `/api/task-groups/[groupId]` | Update fields / reminders / roster |
| DELETE | `/api/task-groups/[groupId]` | Cancel project |
| GET | `/api/task-groups/picker` | Active/draft groups for task create |

Tasks: `POST/PATCH /api/tasks` accept optional `groupId`. `GET /api/tasks?groupId=` filters by parent.

## UI routes

- `/task-groups` — project list
- `/task-groups/new` — create project with long-run reminder defaults (weekly @ 09:00, web)
- `/task-groups/[groupId]` — detail, child parts, link to add task
- `/tasks/new?groupId=` — pre-select parent project

Web toasts link to `/task-groups/[id]` for group reminders.

**Telegram workspace:** Optional ephemeral group per project — see [telegram_project_workspaces.md](./telegram_project_workspaces.md).

## Domain

- `shared/domains/TaskGroupDomain.ts` — CRUD, roster, aggregate refresh, scheduler sync, delivery
- `shared/lib/taskGroupRosterLogic.ts` — roster dedupe, performer union, forum topic title helper
- `shared/lib/taskGroupAccessLogic.ts` — view/edit rules
- `shared/lib/taskGroupStatusLogic.ts` — auto-complete helpers
- `TaskDomain` calls `TaskGroupDomain.refreshGroupAggregate()` after child task mutations

## Tests

```bash
npm run test:run -- task-group-access-logic
npm run test:run -- task-group-roster-logic
npm run test:run -- task-group-status-logic
npm run test:run -- task-group-reminder-notification-copy
npm run test:run -- task-reminder-logic   # includes ongoing mode
```
