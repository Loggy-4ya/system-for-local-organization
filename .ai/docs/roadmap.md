# Master Progress Tracker (roadmap.md)

This document is the central living roadmap for **Project Nexus**. It tracks the developmental history, planning, and status of all domains, features, and UI integrations. 

**AI Agent Mandate:** You must update these statuses (`[ ] Planned`, `[~] In Progress`, `[x] Completed`) immediately upon the ideation, initiation, or completion of any feature, in strict accordance with the Auto-Documentation on Mutation protocol. No spaghetti code is allowed.

## Phase 0: Infrastructure & Core Architecture
- [x] Initialize Next.js Monorepo (Node.js, TypeScript).
- [x] Configure Docker containerization (`docker-compose.yml` + `Dockerfile.dev`) for stateless local operation.
- [x] Setup MongoDB with Mongoose ODM (`shared/lib/db.ts` global-cached connection helper).
- [x] Define `User` and `Page` shared models (`shared/models/`).
- [x] Establish `.ai/docs/` Live Documentation Loop and core `AGENT.md` guidelines.

## Phase 1: Global Layout, Theming & Background Engine
- [~] **Figma Design Preview:** Dark theme + strict admin shell on `58:2`/`58:17`. News (`59:17`), Editor (`59:32`), Profile (`59:47`) dark-themed. Remaining: variable bindings, light toggle previews, Foundations type/spacing specimens. See `.ai/docs/features/figma_ui_integration.md`.
- [~] **Puck.js Integration:** `@measured/puck` installed; block registry (`src/components/puck/config.tsx`) with 13 Figma-mapped components across 4 categories; slots/grids layout support; custom image upload API (`src/app/api/upload/route.ts`); root background picker; catch-all route (`src/app/[...puckPath]/`); MongoDB save/load API (`src/app/api/puck/route.ts`).
- [~] **Puck Editor UI/UX Refinements:** Path state fix, RGBA/media fields, accent background presets, header chrome, inline title, block spacing/lining — see `.ai/docs/features/puck_editor_enhancements.md` (`[x]` completed).
- [~] **Infinite Background Engine:** `InfiniteGrid` React Client Component (`src/components/background/InfiniteGrid.tsx`) — dual-canvas, RAF animation, mouse-tracking CSS Custom Properties, radial vignette. Mounted in root layout.
- [x] **Global Next.js Routing:** Root layout with ThemeProvider, InfiniteGrid, GlobalHeader; `@shared/*` tsconfig path alias for server-side model imports.
- [~] **Design System & Theming:** `next-themes` installed; `globals.css` defines all Nexus/Color tokens, spacing, radius, glass utilities, accent families (5 × 3 shades). `GlobalHeader` component with contained glass bar, nav links, theme toggle (☀/☾), and RBAC `showAdminPanel` prop.

## Phase 2: Authentication & User Profiles (Auth Domain)
- [ ] **Cross-Platform Auth:** Implement login using Google OAuth2, Apple, and Telegram Widget.
- [ ] **Bot Data Harvesting:** Merge Telegram ingress data (phone number, current name, username, avatar) into the unified MongoDB record.
- [ ] **Profile Management:** Build the user profile page displaying personal info, statistics, special tags, and assigned tasks (hiding sensitive info from non-admins).
- [ ] **Student Registration Flow:** Create custom sign-up tabs to capture Specialty, Group, and specific roles (e.g., "I am a starosta", "I am a deputy").

## Phase 3: The Admin Dashboard & Complex Tables (Admin Domain)
- [ ] **Leaderboard & Gamification:** Calculate and display user "Stars" as the sum of coins and crystals earned over the study period.
<!-- - [ ] **Task & Marks Table UI:** Implement the massive tracking table with support for a 1-12 marking scale (classwork, independent work, exams). -->
- [ ] **Calendar Mode:** Build the table view where rows are users, columns are days/weeks, and cells display accomplished tasks.
- [ ] **Tasks Stack Mode:** Build the visual volume tracker where columns are small boxes showing the width of the cell to represent the number of tasks per user.
- [ ] **Warning System:** Track member warnings with an automatic kick-out trigger upon reaching the 3-warning limit.

## Phase 4: Ephemeral Workspaces & Telegram Automation (Workspace Domain)
- [ ] **Telegram Core Worker:** Initialize the Telegram bot responsible for synchronizing members and managing groups.
- [ ] **Dynamic Group Creation:** Automatically spawn a Telegram group (or Discord thread) and elevate the bot to Admin when a large team task is created.
- [ ] **In-Group Command Parsing:** Enable the bot to listen to commands (`/status`, `/task_done`, `/report`) and scrape middle-state task reports (photos, videos, text).
- [ ] **Automated Clean-up:** Automatically save final reports to MongoDB and dismantle/delete the group when the project is marked completed to prevent clutter.

## Phase 5: Task Management, Editors & Community
- [ ] **Task Core Engine:** Handle task CRUD operations, start/end times, and enforce reassignment limits (fixed amount for ordinary users, unlimited for admins).
- [ ] **Asynchronous Acknowledgements:** Implement explicit confirmation triggers for dispatched tasks (flagged as "Delivered, Unacknowledged" until confirmed).
- [ ] **Constant Reminders System:** Allow admins to create long-term scheduled reminders dispatched to users or specific roles via Telegram/Discord.
- [ ] **Community Interactions:** Build comment sections for news posts, allowing ordinary users to comment, propose ideas, and submit applications.
- [ ] **Notion-Style Text Editor:** Build the rich text editor for writing news, pages, and reports.
- [ ] **News Hub:** Implement the news layout with multiple categories (Current, Sport, Announcements) and tile covers.

---
*Note for AI Agents: ALL features implemented must strictly adhere to the English JSDoc formatting rules, the Domain Consolidation Principle, and [directory_hygiene.md](./directory_hygiene.md) (single-purpose folders — no misplaced or duplicate files). DO NOT proceed with any task without first verifying this document and related specifications inside `.ai/docs/`.*
