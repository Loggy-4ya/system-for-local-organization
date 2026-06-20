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
| User Access & Permissions | `/admin/user-access` | `access_control.manage_settings` or legacy `Admin` |
| User Directory | `/admin/users` | `users.view_directory` or legacy `Admin` |
| System Broadcasts | *(compose UI planned)* | `notifications.broadcast` or legacy `Admin` — tile only until UI ships |
| Academic Catalog Review | *(planned)* | Legacy `Admin` — tile only until UI ships |

## Shared card component

**`src/components/ui/NexusSurfaceCard.tsx`** — Tailwind-only reusable surface card modelled on Puck blocks (`NexusNewsCard`, `NexusStatCard`):

- Opaque `glass-panel` + Shadcn `Card` primitives
- Optional Lucide icon header with gradient band
- Optional `href` → Next.js `Link` wrapper with focus ring
- `disabled` + `eyebrow` for non-navigable states
- `hoverLift` (default `true`) for `-translate-y-1` interaction

Use this component anywhere a navigable glass card is needed outside Puck.

## Navigation

- Sub-editors (**Global Layout**, **User Access**) link back to **`/admin`** (“Back to Administration”).
- Default header **Manage → Administration** nav item (`shared/constants/globalLayout.ts`) points to `/admin`.

## Route protection

| Route | Guard |
|-------|-------|
| `/admin` | Middleware: authenticated. Page: at least one visible hub area or redirect `/profile`. |
| `/admin/global-layout` | Middleware: legacy `Admin` role. |
| `/admin/users` | Page: `canUserViewDirectory` or legacy `Admin`; unauthorised callers receive **404** (`notFound`) via shared `src/app/not-found.tsx` (footer remains visible). |
| `/admin/user-access` | Page: `canUserManageSettings` or legacy `Admin`; unauthorised callers receive **404** (`notFound`). |

## Acceptance criteria

- [x] `/admin` renders permitted area cards; no redirect to a single editor.
- [x] `NexusSurfaceCard` reusable outside admin hub.
- [x] Sub-editors link back to `/admin`.
- [x] User Directory tile added and fully functional.
- [ ] Broadcast compose page at `/admin/broadcasts` (planned).
- [ ] Academic catalog review at `/admin/academic-catalog` (planned).
