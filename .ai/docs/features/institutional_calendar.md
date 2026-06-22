# Institutional calendar rules

**Status:** `[x] Completed`

Yearly recurring institutional rules for socium roles and access tiers. Separate admin page at `/admin/institutional-calendar`.

## Actions (user-selectable)

| Action | Behavior |
|--------|----------|
| `notify_only` | Web toast / Telegram only |
| `spawn_task` | Auto-create + dispatch task per matched user |
| `spawn_task_and_notify` | Both task creation and notification |

## Targeting

Recipients must match **both** configured dimensions when each is non-empty:

- **Socium kinds** (`starosta`, `self_government_head`, …) and/or custom **role keys**
- **Access level indexes** (0–6)

At least one filter dimension is required per rule.

## Scheduling

- `yearlyAnchors`: `{ month, day, atTime }[]` — repeats every calendar year forever
- Scheduler event: `institutional_calendar`
- Idempotency key: `institutional_calendar:{ruleId}`
- Task templates support `{year}` token interpolation

## Limits

| Cap | Value |
|-----|-------|
| Yearly anchors per rule | 50 |
| Active rules | 100 |
| Explicit dates per task/group (`on_dates`) | 200 |

## Related

- Task/group **`on_dates`** reminder mode — see [task_management.md](./task_management.md)
- Domain: `shared/domains/InstitutionalCalendarDomain.ts`

## Tests

```bash
npm run test:institutional-calendar-logic
npm run test:task-reminder-logic
```
