# Authentication & User Profiles

**Status:** `[x] Completed` — core auth and profile flows implemented; task list remains placeholder until Phase 5.

**Figma references:** [figma_ui_integration.md](./figma_ui_integration.md) — Auth `57:17`, Profile `59:47`

---

## Overview

Cross-platform authentication merges Google OAuth2, Apple Sign In, Telegram Login Widget, and email/password credentials into a single MongoDB `users` document. Auth.js (NextAuth v5) issues JWT sessions; all mutations flow through `shared/domains/AuthDomain.ts`.

---

## Route map

| Route | Type | Purpose |
|-------|------|---------|
| `/login` | Page | Email/password sign-in + OAuth row |
| `/signup` | Page | Student registration (Figma `57:17`) |
| `/profile` | Page | Read-only profile dashboard (Figma `59:47`) |
| `/profile/settings` | Page | Editable user info |
| `/api/auth/[...nextauth]` | API | Auth.js handler |
| `/api/auth/register` | API | POST credentials signup (JSON API) |
| `/api/auth/login` | API | POST form login → redirect to profile |
| `/api/auth/signup` | API | POST form register + sign-in → redirect |
| `/api/auth/telegram` | API | POST Telegram widget verification |
| `/api/profile` | API | PATCH profile fields |

---

## Data flow

```mermaid
sequenceDiagram
  participant Client
  participant AuthJS as Auth.js
  participant AuthDomain
  participant MongoDB

  Client->>AuthJS: signIn Google / Apple / Credentials
  AuthJS->>AuthDomain: findOrCreate / validateCredentials
  AuthDomain->>MongoDB: upsert users
  AuthDomain-->>AuthJS: user id + role
  AuthJS-->>Client: JWT session cookie

  Client->>AuthJS: Telegram widget callback
  AuthJS->>AuthDomain: verifyTelegramLoginWidget
  AuthDomain->>MongoDB: link telegramId
```

---

## User model extensions

| Field | Type | Notes |
|-------|------|-------|
| `email` | `string \| null` | Sparse unique index |
| `emailVerified` | `Date \| null` | Set on OAuth verify |
| `passwordHash` | `string \| null` | bcrypt; never exposed |
| `appleId` | `string \| null` | Apple `sub` |
| `studentTitle` | `Starosta \| Deputy \| Neither \| null` | Registration chips |
| `accentFamily` | `blue \| red \| yellow \| green \| purple` | Default `blue` |
| `accentShade` | `soft \| medium \| strong` | Default `medium` |
| `lastTelegramSyncAt` | `Date \| null` | Profile sync card |

RBAC `role` (`Admin` / `StudentCouncil` / `Student`) is server-assigned only.

---

## Environment variables

```bash
NEXTAUTH_SECRET=          # Required in production
NEXTAUTH_URL=http://localhost:8080
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
AUTH_APPLE_ID=            # Apple Services ID
AUTH_APPLE_SECRET=        # Apple client secret JWT
TELEGRAM_BOT_TOKEN=       # BotFather token for widget hash verification
```

`docker-compose.yml` loads secrets from `.env.local`. Do **not** hardcode `NEXTAUTH_URL` in Compose — set it in `.env.local` so it matches how you open the app (especially when testing on a phone via LAN IP).

---

## Troubleshooting

### Signed in but `/profile` sends me back to `/login`

1. **iOS Safari blocked port:** WebKit blocks port **3000** (and others) on iPhone. Docker maps **host port 8080** → container 3000. Open `http://YOUR_LAN_IP:8080`, set matching `NEXTAUTH_URL`, then `docker compose up -d --force-recreate web`.
2. **URL mismatch:** `NEXTAUTH_URL` must use the same host and port as the browser address bar. Run `hostname -I | awk '{print $1}'` for your LAN IP.
3. **Next.js dev blocks LAN JS:** When `NEXTAUTH_URL` uses a LAN hostname, `next.config.ts` auto-adds it to `allowedDevOrigins`.
4. **iOS / no client JS:** Credentials login and signup POST to `/api/auth/login` and `/api/auth/signup` (native HTML forms).
5. **Stale session:** Clear site cookies for the host, sign in again.

### React hydration warnings on `/profile`

1. **Dark Reader / similar extensions** inject `data-darkreader-*` attributes and `--darkreader-*` CSS variables on SVG and `<img>` nodes after paint. These are not Nexus SSR bugs. The header logo, theme toggle icons, and profile accent scope use `suppressHydrationWarning` and CSS-class filters where needed.
2. **Real SSR theme mismatch** (cookie `system` vs toggle knob): `HeaderSessionBridge` resolves dark/light via `resolveStoredThemeIsDark()` (`src/lib/resolveStoredThemeIsDark.ts`) using the theme cookie plus `Sec-CH-Prefers-Color-Scheme`. Middleware sends `Accept-CH` so first visits without a cookie align with OS preference.
3. **Theme toggle first paint:** `ThemeToggleLink` defers knob position until after mount (same pattern as `ThemeToggle`) so SSR and hydration agree before applying the server-resolved value.

### `window.ethereum.selectedAddress` TypeError

Not emitted by Nexus application code. Brave and some wallet extensions assign to `window.ethereum` before the provider is injected. Root layout runs a minimal `beforeInteractive` shim (`nexus-wallet-shim`) so `window.ethereum` exists as a stub when extensions race ahead of injection.


## AuthDomain API

| Method | Purpose |
|--------|---------|
| `registerWithCredentials` | Signup with bcrypt hash |
| `validateCredentials` | Login email/password |
| `findOrCreateFromGoogle` | OAuth merge by `googleId` or email |
| `findOrCreateFromApple` | OAuth merge by `appleId` or email |
| `verifyTelegramLoginWidget` | HMAC verify + link Telegram identity |
| `updateProfile` | Settings page PATCH |
| `changePassword` | Current + new password |
| `toPublicUser` | Strip `passwordHash` for API/session |

---

## Input Validation

All authentication and profile settings forms are validated using **Zod** schemas.

### Validation Rules

- **Email:** Trimmed, lowercased, valid email format, max 254 characters.
- **Password:** Minimum 8 characters, max 128 characters.
- **Specialty / Group:** Optional, trimmed, max 120 characters when present. Empty strings are transformed to `null`.
- **Student Title:** Must be one of `Starosta | Deputy | Neither` (defaults to `Neither`).
- **Display Name:** Required, trimmed, 1–100 characters.
- **Accent Family:** Must be one of `blue | red | yellow | green | purple`.
- **Accent Shade:** Must be one of `soft | medium | strong`.
- **Password Change:** If `newPassword` is set, `currentPassword` is required and `newPassword` must be at least 8 characters.

### Shared Schemas & Utilities

Validation logic is centralized in the `shared/validation/` folder:

- `authSchemas.ts` — `loginSchema`, `signupSchema`, `registerSchema`
- `profileSchemas.ts` — `profileUpdateSchema`, `clientProfileSettingsSchema`
- `authErrorCodes.ts` — Maps stable error codes (e.g. `credentials`, `email_exists`, `validation`) to localized, user-friendly messages.
- `formatValidationErrors.ts` — Formats Zod errors into a flat key-value map of field errors.

### Unified UI Feedback

We use two reusable design system components for displaying errors and success messages:

1. **`FormAlert`** (`src/components/ui/form-alert.tsx`) — Displays form-level alerts (errors, success, or info) with matching theme colors.
2. **`FormField`** (`src/components/ui/form-field.tsx`) — Wraps input controls with labels and inline field-level errors, automatically setting `aria-invalid` and `aria-describedby` for accessibility.

---

## Middleware

Protects `/profile/*` and `/admin/*`. Unauthenticated users redirect to `/login?callbackUrl=…`.

Dev bypass: when `NEXTAUTH_SECRET` is unset, API write guards allow all requests (editor works without auth setup).

---

## Acceptance criteria

- [x] Sign up with email/password + specialty/group/student title
- [x] Sign in via Google, Apple, Telegram widget, or credentials
- [x] Identities merge into one `users` document
- [x] `/profile` read-only dashboard with live user data
- [x] `/profile/settings` saves editable fields
- [x] GlobalHeader shows avatar + admin nav from session
- [x] Protected API routes use `auth()` session check (legacy bearer fallback for Puck editor)

**Deferred:** Task list and council activity on profile use Figma placeholder content until Phase 5 Task engine.
