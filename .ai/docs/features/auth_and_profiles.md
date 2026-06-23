# Authentication & User Profiles

**Status:** `[x] Completed` — core auth and profile flows implemented; task list remains placeholder until Phase 5.

**Figma references:** [figma_ui_integration.md](./figma_ui_integration.md) — Auth `57:17`, Profile `59:47`

---

## Overview

Cross-platform authentication merges Google OAuth2, Apple Sign In, Telegram Login Widget, **Telegram Mini App** (`/telegram`), and login/password credentials into a single MongoDB `users` document. Auth.js (NextAuth v5) issues JWT sessions; all mutations flow through `shared/domains/AuthDomain.ts`.

**Telegram surfaces:** Browser users link via the Login Widget; Telegram app users open the Mini App at `/telegram` (auto-login or onboarding). See [telegram_mini_app_and_bot.md](./telegram_mini_app_and_bot.md). **Local dev checklist:** [local_oauth_setup.md](./local_oauth_setup.md).

**Credentials model:** Students sign in with a unique **`login`** handle (3–32 chars, lowercase alphanumeric plus `.`, `-`, `_`). **Email is optional** at signup — used only as a linked contact/OAuth merge field, not for credentials sign-in.

**Sign-in confusion matrix:** See [signin_identity_matrix.md](./signin_identity_matrix.md) for OAuth-only vs credentials error discrimination and deferred admin review queues.

---

## Route map

| Route | Type | Purpose |
|-------|------|---------|
| `/login` | Page | Login/password sign-in + OAuth row |
| `/signup` | Page | Student registration — login, optional linked email, profile photo, socium role (Figma `57:17`) |
| `/profile` | Page | Read-only profile dashboard (Figma `59:47`) |
| `/profile/settings` | Page | Editable user info; `?onboarding=1` for OAuth/Telegram profile completion gate; `#notifications` for delivery channel prefs |
| `/telegram` | Page | Telegram Mini App entry (auto-login / onboarding) |
| `/api/auth/[...nextauth]` | API | Auth.js handler |
| `/api/auth/register` | API | POST credentials signup (JSON API) |
| `/api/auth/signup-options` | API | GET approved specialty/group labels for signup dropdowns |
| `/api/auth/login` | API | POST form login fallback (redirect) — primary UI uses client `signIn` |
| `/api/auth/signup` | API | POST form register fallback — primary UI uses `/api/auth/register` + client `signIn` |
| `/api/auth/telegram` | API | POST Telegram widget verification |
| `/api/auth/telegram/mini-app` | API | POST Mini App `initData` → bridge or onboarding |
| `/api/auth/telegram/mini-app/register` | API | POST Mini App onboarding registration |
| `/api/telegram/webhook` | API | Bot webhook (`/start` → Open Nexus button) |
| `/api/profile` | API | GET/PATCH profile fields |
| `/api/me` | API | GET basic site chrome profile (avatar, name, role) on page entry |
| `/api/profile/completeness` | API | GET membership profile readiness gaps |
| `/api/profile/telegram` | API | POST link Telegram (session); DELETE unlink |
| `/api/notifications/web-prompt` | API | GET/POST browser notification permission prompt state |

---

## Notification preferences

After sign-in or registration, signed-in users see a one-time dialog asking for **browser notification permission**. Copy explains that delivery can be configured in **Profile settings → Notifications** as **Web**, **Telegram**, or **both**.

| Field | Type | Notes |
|-------|------|-------|
| `notificationChannels` | `('web' \| 'telegram')[]` | User preference; default `['web']`. Filters web toasts and Telegram DMs. |
| `webNotificationPromptAt` | `Date \| null` | Set when the user enables or dismisses the browser permission prompt. |

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

See full specification: [user_model_and_social_identity.md](./user_model_and_social_identity.md).

| Field | Type | Notes |
|-------|------|-------|
| `login` | `string \| null` | Unique credentials handle; sparse unique index |
| `passwordHash` | `string \| null` | bcrypt; never exposed |
| `name` | `string` | Given / first name |
| `surname` | `string \| null` | Family name; combined as `fullName` in API |
| `phone` | `string \| null` | Contact number; optional (recommended) for students, required for self-government members and applicants |
| `telegramId` | `number \| null` | Telegram Login Widget / Mini App link; **required** for self-government members (not applicants) before member tools |
| `selfGovernmentApplicationIntent` | `boolean` | Signup checkbox — student wants to apply for self-government (admin reviews) |
| `personalDataConsentAt` | `Date \| null` | Timestamp when user accepted personal data processing at signup |
| `email` | `string \| null` | Optional linked email; sparse unique index; OAuth merge |
| `emailVerified` | `Date \| null` | Set on OAuth verify |
| `appleId` | `string \| null` | Apple `sub` |
| `studentTitle` | `Starosta \| Deputy \| Neither \| null` | Registration chips; synced to `sociumRoles` |
| `sociumRoles` | `IUserSociumRole[]` | Socium identity array (starosta, self-gov, custom) |
| `socialGroupActivities` | `IUserSocialGroupActivity[]` | Admin-assigned activity categories |
| `organizations` | `IUserOrganizationMembership[]` | External org memberships |
| `socialLinks` | `IUserSocialLink[]` | User-editable social media URLs |
| `about` | `string \| null` | Self-authored bio note |
| `qualityScores` | `IUserQualityScores \| null` | Auto-init for self-government members |
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
TELEGRAM_BOT_TOKEN=       # BotFather token for widget + Mini App initData + bot API
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=
TELEGRAM_WEBHOOK_SECRET=  # Optional webhook header validation
ADMIN_SEED_LOGIN=         # Admin credentials seed (required with ADMIN_SEED_PASSWORD)
ADMIN_SEED_PASSWORD=
```

`ADMIN_SEED_EMAIL` / `ADMIN_EMAIL` are **deprecated** — used only to locate legacy email-only seed documents during migration. New seed users are created **without email**; email is populated when Google OAuth is linked from `/profile/settings`.

`docker-compose.yml` loads secrets from `.env.local`. Do **not** hardcode `NEXTAUTH_URL` in Compose — set it in `.env.local` so it matches how you open the app (scheme, host, and port in the browser address bar).

**Phone / LAN testing:** If you open the app as `http://192.168.x.x:8080` on your phone, `NEXTAUTH_URL` must use that same LAN IP — **not** `http://localhost:8080`. On a phone, `localhost` is the phone itself, so auth redirects and session cookies target the wrong host and sign-in appears to fail.

**Default admin (dev):** Set `ADMIN_SEED_LOGIN` + `ADMIN_SEED_PASSWORD` in `.env.local`. Sign in on `/login` with the **login handle** (e.g. `admin`), not email. The seed user is **minimal** — login, password, `Admin` role, and system hierarchy index only. No Telegram, no seeded email, and **no** specialty, group, student title, or socium profile fields (configure those in `/profile/settings` or admin tools). Email is populated when Google OAuth is linked from **Connected accounts**. On first load, `seedAdminUser()` creates the admin, **clears Telegram** on an existing seed login match, or **backfills `login`** on a legacy email-only seed document.

---

### Signed in but `/profile` sends me back to `/login`

1. **`localhost` redirect on phone (most common):** Auth redirects are built from `NEXTAUTH_URL` via `resolvePublicOrigin()` (`src/lib/publicOrigin.ts`). If the dev machine still has `NEXTAUTH_URL=http://localhost:8080` while you browse from an iPhone at `http://YOUR_LAN_IP:8080`, post-login redirects send the phone to **its own** `localhost`, not your PC. Set `NEXTAUTH_URL` to the LAN URL you actually open (e.g. `http://192.168.50.10:8080`), then `docker compose up -d --force-recreate web`. Find your LAN IP: `hostname -I | awk '{print $1}'`.
2. **URL mismatch:** `NEXTAUTH_URL` must match the browser address bar (host **and** port). Docker maps host **8080** → container **3000**; use **8080** in both the URL you open and `NEXTAUTH_URL`.
3. **Next.js dev blocks LAN assets:** When `NEXTAUTH_URL` uses a LAN hostname, `next.config.ts` auto-adds it to `allowedDevOrigins` so dev JS/CSS load from the phone. If `NEXTAUTH_URL` stays on **ngrok** but you browse via LAN IP, set `NEXUS_DEV_ALLOWED_ORIGINS=192.168.x.x,192.168.x.x:8080` in `.env.local`, then `docker compose up -d --force-recreate web`. OAuth still requires the ngrok URL; LAN is for layout/theme/JS smoke tests only.
4. **`MissingCSRF` on LAN HTTP while `NEXTAUTH_URL` is HTTPS (ngrok):** Auth.js would set `Secure` cookies from the ngrok URL while you browse `http://192.168.x.x:8080` — the browser drops them. Dev builds set `useSecureCookies: false` in `auth.config.ts` so credentials sign-in works on LAN. Google/Telegram still need the ngrok URL.
5. **Credentials forms:** `/login` and `/signup` submit via client-side Auth.js (`signIn({ redirect: false })` and `/api/auth/register`). Invalid credentials show inline without a full page reload. Legacy `/api/auth/login` and `/api/auth/signup` form POST routes remain as no-JS fallbacks.
6. **Stale session:** Clear site cookies for the host, sign in again.

### React hydration warnings on `/profile`

1. **Dark Reader / similar extensions** inject `data-darkreader-*` attributes and `--darkreader-*` CSS variables on SVG and `<img>` nodes after paint. These are not Nexus SSR bugs. The header logo uses `suppressHydrationWarning` and CSS-class filters where needed.
2. **Real SSR theme mismatch** (cookie `system` vs toggle knob): `HeaderSessionBridge` resolves dark/light via `resolveStoredThemeIsDark()` (`src/lib/resolveStoredThemeIsDark.ts`) using the theme cookie plus `Sec-CH-Prefers-Color-Scheme`. Middleware sends `Accept-CH` so first visits without a cookie align with OS preference.
3. **Theme toggle first paint:** `ThemeToggleLink` defers knob position until after mount (same pattern as `ThemeToggle`) so SSR and hydration agree before applying the server-resolved value.

### `window.ethereum.selectedAddress` TypeError

Not emitted by Nexus application code. Brave and some wallet extensions assign to `window.ethereum` before the provider is injected. Root layout runs a minimal `beforeInteractive` shim (`nexus-wallet-shim`) so `window.ethereum` exists as a stub when extensions race ahead of injection.


## AuthDomain API

| Method | Purpose |
|--------|---------|
| `registerWithCredentials` | Signup with bcrypt hash |
| `validateCredentials` | Login handle + password |
| `findOrCreateFromGoogle` | OAuth merge by `googleId` or email |
| `findOrCreateFromApple` | OAuth merge by `appleId` or email |
| `linkGoogleProfile` | Link Google onto an existing account (profile settings); sets email from OAuth |
| `linkAppleProfile` | Link Apple onto an existing account (profile settings) |
| `linkTelegramProfile` | Link Telegram Login Widget onto an existing account |
| `verifyTelegramLoginWidget` | HMAC verify + sign-in / sparse account create |
| `authenticateTelegramMiniApp` | Mini App initData → returning user or onboarding |
| `registerFromTelegramMiniApp` | First-time Mini App registration + `telegramId` link |
| `unlinkTelegram` | Remove `telegramId` when password/OAuth remains |
| `updateProfile` | Settings page PATCH |
| `changePassword` | Current + new password |
| `toPublicUser` | Strip `passwordHash` for API/session |

### Deprecated user accent fields (removed)

Per-user accent colour pickers were removed from the product. The Mongoose schema no longer defines `accentFamily` / `accentShade`.

**Existing deployments:** run once against MongoDB after deploy:

```bash
npm run job:remove-user-accent-fields:dry-run   # inspect count
npm run job:remove-user-accent-fields         # $unset on all users
```

Script: `scripts/removeUserAccentFields.ts`. Site-wide accent styling still uses the fixed CSS token `--color-accent-user` (default blue) in `globals.css` — not per-user MongoDB fields.

---

## Input Validation

All authentication and profile settings forms are validated using **Zod** schemas.

### Validation Rules

- **Login:** Trimmed, lowercased, 3–32 characters; `[a-z0-9._-]` only.
- **Linked email (signup):** Optional; trimmed, lowercased, valid email format, max 254 characters when provided.
- **Password:** Minimum 8 characters, max 128; must pass {@link assessPasswordStrength} (mixed character classes, not equal to login, not common weak passwords). Signup requires matching `confirmPassword`.
- **Phone:** Optional at signup; international format via {@link optionalPhoneSchema}.
- **Specialty / Group:** Optional, max 120 chars. Signup uses creatable dropdowns backed by `academic_catalog` — user-typed values queue as `pending` for admin review (see [signin_identity_matrix.md](./signin_identity_matrix.md)).
- **Socium role (signup):** `Student` (default), `Starosta`, or `Teacher` — select control; maps to socium kinds. Other roles are admin-assigned.
- **Group:** Numeric only (1–4 digits, e.g. `42`).
- **Membership intent:** `applyForSelfGovernment` boolean — records intent, does not grant roles. When true, signup requires phone, profile photo, and a verified **Telegram Login Widget** connection (`telegramAuth` on `POST /api/auth/register`).
- **Membership intent (temp override):** `TELEGRAM_REQUIRED_AT_MEMBERSHIP_APPLICATION` in `shared/lib/userProfileCompleteness.ts` is currently `false` — login/signup do not require or prompt for Telegram during application. Set to `true` to restore application-time Telegram collection. Post-approval member Telegram gates are unchanged.
- **Personal data consent:** `personalDataConsent: true` required at signup; stored as `personalDataConsentAt`.
- **Student Title (legacy):** `Starosta | Deputy | Neither` — signup exposes Student/Starosta chips; `Deputy` remains editable in profile settings.
- **Display Name:** Required, trimmed, 1–100 characters.
- **Accent Family:** Must be one of `blue | red | yellow | green | purple`.
- **Accent Shade:** Must be one of `soft | medium | strong`.
- **Password Change:** If `newPassword` is set, `currentPassword` is required and `newPassword` must be at least 8 characters.

### Shared Schemas & Utilities

Validation logic is centralized in the `shared/validation/` folder:

- `authSchemas.ts` — `loginSchema`, `signupSchema`, `registerSchema`
- `profileSchemas.ts` — `profileUpdateSchema`, `clientProfileSettingsSchema`
- `authErrorCodes.ts` — Maps stable error codes (e.g. `credentials`, `login_exists`, `email_exists`, `validation`) to localized, user-friendly messages.
- `formatValidationErrors.ts` — Formats Zod errors into a flat key-value map of field errors.

### Unified UI Feedback

We use two reusable design system components for displaying errors and success messages:

1. **`FormAlert`** (`src/components/ui/form-alert.tsx`) — Displays form-level alerts (errors, success, or info) with matching theme colors.
2. **`FormField`** (`src/components/ui/form-field.tsx`) — Wraps input controls with labels and inline field-level errors, automatically setting `aria-invalid` and `aria-describedby` for accessibility.

---

## OAuth / Telegram profile onboarding

Users who first sign in via **Google**, **Apple**, or the **Telegram Login Widget** receive a sparse MongoDB record (name, optional email/avatar). Before browsing the rest of the app they must complete:

| Field | Required |
|-------|----------|
| Surname | Yes |
| Phone | Yes |
| Specialty | Yes |
| Group | Yes |
| Personal data consent | Yes (`personalDataConsentAt`) |

**Flow:**

1. After OAuth sign-in, default callback is `/profile/settings?onboarding=1`.
2. `ProfileOnboardingRedirect` in the root layout calls `enforceProfileOnboarding()` on every authenticated page (uses `x-pathname` from middleware).
3. Incomplete accounts redirect to `/profile/settings?onboarding=1` (exempt: `/login`, `/signup`, `/profile/settings`, `/telegram`).
4. `PATCH /api/profile` with `completeOAuthOnboarding: true` validates required fields; returns `onboardingComplete: true` when done.
5. Client redirects to `/profile` after successful completion.

**Not gated:** Credentials signup users (no linked external id), Telegram Mini App first-time flow (`/telegram` onboarding form), returning users with a complete profile.

Logic: `shared/lib/userProfileCompleteness.ts` — `userNeedsProfileOnboarding()`.

---

## Site entry profile bootstrap

When a signed-in viewer loads any site page, the root layout seeds {@link BasicSiteProfile} from the server `auth()` session and {@link SiteProfileProvider} immediately refreshes from MongoDB via `GET /api/me`.

| Layer | Path | Role |
|-------|------|------|
| DTO | `shared/lib/siteProfileBasic.ts` | `BasicSiteProfile` — id, name, fullName, email, avatar, role |
| API | `GET /api/me` | Session-required snapshot for header chrome; returns 401 when the JWT references a missing user (stale session after DB reset) |
| Client | `SiteProfileProvider` | Seeds from SSR session, re-fetches on authenticated entry |
| Header | `GlobalHeader` | Reads profile context; SSR theme still from `resolveStoredThemeIsDark()` |

Profile settings call `refreshProfile()` after a successful save so the header avatar/name update without a hard reload.

---

## Middleware

Protects `/profile/*` and `/admin/*`. Unauthenticated users redirect to `/login?callbackUrl=…`.

Dev bypass: when `NEXTAUTH_SECRET` is unset, API write guards allow all requests (editor works without auth setup).

---

## Acceptance criteria

- [x] Sign up with login/password, phone, password confirmation + strength check, optional linked email, creatable specialty/group, socium role (Student/Starosta), optional profile photo (**required** when applying for self-government), membership intent checkbox, personal data consent
- [x] Credentials login distinguishes unknown login (sign up first) from OAuth-only accounts (use provider)
- [x] Sign in via Google, Apple, Telegram widget, Telegram Mini App, or credentials (inline errors, no full-page reload on bad password)
- [x] Profile settings can unlink Telegram when another sign-in method exists
- [x] Identities merge into one `users` document
- [x] `/profile` read-only dashboard with live user data
- [x] `/profile/settings` saves editable fields; profile photo via {@link AvatarImageField} (crop + Lucide User fallback — not emoji)
- [x] OAuth / Telegram sparse accounts redirect to `/profile/settings?onboarding=1` until required fields + consent are saved
- [x] GlobalHeader shows avatar + admin nav from session; entry bootstrap via `SiteProfileProvider` + `GET /api/me`
- [x] Protected API routes use `auth()` session check (legacy bearer fallback for Puck editor)

**Deferred:** Task list and council activity on profile use Figma placeholder content until Phase 5 Task engine.
