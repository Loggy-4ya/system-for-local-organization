# Internationalization (i18n)

**Status:** `[~] In Progress` — web UI, bots, and outbound notifications are locale-aware; Puck sidebar and deep admin form copy remain incremental.

## Goal

Provide Ukrainian (`uk`) and English (`en`) across **the entire Nexus platform** — web app, shared notification copy, **Telegram bot replies**, and admin-editable bot templates — using **next-intl** on the web with **always-prefixed URLs** (`/en/...`, `/uk/...`).

## Scope policy

| Layer | Approach |
|-------|----------|
| **Web UI chrome** | `messages/en.json` + `messages/uk.json` via next-intl |
| **Telegram bot inbound replies** | Per-locale templates from General Rules + code defaults |
| **Telegram outbound DMs** (broadcasts, page go-live) | Per-recipient locale from `User.preferredLocale` |
| **Task / reminder notification copy** | `shared/lib/*NotificationCopy.ts` accepts `locale: 'en' \| 'uk'` |
| **Puck page body** (MongoDB CMS) | Author-written — not auto-translated |
| **Global layout nav labels** (MongoDB) | Admin-configured; optional future `labelsByLocale` |
| **API / domain error strings** | Often English until domain copy helpers accept `locale` |

## Stack (web)

| Piece | Location |
|-------|----------|
| Library | `next-intl` (^4.x) |
| Routing config | [`src/i18n/routing.ts`](../../src/i18n/routing.ts) |
| Server request config | [`src/i18n/request.ts`](../../src/i18n/request.ts) |
| Locale-aware navigation | [`src/i18n/navigation.ts`](../../src/i18n/navigation.ts) |
| Path helpers | [`src/lib/localePathLogic.ts`](../../src/lib/localePathLogic.ts) |
| Message catalogs | [`messages/en.json`](../../messages/en.json), [`messages/uk.json`](../../messages/uk.json) |
| Locale layout | [`src/app/[locale]/layout.tsx`](../../src/app/[locale]/layout.tsx) |
| Middleware | [`src/middleware.ts`](../../src/middleware.ts) — composes next-intl + NextAuth + CSP |
| Language switcher | [`src/components/ui/LocaleSwitcher.tsx`](../../src/components/ui/LocaleSwitcher.tsx) |

## Stack (bots & shared)

| Piece | Location |
|-------|----------|
| Supported locales | [`shared/constants/botLocales.ts`](../../shared/constants/botLocales.ts) — `en`, `uk` |
| Code default templates (EN + UK) | [`shared/constants/botMessageDefaults.ts`](../../shared/constants/botMessageDefaults.ts) |
| Persisted overrides | `GeneralRulesSettings.telegramMessagesByLocale` in MongoDB |
| Locale resolution (pure) | [`shared/lib/resolveBotLocale.ts`](../../shared/lib/resolveBotLocale.ts) — safe for client imports |
| Locale resolution (MongoDB) | [`shared/lib/resolveTelegramBotLocaleForUser.ts`](../../shared/lib/resolveTelegramBotLocaleForUser.ts) — server/worker only |
| Inbound bot handler | [`shared/domains/TelegramBotDomain.ts`](../../shared/domains/TelegramBotDomain.ts) |
| Admin editor (locale tabs) | [`src/components/admin/TelegramBotMessagesEditorShell.tsx`](../../src/components/admin/TelegramBotMessagesEditorShell.tsx) |

## Bot locale resolution order

1. **`User.preferredLocale`** — set in Profile → Settings (also drives web when user switches language)
2. **Telegram `language_code`** — from the inbound update when no preference is stored
3. **Default `en`**

`resolveTelegramBotLocaleForUser()` loads preference from MongoDB when only `telegramUserId` is known (inbound `/start`, contact harvest, task commands).

## User preference

| Field | Model | UI |
|-------|-------|-----|
| `preferredLocale` | [`shared/models/User.ts`](../../shared/models/User.ts) | Profile → Settings → Language |
| PATCH | `PATCH /api/profile` with `{ preferredLocale: "en" \| "uk" }` | [`ProfileSettingsForm`](../../src/components/profile/ProfileSettingsForm.tsx) |

When unset, the web app follows the URL locale; the bot falls back to Telegram client language.

Saving **Language** in Profile → Settings (or using the header locale switcher while signed in) updates `preferredLocale` **and** navigates to the matching URL prefix (`/uk/...` or `/en/...`). The web UI always reads copy from the active URL locale via next-intl.

## Locales

| Code | Role |
|------|------|
| `en` | Default locale |
| `uk` | Ukrainian |

Root `/` redirects to `/en` via middleware.

## Message catalog namespaces

Top-level keys in [`messages/en.json`](../../messages/en.json) (mirror in `uk.json`):

| Namespace | Purpose |
|-----------|---------|
| `metadata` | Page `<title>` / SEO defaults |
| `common` | Shared actions, validation, locale names |
| `home` | Marketing homepage |
| `auth` | Login, signup, OAuth, auth widgets (`signup`, `sociumRoleSelect`, `roleChip`, `catalogSelect`, `passwordStrength`, `telegramConnect`) |
| `header` / `footer` | Site chrome |
| `profile` | Dashboard, settings, membership, identity board, stats |
| `tasks` | Task / task-group manager shells and forms |
| `pages` | Page catalog + publisher invite (`pages.join`) |
| `admin` | Hub, back links, area titles (`admin.hub.*`), user directory chrome |
| `notifications` | Inbox center, bell, kinds, toasts, browser permission prompt |
| `puck` | Editor save/publish toasts |

Add new UI strings to **both** JSON files in the same change.

## Translated surfaces (shipped)

| Area | Status | Key files |
|------|--------|-----------|
| Homepage, 404, auth shell, header, footer, admin hub | `[x]` | `src/app/[locale]/*`, `Header*`, `AdminHubShell` |
| Login form | `[x]` | `LoginForm.tsx` |
| Student signup form | `[x]` | `StudentSignUpForm.tsx` |
| Auth widgets (role select, chips, catalog select, password strength, Telegram connect) | `[x]` | `src/components/auth/*` |
| Profile dashboard + settings + membership | `[x]` | `src/app/[locale]/(profile)/**`, `Profile*.tsx` |
| Tasks + task groups (list, detail, create) | `[x]` | `Task*Shell.tsx`, `Task*Form.tsx` |
| Notifications (center, bell, inbox rows, toasts, permission dialog) | `[x]` | `src/components/notifications/*` |
| Profile completeness UI (`profile.completeness` + field keys) | `[x]` | `src/lib/profileCompletenessCopy.ts` |
| Pages catalog + new-page form | `[x]` | `PagesBrowseShell.tsx`, `NewPageForm.tsx`, `pages/page.tsx` |
| Public user profile `/users/[ref]` | `[x]` | `src/app/[locale]/users/[userId]/page.tsx` |
| Publisher invite `/pages/join/[token]` (chrome; domain errors still EN) | `[x]` | `pages/join/[token]/page.tsx` |
| Puck editor client toasts | `[x]` | `messages/puck`, `SiteClientToastHost` |
| Puck block sidebar chapter titles | `[x]` | `blockFieldChapterConfigs.tsx` + `titleKey` → `puck.chapters` |
| Puck block field labels (185+ catalog keys) | `[x]` | `puck.fieldLabels` / `puck.fieldOptions` + `translatePuckSidebarCopy` in overrides |
| Puck shared field groups (spacing, island, form, list, carousel) | `[x]` | `SpacingFieldGroup`, `IslandFieldGroup`, `FormField*`, `ListConnectorStyleField`, `CarouselSizeFieldGroup` |
| Puck block drawer categories | `[x]` | `useLocalizedPuckConfig.ts` → `puck.blockCategories` |
| Puck page publication chapter (full sidebar body) | `[x]` | `PagePublicationFieldGroup`, `PagePublicationTelegramFields`, `PagePublisherInviteShare` |
| Puck page-root chapters (details, width, background) | `[x]` | `PageSettingsFieldGroup`, `PageLayoutFieldGroup`, `PageBackgroundFieldGroup` |
| Puck page publication chapter title | `[~]` partial | superseded — full publication body now translated |
| Telegram bot templates + runtime resolution | `[x]` | `TelegramBotDomain`, General Rules |
| Broadcast / page go-live Telegram DMs | `[x]` | `BroadcastDomain`, `PageDomain` |
| Admin back navigation + hub titles | `[x]` partial | General Rules, Bot messages, logs, membership, security audit, hosting, calendar, telegram workspaces, user access, user directory |
| Admin General Rules editor (full form) | `[x]` | `admin.generalRules` |
| Admin membership applications queue | `[x]` | `admin.membershipApplications` + `missingFields` on row DTO |
| Admin hosting diagnostics | `[x]` | `admin.hosting` |
| Admin Telegram workspaces editor | `[x]` | `admin.telegramWorkspaces` |
| Admin shared editor toolbar | `[x]` | `admin.editorToolbar` |
| Admin institutional calendar editor | `[x]` | `admin.institutionalCalendar` — action/socium/access labels at UI layer |
| Admin system logs shell + audit sections | `[x]` | `admin.systemLogs` — sanitize + user-directory tabs |
| Puck field hints / placeholders | `[~]` partial | `puck.fieldHints` — Tiptap, list steps, media upload, form options |

## `[locale]` route migration

Server pages under `src/app/[locale]/` should use:

```tsx
import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
```

**Migrated:** profile, tasks, task-groups, notifications, membership, settings, users, pages (catalog + join + legacy redirects), admin hub/global-layout/security-audits/page-categories, Puck client router (`[...puckPath]/client.tsx`).

**Still on `next/navigation` (acceptable where noted):**

| File | Notes |
|------|-------|
| `[locale]/layout.tsx` | `notFound()` — framework API |
| `[...puckPath]/page.tsx` | `notFound()` |

## Deferred / incremental

| Item | Reason |
|------|--------|
| Puck field hints (PagePathDomainSlug, PageAccessEditors, remaining list step defaults) | Incremental — high-traffic fields done in `puck.fieldHints` |
| Deep admin user directory table/filters (outside logs audit sections) | Incremental |
| Global layout nav/footer labels | MongoDB-authored; needs `labelsByLocale` schema |
| `userProfileCompleteness` hint constants | Web UI uses `profileCompletenessCopy`; shared EN strings remain for API/validation/bots |
| `DEV_AUTH_TUNNEL_HINT` | Shared dev copy in `shared/lib/devAuthTunnelHint.ts` |
| `PageDomainError.message` on join page | Domain throws English; needs locale param on domain |
| Zod / API validation messages | Server-side; separate from next-intl catalogs |

## Developer patterns

### Server components

```tsx
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  if (!session) redirect("/login");
  return <h1>{t("heroTitle")}</h1>;
}
```

### Client components

```tsx
"use client";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";

const t = useTranslations("common");
return <Link href="/login">{t("signIn")}</Link>;
```

### Profile completeness (field keys, not English labels)

Shared domain code in `userProfileCompleteness.ts` keeps **English** `PROFILE_FIELD_LABELS` for tests, Zod/API errors, and Telegram bots. Web UI must **not** render those labels directly when locale matters.

Use [`src/lib/profileCompletenessCopy.ts`](../../src/lib/profileCompletenessCopy.ts) with `getTranslations("profile.completeness")` / `useTranslations("profile.completeness")`:

- `translateProfileCompletenessField(t, "phone")` — maps slug → message key `fields.phone`
- `membershipApplicationRequirementsCopy(t, profileSlice)` — dynamic requirements sentence
- `memberProfileMaintenanceCopy(t, profileSlice)` — member settings hints

API: `MembershipApplicationStatusDto` now includes **`missingFields`** (keys) alongside legacy `missingFieldLabels` (English). Prefer `missingFields` in client components.

### Mapping shared English issue strings (password strength)

When a shared pure function returns canonical English messages, map them in the UI layer:

```tsx
const ISSUE_KEY_BY_ENGLISH: Record<string, "tooShort" | "sameAsLogin"> = {
  "Password must be at least 8 characters.": "tooShort",
};
// render: tStrength(ISSUE_KEY_BY_ENGLISH[issue] ?? issue)
```

Prefer adding `locale` to shared copy helpers when the same strings appear in multiple surfaces.

### Bot template lookup

```typescript
await GeneralRulesDomain.ensureLoaded();
const locale = await resolveTelegramBotLocaleForUser({
  telegramUserId: message.from?.id,
  languageCode: message.from?.language_code,
});
const text = await GeneralRulesDomain.getTelegramMessageTemplate("startWelcome", locale);
```

### Shared notification copy

[`shared/lib/taskReminderNotificationCopy.ts`](../../shared/lib/taskReminderNotificationCopy.ts) accepts optional `locale: 'en' | 'uk'`.

## Verification

```bash
# JSON syntax
node -e "JSON.parse(require('fs').readFileSync('messages/en.json')); JSON.parse(require('fs').readFileSync('messages/uk.json')); console.log('ok')"

# Registered tests
npm run test:run -- locale-path-logic
npm run test:run -- general-rules-domain
```

Manual smoke:

1. Open `/uk/profile/settings` — labels in Ukrainian; save persists `preferredLocale`.
2. Open `/en/profile/notifications` — inbox chrome in English.
3. Switch locale via header `LocaleSwitcher` — URL prefix updates, same page content locale.
4. Admin `/uk/admin` — hub area titles in Ukrainian; back links stay under `/uk/admin`.

### Puck sidebar chapters (`titleKey`)

Block chapters register a stable `titleKey` in `blockFieldChapterConfigs.tsx`; `createChapterRenderer` resolves it via `useTranslations("puck.chapters")`. English `title` remains as fallback. Block drawer categories use `useLocalizedPuckConfig()` at editor render time.

### Puck block field labels (`fieldLabels` slug catalog)

Block `fields` configs keep canonical English `label` strings. `puckEditorOverrides` (`select`, `radio`, `fieldLabel`, `drawerItem`) and shared field components call `translatePuckSidebarCopy(english, t)` which slugs the English string (`puckCopySlug`) and looks up `puck.fieldLabels` / `puck.fieldOptions`. Missing keys fall back to English so new fields do not break the editor.

## Follow-ups

- [ ] Optional `labelsByLocale` on global layout nav schema
- [ ] Per-page Puck `locale` field for CMS content
- [ ] Locale-aware `PageDomainError` + join invite errors
- [ ] Puck custom field hints/placeholders (Tiptap, step labels, media alt text)
- [ ] Institutional calendar admin editor form body
- [ ] Security audit / system logs admin shells
