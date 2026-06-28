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

### 1. Install and configure environment

**Solo / first-time setup:**

```bash
npm install
npm run env:init                  # copies .env.example → .env.local
```

Edit `.env.local` (minimum):

- `NEXTAUTH_SECRET` — random string (`openssl rand -base64 32`)
- `ADMIN_SEED_LOGIN` / `ADMIN_SEED_PASSWORD` — dev admin account
- `MONGODB_URI` — only when using **external** MongoDB (Atlas)

**Team member with shared staging** — get `.env.keys` from your team vault, then:

```bash
npm install
npm run env:pull-team             # decrypts .env.staging → .env.local
```

Full env guide: **[`.ai/docs/env_and_secrets.md`](.ai/docs/env_and_secrets.md)** (dotenvx, solo vs team, all scripts).

| Goal | Command |
|------|---------|
| **First-time local setup** | `npm run env:init` |
| **Team shared staging secrets** | `npm run env:pull-team` |
| **Variable reference** | [`.env.example`](.env.example) · [env_and_secrets.md](.ai/docs/env_and_secrets.md) |

### 2. Start the app

**Option A — Docker with bundled MongoDB (fastest on a laptop)**

```bash
npm run env:init                  # skip if .env.local exists
npm run docker:up
```

Open **http://localhost:8080**

**Option B — Docker web + external MongoDB (Atlas)**

```bash
npm run env:init
# set MONGODB_URI in .env.local
npm run docker:up:external
```

**Option C — Node only (MongoDB must already be reachable)**

```bash
npm run env:init
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
npm run auth:check-env
npm run test:run -- global-layout
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

npm run env:init         # .env.example → .env.local
npm run env:pull-team    # Team dotenvx .env.staging → .env.local
npm run docker:up        # Dev — web + worker + bundled MongoDB
npm run docker:up:external   # Dev — web + worker + external MongoDB
npm run docker:up:prod       # EC2 production — web-prod + worker

npm test                 # All unit test suites
npm run test:run -- carousel-pagination   # One suite by id
npm run test:list        # List registered suite ids
npm run test:puck        # Puck canvas logic bundle
npm run test:run -- browser:puck-mobile-panel   # Playwright (after test:run -- browser:install)
```

Test registry: [`.ai/docs/testing.md`](.ai/docs/testing.md) · suite definitions: [`scripts/test/testRegistry.json`](scripts/test/testRegistry.json)

One-off maintenance jobs: `npm run job:*` (see `package.json` and [`scripts/`](scripts/))

---

## Deployment

Production targets **AWS EC2 (Docker)** with **MongoDB Atlas** and **Amazon S3** for media. Local dev uses Docker with bundled or external MongoDB. Do not guess env vars — follow the canonical guide:

| Topic | Document |
|-------|----------|
| **Hosting & Docker** | [`.ai/docs/features/hosting_and_deployment.md`](.ai/docs/features/hosting_and_deployment.md) |
| **Env & dotenvx** | [`.ai/docs/env_and_secrets.md`](.ai/docs/env_and_secrets.md) |
| **Env template** | [`.env.example`](.env.example) |
| **Pre-go-live checklist** | [`.ai/docs/production_readiness.md`](.ai/docs/production_readiness.md) |

---

## Repository layout

```
nexus-web/
├── src/                 Next.js App Router (UI + API routes)
├── shared/              Mongoose models, domain engines, shared logic
├── tests/               Automated tests (*.test.ts, e2e specs)
├── scripts/             CLI jobs — see scripts/README.md (env, auth, jobs, test, workers)
├── .ai/docs/            Living architecture & feature specifications
├── AGENTS.md            AI agent contract (read before coding)
├── docker-compose.yml   All dev + prod services (Compose profiles)
├── .env.example           Committed env template
├── .env.staging           Team secrets (dotenvx encrypted, optional)
└── .env.local             Your secrets (gitignored)
```

Detailed map: [`.ai/docs/architecture_map.md`](.ai/docs/architecture_map.md)

---

## Documentation index

| Audience | Start here |
|----------|------------|
| **Developers** | This README → [env_and_secrets.md](.ai/docs/env_and_secrets.md) → [`.ai/docs/README.md`](.ai/docs/README.md) |
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
  env_guide: .ai/docs/env_and_secrets.md
  docs_index: .ai/docs/README.md
  architecture: .ai/docs/architecture_map.md
  directory_hygiene: .ai/docs/directory_hygiene.md
  testing_registry: .ai/docs/testing.md
  test_registry_json: scripts/test/testRegistry.json
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
  team_secrets: dotenvx

code_layout:
  app_ui_and_api: src/
  models_domains_shared_logic: shared/
  tests: tests/
  maintenance_scripts: scripts/
  scripts_index: scripts/README.md
  env_config: .env.example
  living_docs: .ai/docs/

architecture_rules:
  - Consolidate business logic in shared/domains/*Domain.ts (one domain per file)
  - Mongoose schemas only in shared/models/
  - Read .ai/docs/ before code changes; update docs when behavior changes
  - Register new tests in scripts/test/testRegistry.json and .ai/docs/testing.md
  - AGENTS.md overrides guesses; feature specs override AGENTS.md summaries

env_files:
  template: .env.example
  team_staging_encrypted: .env.staging
  runtime_file: .env.local

quick_start:
  solo:
    - npm install
    - npm run env:init
    - set NEXTAUTH_SECRET, ADMIN_SEED_LOGIN, ADMIN_SEED_PASSWORD in .env.local
    - npm run docker:up
    - open http://localhost:8080
  team_staging:
    - npm install
    - place .env.keys from team vault
    - npm run env:pull-team
    - npm run docker:up
  external_mongo:
    - npm run env:init
    - set MONGODB_URI in .env.local
    - npm run docker:up:external

hosting_modes:
  vps: only supported mode — AWS EC2 / Docker; in-process scheduler; S3 media required in production

test_commands:
  all_unit: npm test
  one_suite: npm run test:run -- <suite-id>
  list: npm run test:list
  registry: scripts/test/testRegistry.json

common_jobs:
  migrate_global_layout_header: npm run job:migrate-global-layout-header
  remove_user_accent_fields: npm run job:remove-user-accent-fields
  process_scheduled_events: npm run job:process-scheduled-events
  telegram_worker: npm run worker:telegram

question_router:
  deploy: .ai/docs/features/hosting_and_deployment.md
  env: .ai/docs/env_and_secrets.md
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
