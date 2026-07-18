# Environment variables & team secrets (dotenvx)

**Status:** `[x] Completed` — single root `.env.example`, runtime `.env.local`, optional encrypted `.env.staging` for teams.

**Related:** [hosting_and_deployment.md](./features/hosting_and_deployment.md), [`.env.example`](../.env.example), [local_oauth_setup.md](./features/local_oauth_setup.md)

---

## Overview

Nexus uses a **two-layer** env model:

| Layer | File | In git? | Purpose |
|-------|------|---------|---------|
| Template | [`.env.example`](../.env.example) | Yes | All supported variables, dev defaults, comments for prod (S3, Atlas) |
| Runtime | `.env.local` | **No** | What Next.js, Docker, and workers read at runtime |
| Team staging | `.env.staging` | Yes (encrypted) | Shared staging secrets for the team — optional |
| Decryption key | `.env.keys` | **No** | dotenvx private key — share via password manager only |

There are **no env profile files** (no `vps-bundled`, `config/env/`, etc.). One template; you customize `.env.local` for your machine or server.

Production CI/CD adds a separate authoritative layer: AWS Secrets Manager stores
the encrypted runtime env for each deployed environment. During an SSM rollout,
the EC2 instance role reads its one allowed secret and atomically materializes
`/opt/nexus/.env.local` with mode `0600`. GitHub Actions cannot read this secret,
and no secret is passed in an SSM command parameter or Docker image.

**Implementation:** [`scripts/env/`](../scripts/env/) · package `@dotenvx/dotenvx` · index [`scripts/README.md`](../scripts/README.md)

---

## Mental model

```
Solo dev:
  .env.example  ──npm run env:init──►  .env.local  ──►  Next.js / Docker

Team (dotenvx):
  .env.staging (encrypted, in git)
        │
        ├── npm run env:pull-team  ──►  .env.local  ──►  Next.js / Docker
        │
        └── npm run env:run -- <cmd>  (in-memory only, no .env.local write)
```

Docker Compose loads `.env.local` via `env_file:` on `web`, `web-prod`, and `telegram-worker` services.

---

## Solo developer (first machine)

```bash
npm install
npm run env:init              # copies .env.example → .env.local (skips if exists)
```

Edit `.env.local` — minimum:

| Variable | Notes |
|----------|--------|
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` |
| `ADMIN_SEED_LOGIN` / `ADMIN_SEED_PASSWORD` | Dev admin sign-in |
| `MONGODB_URI` | Default `mongodb://db:27017/nexus` for bundled Docker; change for Atlas |

```bash
npm run auth:check-env
npm run docker:up             # bundled MongoDB
# or: npm run docker:up:external   (Atlas — set MONGODB_URI first)
```

**Node without Docker:** set `MONGODB_URI=mongodb://localhost:27017/nexus` if MongoDB runs on the host, then `npm run dev`.

---

## Team secrets with dotenvx

[dotenvx](https://dotenvx.com) encrypts env files so **ciphertext can live in git** while **keys stay private**.

### Maintainer — first-time setup

**From an existing `.env.local` (fastest):**

```bash
npm run env:encrypt-local
# copies .env.local → .env.staging, encrypts in place, writes .env.keys
git add .env.staging
git commit -m "Add encrypted team staging env"
# Store .env.keys in team vault — never commit
```

**From the plain template:**

```bash
npm install

cp .env.staging.plain.example .env.staging
# Edit .env.staging with real shared staging values (Atlas, OAuth, Telegram, etc.)

npm run env:encrypt-team
# Creates/updates .env.keys in repo root — DO NOT commit this file

git add .env.staging
git commit -m "Add encrypted team staging env"

# Store .env.keys in team vault (1Password, Bitwarden, etc.)
```

After encrypt, values in `.env.staging` look like `encrypted:…` — safe to commit.

### Developer — join the team

```bash
npm install

# Copy .env.keys from team vault into repo root (gitignored)

npm run env:pull-team
# Decrypts .env.staging → writes .env.local

npm run docker:up
```

If pull fails: confirm `.env.staging` exists in the repo clone and you have `.env.keys` (or `DOTENV_PRIVATE_KEY` in the shell).

### Run a command without writing `.env.local`

```bash
npm run env:run -- npm run dev
npm run env:run -- npm run auth:check-env
```

Loads decrypted `.env.staging` for that process only.

### Rotate or update team secrets

1. Ensure you have `.env.keys` locally.
2. Decrypt if needed: `npx @dotenvx/dotenvx decrypt -f .env.staging`
3. Edit `.env.staging` (plaintext on disk briefly).
4. `npm run env:encrypt-team`
5. Commit updated `.env.staging`; redistribute `.env.keys` if dotenvx rotated keys.
6. Teammates re-run `npm run env:pull-team` and restart containers.

---

## npm scripts reference

| Script | Command | Purpose |
|--------|---------|---------|
| `npm run env:init` | `scripts/env/envInit.mjs` | `.env.example` → `.env.local` |
| `npm run env:encrypt-local` | `scripts/env/envDotenvx.mjs encrypt-local` | `.env.local` → `.env.staging` → encrypt |
| `npm run env:pull-team` | `scripts/env/envDotenvx.mjs pull` | Decrypt `.env.staging` → `.env.local` |
| `npm run env:encrypt-team` | `scripts/env/envDotenvx.mjs encrypt` | Re-encrypt `.env.staging` after edit |
| `npm run env:run -- <cmd>` | `scripts/env/envDotenvx.mjs run` | Run `<cmd>` with `.env.staging` loaded |

---

## Commit rules

| Do commit | Do not commit |
|-----------|----------------|
| `.env.example` | `.env.local` |
| `.env.staging` (after encrypt) | `.env.keys` |
| `.env.staging.plain.example` | `.env.staging.plain` (working copy while editing) |
| | Real secrets in `.env.example` |

See [`.gitignore`](../.gitignore): `.env*.local`, `.env.keys`, `.env.staging.plain`.

---

## Common scenarios

### External MongoDB (Atlas) locally

```bash
npm run env:init
# Set MONGODB_URI=mongodb+srv://... in .env.local
npm run docker:up:external
```

### Production AWS EC2

For manual deployments, copy or pull env into `.env.local`. For GitHub CI/CD,
store the complete dotenv payload in the environment Secrets Manager secret;
the EC2 deployment script creates `.env.local` from it.

Set at minimum:

- `MONGODB_URI` (Atlas)
- `NEXTAUTH_SECRET`, `NEXTAUTH_URL` (public HTTPS)
- `MEDIA_STORAGE_DRIVER=s3`, `S3_MEDIA_BUCKET`, `S3_MEDIA_REGION`
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_OPERATOR_SESSION`, `TELEGRAM_API_ID`, `TELEGRAM_API_HASH`

Full deploy steps: [hosting_and_deployment.md](./features/hosting_and_deployment.md).

### GitHub Actions credentials

GitHub uses OIDC to assume an environment-specific AWS IAM role. Do **not** add
`AWS_ACCESS_KEY_ID` or `AWS_SECRET_ACCESS_KEY` to GitHub secrets.

GitHub Environment variables contain non-secret deployment coordinates such as
the AWS region, role ARN, stack name, instance tag, ECR repository names, and
public build-time `NEXT_PUBLIC_*` values. Runtime credentials remain in Secrets
Manager.

The dotenvx private key remains a team-local onboarding credential. CI/CD does
not require it in the recommended architecture. If a temporary legacy workflow
must decrypt `.env.staging`, add only the private key value as the protected
environment secret `DOTENV_PRIVATE_KEY`; never upload `.env.keys`, and remove
the secret after migration to Secrets Manager.

### `env:init` vs `env:pull-team`

| Situation | Use |
|-----------|-----|
| New machine, no team staging | `env:init` |
| Team uses encrypted `.env.staging` | `env:pull-team` |
| `.env.local` already exists | Neither overwrites — delete or edit manually first |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `Missing .env.keys` on pull | Get key from team vault; place at repo root |
| `Missing .env.staging` | Maintainer must commit encrypted file; or use `env:init` for solo dev |
| Docker still has old env | `docker compose --profile dev up -d --force-recreate web telegram-worker` |
| Worker crash-loop | Check `TELEGRAM_OPERATOR_SESSION`, `TELEGRAM_API_ID`, `TELEGRAM_API_HASH`, `TELEGRAM_BOT_TOKEN` in `.env.local` |
| OAuth / Telegram misconfigured | `npm run auth:check-env` |

---

## Variable catalogue

Every supported variable with inline comments: [`.env.example`](../.env.example).

Production-specific values (S3 required, Atlas, EC2): [hosting_and_deployment.md](./features/hosting_and_deployment.md).
