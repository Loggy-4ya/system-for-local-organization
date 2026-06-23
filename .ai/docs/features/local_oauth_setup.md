# Local OAuth & Telegram Auth Setup

**Status:** `[x] Completed` — ngrok tunnel workflow, env validator, Apple JWT helper.

**Related:** [auth_and_profiles.md](./auth_and_profiles.md), [telegram_mini_app_and_bot.md](./telegram_mini_app_and_bot.md), [signin_identity_matrix.md](./signin_identity_matrix.md)

---

## Why ngrok is required (not LAN IP)

| Provider | LAN IP (`192.168.x.x`) | `localhost` | ngrok HTTPS |
|----------|------------------------|-------------|-------------|
| **Google OAuth** | Rejected — must end with public TLD | Works on desktop only | Works everywhere |
| **Telegram Login Widget** | No widget / “bot domain invalid” | Unreliable — needs HTTPS | Works |
| **Apple Sign In** | Rejected | Limited | Works |

**Do not use `http://192.168.x.x:8080` for OAuth testing.** Use **`npm run dev:tunnel`** and open the ngrok URL.

---

## Quick start (recommended)

```bash
# 1. App + MongoDB
docker compose -f docker-compose.yml -f docker-compose.bundled-db.yml --profile bundled-db up -d

# 2. Add to .env.local (get token from https://dashboard.ngrok.com/get-started/your-authtoken)
NGROK_AUTHTOKEN=your_ngrok_authtoken

# 3. Optional — stable URL so Google/BotFather config survives restarts
NGROK_STATIC_DOMAIN=your-name.ngrok-free.app

# 4. Start tunnel + sync NEXTAUTH_URL + recreate web
npm run dev:tunnel

# 5. Register the printed URLs (Google Console, @BotFather /setdomain)
# 6. Open https://YOUR-NGROK-URL/login
```

---

## ngrok commands (host binary)

Install once: `sudo snap install ngrok` or https://ngrok.com/download

| Command | Purpose |
|---------|---------|
| `npm run dev:tunnel` | Start **host** ngrok, sync `.env.local`, recreate web |
| `npm run dev:tunnel:sync` | Re-read ngrok URL when tunnel already running |
| `npm run dev:tunnel:setup` | Save authtoken to ngrok config (`ngrok config add-authtoken`) |
| `npm run auth:check-env` | Validate auth env without printing secrets |

**Manual:**

```bash
ngrok http --domain=your-name.ngrok-free.dev 8080   # static domain
# or
ngrok http 8080

npm run dev:tunnel:sync
docker compose up -d --force-recreate web
```

`.env.local`:

```bash
NGROK_AUTHTOKEN=...                              # dashboard.ngrok.com
NGROK_STATIC_DOMAIN=your-name.ngrok-free.dev     # hostname only, no https://
NGROK_LOCAL_PORT=8080                            # optional, default 8080
```

---

## Register external services (once per ngrok URL)

After `npm run dev:tunnel`, the sync script prints:

### Google Cloud Console

- **Authorized JavaScript origins:** `https://YOUR-SUBDOMAIN.ngrok-free.app`
- **Authorized redirect URIs:** `https://YOUR-SUBDOMAIN.ngrok-free.app/api/auth/callback/google`

Add credentials to `.env.local`:

```bash
GOOGLE_CLIENT_ID=....apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=....
```

### Telegram — @BotFather

```
/setdomain
@your_bot_username
YOUR-SUBDOMAIN.ngrok-free.app
```

Host only — no `https://`, no port. Widget appears on `/login` and `/signup` when domain matches.

Optional Mini App / webhook (same HTTPS base):

- **Web App URL:** `https://YOUR-SUBDOMAIN.ngrok-free.app/telegram`
- **Webhook:** `https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://YOUR-SUBDOMAIN.ngrok-free.app/api/telegram/webhook&secret_token=<TELEGRAM_WEBHOOK_SECRET>`

### Apple Developer

- **Domains:** `YOUR-SUBDOMAIN.ngrok-free.app`
- **Return URL:** `https://YOUR-SUBDOMAIN.ngrok-free.app/api/auth/callback/apple`

Generate JWT: `npm run auth:apple-secret -- ...` (see below).

---

## `NEXTAUTH_URL` rule

Must equal the URL in your browser bar (scheme + host + port):

```bash
NEXTAUTH_URL=https://your-subdomain.ngrok-free.app
```

After any change: `docker compose up -d --force-recreate web`

With **`NGROK_STATIC_DOMAIN`**, the URL stays the same across restarts — strongly recommended.

---

## Apple Sign In JWT

Requires [Apple Developer Program](https://developer.apple.com/programs/) membership.

```bash
npm run auth:apple-secret -- \
  --team-id YOUR_TEAM_ID \
  --client-id com.institution.nexus.service \
  --key-id YOUR_KEY_ID \
  --key-file ./AuthKey_YOUR_KEY_ID.p8
```

```bash
AUTH_APPLE_ID=com.institution.nexus.service
AUTH_APPLE_SECRET=eyJhbGciOi...
```

Regenerate before expiry (~180 days).

---

## Desktop-only fallback (no ngrok)

Google OAuth works with:

```bash
NEXTAUTH_URL=http://localhost:8080
```

Register `http://localhost:8080` and `http://localhost:8080/api/auth/callback/google` in Google Console.

Telegram widget on plain `localhost` is **unreliable** (HTTPS + domain issues). Use ngrok for Telegram testing.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Google “Invalid Origin: must end with public TLD” | You used a LAN IP — switch to ngrok URL |
| Telegram widget missing on LAN IP | Expected — run `npm run dev:tunnel`, `/setdomain` with ngrok host |
| LAN page has no theme / broken JS | Set `NEXUS_DEV_ALLOWED_ORIGINS=<LAN-IP>,<LAN-IP>:8080` in `.env.local`, recreate `web` — see [auth_and_profiles.md](./auth_and_profiles.md) |
| `MissingCSRF` on LAN HTTP | Fixed in dev via `useSecureCookies: false` when `NODE_ENV=development`; hard-refresh and clear site cookies for `192.168.x.x` |
| Telegram “bot domain invalid” | `/setdomain` host ≠ browser host |
| Signed in then back to `/login` | `NEXTAUTH_URL` ≠ browser URL; `docker compose up -d --force-recreate web` |
| ngrok URL changed after restart | Re-run sync + update Google/BotFather; or set `NGROK_STATIC_DOMAIN` |
| `NGROK_AUTHTOKEN is missing` | Add token from ngrok dashboard to `.env.local` |

---

## Files

| Path | Role |
|------|------|
| `scripts/startDevTunnel.mjs` | `npm run dev:tunnel` — host ngrok |
| `scripts/stopDevTunnel.mjs` | `npm run dev:tunnel:stop` |
| `scripts/ngrokSyncEnv.mjs` | Writes `NEXTAUTH_URL` from ngrok inspector |
| `scripts/checkAuthEnv.mjs` | `npm run auth:check-env` |
| `shared/lib/devAuthTunnelHint.ts` | UI hint on LAN HTTP |
