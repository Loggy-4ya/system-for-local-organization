# Scripts directory

CLI entrypoints and maintenance tools — **not** imported by the Next.js app at runtime.

**Index:** Each subdirectory is one domain. Add new scripts to the matching folder only.

| Directory | Purpose | npm scripts |
|-----------|---------|-------------|
| [`env/`](env/) | `.env.local` setup, dotenvx team staging | `env:init`, `env:encrypt-local`, `env:pull-team`, `env:encrypt-team`, `env:run` |
| [`auth/`](auth/) | OAuth / Telegram env validation | `auth:check-env` |
| [`dev/tunnel/`](dev/tunnel/) | Host ngrok tunnel for local HTTPS OAuth | `dev:tunnel`, `dev:tunnel:*` |
| [`test/`](test/) | Test registry and runner | `test`, `test:run`, `test:list`, `test:puck` |
| [`jobs/`](jobs/) | Background job CLIs (MongoDB required) | `job:media-orphan-cleanup`, `job:process-scheduled-events` |
| [`jobs/migrations/`](jobs/migrations/) | One-off data / index migrations | `job:remove-user-accent-fields`, `job:fix-user-unique-indexes`, `job:migrate-global-layout-header` |
| [`workers/`](workers/) | Long-running sidecar processes | `worker:telegram`, Docker `telegram-worker` |
| [`lib/`](lib/) | Shared helpers (`findRepoRoot`) — not invoked directly | — |

## Conventions

- **Registry:** New test suites → [`test/testRegistry.json`](test/testRegistry.json) + [`.ai/docs/testing.md`](../.ai/docs/testing.md).
- **Env docs:** [`.ai/docs/env_and_secrets.md`](../.ai/docs/env_and_secrets.md) · scripts in [`env/`](env/)
- **Repo root:** Scripts use [`lib/repoRoot`](lib/repoRoot.mjs) — safe at any nesting depth under `scripts/`.
- **Do not** add application UI, Mongoose models, or `*.test.ts` files here — see [directory_hygiene.md](../.ai/docs/directory_hygiene.md).

## Layout

```
scripts/
  lib/           shared helpers
  env/           environment & dotenvx
  auth/          auth env tooling
  dev/tunnel/    ngrok dev tunnel
  test/          test runner + registry
  jobs/          cron/CLI jobs
    migrations/  one-off DB migrations
  workers/       long-running workers
```
