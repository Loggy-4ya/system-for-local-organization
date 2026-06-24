# Project Nexus — Architecture Map

Central directory-purpose map for the Nexus monorepo. Update this file whenever a new root or sub-directory is created.

**Directory hygiene policy:** Every folder must contain only files dedicated to its declared purpose — no unrelated assets, duplicates, or dump-folder clutter. See [directory_hygiene.md](./directory_hygiene.md) for the full rule, violation examples, and agent workflow.

## Root

| Path | Purpose | Allowed | Not allowed |
|------|---------|---------|-------------|
| `README.md` | Human + machine project entry — quick start, doc router, env profiles | Setup instructions, links to `.ai/docs/` | Duplicating full feature specs (link instead) |
| `src/` | Next.js App Router application (UI, API routes, client components) | Pages, layouts, components, hooks, lib utilities | Mongoose models, domain business logic |
| `shared/` | Cross-service shared code consumed by web, workers, and containers | Mongoose models (`shared/models/`), domain engines (`shared/domains/`) | React components, Next.js-specific code |
| `public/` | Static assets served at URL root | Organised subfolders: `icons/`, `brand/` | Secrets, compiled bundles, create-next-app boilerplate SVGs |
| `public/icons/` | Browser favicon and app icons | `favicon.ico`, future `apple-icon.png` | Logos, UI illustrations |
| `public/brand/` | Brand marks used in UI | `logo.svg` | Favicons, unrelated stock assets |
| `public/uploads/` | User-uploaded images and media (gitignored binaries; `.gitkeep` per segment) | Uploaded files in declared subfolders | Brand marks, static icons, loose files at `public/uploads/` root |
| `public/uploads/avatars/` | Profile avatar images | Image uploads from `/profile/settings` | Videos, Puck block assets |
| `public/uploads/page-covers/` | Puck page root background images | `page-cover` purpose uploads | Block inline media |
| `public/uploads/puck-blocks/` | Inline Puck block images and videos | `puck-block` purpose uploads | Avatars, task reports |
| `public/uploads/task-reports/` | Future task submission attachments | `task-report` purpose uploads | Unrelated CMS media |
| `public/uploads/general/` | Fallback uploads when purpose is `general` | Generic media | Purpose-specific assets |
| `tests/` | Automated test suites only | `*.test.ts` mirroring source tree (`tests/puck/lib/`, …); Playwright `*.spec.ts` under `tests/e2e/` | Application runtime code, React components, fixtures unrelated to a registered suite |
| `.ai/docs/` | Living architectural truth and feature specs | Markdown specs, roadmap, structure maps, [testing.md](./testing.md) test registry | Application runtime code |
| `.ai/docs/README.md` | Documentation index — entry point for agents and developers | Links to roadmap, architecture map, **production_readiness.md** | Application runtime code |
| `.ai/docs/production_readiness.md` | Production deploy checklist and deferred/future work tracker | Go-live verification, env reference, planned follow-ups | Application runtime code |
| `.ai/assets/` | Design-time media symlinked from `.ai/docs/assets/` | Background engine sources, exported Figma preview PNGs | Application runtime code |
| `.cursor/` | Cursor IDE project settings and agent rules | `settings.json`, `rules/*.mdc` (LLM context, not imported by app) | Application runtime code, secrets |
| `.cursor/rules/` | File-targeted Cursor agent rules (`.mdc`) | Puck sidebar chapter policy, file-specific constraints | Runtime `.ts` / `.tsx`, tests |
| `scripts/` | CLI maintenance jobs (orphan upload cleanup, future migrations) | `*.ts` runnable via `npm run job:*` | Application UI, long-running servers |
| `docker-compose.yml` | Container orchestration for stateless services | Service definitions, env wiring (`NEXUS_HOSTING_MODE=vps`) | Application logic |
| `.env.example` | Full environment variable reference (master catalogue) | Active |
| `.env.vps.example` | VPS/Docker profile with bundled MongoDB (local dev) | Active |
| `.env.vps-external-db.example` | VPS/Docker profile with external MongoDB (Atlas, remote host) | Active |
| `.env.vercel.example` | Vercel serverless deployment profile template | Active |
| `.env.hybrid.example` | Hybrid (Vercel web + telegram-worker) profile template | Active |
| `.env.aws.example` | AWS S3 media storage profile (merge with VPS or Vercel env) | Active |
| `docker-compose.bundled-db.yml` | Compose override — wait for bundled `db` health before web | Active |
| `vercel.json` | Vercel cron schedules for scheduled-events and media cleanup | Active |

## `src/` Sub-directories

| Path | Purpose | Status |
|------|---------|--------|
| `src/app/` | App Router routes, root layout, API handlers | Active |
| `src/app/loading.tsx` | Root Suspense fallback — `SiteLoader` with soft refresh + reload recovery | Active |
| `src/components/navigation/RouteNavigationRecoveryHost.tsx` | `popstate` / bfcache `pageshow` hooks — fast `router.refresh()` on history nav | Active |
| `src/lib/routeLoaderRecoveryLogic.ts` | Back-navigation detection and stuck-loader recovery delay tiers | Active |
| `src/app/layout.tsx` | Root layout: Inter font, ThemeProvider, InfiniteGrid, GlobalHeader | Active |
| `src/app/page.tsx` | Code-only homepage (`/`) — `HomeLandingShell` marketing islands; not Puck-managed | Active |
| `src/app/not-found.tsx` | Custom 404 — compact `StaticPageShell` so global footer stays in viewport (replaces Next.js `100vh` default) | Active |
| `src/app/globals.css` | Nexus CSS Custom Properties + Shadcn UI token bridge (`@import shadcn/tailwind.css`, `--background` → `--color-bg-surface`, etc.); spacing scale (`--spacing-sm` = default root-level Puck block vertical margin) | Active |
| `src/app/page-catalog.css` | `/pages` and `/pages/edit` catalog surfaces (split from globals for Safari/WebKit stylesheet size limits); imported in root layout | Active |
| `src/lib/utils.ts` | Shadcn `cn()` helper (`clsx` + `tailwind-merge`) | Active |
| `src/lib/assets.ts` | Canonical `public/` URL paths (`ICONS`, `BRAND`, `SITE_ICONS` for metadata) | Active |
| `src/app/[...puckPath]/` | Puck catch-all route (viewer + `/edit` editor mode); colocated `client.tsx` only | Active |
| `src/app/pages/` | Public catalog (`/pages`), publisher editor (`/pages/edit`); `PagesBrowseShell.tsx`, `PageManagerShell.tsx`, `NewPageForm.tsx` | Active |
| `src/app/pages/edit/` | Publisher catalog editor (drag reorder, FAB, save) | Active |
| `src/app/pages/categories/` | Legacy redirects → `/pages` | Active |
| `src/components/pages/` | Page Manager catalog UI (`PageCatalogCard`, `PageManagerCatalogView`, `NewPagePopover`, drag providers) | Active |
| `src/app/pages/join/[token]/` | Publisher invite redemption — adds delegate and redirects to Puck editor | Active |
| `src/app/admin/` | Administration hub — area picker at `/admin` | Active |
| `src/app/admin/telegram-bot/` | Telegram bot default message templates (`TelegramBotMessagesEditorShell`) | Active |
| `src/app/admin/global-layout/` | Admin Global Layout Editor page | Active |
| `src/app/admin/page-categories/` | Legacy redirect → `/pages/edit` | Active |
| `src/app/admin/user-access/` | Admin User Access & permissions matrix editor | Active |
| `src/app/admin/users/` | Admin User Directory page | Active |
| `src/app/admin/logs/` | Multi-section system audit logs (`/admin/logs`) | Active |
| `src/app/admin/security-audits/` | Legacy redirect → `/admin/logs?section=content-sanitization` | Active |
| `src/app/api/puck/` | REST API for loading/saving/deleting Puck page layouts to MongoDB | Active |
| `src/app/api/pages/categories/` | GET distinct page category labels for Puck editor autocomplete | Active |
| `src/app/api/page-categories/settings/` | GET/POST hub settings for page publishers | Active |
| `src/app/api/page-categories/hub/` | GET resolved news catalog hub payload | Active |
| `src/app/api/pages/move-domain/` | POST rename page path when moving across path domains | Active |
| `src/app/api/pages/publisher-invite/` | POST create publisher invite link for a persisted page | Active |
| `src/app/api/pages/view/` | POST increment public page view count (anonymous allowed, cookie dedupe) | Active |
| `src/app/api/pages/like/` | POST toggle authenticated user like on a published page | Active |
| `src/app/api/editor-settings/` | REST API for singleton Puck editor settings (island default components) | Active |
| `src/app/api/access-control/` | REST API for singleton access-control settings | Active |
| `src/app/api/admin/broadcasts/` | POST institution-wide broadcast messages | Active |
| `src/app/api/admin/users/` | REST API for searching, listing, and updating directory users | Active |
| `src/app/api/admin/security-sanitize-audits/` | GET paginated Puck sanitization audit rows (legacy Admin) | Active |
| `src/app/api/admin/user-directory-audits/` | GET paginated User Directory admin audit rows (legacy Admin) | Active |
| `src/app/api/notifications/broadcasts/` | GET active web toasts; POST dismiss per user | Active |
| `src/app/api/notifications/inbox/` | GET paginated personal inbox; unread count; mark read | Active |
| `src/app/api/notifications/task-reminders/` | GET active task reminder toasts; POST dismiss per user | Active |
| `src/app/api/notifications/web-prompt/` | GET/POST post-auth browser notification permission prompt | Active |
| `src/app/api/global-layout/` | REST API for global layout settings | Active |
| `src/app/api/upload/` | REST API for media uploads via {@link MediaDomain} | Active |
| `src/app/api/upload/from-url/` | POST remote HTTPS image import → local storage via {@link MediaDomain.uploadFromUrl} | Active |
| `src/app/api/admin/jobs/media-orphan-cleanup/` | POST scan `public/uploads/` vs MongoDB refs; delete orphans | Active |
| `src/app/api/admin/jobs/process-scheduled-events/` | GET/POST claim and execute due scheduled background tasks | Active |
| `src/app/(marketing)/` | Hardcoded landing and public marketing pages (excluded from Puck) | Planned |
| `src/app/(dashboard)/` | Hardcoded admin dashboard shell (excluded from Puck) | Planned |
| `src/app/(auth)/` | Authentication flows (`/login`, `/signup`) | Active |
| `src/app/telegram/` | Telegram Mini App entry (`/telegram`) | Active |
| `src/app/(profile)/` | User profile dashboard (`/profile`) and settings (`/profile/settings`) | Active |
| `src/app/(profile)/profile/notifications/` | Personal notification center inbox UI | Active |
| `src/app/users/[userId]/` | Public member profile view (authenticated) | Active |
| `src/app/tasks/` | Task manager list, create, and detail routes | Active |
| `src/app/task-groups/` | Multi-part project list, create, detail (`plannedRoster`, Telegram workspace panel) | Active |
| `src/app/api/task-groups/` | Task group CRUD, picker, per-group Telegram workspace PATCH | Active |
| `src/app/api/users/search/` | GET user autocomplete (name, login, group, email) | Active |
| `src/components/users/` | Reusable user search picker for tasks and forms | Active |
| `src/app/api/tasks/` | Task list + create REST API | Active |
| `src/app/api/tasks/[taskId]/` | Task detail, update, cancel + sub-action routes | Active |
| `src/components/tasks/` | Task manager UI shells (list, create, detail) | Active |
| `src/app/api/auth/` | Auth.js handler, register, Telegram widget + Mini App verify | Active |
| `src/app/api/auth/signup-options/` | GET approved specialty/group labels for signup dropdowns | Active |
| `src/app/api/telegram/` | Telegram Bot API webhook (`/api/telegram/webhook`) | Active |
| `src/app/api/profile/completeness/` | GET membership profile readiness summary | Active |
| `src/app/(profile)/profile/membership/` | Self-government membership application submit/withdraw UI | Active |
| `src/app/api/membership-application/` | GET/POST/DELETE applicant membership application status | Active |
| `src/app/admin/membership-applications/` | Admin queue — approve/reject self-government applications | Active |
| `src/app/api/admin/membership-applications/` | Paginated pending application list | Active |
| `src/app/api/admin/membership-applications/[userId]/approve/` | POST approve application | Active |
| `src/app/api/admin/membership-applications/[userId]/reject/` | POST reject application | Active |
| `src/app/api/profile/` | GET/PATCH user profile; DELETE `/api/profile/telegram` unlink | Active |
| `src/app/api/me/` | GET authenticated viewer basic profile for site chrome bootstrap | Active |
| `src/app/api/mentions/` | Mention autocomplete for rich text editor (`/api/mentions/search`) | Active |
| `src/auth.ts` | Auth.js configuration (providers, callbacks, session) | Active |
| `src/auth.config.ts` | Edge-safe Auth.js config for middleware | Active |
| `src/middleware.ts` | Route protection for `/profile/*`, `/admin/*`, `/tasks/*`, `/users/*`; `Accept-CH` for theme hints | Active |
| `src/lib/resolveStoredThemeIsDark.ts` | SSR helper — resolves dark/light from theme cookie + color-scheme client hint | Active |
| `src/components/auth/` | Auth UI: `AuthShell`, OAuth row, role chips, forms | Active |
| `src/components/marketing/` | Code-only public marketing surfaces (homepage islands at `/`) | Active |
| `src/components/profile/` | Profile dashboard and settings components | Active |
| `src/components/admin/` | Administration hub shell (`AdminHubShell`), `AdminSystemLogsShell`, shared `AdminEditorActionToolbar`, page categories hub editor | Active |
| `src/components/access-control/` | User access hierarchy & permission matrix editor UI | Active |
| `src/components/ui/pagination.tsx` | Shadcn pagination primitives | Active |
| `src/components/ui/calendar.tsx` | Shadcn calendar (react-day-picker) for scheduled publish | Active |
| `src/components/ui/NexusDateTimePicker.tsx` | Combined date + time picker for delayed page publishing | Active |
| `src/components/media/SettingsMediaPreview.tsx` | Readable contain preview for settings upload fields | Active |
| `src/components/puck/PageLikeButton.tsx` | Bottom-right reactions launcher on published pages | Active |
| `src/components/notifications/` | `SiteNotificationToastStack`, `WebNotificationPermissionPromptHost`, `NotificationCenterShell`, `NotificationBellButton` | Active |
| `src/components/global-layout/` | Global Layout editor components (Header, Footer, Preview, IconPicker) | Active |
| `src/components/` | Reusable UI primitives bound to design tokens | Active |
| `src/components/background/` | `InfiniteGrid` dual-canvas client component (`isContained` + `isStatic` freezes scroll only); `LayoutInfiniteGrid.tsx` subscribes to `pageBackgroundGridStore.ts` for Puck page grid motion; `infiniteGridIconLoader.ts` for WebKit-safe SVG rasterization; `logo-grid.svg` for both themes; `z-index:0` stacking | Active |
| `src/components/ui/` | Shared UI: Shadcn/Base UI primitives (`button`, `card`, `carousel`, `accordion`, `select`, `command`, `dialog`, `drawer`, `spinner`), `SiteLoader`, `GlobalHeader`, `SiteHeaderBar`, `ThemeProvider` | Active |
| `src/components/editor/` | Site-wide TipTap rich text editor with `@` mentions (`NexusRichTextEditor`, `NexusRichTextView`, TipTap extensions) | Active |
| `src/components/media/` | App-wide image crop dialog (`NexusImageCropHost`, preview masks, rotate/zoom) — see [image_crop_editor.md](./features/image_crop_editor.md) | Active |
| `src/components/puck/` | Puck block registry (`config.tsx`) + individual block files | Active |
| `src/components/puck/blocks/` | Puck block definitions grouped by category (layout, content, news) | Active |
| `src/components/puck/fields/` | Custom Puck fields (`PageSettingsFieldGroup`, `PageAppearanceFieldGroup`, `CoverMediaFrame`, `PuckSelectField`, `TiptapField`, `MediaUploadField`, …) | Active |
| `src/components/puck/lib/` | Shared helpers (`puckDataTree.ts`, `applyIslandDefaultsOnInsert.ts`, `nexusGridItemZonePolicy.ts`, `gridEditSizing.ts`, `canvasDropTargetLogic.ts`, `pageRootFieldProps.ts`, `blockFieldChapters.tsx`, `spacingFields.tsx`, `contentWidthTokens.ts`, …) | Active — **no** `*.test.ts` (tests live in `tests/puck/lib/`) |
| `src/components/puck/root/` | Puck root page wrapper (`PageRoot.tsx`) | Active |
| `src/lib/` | App-local utilities and constants (no React, no routes) — includes `mediaUploadClient.ts`, `assets.ts`, `dragAutoScrollLogic.ts`, `nexusEditor/` | Active |
| `src/lib/nexusEditor/` | Rich text sanitizer, mention query client, slash command catalog for {@link NexusRichTextEditor} | Active |
| `src/lib/mediaUploadClient.ts` | App-wide browser upload helper (`POST /api/upload` + purpose); `uploadMediaFileWithCrop` opens crop dialog first | Active |
| `src/lib/imageCropClient.ts` | Crop dialog entry (`cropImageFile`, `shouldOpenImageCropForFile`) | Active |
| `src/lib/imageCropCanvas.ts` | Browser canvas export for rotated crops | Active |
| `src/lib/nexusHostingBootstrap.ts` | Boot-time hosting validation, policy cache, abort on prod misconfig | Active |
| `src/lib/nexusJobsConfig.ts` | Scheduler interval readers clamped by hosting policy | Active |
| `src/instrumentation.ts` | Next.js boot hook — hosting bootstrap + in-process job schedulers | Active |
| `src/app/api/admin/hosting-config/` | GET admin hosting mode, policy, warnings, errors | Active |
| `src/app/admin/hosting/` | Admin hosting diagnostics page | Active |
| `scripts/telegramWorker.ts` | MTProto worker poll loop (`npm run worker:telegram`) | Active |

## `tests/` Sub-directories

| Path | Purpose | Status |
|------|---------|--------|
| `tests/puck/lib/` | Unit tests for `src/components/puck/lib/` pure logic modules | Active |
| `tests/shared/lib/` | Unit tests for shared lib helpers (Telegram initData verify, media storage rules) | Active |
| `tests/shared/domains/` | Unit tests for shared domains (global layout validation) | Active |
| `tests/shared/validation/` | Unit tests for shared validation schemas | Active |

## `shared/` Sub-directories

| Path | Purpose | Status |
|------|---------|--------|
| `shared/lib/db.ts` | Mongoose connection helper with global cache | Active |
| `shared/models/AccessControlSettings.ts` | Singleton access hierarchy and permission matrix | Active |
| `shared/models/User.ts` | Unified User schema (cross-platform auth, RBAC, socium identity, gamification) | Active |
| `shared/models/userTypes.ts` | Shared TypeScript types for socium roles, affiliations, social links, quality scores | Active |
| `shared/models/AcademicCatalog.ts` | Admin-reviewed specialty and group catalog (`academic_catalog`) | Active |
| `shared/models/SociumCatalog.ts` | Admin-configurable socium role, activity, and organization catalogs | Active |
| `shared/models/UserEngagement.ts` | Community engagement stubs — comments, survey participation, published content feed | Active |
| `shared/models/FormFieldResponse.ts` | Puck `NexusInput` per-user answers (survey / quiz / text) | Active |
| `shared/domains/FormFieldDomain.ts` | Form field submit, stats, and `SurveyParticipation` linkage | Active |
| `shared/models/TelegramContactHarvest.ts` | Staged phone numbers from bot `request_contact` before account creation | Active |
| `shared/models/SystemBroadcast.ts` | Institution-wide broadcast messages | Active |
| `shared/models/UserBroadcastReceipt.ts` | Per-user broadcast delivery and dismissal receipts | Active |
| `shared/models/UserNotification.ts` | Per-user durable notification inbox rows | Active |
| `shared/models/Page.ts` | Puck page layout schema (path → puckData, publication metadata, engagement counters) | Active |
| `shared/models/PageLike.ts` | Per-user page like records | Active |
| `shared/models/Task.ts` | Institutional task assignments, reports, scoring, optional `telegramForumTopicId` | Active |
| `shared/models/TaskGroup.ts` | Multi-part project shell — `plannedRoster`, child task aggregates, `telegramWorkspace` | Active |
| `shared/models/PageCategoriesSettings.ts` | Singleton page categories hub / news catalog configuration | Active |
| `shared/models/PagePathSettings.ts` | Singleton hidden page path domain labels for the editor picker | Active |
| `shared/models/EditorSettings.ts` | Singleton Puck editor settings (`islandDefaultComponents`) | Active |
| `shared/models/GlobalLayout.ts` | Singleton Global Layout configuration model | Active |
| `shared/models/SystemScheduledEvent.ts` | System scheduled events queue model | Active |
| `shared/constants/editorSettings.ts` | Client-safe editor settings seed constants | Active |
| `shared/constants/globalLayout.ts` | Global Layout seed constants and whitelists | Active |
| `shared/domains/` | Consolidated domain engines (one file per domain) | Active |
| `shared/constants/broadcastChannels.ts` | Broadcast delivery channel registry (`web_toast`, `telegram_dm`, …) | Active |
| `shared/constants/scheduledEventTypes.ts` | Registry of recognized background event types | Active |
| `shared/constants/accessControl.ts` | Seven-tier hierarchy, permission keys, default matrix | Active |
| `shared/constants/listPagination.ts` | Default/max page sizes for paginated list APIs | Active |
| `shared/constants/contentPolicy.ts` | Central blocked-word and weak-password denylists | Active |
| `shared/constants/taskSettings.ts` | Task status registry, delegation limit defaults, score bounds | Active |
| `shared/constants/nexusHosting.ts` | Hosting mode slugs (`vps`, `serverless`, `hybrid`) and env key names | Active |
| `shared/lib/nexusHostingLogic.ts` | Pure hosting mode resolution, env validation, effective policy | Active |
| `shared/domains/BroadcastDomain.ts` | System-wide broadcast send, web toast query, dismiss | Active |
| `shared/domains/NotificationDomain.ts` | Personal notification inbox — record, list, read state, legacy backfill | Active |
| `shared/domains/AccessControlDomain.ts` | Access-control settings load/update and permission resolution | Active |
| `shared/lib/membershipApplicationLogic.ts` | Pure membership application status helpers | Active |
| `shared/domains/MembershipApplicationDomain.ts` | Self-government membership application queue, submit, approve, reject | Active |
| `shared/domains/AuthDomain.ts` | Auth registration, OAuth merge, Telegram widget + Mini App, profile mutations | Active |
| `shared/domains/TaskDomain.ts` | Task CRUD, acknowledgement, reports, scoring, delegation, reminders, forum topic sync on dispatch | Active |
| `shared/domains/TaskGroupDomain.ts` | Project CRUD, planned roster, aggregate refresh, group reminders | Active |
| `shared/domains/TelegramBotDomain.ts` | Telegram Bot API webhook (`/start`, `/link`, task commands), forum topic create | Active |
| `shared/domains/TelegramBotTaskDomain.ts` | `/tasks`, `/task_report`, `/see_report`, `/completed`, report wizard sessions | Active |
| `shared/domains/TelegramOperatorDomain.ts` | MTProto create, forum toggle, member sync, dismantle (telegram-worker) | Active |
| `shared/domains/TelegramWorkspaceDomain.ts` | Workspace state machine, operator job queue, bot topic sync | Active |
| `shared/lib/telegramChannelIdLogic.ts` | Bot API ↔ MTProto supergroup id conversion | Active |
| `shared/lib/taskGroupRosterLogic.ts` | Planned roster dedupe, performer union, forum topic title formatting | Active |
| `shared/lib/telegramBotTaskLogic.ts` | Bot task list templates and index resolution | Active |
| `shared/lib/telegramReportFlowLogic.ts` | `/task_report` wizard step machine | Active |
| `shared/lib/telegramBotCommandLogic.ts` | Slash-command parsing and session cancel rules | Active |
| `shared/domains/TelegramBotUserDomain.ts` | Telegram sender → Nexus registration state | Active |
| `shared/lib/telegramBotUserLogic.ts` | Register / incomplete / ready classification | Active |
| `shared/lib/telegramOperatorEnv.ts` | Worker env validation | Active |
| `shared/lib/accessControlLogic.ts` | Pure hierarchy rank, effective permissions, delegation checks | Active |
| `shared/lib/directoryRedaction.ts` | User Directory field-level PII redaction and DTO mapping | Active |
| `shared/lib/listPaginationLogic.ts` | Offset pagination helpers (`computeTotalPages`, `buildPaginationItems`, …) | Active |
| `shared/lib/passwordStrength.ts` | Signup password strength assessment | Active |
| `shared/lib/contentPolicy.ts` | Blocked-word scan, mask, weak-password denylist checks | Active |
| `shared/lib/puckContentPolicy.ts` | Puck JSON content-policy scan before page save | Active |
| `shared/validation/contentPolicySchemas.ts` | Zod refinements for blocked-word validation | Active |
| `shared/lib/academicCatalogLogic.ts` | Specialty/group catalog slug and approval helpers | Active |
| `shared/lib/pageCategoryLogic.ts` | Puck page category label normalization and suggestion filter | Active |
| `shared/lib/pageCategoriesHubLogic.ts` | Page categories hub normalization and news catalog card helpers | Active |
| `shared/lib/publicProfileRedaction.ts` | Member profile PII redaction DTO for `/users/[userId]` | Active |
| `shared/lib/taskAccessLogic.ts` | Pure task permission and delegation quota rules | Active |
| `shared/domains/UserSearchDomain.ts` | Institution user search for pickers |
| `shared/lib/userSearchLogic.ts` | Search filter builder and result DTO mapping |
| `shared/lib/imageCropLogic.ts` | Pure crop geometry, export MIME/filename helpers for the image crop editor | Active |
| `shared/lib/splitPersonName.ts` | OAuth full-name → given name + surname split | Active |
| `shared/lib/userProfileCompleteness.ts` | Membership application profile gaps; phone requirement rules | Active |
| `shared/lib/userSociumHelpers.ts` | Full name formatting, socium role sync, quality score init, publish eligibility | Active |
| `shared/lib/scheduledEventLogic.ts` | Pure state transition, exponential backoff, and locking logic | Active |
| `shared/lib/scheduledEventHandlers/` | Background task handler registrations | Active |
| `shared/domains/MediaDomain.ts` | Media upload validation + storage provider orchestration | Active |
| `shared/domains/PageDomain.ts` | Puck page persistence (delete, category catalog aggregation) | Active |
| `shared/domains/PageCategoriesDomain.ts` | Page categories hub settings load/update and catalog payload resolution | Active |
| `shared/domains/SchedulerDomain.ts` | Central background task scheduler and execution engine | Active |
| `shared/domains/MentionDomain.ts` | User + page mention search for rich text `@` autocomplete | Active |
| `shared/lib/nexusMentionTypes.ts` | Shared mention item types and href builders | Active |
| `shared/constants/mediaStorage.ts` | Upload purpose policies, size limits, driver constants | Active |
| `shared/constants/imageCropContexts.ts` | Preview mask definitions for the app-wide image crop editor | Active |
| `shared/lib/mediaStorage/` | Storage provider implementations (local filesystem, GCS, S3) | Active |
| `shared/lib/safeHref.ts` | Hyperlink allowlist for Puck blocks and rich text | Active |
| `shared/lib/safeMediaUrl.ts` | Media `src` URL validation (local uploads, GCS, S3, HTTPS) | Active |
| `shared/lib/nexusRichTextSanitize.ts` | TipTap HTML allowlist + mention anchor normalization | Active |
| `shared/lib/puckContentSanitize.ts` | Deep-walk Puck JSON sanitization on page save | Active |
| `shared/lib/puckContentSanitizeReport.ts` | Field-level sanitization diff types for audit logging | Active |
| `shared/lib/securitySanitizeAuditLog.ts` | Console + MongoDB audit for blocked Puck content | Active |
| `shared/lib/userDirectoryAuditLog.ts` | Console + MongoDB audit for User Directory admin mutations | Active |
| `shared/lib/userDirectorySaveLogic.ts` | Pre-save profile requirement checks for User Directory admin PATCH | Active |
| `shared/lib/userDirectoryProfilePatch.ts` | Profile field patch delta builder for User Directory admin saves | Active |
| `shared/models/GeneralRulesSettings.ts` | Singleton general rules (blocklist, Telegram templates) | Active |
| `shared/domains/GeneralRulesDomain.ts` | Load/update general rules + publish effective cache | Active |
| `shared/domains/UserDirectoryAuditDomain.ts` | List and record User Directory admin audit rows | Active |
| `shared/models/SecuritySanitizeAudit.ts` | Persisted sanitization audit trail | Active |
| `shared/models/UserDirectoryAudit.ts` | Persisted User Directory admin audit trail | Active |
| `src/lib/contentSecurityPolicy.ts` | CSP header builder + nonce generation for middleware | Active |
| `shared/validation/` | Centralized Zod validation schemas and format utilities | Active |

## `.ai/docs/` Sub-directories

| Path | Purpose | Allowed | Not allowed |
|------|---------|---------|-------------|
| `.ai/docs/features/` | Per-feature specifications with acceptance criteria | `*.md` spec files | Runtime `.ts` / `.tsx` imported by the app |
| `.ai/docs/features/puck_editor.md` | Puck Editor overhaul and block specifications | Markdown spec | — |
| `.ai/docs/features/puck_editor_enhancements.md` | Editor UI/UX refinements (fields, path bug, spacing) | Markdown spec | — |
| `.ai/docs/features/puck_editor_performance.md` | Canvas performance playbook (ref-only sync, selectors, deferred fields, resolveData) | Markdown spec | — |
| `.ai/docs/features/puck_field_controls.md` | Puck sidebar field controls — outline-flat select/segmented/switch/input style | Markdown spec | — |
| `.ai/docs/features/puck_grid_item_zone_policy.md` | Grid Item placement rule (`{gridId}:content`), slot disallow, outline/root guards | Markdown spec | — |
| `.ai/docs/features/media_storage.md` | Unified media upload/storage architecture (local + GCS + S3) | Markdown spec | — |
| `.ai/docs/assets/` | Design-time media (background engine sources, Figma exports) | Reference images, prototype HTML/JS | Production bundles, duplicates of `public/` without documented reason |
| `.ai/docs/directory_hygiene.md` | Single-purpose folder policy and placement decision tree | Policy documentation | — |
| `.ai/docs/architecture_map.md` | This file — directory purpose registry | Structure maps | Application code |
| `.ai/docs/icon_sizes.md` | Canonical Lucide icon size tiers (site chrome 18px, Puck sidebar 14px, compact rail) | Size tokens, helpers, surface map | Application code |
| `.ai/docs/roadmap.md` | Master progress tracker | Status lists, phase notes | Unrelated notes, scratch dumps |

## Design ↔ Code Bridge

Figma design tokens and frame node IDs are documented in [features/figma_ui_integration.md](./features/figma_ui_integration.md). Puck.js block names must map 1:1 to Figma component names listed in that file.

## Figma MCP Agent Protocol

**Plan requirement:** Figma Pro (or higher) with Full/Dev seat. Starter-tier workarounds (split Light/Dark collections, 3-page layouts) are **deprecated**.

| Step | Agent action |
|------|--------------|
| Before write | Read `.ai/docs/features/figma_ui_integration.md` Section 0 |
| Auth check | `whoami` → confirm `tier: pro` |
| Inspect | `use_figma` read-only on file `J2lVqyamWpo7Rxzah1Fq4i` |
| Tokens | `Nexus/Primitives` → `Nexus/Color` (Light/Dark) → Spacing → Radius |
| Pages | 8 named pages per integration spec (not sections on 3 pages) |
| Frames | Transparent 1440×900; glass panels bound to semantic variables |
| After write | Update node IDs in `figma_ui_integration.md` + roadmap status |

**Skills (mandatory):** `figma-use` before every `use_figma`; `figma-generate-library` for tokens and components.
