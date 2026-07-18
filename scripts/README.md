# Scripts — command-line tools for Nexus

Everything in this folder is a **standalone CLI tool**. These files are **not** imported by the Next.js app at runtime — they are things you run from the terminal for setup, testing, maintenance, and background workers.

You almost always invoke them through **`npm run …`** (see `package.json`). You do not need to call the files under `scripts/` directly unless you are debugging a script itself.

---

## New here? Start with these

Most day-to-day work uses a small subset of commands:

```bash
npm install
npm run env:init          # first time only — creates .env.local from .env.example
npm run auth:check-env    # sanity-check OAuth / Telegram env vars
npm run docker:up         # app + MongoDB in Docker (see docker-compose.yml)
```

**Testing Google or Telegram login locally?** OAuth needs a public HTTPS URL — use the ngrok tunnel scripts:

```bash
npm run dev:tunnel        # start tunnel, sync NEXTAUTH_URL, restart web container
```

Full walkthrough: [`.ai/docs/features/local_oauth_setup.md`](../.ai/docs/features/local_oauth_setup.md)

**On a team with shared secrets?** See [`.ai/docs/env_and_secrets.md`](../.ai/docs/env_and_secrets.md) — use `env:pull-team` instead of hand-copying keys.

---

## Folder map

Each subfolder is one **domain**. Put new scripts in the matching folder — do not add a catch-all `misc/` folder.

```
scripts/
  env/              Environment files (.env.local, dotenvx team secrets)
  auth/             Auth env validation
  deploy/           AWS/GitHub CI/CD bootstrap and EC2 rollout scripts
  dev/tunnel/       ngrok tunnel for local HTTPS OAuth
  test/             Test runner + suite registry
  jobs/             One-shot maintenance / cron-style jobs
    migrations/     One-off database migrations (run once per environment)
  workers/          Long-running sidecar processes
  lib/              Shared helpers (not run directly)
```

---

## Environment (`env/`)

**What it does:** Creates and manages `.env.local` (what the app reads) and optional encrypted `.env.staging` (team-shared secrets in git).

| When you need it | Command |
|------------------|---------|
| First clone — create your local env file | `npm run env:init` |
| Join a team — decrypt shared staging secrets | `npm run env:pull-team` |
| Maintainer — publish your `.env.local` to the team vault | `npm run env:encrypt-local` |
| Maintainer — re-encrypt after editing `.env.staging` | `npm run env:encrypt-team` |
| Run any command with staging secrets without writing `.env.local` | `npm run env:run -- <command>` |

**Deep dive:** [`.ai/docs/env_and_secrets.md`](../.ai/docs/env_and_secrets.md)

---

## Auth checks (`auth/`)

**What it does:** Validates that OAuth and Telegram-related variables in `.env.local` look correct — without printing secret values.

| When you need it | Command |
|------------------|---------|
| After editing auth env vars, or before debugging login | `npm run auth:check-env` |

**Deep dive:** [`.ai/docs/features/local_oauth_setup.md`](../.ai/docs/features/local_oauth_setup.md)

---

## Local dev tunnel (`dev/tunnel/`)

**What it does:** Runs **ngrok on your host machine** so Google OAuth and the Telegram Login Widget get a real HTTPS URL pointing at your local app (usually port `8080`).

| When you need it | Command |
|------------------|---------|
| Start tunnel + update `.env.local` + restart web | `npm run dev:tunnel` |
| Tunnel already running — refresh `NEXTAUTH_URL` only | `npm run dev:tunnel:sync` |
| Stop the tunnel | `npm run dev:tunnel:stop` |
| Save ngrok authtoken to ngrok config (one-time setup) | `npm run dev:tunnel:setup` |
| Diagnose ngrok / env / Docker issues | `npm run dev:tunnel:doctor` |

**Prerequisite:** Install ngrok on the host (`snap install ngrok` or [ngrok.com/download](https://ngrok.com/download)) and set `NGROK_AUTHTOKEN` in `.env.local`.

**Deep dive:** [`.ai/docs/features/local_oauth_setup.md`](../.ai/docs/features/local_oauth_setup.md)

---

## Cloud deployment (`deploy/`)

**What it does:** Connects CDK stack outputs to protected GitHub Environments
and performs locked, health-checked EC2 rollouts from immutable ECR images.

| Script | Invocation | Purpose |
|--------|------------|---------|
| `configureGithubDeployment.mjs` | `npm run deploy:configure-github -- staging https://staging.example.com [bot_username]` | Create/update the GitHub Environment, non-secret variables, release-branch restriction, and branch protection |
| `deployFromEcr.sh` | SSM only | Pull runtime env from Secrets Manager, deploy one Git SHA, verify health, and roll back on failure |

`deployFromEcr.sh` is not a workstation command. The CDK-managed SSM document
downloads the release copy from the private deployment bucket and invokes it on
the environment EC2 instance.

Prerequisites and the one-time AWS/GitHub sequence are documented in
[hosting_and_deployment.md](../.ai/docs/features/hosting_and_deployment.md).

---

## Tests (`test/`)

**What it does:** Runs automated test suites registered in `testRegistry.json`. Unit tests live under `tests/` at the repo root — not inside `scripts/`.

| When you need it | Command |
|------------------|---------|
| Run all unit suites | `npm test` |
| Run one suite by id | `npm run test:run -- carousel-pagination` |
| List all suite ids | `npm run test:list` |
| Run all Puck-related unit suites | `npm run test:puck` |
| Run a Playwright browser suite | `npm run test:run -- browser:puck-mobile-panel` |

**Adding a new test:** register it in [`test/testRegistry.json`](test/testRegistry.json) and [`.ai/docs/testing.md`](../.ai/docs/testing.md). Put the `*.test.ts` file under `tests/`, not here.

**Deep dive:** [`.ai/docs/testing.md`](../.ai/docs/testing.md)

---

## Jobs (`jobs/`)

**What it does:** Short-lived CLI tasks you run manually or from cron. **Requires MongoDB** — use the same `MONGODB_URI` as the app (Docker or Atlas).

| When you need it | Command |
|------------------|---------|
| Delete orphaned S3 uploads with no DB reference | `npm run job:media-orphan-cleanup` |
| Preview orphan cleanup (no deletes) | `npm run job:media-orphan-cleanup:dry-run` |
| Process due scheduled events (reminders, etc.) | `npm run job:process-scheduled-events` |
| Preview scheduled events pass | `npm run job:process-scheduled-events:dry-run` |

In production, the scheduler usually runs inside Docker; these commands are for manual runs and debugging.

---

## Migrations (`jobs/migrations/`)

**What it does:** **One-off** database fixes or schema migrations. Run each migration **once per environment** (local, staging, prod) when upgrading — not on every deploy.

Always try **`--dry-run`** first when available.

| Migration | Command |
|-----------|---------|
| Remove legacy per-user accent fields | `npm run job:remove-user-accent-fields` |
| Fix partial unique indexes on `User` | `npm run job:fix-user-unique-indexes` |
| Migrate global layout header data | `npm run job:migrate-global-layout-header` |

Each command has a matching `:dry-run` npm script (e.g. `npm run job:fix-user-unique-indexes:dry-run`).

---

## Workers (`workers/`)

**What it does:** Long-running processes that poll MongoDB and talk to external APIs — separate from the Next.js web server.

| When you need it | Command |
|------------------|---------|
| Run Telegram MTProto worker locally | `npm run worker:telegram` |
| Run worker in Docker (typical dev setup) | `npm run docker:up` (includes `telegram-worker` service) |

**Deep dive:** [`.ai/docs/features/telegram_project_workspaces.md`](../.ai/docs/features/telegram_project_workspaces.md)

---

## Shared helpers (`lib/`)

**What it does:** Small utilities used by other scripts (e.g. finding the repo root no matter how deep a script lives under `scripts/`).

You do **not** run these directly. Import from sibling scripts when needed.

---

## Rules for contributors

When adding or moving scripts:

1. **Pick the right folder** — match an existing domain above; no `scripts/misc/`.
2. **Wire an npm script** in `package.json` so humans discover it via `npm run`.
3. **Document in JSDoc** at the top of the file: purpose, `npm run …` command, and links to `.ai/docs/` if relevant.
4. **New test suites** → [`test/testRegistry.json`](test/testRegistry.json) + [`.ai/docs/testing.md`](../.ai/docs/testing.md). Test **files** go in `tests/`, not `scripts/`.
5. **Do not put here:** React components, API routes, Mongoose models, or anything the web app imports at runtime.

Full placement rules: [`.ai/docs/directory_hygiene.md`](../.ai/docs/directory_hygiene.md)

---

## Related docs

| Topic | Doc |
|-------|-----|
| Env files & dotenvx | [`.ai/docs/env_and_secrets.md`](../.ai/docs/env_and_secrets.md) |
| Local OAuth / ngrok | [`.ai/docs/features/local_oauth_setup.md`](../.ai/docs/features/local_oauth_setup.md) |
| Test registry | [`.ai/docs/testing.md`](../.ai/docs/testing.md) |
| Where files belong | [`.ai/docs/directory_hygiene.md`](../.ai/docs/directory_hygiene.md) |
| Docker & deploy | [`.ai/docs/features/hosting_and_deployment.md`](../.ai/docs/features/hosting_and_deployment.md) |
