# Hosting & deployment modes

**Status:** `[x] Completed` — `NEXUS_HOSTING_MODE`, env profile templates, boot validation, admin diagnostics API.

**Related:** [scheduled_events.md](./scheduled_events.md), [media_storage.md](./media_storage.md), [telegram_project_workspaces.md](./telegram_project_workspaces.md), [production_readiness.md](../production_readiness.md)

---

## Overview

Nexus runs on **one codebase** with three deployment profiles:

| Mode | Typical target | Scheduler | Media storage | Telegram auto-create |
|------|----------------|-----------|---------------|-------------------|
| `vps` | Docker, VPS, bare metal | In-process `setInterval` | `local`, `gcs`, or `s3` | Optional on same host |
| `serverless` | Vercel, Lambda + Atlas | HTTP cron (`vercel.json`) | **`gcs` or `s3` required** in prod | Manual `/link` only |
| `hybrid` | Vercel web + worker | HTTP cron on web | **`gcs` or `s3` required** on web | Separate `telegram-worker` |

Set explicitly:

```bash
NEXUS_HOSTING_MODE=vps          # or serverless | hybrid
```

When unset:

- `VERCEL=1` → infers `serverless`
- Otherwise → `vps`

---

## Env files — which one to use?

Nexus ships **six** env example files. They are not interchangeable copies of the same content — each has a different job:

| File | Role | You copy it to… |
|------|------|-----------------|
| **`.env.example`** | **Master reference** — every variable Nexus understands, with comments explaining background jobs, OAuth, Telegram, media, etc. | `.env.local` when you want to build config from scratch or look up a variable |
| **`.env.vps.example`** | **Bundled MongoDB** — app + `db` container for local Docker dev | `.env.local` + bundled-db compose override (see below) |
| **`.env.vps-external-db.example`** | **External MongoDB** — app on VPS/Docker, DB on Atlas or another host | `.env.local` + `docker compose up` |
| **`.env.vercel.example`** | **Ready-made serverless profile** — vars to paste into Vercel project settings | Vercel dashboard (not a file in the repo) |
| **`.env.hybrid.example`** | **Ready-made hybrid profile** — web vars for Vercel + notes for the worker | Vercel dashboard + worker host env |
| **`.env.aws.example`** | **Ready-made AWS object-storage profile** — S3 media vars for VPS/ECS on AWS | `.env.local` or container/task env |

### What to do with `.env.example`

**Do not deploy with it as-is.** It is documentation you keep in git — like a catalogue.

Typical workflows:

1. **Local dev with bundled MongoDB** — fastest for laptop development:
   ```bash
   cp .env.vps.example .env.local
   docker compose -f docker-compose.yml -f docker-compose.bundled-db.yml --profile bundled-db up
   ```

2. **VPS / production with external MongoDB** — app on your server, database elsewhere (Atlas, dedicated DB VPS):
   ```bash
   cp .env.vps-external-db.example .env.local
   # set MONGODB_URI to your Atlas or remote connection string
   docker compose up
   ```

3. **Local dev without Docker** — MongoDB must be reachable at `MONGODB_URI`:
   ```bash
   cp .env.vps.example .env.local   # or localhost:27017 if mongo runs on host
   # OR
   cp .env.example .env.local       # full reference
   npm run dev
   ```

4. **Need a variable not in the profile template?** — open `.env.example`, find the variable and its comment, add that line to your `.env.local` (or Vercel env).

5. **Production on Vercel** — use `.env.vercel.example` or `.env.hybrid.example` as a checklist; set each line in Vercel → Settings → Environment Variables. You do **not** upload `.env.local` to Vercel.

**Rule of thumb:** profile `.example` files = fast start for a hosting mode; `.env.example` = complete dictionary when something is missing or unclear.

Next.js still loads secrets from **`.env.local`** at runtime (gitignored). `.env.example` is only the committed template — standard convention in most repos.

---

## How to use each profile

### VPS — two database layouts

Nexus on a VPS always uses `NEXUS_HOSTING_MODE=vps` (in-process scheduler, no `CRON_SECRET` required). The difference is **where MongoDB runs**:

| Layout | When | Env template | Docker command |
|--------|------|--------------|----------------|
| **Bundled MongoDB** | Local dev — app + DB in Docker on one machine | `.env.vps.example` | `docker compose -f docker-compose.yml -f docker-compose.bundled-db.yml --profile bundled-db up` |
| **External MongoDB** | Production VPS, or dev against Atlas | `.env.vps-external-db.example` | `docker compose up` |

#### Bundled MongoDB (local dev)

```bash
cp .env.vps.example .env.local
# Fill in NEXTAUTH_SECRET, admin seed password
docker compose -f docker-compose.yml -f docker-compose.bundled-db.yml --profile bundled-db up
```

- `MONGODB_URI=mongodb://db:27017/nexus` — hostname `db` is the Compose service name
- `MEDIA_STORAGE_DRIVER=local` — uploads on the Docker volume (see [Media storage at deploy time](#media-storage-at-deploy-time))

#### External MongoDB (Atlas / dedicated DB host)

```bash
cp .env.vps-external-db.example .env.local
# Set MONGODB_URI to your Atlas or remote connection string
docker compose up
```

- No `db` container — only the `web` service starts
- Point `MONGODB_URI` at MongoDB Atlas, a database VPS, or any reachable host
- On Atlas: add your server IP to **Network Access**; use a database user with read/write on the `nexus` database
- **Atlas + Docker on Linux:** if logs show `querySrv ESERVFAIL` for `mongodb+srv://`, the web container cannot resolve Atlas SRV records. `docker-compose.yml` sets public DNS (`8.8.8.8` / `8.8.4.4`) on `web` and `telegram-worker`. After changing `.env.local`, run `docker compose up -d --force-recreate web`. Alternative: use Atlas **Drivers → Connect → standard connection string** (`mongodb://host1,host2,host3/...`) instead of `mongodb+srv://`, or run `npm run dev` on the host (outside Docker) where host DNS already works.

**Bare-metal production** (no Compose):

```bash
cp .env.vps-external-db.example .env.local
npm run build && npm run start
# Or: docker build -t nexus-web . && docker run --env-file .env.local -p 3000:3000 nexus-web
```

`docker-compose.yml` sets `NEXUS_HOSTING_MODE=vps` and the tick interval; your `.env.local` supplies `MONGODB_URI`.

---

### Vercel (serverless)

For the web app on Vercel with MongoDB Atlas and **cloud object storage** (GCS or S3).

1. Open [`.env.vercel.example`](../../.env.vercel.example) (GCS) or configure S3 vars from [`.env.aws.example`](../../.env.aws.example).
2. In Vercel → **Project → Settings → Environment Variables**, add each variable (Production, and Preview if needed).
3. Set `MEDIA_STORAGE_DRIVER=gcs` (typical on Vercel/GCP) **or** `MEDIA_STORAGE_DRIVER=s3` (when using AWS S3 / CloudFront).
4. Deploy — [vercel.json](../../vercel.json) registers crons that call:
   - every minute → `/api/admin/jobs/process-scheduled-events`
   - daily 03:00 UTC → `/api/admin/jobs/media-orphan-cleanup`
4. Vercel sends `Authorization: Bearer <CRON_SECRET>` automatically.

**Do not set** `SCHEDULED_EVENTS_TICK_INTERVAL_SECONDS` or `MEDIA_ORPHAN_CLEANUP_INTERVAL_HOURS` on Vercel — boot validation rejects them in serverless mode.

Telegram project groups on Vercel-only: use manual `/link` (Bot API). For auto-create, forum topics, and member sync, run **telegram-worker** with operator env (hybrid profile) — see [telegram_project_workspaces.md](./telegram_project_workspaces.md).

---

### Hybrid (Vercel web + telegram-worker)

When you need serverless web **and** automatic Telegram group creation via MTProto.

**Web app (Vercel):**

1. Copy vars from [`.env.hybrid.example`](../../.env.hybrid.example) into Vercel env (same rules as serverless: `CRON_SECRET`, cloud media driver `gcs` or `s3`, no in-process tick).
2. Set `NEXUS_HOSTING_MODE=hybrid`.

**Worker (separate always-on host — Phase 4b, planned):**

- Run a `telegram-worker` service (not on Vercel) with:
  - `TELEGRAM_OPERATOR_SESSION` — GramJS/Telethon session export
  - Same `MONGODB_URI` and `TELEGRAM_BOT_TOKEN` as the web app
- Until the worker ships, hybrid behaves like serverless for scheduling; Telegram groups still use manual `/link`.

---

## Quick start templates (summary)

| File | Use when |
|------|----------|
| [`.env.vps.example`](../../.env.vps.example) | Local Docker dev with bundled MongoDB |
| [`.env.vps-external-db.example`](../../.env.vps-external-db.example) | VPS / Docker with Atlas or remote MongoDB |
| [`.env.vercel.example`](../../.env.vercel.example) | Vercel project env vars (GCS media) |
| [`.env.hybrid.example`](../../.env.hybrid.example) | Vercel + separate MTProto worker |
| [`.env.aws.example`](../../.env.aws.example) | VPS / ECS / Lambda with S3 media |
| [`.env.example`](../../.env.example) | Full variable reference — not a deploy profile |

---

## Environment variables by mode

### All modes

| Variable | Required |
|----------|----------|
| `MONGODB_URI` | Yes |
| `NEXTAUTH_SECRET` | Yes |
| `NEXTAUTH_URL` | Yes (public HTTPS in production) |

### `vps`

| Variable | Notes |
|----------|-------|
| `SCHEDULED_EVENTS_TICK_INTERVAL_SECONDS=15` | In-process scheduler (recommended) |
| `MEDIA_ORPHAN_CLEANUP_INTERVAL_HOURS=24` | Optional in-process cleanup |
| `MEDIA_STORAGE_DRIVER=local` | OK with persistent volume |
| `MEDIA_STORAGE_DRIVER=gcs` | Optional — object storage instead of disk |
| `MEDIA_STORAGE_DRIVER=s3` | Optional — object storage instead of disk |
| `CRON_SECRET` | Optional — only if using external crontab instead of in-process tick |

### `serverless`

| Variable | Notes |
|----------|-------|
| `CRON_SECRET` | **Required in production** — Vercel cron auth |
| `MEDIA_STORAGE_DRIVER` | **Must be `gcs` or `s3` in production** — `local` is rejected |
| `GCS_MEDIA_BUCKET` | Required when driver is `gcs` |
| `GCS_MEDIA_PUBLIC_BASE_URL` | Optional CDN origin for GCS URLs |
| `S3_MEDIA_BUCKET` | Required when driver is `s3` |
| `S3_MEDIA_REGION` | Required when driver is `s3` (falls back to `AWS_REGION`) |
| `S3_MEDIA_PUBLIC_BASE_URL` | Optional CloudFront/CDN origin for S3 URLs |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | Required on Vercel when using S3 (no IAM role) |
| `SCHEDULED_EVENTS_TICK_INTERVAL_SECONDS` | **Must be unset** — boot error if set |
| `MEDIA_ORPHAN_CLEANUP_INTERVAL_HOURS` | **Must be unset** — use [vercel.json](../../vercel.json) cron |

### `hybrid`

Same rules as `serverless` on the **web app**. Additionally:

| Variable | Where |
|----------|-------|
| `TELEGRAM_OPERATOR_SESSION` | **telegram-worker** container only (not Vercel) |

---

## Media storage at deploy time

User uploads (avatars, Puck page media, future task attachments) share one pipeline. The active backend is selected **only** via `MEDIA_STORAGE_DRIVER` — no code changes in Puck fields or upload APIs.

Full architecture: [media_storage.md](./media_storage.md).

### Driver summary

| Driver | `MEDIA_STORAGE_DRIVER` | Typical deploy target | Serverless-safe? |
|--------|------------------------|----------------------|------------------|
| Local disk | `local` (default) | VPS / Docker with a persistent volume | **No** — files are lost on cold starts |
| Google Cloud Storage | `gcs` | Vercel, Cloud Run, GCP VPS | **Yes** |
| Amazon S3 | `s3` | AWS ECS/EC2/Lambda, Vercel + S3, AWS VPS | **Yes** |

Boot validation rejects `MEDIA_STORAGE_DRIVER=local` in production on `serverless` and `hybrid` modes. Use `gcs` or `s3` instead.

Object keys are identical across cloud drivers: `{segment}/{filename}` under prefixes such as `avatars/`, `puck-blocks/`, `page-covers/`.

### Google Cloud Storage (GCS)

**When:** Vercel deployments, GCP-hosted VPS, or any environment where you already use Google Cloud.

**Env vars:**

```bash
MEDIA_STORAGE_DRIVER=gcs
GCS_MEDIA_BUCKET=your-nexus-media-bucket
# Optional — CDN or custom public origin (recommended in production):
# GCS_MEDIA_PUBLIC_BASE_URL=https://cdn.example.com/media
```

**Credentials:**

- **GCP / Cloud Run:** Application Default Credentials (no key file).
- **Vercel / external host:** service account JSON via `GOOGLE_APPLICATION_CREDENTIALS`, or inject the JSON contents as an env var your platform supports.

**IAM (service account):** `storage.objects.create`, `storage.objects.delete`, `storage.objects.list` on the media bucket.

**Checklist:**

1. Create a GCS bucket (uniform bucket-level access recommended).
2. Make objects publicly readable **or** serve them through a CDN that maps to `GCS_MEDIA_PUBLIC_BASE_URL`.
3. Set env vars in Vercel / `.env.local` (see [`.env.vercel.example`](../../.env.vercel.example)).
4. Add the CDN hostname (or `storage.googleapis.com`) to `images.remotePatterns` in [`next.config.ts`](../../next.config.ts) if you use Next.js image optimisation for avatars/covers.
5. Orphan cleanup runs via [vercel.json](../../vercel.json) cron (serverless) or `MEDIA_ORPHAN_CLEANUP_INTERVAL_HOURS` (VPS).

### Amazon S3

**When:** AWS ECS/EC2/Lambda, VPS on AWS, or Vercel when your media bucket lives in S3 (often fronted by CloudFront).

**Env vars:**

```bash
MEDIA_STORAGE_DRIVER=s3
S3_MEDIA_BUCKET=your-nexus-media-bucket
S3_MEDIA_REGION=eu-central-1
# Optional — CloudFront or custom CDN (recommended in production):
# S3_MEDIA_PUBLIC_BASE_URL=https://cdn.example.com/media
```

`S3_MEDIA_REGION` falls back to `AWS_REGION` when unset.

**Credentials:**

- **ECS / EC2 / Lambda:** attach an IAM role with S3 permissions (preferred — no static keys).
- **Vercel / external host:** `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` for an IAM user or access key.

**IAM policy (bucket + objects):**

| Action | Purpose |
|--------|---------|
| `s3:PutObject` | Upload API |
| `s3:DeleteObject` | Orphan cleanup |
| `s3:ListBucket` | Orphan inventory scan (scoped to `avatars/*`, `puck-blocks/*`, etc. prefixes) |

**Checklist:**

1. Create an S3 bucket in your target region.
2. Configure public read access **or** put CloudFront (or another CDN) in front and set `S3_MEDIA_PUBLIC_BASE_URL` to that origin.
3. Copy [`.env.aws.example`](../../.env.aws.example) into `.env.local` (VPS) or your task/container env (ECS), **or** add the S3 lines to an existing profile such as [`.env.vps-external-db.example`](../../.env.vps-external-db.example).
4. On Vercel: set the same `MEDIA_STORAGE_DRIVER=s3` vars plus `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` in project settings.
5. Add the S3 virtual-hosted hostname or CloudFront domain to `images.remotePatterns` in [`next.config.ts`](../../next.config.ts).
6. Orphan cleanup uses the same HTTP cron / in-process schedule as GCS — it lists and deletes unreferenced keys in `S3_MEDIA_BUCKET`.

**Public URL shape (when no CDN base is set):**

- `https://{bucket}.s3.{region}.amazonaws.com/{segment}/{file}`
- `us-east-1` legacy: `https://{bucket}.s3.amazonaws.com/{segment}/{file}`

Stored Puck/avatar URLs must match what browsers can fetch — use `S3_MEDIA_PUBLIC_BASE_URL` when CloudFront serves media under a different hostname.

### Local disk (VPS only)

**When:** Docker or bare-metal VPS with a mounted volume at `public/uploads/`.

```bash
MEDIA_STORAGE_DRIVER=local
```

- Default in [`.env.vps.example`](../../.env.vps.example) and [`.env.vps-external-db.example`](../../.env.vps-external-db.example).
- URLs are root-relative (`/uploads/avatars/…`) and served by Next.js static hosting.
- Ensure the upload directory is on persistent storage in production Docker (`volume` mount for `public/uploads`).
- Orphan cleanup can run in-process via `MEDIA_ORPHAN_CLEANUP_INTERVAL_HOURS=24`.

### Migrating between drivers

1. Provision the target bucket (GCS or S3).
2. Copy existing `public/uploads/**` objects preserving `{segment}/{filename}` keys (one-off `gsutil` / `aws s3 sync` script).
3. Switch `MEDIA_STORAGE_DRIVER` and related env vars.
4. Update `next.config.ts` `images.remotePatterns` if the public hostname changes.
5. Existing MongoDB documents keep working for URLs already stored — reference scanning supports `/uploads/…`, GCS URLs, and S3 URLs. New uploads use the active driver.

Details: [media_storage.md § Deployment migration](./media_storage.md#deployment-migration).

---

On Node server start (`src/instrumentation.ts`):

1. Resolves `NEXUS_HOSTING_MODE`
2. Clamps in-process scheduler intervals (forces `0` on serverless/hybrid)
3. Logs warnings (e.g. hybrid without operator session)
4. Logs errors (e.g. `local` media on Vercel prod)
5. **Aborts boot** when errors exist in `NODE_ENV=production`, or when `NEXUS_HOSTING_STRICT=true`

### Code map

| Module | Role |
|--------|------|
| `shared/constants/nexusHosting.ts` | Mode slugs |
| `shared/lib/nexusHostingLogic.ts` | Resolution + validation (pure) |
| `src/lib/nexusHostingBootstrap.ts` | Boot logging + cache |
| `src/lib/nexusJobsConfig.ts` | Scheduler intervals via policy |
| `src/instrumentation.ts` | Calls bootstrap on boot |

---

## HTTP cron (serverless / hybrid / external VPS)

[vercel.json](../../vercel.json):

| Schedule | Route |
|----------|-------|
| Every minute | `/api/admin/jobs/process-scheduled-events` |
| Daily 03:00 UTC | `/api/admin/jobs/media-orphan-cleanup` |

**telegram-worker** (optional, VPS/hybrid): `docker compose --profile telegram-worker up` or `npm run worker:telegram` — requires `TELEGRAM_OPERATOR_SESSION`, `TELEGRAM_API_ID`, `TELEGRAM_API_HASH`, `TELEGRAM_BOT_TOKEN`. Polls provisioning jobs and `operatorPendingAction` maintenance (enable forum, sync members, dismantle).

Auth: `Authorization: Bearer $CRON_SECRET` (Vercel injects automatically).

External VPS crontab alternative:

```bash
curl -H "Authorization: Bearer $NEXUS_CRON_SECRET" \
  "$NEXTAUTH_URL/api/admin/jobs/process-scheduled-events"
```

---

## Admin diagnostics

`GET /api/admin/hosting-config` (Admin session) returns:

- `mode`, `modeLabel`
- `policy` (effective scheduler/storage flags)
- `warnings`, `errors`
- `healthy` boolean

Use after deploy to confirm the running instance matches intent.

---

## Docker Compose

| Command | MongoDB | Use case |
|---------|---------|----------|
| `docker compose -f docker-compose.yml -f docker-compose.bundled-db.yml --profile bundled-db up` | Bundled `db` container | Local dev |
| `docker compose up` | External (`MONGODB_URI` in `.env.local`) | VPS prod, Atlas |

[docker-compose.yml](../../docker-compose.yml) sets `NEXUS_HOSTING_MODE=vps`. The `db` service uses profile `bundled-db` so it is opt-in.

---

## Tests

```bash
npm run test:nexus-hosting-logic
```

---

## Decision guide

```mermaid
flowchart TD
  A[Where does Nexus run?] --> B{Always-on Node?}
  B -->|Yes| C{VPS database layout?}
  C -->|Bundled local MongoDB| D[vps + bundled-db profile]
  C -->|Atlas / remote MongoDB| E[vps + external MONGODB_URI]
  B -->|No| F{Need Telegram auto-create groups?}
  F -->|No| G[serverless]
  F -->|Yes| H[hybrid + telegram-worker]
  D --> I[docker compose -f docker-compose.yml -f docker-compose.bundled-db.yml --profile bundled-db up]
  E --> J[docker compose up or bare-metal]
  G --> K[CRON_SECRET + gcs or s3 + vercel.json]
  H --> K
  H --> L[Worker with TELEGRAM_OPERATOR_SESSION]
```
