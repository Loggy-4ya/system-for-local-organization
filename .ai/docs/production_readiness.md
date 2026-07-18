# Production Readiness & Future Work

**Purpose:** Single checklist for **what must be verified before production** and **what is intentionally deferred**. Agents and operators should update this file when shipping partial features or planning go-live steps.

**Related:** [roadmap.md](./roadmap.md) (feature status) · [content_security.md](./features/content_security.md) · [media_storage.md](./features/media_storage.md) · [admin_hub.md](./features/admin_hub.md)

---

## How to use this document

| Symbol | Meaning |
|--------|---------|
| `[ ]` | Not done — required before production **or** planned follow-up |
| `[~]` | Partially done — verify or finish before relying on it in prod |
| `[x]` | Done for current scope |

When you ship code that is **dev-safe but needs prod verification**, add a row here immediately (do not leave it only in chat or PR text).

---

## 1. Before first production deploy (platform)

| Item | Status | Notes |
|------|--------|-------|
| Set strong `NEXTAUTH_SECRET`, `NEXTAUTH_URL` (public HTTPS origin) | `[ ]` | Must match browser URL |
| Configure MongoDB (`MONGODB_URI`) with backups | `[ ]` | |
| Configure OAuth secrets (Google) for prod domain | `[ ]` | |
| Configure Telegram bot token + webhook URL | `[ ]` | See [telegram_mini_app_and_bot.md](./features/telegram_mini_app_and_bot.md) |
| Seed / rotate admin credentials (`ADMIN_SEED_*`) | `[ ]` | Change defaults; link OAuth in profile after first login |
| Choose hosting mode for scheduled jobs | `[x]` | `NEXUS_HOSTING_MODE` + profile templates — [hosting_and_deployment.md](./features/hosting_and_deployment.md) |
| Docker / standalone build smoke (`npm run build && npm run start`) | `[~]` | `npm run build` verified 2026-07-18 (TypeScript + Next.js 16). Full `npm run start` + Docker image smoke still pending before production. |
| Run registered test suites for touched domains | `[ ]` | [testing.md](./testing.md) |
| GitHub `main` protection and required CI checks | `[~]` | Workflow files exist locally but are not yet committed/pushed; branch protection deferred until CI check names exist on GitHub |
| GitHub `production` environment approval + `main` branch restriction | `[~]` | Branch restrictions exist; production stack and required reviewers still pending |
| GitHub OIDC roles (no permanent AWS keys) | `[x]` | `NexusGithubIdentity` + staging deploy role live; subject `repo:Loggy-4ya/system-for-local-organization:environment:staging` |
| Immutable web + worker ECR images | `[x]` | Staging repos `nexus-staging-web` / `nexus-staging-worker` with scan-on-push + immutable tags |
| EC2 SSM management with port 22 closed | `[x]` | Staging instance `i-08b67e49f72b32061` SSM PingStatus Online; no SSH ingress |
| CloudFront private media CDN | `[x]` | Intentionally removed — local institutional deployment uses public-read S3 object URLs |
| Secrets Manager runtime env isolation | `[~]` | Secret `nexus/staging/runtime-env` exists empty — operator must upload dotenv payload before first deploy |
| Public DNS + automatic HTTPS | `[~]` | Temporary staging origin `https://52.57.18.154.sslip.io` (EIP `52.57.18.154`); replace with real DNS before production |
| Deployment health check and automatic rollback smoke | `[ ]` | Requires first successful image deploy after secrets + workflow push |
| ECR/CDK security checks in CI | `[~]` | Local CDK assertions/nag pass; GitHub Actions still need a committed workflow on `dev` |

---

## 2. Content security & XSS (this workstream)

Shipped in codebase; **production verification still required.**

| Item | Status | Action before / in production |
|------|--------|-------------------------------|
| CSP nonce mode (`CSP_USE_NONCE`) | `[~]` | **Default ON in production.** After deploy, open DevTools → Console: confirm no CSP violations on `/`, `/admin`, Puck editor, published Puck pages. Set `CSP_USE_NONCE=true` locally to reproduce prod CSP. |
| Locale layout bootstrap script nonces | `[x]` | Theme init + wallet shim + DOM-event guard streamed via `BootstrapInlineScriptsHost` with `x-nonce` |
| Puck save sanitization (`POST /api/puck`) | `[x]` | Strips unsafe `href`, media URLs, rich HTML before MongoDB write |
| Render-time URL guards (Puck blocks) | `[x]` | Defense in depth on published pages |
| SVG upload block | `[x]` | Reject `image/svg+xml` on all upload paths |
| Remote image import (HTTPS + raster sniff) | `[x]` | No SVG; SSRF guards — run `npm run test:run -- remote-image-import` |
| Sanitization audit persistence | `[~]` | Writes to `security_sanitize_audits` unless `SECURITY_SANITIZE_AUDIT_PERSIST=false`. **Review audit rows after first prod Puck saves.** |
| Admin system logs viewer | `[x]` | `/admin/logs` — content sanitization + user directory sections (legacy Admin) |
| **Prod smoke:** inject `javascript:` href in Puck → save → confirm stripped + audit row | `[ ]` | Manual acceptance test |
| **Prod smoke:** confirm YouTube/Vimeo embeds still play on published pages under CSP | `[ ]` | |
| **Prod smoke:** confirm Google avatar / Telegram images load (`img-src`) | `[ ]` | |

### Planned security follow-ups

| Item | Status | Notes |
|------|--------|-------|
| CSP reporting endpoint (`report-uri` / `report-to`) | `[ ]` | Collect browser CSP violations in prod |
| Hash-based CSP for static inline chunks (if nonce + Next.js gaps remain) | `[ ]` | Only if prod smoke finds blocked scripts |
| Sanitize **profile** rich text / about fields on API save (if not already unified) | `[ ]` | Audit `PATCH /api/profile` and broadcast compose when UI ships |
| Rate-limit repeated sanitization audit storms (same user/path) | `[ ]` | Optional abuse hardening |
| Expand audit sources beyond `puck_save` (profile, broadcasts, comments) | `[ ]` | Reuse `SecuritySanitizeAudit` model + `recordPuckSanitizeAudit` pattern |

---

## 3. Media storage & uploads

| Item | Status | Notes |
|------|--------|-------|
| Local driver (`MEDIA_STORAGE_DRIVER=local`) | `[x]` | Default dev setup |
| S3 driver (`MEDIA_STORAGE_DRIVER=s3`) | `[~]` | **Required in production** — `S3_MEDIA_BUCKET`, `S3_MEDIA_REGION` (or `AWS_REGION`), EC2 IAM role for writes; CDK media buckets allow public `GetObject` (no CloudFront) |
| Orphan upload cleanup job | `[~]` | `npm run job:media-orphan-cleanup` / API cron — configure `MEDIA_ORPHAN_MIN_AGE_HOURS`, schedule in prod |
| S3 orphan cleanup (`listInventory`) | `[x]` | Same job scans S3 when driver is `s3` |
| **Prod:** schedule orphan cleanup (cron or `MEDIA_ORPHAN_CLEANUP_INTERVAL_HOURS`) | `[ ]` | Do not rely on manual CLI in prod |
| **Prod:** run user accent field migration (one-time) | `[ ]` | `npm run job:remove-user-accent-fields` after deploy — see [auth_and_profiles.md](./features/auth_and_profiles.md) |
| **Prod:** fix optional unique email/login indexes (one-time) | `[~]` | `npm run job:fix-user-unique-indexes` — partial filter uses `{ $gt: "" }` (not `$ne`); run once per MongoDB deployment. Applied on local dev DB 2026-06-22. |
| **Prod:** verify CDN/base URL matches stored Puck media URLs | `[ ]` | When using `S3_MEDIA_PUBLIC_BASE_URL` |
| Task report media UI (Phase 5) | `[ ]` | `task-report` purpose exists; UI not wired — [media_storage.md](./features/media_storage.md) |
| Delete-on-replace for replaced uploads | `[ ]` | **Explicitly not implemented** — orphan job is the retention strategy |

---

## 4. Admin hub — deferred UI

| Item | Status | Route / API |
|------|--------|-------------|
| User Directory | `[x]` | `/admin/users` — general profile editing via `users.edit_profile`; grant permission on existing DBs via `/admin/user-access` |
| Global Layout | `[x]` | `/admin/global-layout` |
| User Access & Permissions | `[x]` | `/admin/user-access` |
| System logs (sanitization + user directory) | `[x]` | `/admin/logs` (legacy `/admin/security-audits` redirects) |
| System Broadcasts compose UI | `[ ]` | API exists — `/admin/broadcasts` planned — [system_broadcasts.md](./features/system_broadcasts.md) |
| Academic catalog review (pending specialties/groups) | `[ ]` | `/admin/academic-catalog` planned — [signin_identity_matrix.md](./features/signin_identity_matrix.md) |

---

## 5. Rich text & Puck content

| Item | Status | Notes |
|------|--------|-------|
| TipTap editor + `@` mentions | `[x]` | |
| `/` slash commands | `[x]` | |
| Page categories (editor tags) | `[x]` | Page Settings — [page_categories.md](./features/page_categories.md) |
| Page Manager category badges on page cards | `[ ]` | Data persisted on `Page.categories`; UI deferred — **§5 of page_categories.md** |
| Page hover preview on `@page` mentions | `[ ]` | [nexus_rich_text_editor.md](./features/nexus_rich_text_editor.md) |
| Use rich text on comments, task reports, news compose | `[ ]` | Editor kit ready; surfaces not all wired |

---

## 6. Telegram & ephemeral workspaces (Phase 4)

| Item | Status | Notes |
|------|--------|-------|
| Login Widget + Mini App auth merge | `[~]` | |
| Bot `/start` + webhook | `[~]` | |
| Phone harvest via bot contact | `[ ]` | |
| Ephemeral project Telegram groups | `[~]` | Manual `/link`, `/status`, `/task_done`, telegram-worker auto-create, admin policy — [telegram_project_workspaces.md](./features/telegram_project_workspaces.md) |
| Admin hosting diagnostics | `[x]` | `/admin/hosting` + `GET /api/admin/hosting-config` — [hosting_and_deployment.md](./features/hosting_and_deployment.md) |

---

## 7. Environment variables — production reference

Copy [`.env.example`](../.env.example) to `.env.local` and follow the inline comments. Summary:

| Variable | Required in prod? | Purpose |
|----------|-------------------|---------|
| `MONGODB_URI` | Yes | Database |
| `NEXTAUTH_SECRET` / `NEXTAUTH_URL` | Yes | Session signing + public site URL for OAuth |
| `CSP_USE_NONCE` | Default `true` in production | Stricter script CSP |
| `SECURITY_SANITIZE_AUDIT_PERSIST` | Default persist | Set `false` to log-only |
| `MEDIA_STORAGE_DRIVER` | Yes | `local` (dev) or `s3` (production on AWS EC2) |
| `S3_MEDIA_BUCKET` | If `s3` | S3 object storage bucket |
| `S3_MEDIA_REGION` | If `s3` | AWS region (`AWS_REGION` fallback) |
| `S3_MEDIA_PUBLIC_BASE_URL` | Optional | Override for public S3 object URLs (defaults to virtual-hosted S3 HTTPS) |
| `MEDIA_ORPHAN_MIN_AGE_HOURS` | Recommended | Hours before an unreferenced upload may be deleted (default 24) |

**Background jobs — pick one approach** ([scheduled_events.md](./features/scheduled_events.md)):

| Deployment | Set | Do not set |
|------------|-----|------------|
| **Docker / AWS EC2 (recommended)** | `SCHEDULED_EVENTS_TICK_INTERVAL_SECONDS=15` (optional `MEDIA_ORPHAN_CLEANUP_INTERVAL_HOURS=24`) | — |
| **External crontab** | `CRON_SECRET` or `NEXUS_CRON_SECRET` + HTTP/CLI job calls | `SCHEDULED_EVENTS_TICK_INTERVAL_SECONDS` |

`CRON_SECRET` authorises both `/api/admin/jobs/process-scheduled-events` and `/api/admin/jobs/media-orphan-cleanup`. Legacy `MEDIA_ORPHAN_CLEANUP_CRON_SECRET` still works but is optional.

---

## 8. Test commands — pre-release smoke

Run suites for domains you touched; minimum security/media regression:

```bash
npm run test:run -- safe-href
npm run test:run -- puck-content-sanitize
npm run test:run -- security-sanitize-audit
npm run test:run -- content-security-policy
npm run test:run -- nexus-editor-content
npm run test:run -- media-storage
npm run test:run -- remote-image-import
npm run test:run -- orphan-upload-cleanup
```

Registry: [testing.md](./testing.md)

---

## Changelog (agent-maintained)

| Date | Change |
|------|--------|
| 2026-06-19 | Initial production readiness doc: XSS/CSP, media/S3, sanitization audit, admin deferrals from security hardening workstream |
| 2026-06-19 | Added `/admin/security-audits` viewer; linked docs index at `.ai/docs/README.md` |
| 2026-06-20 | Page categories in Puck editor; Page Manager badge UI deferred — [page_categories.md](./features/page_categories.md) |
| 2026-07-16 | Added GitHub OIDC → ECR → SSM deployment automation, CDK security checks, Secrets Manager runtime env, private CloudFront media delivery, health checks, and rollback; live AWS/GitHub bootstrap remains pending credentials. |
| 2026-07-16 | Created branch-restricted GitHub `staging` and `production` environments. AWS bootstrap remains paused because the only configured CLI profile uses the account root identity and has an invalid default region (`eu-east-1`); no paid AWS resources were created. |
| 2026-07-18 | Bootstrapped CDK in `eu-central-1` with IAM user `loggy-ec2-instance` (`ide-agent`). Deployed `NexusGithubIdentity` and `NexusStaging`. Staging EIP `52.57.18.154`, SSM Online, GitHub `staging` environment variables set. Production stack not deployed. |
| 2026-07-18 | Removed CloudFront from the target architecture; media uses public-read S3 `GetObject` for local/institutional delivery. |
