# Administration Hub (`/admin`)

## Outcome

Authenticated staff land on **`/admin`** and pick an administration workspace from a grid of glass-panel cards. Each card links to a dedicated editor route. Tiles the user is not permitted to manage are hidden — not shown disabled.

## UI

| Element | Implementation |
|---------|------------------|
| Page shell | `StaticPageShell` at admin content width (`1400px`) |
| Hub header | Opaque `glass-panel` intro block (title + description) |
| Area tiles | {@link NexusSurfaceCard} — icon header band, eyebrow, title, description, hover lift |
| Coming soon | Broadcast compose UI and academic catalog review — eyebrow **Coming soon**, no link |

## Area registry

Defined in `src/lib/adminHubAreas.ts` (`ADMIN_HUB_AREAS`).

| Area | Route | Visibility |
|------|-------|------------|
| Global Layout | `/admin/global-layout` | Legacy `Admin` role |
| Page Categories Hub | `/pages` (public browse), `/pages/edit` (publishers) | Page publishers (Admin, StudentCouncil, `pages.create`) |
| User Access & Permissions | `/admin/user-access` | `access_control.manage_settings` or legacy `Admin` |
| User Directory | `/admin/users` | `users.view_directory` or legacy `Admin` |
| Membership Applications | `/admin/membership-applications` | `users.assign_socium_roles` or legacy `Admin` |
| System Broadcasts | *(compose UI planned)* | `notifications.broadcast` or legacy `Admin` — tile only until UI ships |
| Academic Catalog Review | *(planned)* | Legacy `Admin` — tile only until UI ships |
| System Logs | `/admin/logs` | Legacy `Admin` — multi-section audit viewer |

## Shared card component

**`src/components/ui/NexusSurfaceCard.tsx`** — Tailwind-only reusable surface card modelled on Puck blocks (`NexusNewsCard`):

- Opaque `glass-panel` + Shadcn `Card` primitives
- Optional Lucide icon header with gradient band
- Optional `href` → Next.js `Link` wrapper with focus ring
- `disabled` + `eyebrow` for non-navigable states
- `hoverLift` (default `true`) for `-translate-y-1` interaction

Use this component anywhere a navigable glass card is needed outside Puck.

## Navigation

- Sub-editors (**Global Layout**, **User Access**) link back to **`/admin`** (“Back to Administration”).
- Default header **Administration → Admin Hub** nav item (`shared/constants/globalLayout.ts`) points to `/admin`.

## Route protection

| Route | Guard |
|-------|-------|
| `/admin` | Middleware: authenticated. Page: at least one visible hub area or redirect `/profile`. |
| `/admin/global-layout` | Middleware: legacy `Admin` role. |
| `/admin/page-categories` | Legacy redirect → `/pages/edit`. |
| `/admin/users` | Page: `canUserViewDirectory` or legacy `Admin`; unauthorised callers receive **404** (`notFound`) via shared `src/app/not-found.tsx` (footer remains visible). |
| `/admin/user-access` | Page: `canUserManageSettings` or legacy `Admin`; unauthorised callers receive **404** (`notFound`). |
| `/admin/membership-applications` | Page: `users.assign_socium_roles` or legacy `Admin`; unauthorised callers receive **404** (`notFound`). |
| `/admin/logs` | Page: legacy `Admin` only; unauthorised callers receive **404** (`notFound`). Sections: **Content sanitization** (`security_sanitize_audits`), **User directory** (`user_directory_audits`). |
| `/admin/general-rules` | Page: legacy `Admin` only; content policy + Telegram message templates. |
| `/admin/telegram-bot` | Page: legacy `Admin` only; focused Telegram bot message templates (same persistence as General Rules). |
| `/admin/security-audits` | Legacy redirect → `/admin/logs?section=content-sanitization` (same guard as `/admin/logs`). |

## Shared admin components

| Component | Path | Purpose |
|-----------|------|---------|
| `AdminEditorActionToolbar` | `src/components/admin/AdminEditorActionToolbar.tsx` | Aligned Reset / Save / optional Delete row; labels hidden below `sm` (icons + `aria-label`) |
| `admin-mobile-toolbar` | `src/app/global-layout-editor.css` | Fixed bottom action bar on phone (`lg:hidden`) with safe-area padding |

Used on User Directory, User Access, and Global Layout editors.

## Responsive behavior (all sub-routes)

| Route | Phone / tablet patterns |
|-------|-------------------------|
| `/admin` | Single-column card grid; `py-8 md:py-12` shell padding |
| `/admin/users` | Master-detail below `lg`; sticky action toolbar; Personal fields section; offset pagination (`NexusListPagination`, 10 rows/page) |
| `/admin/user-access` | Horizontally scrollable tab bar; permissions matrix `overflow-x-auto` with larger checkboxes below 640px; sticky save bar when dirty |
| `/admin/logs` | Section tabs; stacked filter rows; expanded audit rows scroll horizontally where tables are used |
| `/admin/security-audits` | Redirect only (no dedicated UI) |
| `/admin/global-layout` | Collapsible live preview below `md` (toggle button); reduced preview canvas height below 640px; sticky save bar when dirty |

## Acceptance criteria

- [x] `/admin` renders permitted area cards; no redirect to a single editor.
- [x] `NexusSurfaceCard` reusable outside admin hub.
- [x] Sub-editors link back to `/admin`.
- [x] User Directory tile added and fully functional.
- [ ] Broadcast compose page at `/admin/broadcasts` (planned).
- [ ] Academic catalog review at `/admin/academic-catalog` (planned).
- [x] Unified system logs at `/admin/logs` (content sanitization + user directory sections).
- [x] Legacy `/admin/security-audits` redirects to the content sanitization section.
- [x] Admin sub-routes responsive for phone users (master-detail directory, sticky toolbars, scroll-safe tables, collapsible global-layout preview).
