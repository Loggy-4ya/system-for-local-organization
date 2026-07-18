# Master Progress Tracker (roadmap.md)

This document is the central living roadmap for **Project Nexus**. It tracks the developmental history, planning, and status of all domains, features, and UI integrations. 

**AI Agent Mandate:** You must update these statuses (`[ ] Planned`, `[~] In Progress`, `[x] Completed`) immediately upon the ideation, initiation, or completion of any feature, in strict accordance with the Auto-Documentation on Mutation protocol. No spaghetti code is allowed.

## Phase 0: Infrastructure & Core Architecture
- [x] Initialize Next.js Monorepo (Node.js, TypeScript).
- [x] Configure Docker containerization (`docker-compose.yml` + unified multi-stage `Dockerfile` with `dev` / `production` / `worker` targets) for stateless local and VPS deploy.
- [x] Setup MongoDB with Mongoose ODM (`shared/lib/db.ts` global-cached connection helper).
- [x] Define `User` and `Page` shared models (`shared/models/`).
- [x] Establish `.ai/docs/` Live Documentation Loop and core `AGENT.md` guidelines.
- [x] **AWS EC2 deployment:** `NEXUS_HOSTING_MODE=vps`, root `.env.example`, [env_and_secrets.md](./env_and_secrets.md) (dotenvx), boot validation — see [hosting_and_deployment.md](./features/hosting_and_deployment.md).
- [~] **AWS CI/CD:** protected `main` production promotion, `dev` staging validation, GitHub Actions OIDC, immutable ECR web/worker images, EC2 Systems Manager deployment, AWS Secrets Manager runtime env, health verification, and rollback — see [hosting_and_deployment.md](./features/hosting_and_deployment.md).

## Phase 1: Global Layout, Theming & Background Engine
- [~] **Figma Design Preview:** Dark theme + strict admin shell on `58:2`/`58:17`. News (`59:17`), Editor (`59:32`), Profile (`59:47`) dark-themed. Remaining: variable bindings, light toggle previews, Foundations type/spacing specimens. See `.ai/docs/features/figma_ui_integration.md`.
- [~] **Puck.js Integration:** `@puckeditor/core` 0.21.x installed; block registry (`src/components/puck/config.tsx`) with 13 Figma-mapped components across 4 categories; slots/grids layout support; unified media storage via `MediaDomain` + `/api/upload`; root background picker; catch-all route (`src/app/[...puckPath]/`); MongoDB save/load API (`src/app/api/puck/route.ts`); mobile plugin rail; Outline tree drag reorder; auto viewport sync; glass viewport instrument island; three-tier responsive canvas layout (compact ≤900px, narrow desktop 901–1023px).
- [x] **Unified Media Storage:** Purpose-based upload pipeline (`avatar`, `page-cover`, `puck-block`, `task-report`) with local filesystem (dev) and Amazon S3 (production) — see `.ai/docs/features/media_storage.md`.
- [x] **Image crop editor:** App-wide crop/rotate dialog with contextual preview masks (`react-easy-crop`) — see [image_crop_editor.md](./features/image_crop_editor.md).
- [~] **Content Security (XSS):** Safe href/media URL helpers, Puck save sanitization, render-time guards, SVG upload block, CSP middleware — see `.ai/docs/features/content_security.md`.
- [~] **Puck Editor UI/UX Refinements:** Path state fix, RGBA/media fields, accent background presets, header chrome, inline title, block spacing/lining, root-level block default margin (`sm` / `--spacing-sm`), canvas slot reparenting + full-container drop highlights, **settings readability pass** (field hint icons, category divider cleanup, chapter renames) — see `.ai/docs/features/puck_editor_enhancements.md` (`[x]` completed), `.ai/docs/features/field_hints.md`, and `.ai/docs/features/puck_editor.md` §3b / §6c.
- [x] **Page categories (Obsidian-style tags):** Searchable multi-select in Page Settings; DB-derived autocomplete; creatable labels — see [page_categories.md](./features/page_categories.md). Page Manager badge display deferred (§5 of that doc).
- [~] **Infinite Background Engine:** `InfiniteGrid` React Client Component (`src/components/background/InfiniteGrid.tsx`) — dual-canvas, RAF animation, mouse-tracking CSS Custom Properties, radial vignette. Mounted in root layout.
- [~] **Global Next.js Routing:** Root layout with ThemeProvider, InfiniteGrid, GlobalHeader; `@shared/*` tsconfig path alias for server-side model imports. **Internationalization:** next-intl (`/en` + `/uk`), Telegram bot per-locale templates, `User.preferredLocale` — see [internationalization.md](./features/internationalization.md).
- [~] **Design System & Theming:** `next-themes` installed; `globals.css` defines all Nexus/Color tokens, spacing, radius, glass utilities. Shadcn UI (Base UI / `base-vega`) installed with token bridge in `globals.css`. `GlobalHeader` + `SiteHeaderBar` with fixed header, native `<details>` mobile nav (no JS), `ThemeToggleLink` + `/api/theme/toggle`, theme toggle (☀/☾) in Puck editor via client `ThemeToggle`, and RBAC `showAdminPanel` prop. Per-user MongoDB accent fields removed; run `npm run job:remove-user-accent-fields` on existing databases.
- [x] **Configurable Global Layout:** MongoDB-backed configurable header categories and footer columns with live preview and Admin-only Global Layout Editor at `/admin/global-layout`.

## Phase 2: Authentication & User Profiles (Auth Domain)
- [x] **Cross-Platform Auth:** Google OAuth2, Telegram Login Widget, Telegram Mini App, and login/password via Auth.js. See `.ai/docs/features/auth_and_profiles.md` and `.ai/docs/features/telegram_mini_app_and_bot.md`.
- [~] **Bot Data Harvesting:** Telegram Login Widget and Mini App merge name, username, avatar into unified MongoDB record; **phone harvest via bot `request_contact`** stores pre-registration phones and updates linked profiles — see [telegram_mini_app_and_bot.md](./features/telegram_mini_app_and_bot.md).
- [~] **Profile Management:** `/profile` read-only dashboard; `/profile/settings` for editable fields; **personal notification center** at `/profile/notifications` — see [notification_center.md](./features/notification_center.md). **Public member profiles** at `/users/[userId]` — see [public_user_profiles.md](./features/public_user_profiles.md). Extended socium identity, about, social links — see [user_model_and_social_identity.md](./features/user_model_and_social_identity.md). Task panels wired to live engine (Phase 5).
- [~] **Student Registration Flow:** `/signup` — two-column name/surname, phone, password strength + confirm, creatable specialty/group dropdowns, socium role (Student/Starosta), self-government application intent, personal data consent. **Membership review** at `/admin/membership-applications` — see [membership_applications.md](./features/membership_applications.md). See [signin_identity_matrix.md](./features/signin_identity_matrix.md).

## Phase 3: The Admin Dashboard & Complex Tables (Admin Domain)
- [x] **Access Control & Hierarchy:** Seven-tier permission matrix, `/admin/user-access` editor, User Directory and per-user assignments — see [access_control_and_hierarchy.md](./features/access_control_and_hierarchy.md).
- [x] **Administration Hub:** `/admin` area picker with `NexusSurfaceCard` tiles — see [admin_hub.md](./features/admin_hub.md). Responsive layouts across all admin sub-routes (User Directory master-detail, shared `AdminEditorActionToolbar`, sticky mobile save bars).
- [~] **System Broadcasts:** `POST /api/admin/broadcasts` — web toasts + Telegram DM to all users — see [system_broadcasts.md](./features/system_broadcasts.md). Admin compose UI deferred.
- [ ] **Leaderboard & Gamification:** Calculate and display user "Stars" as the sum of coins and crystals earned over the study period.
<!-- - [ ] **Task & Marks Table UI:** Implement the massive tracking table with support for a 1-12 marking scale (classwork, independent work, exams). -->
- [ ] **Calendar Mode:** Build the table view where rows are users, columns are days/weeks, and cells display accomplished tasks.
- [ ] **Tasks Stack Mode:** Build the visual volume tracker where columns are small boxes showing the width of the cell to represent the number of tasks per user.
- [ ] **Warning System:** Track member warnings with an automatic kick-out trigger upon reaching the 3-warning limit.

## Phase 4: Ephemeral Workspaces & Telegram Automation (Workspace Domain)
- [~] **Telegram Core Worker:** Web app webhook handles `/start` + Mini App open button; full group sync and commands remain planned.
- [~] **Dynamic Group Creation:** Manual `/link`, MTProto `telegram-worker`, in-group `/status` + `/task_done` — [telegram_project_workspaces.md](./features/telegram_project_workspaces.md); `/report` media scraping remains planned.
- [~] **In-Group Command Parsing:** `/status` and `/task_done` shipped; `/report` with photos/videos remains planned.
- [ ] **Automated Clean-up:** Automatically save final reports to MongoDB and dismantle/delete the group when the project is marked completed to prevent clutter.

## Phase 5: Task Management, Editors & Community
- [~] **Scheduled Events Engine:** Core background task scheduler, MongoDB queue model, shared auth, API routes, and in-process/CLI runners (foundation completed).
- [~] **Task Core Engine:** CRUD, performers, reports, scoring, delegation quotas, reminders — see [task_management.md](./features/task_management.md). **Task groups** — [task_groups.md](./features/task_groups.md). **Calendar `on_dates` reminders** + **institutional yearly rules** — [institutional_calendar.md](./features/institutional_calendar.md).
- [~] **Asynchronous Acknowledgements:** Performer `Confirm receipt` on dispatched tasks (`POST /api/tasks/[id]/acknowledge`).
- [~] **Constant Reminders System:** `task_reminder` scheduler delivers web toasts + Telegram DMs; see [task_management.md](./features/task_management.md).
- [~] **Community Interactions:** Comment sections and Puck **Form Input** surveys/quizzes on published pages — see [form_fields_and_surveys.md](./features/form_fields_and_surveys.md) and [user_model_and_social_identity.md](./features/user_model_and_social_identity.md).
- [~] **Notion-Style Text Editor:** Site-wide TipTap kit with `@` user/page mentions — see `.ai/docs/features/nexus_rich_text_editor.md`. Page hover preview cards remain planned.
- [~] **News Hub:** Page publication metadata (description, cover, schedule, views/likes) in Puck Page Settings — see [page_metadata_and_engagement.md](./features/page_metadata_and_engagement.md). **Page Categories Hub** admin editor + `NexusNewsCatalog` block — see [page_categories_hub.md](./features/page_categories_hub.md).

---
*Note for AI Agents: ALL features implemented must strictly adhere to the English JSDoc formatting rules, the Domain Consolidation Principle, and [directory_hygiene.md](./directory_hygiene.md) (single-purpose folders — no misplaced or duplicate files). DO NOT proceed with any task without first verifying this document and related specifications inside `.ai/docs/`.*
