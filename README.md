# Project Nexus

Institutional management and automation platform for student councils — visual pages (Puck), tasks, profiles, RBAC, Telegram workspaces, and admin tooling. Built with **Next.js**, **MongoDB**, and **Docker**.

---

## Quick start (humans)

### Prerequisites

| Tool | Version / notes |
|------|-----------------|
| Node.js | 20+ recommended |
| npm | ships with Node |
| Docker + Compose | optional but recommended for local dev |
| MongoDB | bundled via Compose **or** remote (Atlas) |

### 1. Configure environment

Pick **one** profile and copy it to `.env.local` (gitignored):

| Goal | Command |
|------|---------|
| **Local dev — app + MongoDB in Docker** | `cp .env.vps.example .env.local` |
| **Local dev — remote MongoDB (Atlas, etc.)** | `cp .env.vps-external-db.example .env.local` |
| **Look up any variable** | open [`.env.example`](.env.example) |

Minimum edits in `.env.local`:

- `NEXTAUTH_SECRET` — random string (required)
- `ADMIN_SEED_LOGIN` / `ADMIN_SEED_PASSWORD` — dev admin account (see [auth docs](.ai/docs/features/auth_and_profiles.md))
- `MONGODB_URI` — only when using **external** MongoDB (Atlas connection string)

> **Note:** If you use Atlas, set `MONGODB_URI` to your `mongodb+srv://…` string. The bundled Docker MongoDB on `localhost:27017` is a **separate** database from Atlas.

### 2. Start the app

**Option A — Docker with bundled MongoDB (fastest on a laptop)**

```bash
cp .env.vps.example .env.local
# edit NEXTAUTH_SECRET and ADMIN_SEED_PASSWORD
docker compose -f docker-compose.yml -f docker-compose.bundled-db.yml --profile bundled-db up
```

Open **http://localhost:8080**

**Option B — Docker web + external MongoDB (typical with Atlas)**

```bash
cp .env.vps-external-db.example .env.local
# set MONGODB_URI, NEXTAUTH_SECRET, admin seed, NEXTAUTH_URL=http://localhost:8080
docker compose up
```

Open **http://localhost:8080**

**Option C — Node only (MongoDB must already be reachable)**

```bash
cp .env.vps.example .env.local   # or .env.vps-external-db.example for Atlas
npm install
npm run dev
```

Open **http://localhost:3000** (default Next.js port)

### 3. Sign in

1. Go to `/login`
2. Use the **login handle** from `ADMIN_SEED_LOGIN` (default `admin`), not email
3. Password from `ADMIN_SEED_PASSWORD`

Admin tools live at `/admin`. Page catalog at `/pages`. Visual editor at `/<slug>/edit`.

### 4. Verify setup (optional)

```bash
npm run auth:check-env          # OAuth / Telegram env sanity check
npm run test:global-layout      # quick logic test (no real DB required)
```

---

## Common URLs

| URL | Purpose |
|-----|---------|
| `/` | Marketing homepage |
| `/pages` | Public page catalog |
| `/pages/edit` | Page manager (publishers) |
| `/tasks` | Task manager |
| `/profile` | Signed-in profile |
| `/admin` | Administration hub |
| `/admin/global-layout` | Header / footer editor |
| `/login` | Sign in |

---

## Development commands

```bash
npm run dev              # Next.js dev server (0.0.0.0)
npm run build            # Production build
npm run start            # Production server
npm run lint             # ESLint

npm run test:puck        # Puck / canvas logic test bundle
npm run test:global-layout
npm run test:browser:install   # Playwright Chromium (first time)
```

Full test registry: [`.ai/docs/testing.md`](.ai/docs/testing.md)

One-off maintenance jobs: `npm run job:*` (see `package.json` and [`scripts/`](scripts/))

---

## Deployment

Nexus supports **VPS (Docker)**, **Vercel serverless**, and **hybrid** (Vercel + Telegram worker). Do not guess env vars — follow the canonical guide:

| Topic | Document |
|-------|----------|
| **Hosting profiles & Docker** | [`.ai/docs/features/hosting_and_deployment.md`](.ai/docs/features/hosting_and_deployment.md) |
| **Pre-go-live checklist** | [`.ai/docs/production_readiness.md`](.ai/docs/production_readiness.md) |
| **Env templates** | `.env.example`, `.env.vps.example`, `.env.vps-external-db.example`, `.env.vercel.example`, `.env.hybrid.example`, `.env.aws.example` |

---

## Repository layout

```
nexus-web/
├── src/           Next.js App Router (UI + API routes)
├── shared/        Mongoose models, domain engines, shared logic
├── tests/         Automated tests (*.test.ts, e2e specs)
├── scripts/       CLI jobs (migrations, workers, tunnel helpers)
├── .ai/docs/      Living architecture & feature specifications
├── AGENTS.md      AI agent contract (read before coding)
├── docker-compose.yml
└── .env.local     Your secrets (create from *.example — not committed)
```

Detailed map: [`.ai/docs/architecture_map.md`](.ai/docs/architecture_map.md)

---

## Documentation index

| Audience | Start here |
|----------|------------|
| **Developers** | This README → [`.ai/docs/README.md`](.ai/docs/README.md) |
| **AI agents / Cursor** | [`AGENTS.md`](AGENTS.md) → [`.ai/docs/README.md`](.ai/docs/README.md) |
| **Feature depth** | [`.ai/docs/features/`](.ai/docs/features/) |
| **What's done vs planned** | [`.ai/docs/roadmap.md`](.ai/docs/roadmap.md) |

---

## For AI agents and automated tooling

<!-- nexus:machine-readme:start -->
```yaml
project:
  name: nexus-web
  description: Containerized institutional management platform (Next.js + MongoDB + Puck + Telegram)
  default_branch: dev

entrypoints:
  human_readme: README.md
  agent_contract: AGENTS.md
  docs_index: .ai/docs/README.md
  architecture: .ai/docs/architecture_map.md
  directory_hygiene: .ai/docs/directory_hygiene.md
  testing_registry: .ai/docs/testing.md
  roadmap: .ai/docs/roadmap.md
  production_checklist: .ai/docs/production_readiness.md
  deployment: .ai/docs/features/hosting_and_deployment.md

stack:
  runtime: node
  framework: nextjs
  database: mongodb
  odm: mongoose
  ui_editor: puck
  auth: next-auth
  containers: docker-compose

code_layout:
  app_ui_and_api: src/
  models_domains_shared_logic: shared/
  tests: tests/          # never place *.test.ts in src/ or shared/
  maintenance_scripts: scripts/
  living_docs: .ai/docs/

architecture_rules:
  - Consolidate business logic in shared/domains/*Domain.ts (one domain per file)
  - Mongoose schemas only in shared/models/
  - Read .ai/docs/ before code changes; update docs when behavior changes
  - Register new tests in .ai/docs/testing.md and package.json
  - AGENTS.md overrides guesses; feature specs override AGENTS.md summaries

env_profiles:
  master_catalog: .env.example
  local_docker_bundled_db: .env.vps.example
  local_or_vps_external_db: .env.vps-external-db.example
  vercel_serverless: .env.vercel.example
  vercel_plus_worker: .env.hybrid.example
  aws_s3_media: .env.aws.example
  runtime_file: .env.local          # gitignored — never commit

quick_start:
  bundled_mongo:
    - cp .env.vps.example .env.local
    - set NEXTAUTH_SECRET, ADMIN_SEED_LOGIN, ADMIN_SEED_PASSWORD
    - docker compose -f docker-compose.yml -f docker-compose.bundled-db.yml --profile bundled-db up
    - open http://localhost:8080
  external_mongo:
    - cp .env.vps-external-db.example .env.local
    - set MONGODB_URI, NEXTAUTH_SECRET, NEXTAUTH_URL, admin seed
    - docker compose up
    - open http://localhost:8080
  node_only:
    - cp .env.vps.example .env.local OR .env.vps-external-db.example
    - npm install && npm run dev
    - open http://localhost:3000

hosting_modes:
  vps: in-process scheduler; local/gcs/s3 media
  serverless: vercel cron; gcs/s3 media required in prod
  hybrid: vercel web + separate telegram-worker

common_jobs:
  migrate_global_layout_header: npm run job:migrate-global-layout-header
  remove_user_accent_fields: npm run job:remove-user-accent-fields
  process_scheduled_events: npm run job:process-scheduled-events
  telegram_worker: npm run worker:telegram

question_router:
  deploy: .ai/docs/features/hosting_and_deployment.md
  architecture: .ai/docs/architecture_map.md
  auth: .ai/docs/features/auth_and_profiles.md
  puck_pages: .ai/docs/features/puck_editor.md
  admin_ui: .ai/docs/features/admin_hub.md
  tests: .ai/docs/testing.md
```
<!-- nexus:machine-readme:end -->

**Agent protocol:** Read [`AGENTS.md`](AGENTS.md) before modifying code. Use the YAML block above for structured context; use linked `.ai/docs/` files as authoritative feature specs.

---

## License

Private institutional project — see repository ownership for usage terms.
