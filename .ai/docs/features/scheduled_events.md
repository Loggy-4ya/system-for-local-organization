# Scheduled Events & Background Jobs Engine

**Status:** `[~] In Progress` — Foundation engine, MongoDB queue model, shared auth, API routes, in-process/CLI runners, and **`publish_page`** handler completed; broadcast/reminder handlers planned.

**Related:** [media_storage.md](./media_storage.md), [system_broadcasts.md](./system_broadcasts.md), [roadmap.md](../roadmap.md) Phase 0 / Phase 5

---

## Overview

Project Nexus requires a unified scheduler and background job executor to manage delayed or periodic operations (e.g. publishing scheduled news posts, sending overdue task notifications, and dispatching deferred system broadcasts).

Instead of managing separate schedules/crons for each feature, Nexus employs a **centralized event queue** in MongoDB paired with a **pluggable handler registry**.

```
[Feature Code] ---> scheduleEvent() ---> [system_scheduled_events Collection]
                                                    |
                                                    v
[HTTP Tick Route / CLI / Interval] ---> SchedulerDomain.processDueEvents()
                                                    |
                                                    v
                                      [Locks & Dispatches to Registered Handler]
```

---

## Dual Hosting Models

Hosting profiles are selected with **`NEXUS_HOSTING_MODE`** (`vps` | `serverless` | `hybrid`). See [hosting_and_deployment.md](./hosting_and_deployment.md) for templates, validation, and the admin diagnostics API.

To support both simple containerized deployments (Docker / VPS) and serverless deployments (Vercel) without code modifications, the system adapts its execution model based on mode + environment variables:

| Mode | Environment Settings | How it works |
|------|----------------------|--------------|
| **`vps`** | `NEXUS_HOSTING_MODE=vps`, `SCHEDULED_EVENTS_TICK_INTERVAL_SECONDS=15` | In-process `setInterval` loop in `instrumentation.ts`. Good for Docker / always-on servers. |
| **`serverless`** | `NEXUS_HOSTING_MODE=serverless`, `CRON_SECRET=...` | Platform cron hits `/api/admin/jobs/process-scheduled-events`. In-process tick is **disabled** (boot error if set). |
| **`hybrid`** | `NEXUS_HOSTING_MODE=hybrid`, `CRON_SECRET=...` on web; `TELEGRAM_OPERATOR_SESSION` on worker | Same scheduler as serverless on the web app; MTProto worker runs separately. |
| **External Cron (VPS)** | `NEXUS_CRON_SECRET=...`, no tick interval | Host `crontab` pings job routes or runs `npm run job:process-scheduled-events`. |

---

## API Routes & CLI Commands

### 1. Process Scheduled Events Job
* **Route:** `/api/admin/jobs/process-scheduled-events`
* **Methods:** `GET`, `POST`
* **Authorization:** Bearer token matching `CRON_SECRET` or `NEXUS_CRON_SECRET`, or an Admin user session.
* **Body/Query Parameters (Optional):**
  * `limit` (number): Maximum events to process in this run (default 50).
  * `dryRun` (boolean): Scan and list due events without locking or executing them.
  * `eventTypes` (array of strings / comma-separated): Process only specific event types.

### 2. CLI Tool (Maintenance / Crontab)
* **Command:** `npm run job:process-scheduled-events`
* **Dry run:** `npm run job:process-scheduled-events:dry-run`
* **Options:**
  * `--limit <number>`
  * `--event-types <comma-separated-list>`

---

## Data Model: `system_scheduled_events`

Persisted in the `SystemScheduledEvent` Mongoose model:

| Field | Type | Description |
|-------|------|-------------|
| `eventType` | `String` | Unique key identifying the handler (e.g. `publish_page`). |
| `dueAt` | `Date` | Timestamp when this event is scheduled to run. |
| `status` | `String` | Lifecycle state: `pending`, `processing`, `completed`, `failed`, or `cancelled`. |
| `payload` | `Mixed` | Contextual JSON data needed by the handler. |
| `idempotencyKey` | `String` | Optional unique index key to prevent duplicate scheduling. |
| `attempts` | `Number` | Current count of execution attempts. |
| `maxAttempts` | `Number` | Maximum retry attempts before giving up (default 3). |
| `lockedUntil` | `Date` | Lock lease expiration to prevent duplicate execution across instances. |
| `lastError` | `String` | Error trace captured from the last failure. |
| `completedAt` | `Date` | Timestamp when the event successfully completed. |

---

## Extensibility & Handler Registration

To register a new background task type:

1. Add your type slug to `shared/constants/scheduledEventTypes.ts`:
   ```typescript
   export const SCHEDULED_EVENT_TYPES = {
     my_new_task: "my_new_task",
   } as const;
   ```
2. Implement your handler function (conforming to `ScheduledEventHandler` signature):
   ```typescript
   export async function handleMyNewTask(payload: Record<string, any>, event: ISystemScheduledEvent): Promise<void> {
     // execute background work...
   }
   ```
3. Wire the handler in `shared/lib/scheduledEventHandlers/index.ts`:
   ```typescript
   import { handleMyNewTask } from "./handleMyNewTask";
   
   export function registerScheduledEventHandlers(): void {
     SchedulerDomain.registerHandler(SCHEDULED_EVENT_TYPES.my_new_task, handleMyNewTask);
   }
   ```

No new API routes or cron schedules are required on your server or hosting platform. The single centralized tick manages the execution.
