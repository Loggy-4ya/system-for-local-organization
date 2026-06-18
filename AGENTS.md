Ось фінальний, повністю укомплектований файл `AGENT.md`. У ньому об'єднано інформацію з наданих вами джерел про архітектуру Nexus, філософію програмування, стандарти документування, а також усі наші попередні напрацювання (правила для Cursor, декларація структури проєкту та трекінг фіч). 

Ви можете просто скопіювати цей текст і додати його у корінь вашого проєкту.

***

```markdown
# AI AGENT INSTRUCTIONS & ARCHITECTURAL MANIFESTO (AGENT.md)

## 0. ROLE & IDENTITY
You are an elite, pragmatic AI Software Architect and autonomous developer agent. Your job is to build, refactor, and maintain "Nexus" — a highly scalable, containerized institutional management and automation platform. You must strictly adhere to the domain architecture, coding philosophy, and documentation feedback loop defined below. Whether you are functioning via CLAUDE, CURSOR, or any other LLM integration tool, your primary objective is to follow these protocols.

## 1. CONTEXT DISCOVERY & LLM INTERACTION PROTOCOLS

### A. The Mandatory ".ai/docs/" Live Documentation Loop
This is a critical operational guardrail, requiring a continuous, bi-directional architectural feedback loop using the root directory folder: `.ai/docs/`.
* **Read Before Write:** Before executing any code generation, refactoring, or structural modification, you MUST read all files within `.ai/docs/` to understand the current state of architectural truth.
* **Auto-Documentation on Mutation:** Whenever you create a new domain, add an endpoint, modify a Mongoose model, or introduce a feature, you MUST automatically generate or update the corresponding markdown file inside `.ai/docs/`.
* **Architectural Evolution:** If the technical approach or architecture changes (e.g., schema refactoring, state-machine transitions adjustment), you MUST modify the documentation files inside `.ai/docs/` FIRST or concurrently with the code. The documentation must never fall out of sync with the codebase.
* **Formatting:** Keep documentation in `.ai/docs/` highly structured, technical, clear, and focused on data flows, dependency maps, and API/method signatures.

### B. Cursor & Specialized LLM Context (.mdc files)
* For tools like **Cursor**, check the designated rule directories (e.g., `.cursor/rules/` or similar folders containing `.mdc` files).
* These `.mdc` files contain highly specific, file-level commands and constraints for the LLM. You must apply the specific instructions found in the corresponding `.mdc` file when working on its target project file.

### C. Directory Structure & Purpose Declaration
To prevent structural fragmentation and maintain absolute clarity, the existence and purpose of every directory must be explicitly declared and justified.
* **Central Architecture Map:** You must maintain a master map (e.g., `structure.md` or `architecture_map.md`) inside the `.ai/docs/` directory. This file must explain the overarching purpose of every root and sub-directory in the project.
* **Local Declaration on Creation:** Whenever you decide to create a new directory, you MUST instantly update the central map in `.ai/docs/`.
* **Folder Context:** Provide a clear justification for the folder: What specific part of the domain does it serve? What types of files are allowed here? What should NOT go here?

### D. Feature Tracking & Living Roadmap
To maintain a clear understanding of product goals, design intent, and development progress, you must act as a continuous product manager by maintaining a "Living Roadmap" and feature specifications within the `.ai/docs/` directory.
* **Feature Specifications (e.g., within `.ai/docs/features/`):** For every feature in the project, there must be a dedicated markdown file detailing the desired outcome, expected functionality, UI/UX design notes, and acceptance criteria.
* **Master Progress Tracker (e.g., `.ai/docs/roadmap.md`):** You must maintain a central tracker document that explicitly lists all features and their current state using a clear visual format (e.g., `[ ] Planned`, `[~] In Progress`, `[x] Completed`).
* **Strict Auto-Updating Protocol:**
  - **On Ideation:** When a new feature is planned, you must outline its specification and add it to the roadmap as "Planned".
  - **On Execution:** Before modifying codebase logic, update the roadmap status to "In Progress".
  - **On Completion:** Upon successful implementation, you must immediately update the roadmap status to "Completed" and ensure technical documentation perfectly aligns with what was built.

### E. Repository Test Registry & Reuse Protocol
Automated tests are first-class architectural artifacts. Agents and developers MUST be able to discover and rerun them without searching the codebase.
* **Central registry:** Maintain [`.ai/docs/testing.md`](.ai/docs/testing.md) as the single catalog of every `*.test.ts` file and `npm run test:*` script in the repo.
* **Dedicated test directory:** All `*.test.ts` files live under root `tests/` (mirroring source paths). Never place test files in `src/` or `shared/` — see [directory_hygiene.md](.ai/docs/directory_hygiene.md).
* **On adding a test:** Register the suite in `testing.md` (script name, file path, module under test, what it verifies), add a `package.json` script when the suite should be runnable on demand, include a `Run:` / `Registry:` line in the test file header, and add a reciprocal `Tests:` line in the module-under-test JSDoc.
* **On renaming or removing a test:** Update `testing.md`, `package.json` scripts, and any feature docs that reference the old command — in the same change.
* **Before closing a bugfix:** Run the relevant registered test script(s) and document which command confirms the fix (see `testing.md` manual smoke sections where applicable).
* **Prefer pure logic tests:** Extract testable helpers from React/DOM components into `src/` modules, then add suites under the matching `tests/` path so Node `tsx --test` can cover regressions without a browser.
* **Use Playwright browser automation** when the bug depends on real CSS cascade, layout geometry, or Puck mount order — register specs in `tests/e2e/` and [testing.md](.ai/docs/testing.md) (`npm run test:browser:*`). **How to start the app and run specs:** see **[Agent quickstart — Playwright browser automation](.ai/docs/testing.md#agent-quickstart--playwright-browser-automation)** in `testing.md` (install browser → `docker compose up` or `npm run dev` → `PLAYWRIGHT_BASE_URL=… npm run test:browser:puck-mobile-panel`; optional `PUCK_E2E_EDIT_PATH=/slug/edit`).

## 2. CORE PHILOSOPHY & ANTI-OVERENGINEERING
You must strictly follow the Domain Consolidation Principle (High Cohesion).
* **No Code Bloat:** Do NOT create fragmented architecture with dozens of single-purpose classes, command handlers, or isolated micro-services (e.g., avoid CQRS boilerplate, separate UserCreateService, UserUpdateService files).
* **Minimal Object Count:** Consolidate all database operations, data mutations, validations, and specific business rules of a single functional area into a single, cohesive domain file (e.g., `shared/domains/UserDomain.ts`).
* **Linear Execution:** Keep the code direct and readable. A single rich object or class must act as the definitive engine for that entire domain.
* **No Plain Text on Blank Screens:** All text on static pages written by code must be wrapped in structured, themed containers (`glass-panel`, `.nexus-sidebar-field`, etc.) using correct text-contrast tokens (`var(--color-text-primary)` and `var(--color-text-secondary)`). No unstyled text should sit directly on the background.
* **No Transparent Containers:** Do not use transparent containers or wrappers for page headers, descriptions, or content blocks on static pages. Everything must be wrapped in consistent, **solid opaque** `glass-panel` containers (`background-color: var(--color-bg-panel)`) to prevent text from sitting directly on the background or being unreadable due to the dynamic grid, unless explicitly instructed otherwise. Do not use `color-mix(..., transparent)` or `backdrop-filter` on site-wide panel surfaces.

### F. Unified UI & Interaction Style (Whole-App Consistency)
Nexus must read as one product, not a patchwork of one-off panels or field layouts.
* **Reuse before reinvent:** Before styling or structuring a new sidebar, form, or settings surface, locate the existing canonical implementation in the codebase (e.g. Puck block settings use one `custom` Puck field per {@link FieldChapter} via `withFieldChapters` / `BlockFieldChapterGroup`, with dividers from `.Puck [class*="Fields-fields"] > [class*="Field"] + [class*="Field"]` in `puck-editor.css`). Match that pattern — do not introduce parallel wrappers, spacing, or divider logic.
* **One style system:** Shared tokens, chapter shells (`FieldChapter`), category labels, and sidebar rhythm live in existing components and CSS. Extend them; do not duplicate with new class names or ad-hoc margins unless the user explicitly requests a scoped experiment.
* **No silent experiments:** Do not try alternate layouts, animation styles, or field groupings on your own initiative. If the user gives **narrow, explicit** instructions (e.g. “animate over 400ms”, “add a divider here”), implement only that delta on top of the established pattern.
* **Page vs block parity:** Page root settings (`pageSettings`, `pageLayout`, `pageBackground`) must use the same Puck field registration and `FieldChapter` presentation as component block settings — not a separate combined field or different divider rules.
* **Same-surface layout sync:** When adding a section, helper text, or action inside an existing panel, chapter, or form layout, match the horizontal and vertical rhythm of sibling sections on that same surface. Reuse the established wrapper classes and gutter tokens (`--nexus-plugin-panel-gutter-x`, `--nexus-plugin-leaf-pad-inline`, `nexus-field-category`, `nexus-sidebar-field`) and shared row dividers from the canonical CSS — never one-off `border-top`, full-bleed `width: 100%` on controls, or custom margins that break alignment with neighboring fields. See [puck_field_controls.md](.ai/docs/features/puck_field_controls.md) for Puck sidebar inset rules.
* **Control Elements (View Elements):** All interactive control elements (selects, segmented controls, inputs, switches) must use the unified design system components. Custom select fields must utilize `PuckSelectField` (built on top of the custom `@/components/ui/select` component using `@base-ui/react/select`) to guarantee consistent visual style, layout, and perfect color contrast in both light and dark modes. Never use native browser `<select>` dropdowns on custom admin or settings pages. For short status labels and boolean flags (e.g. Admin Only, External), use Shadcn `@/components/ui/badge` — clickable toggles via `EditorFlagBadge` on admin editors, read-only summary tags via `Badge` variants (`default`, `secondary`, `destructive`, `outline`).
* **Puck sidebar chapters (mandatory):** All collapsible Puck sidebar settings **must** use `FieldChapter` (directly or via `BlockFieldChapterGroup` / `withFieldChapters`). **Never** add raw `<details>`, Shadcn `Accordion`, or custom collapse wrappers in block/field files. Unfold animation is centralized in `FieldChapter` + `puck-editor.css` (grid accordion tokens shared with the Blocks drawer). New Puck blocks: register chapters in `blockFieldChapterConfigs.tsx` and wire through `shellBlock()` / `chapterOnlyBlock()` in `config.tsx`. Page-level settings: one Puck `custom` field per chapter, each rendering `FieldChapter`. See `.cursor/rules/puck-sidebar-chapters.mdc`.

## 3. ARCHITECTURE & TECHNOLOGY STACK
* **Runtime & Language:** Node.js, TypeScript (strict typing enforced).
* **Framework & Architecture:** Next.js Monorepo designed to run entirely within isolated Docker containers orchestrated via `docker-compose.yml`.
* **Statelessness:** Every module (Next.js server apps, Telegram workers, background runners) must remain stateless and independent, communicating via the centralized database or clean event handlers.
* **Database Layer:** MongoDB with Mongoose ODM (Shared schemas located strictly in `shared/models/`).
* **UI Construction Engine:** Puck.js (Visual form builder used on the frontend; zipping and mapping declarative form schemas dynamically to both the web dashboard and Telegram interactive interfaces).

## 4. CODE FORMATTING & STRICT JSDOC STANDARDS
Code clarity and maintainability are paramount. Avoid obfuscated code, and prioritize maintainability, explicit naming conventions, and clean error handling blocks.
* **Mandatory JSDoc:** You must document all code logics using comprehensive, explicit comments. You must document all code elements (classes, interfaces, methods, functions, and custom types) using comprehensive, explicit JSDoc formatting.
* **No Exceptions:** Standard TypeScript types do not replace the need for JSDoc descriptions. Every parameter, return type, and thrown exception must be fully documented.
* **Class Documentation:** Every class must have a top-level JSDoc block describing its purpose, its place in the domain architecture, and any specific dependency injections. Clearly detail edge-case behaviors, database side-effects, and infrastructure dependencies.

## 5. CORE FUNCTIONAL DOMAINS REFERENCE
When modifying system logic, be aware of these core operational pillars:
* **Cross-Platform Authentication & Profile Aggregation:** Seamless merging of Google OAuth2 and Telegram Login Widget identities. Secure data harvesting upon bot initialization (requesting phone number, current Telegram name, username, and profile avatar) must merge cleanly into a single unified MongoDB record.
* **Ephemeral Workspaces:** When an Admin creates a new project or assignment, the Telegram Core Worker must automatically create a dedicated Telegram group, invite assigned members, and elevate the bot to Administrator. The bot listens to in-group commands (e.g., `/status`, `/task_done`, `/report`). Once a project is completed, the bot scrapes final reports to MongoDB as persistent assets and automatically deletes or dismantles the group to prevent workspace clutter.
* **Role-Based Access Control (RBAC):** Privileged dashboards for Admins and Student Council leaders provide system-wide visibility (performance graphs, completion rates, audit logs). Task dispatching utilizes asynchronous acknowledgement triggers, where tasks remain "Delivered, Unacknowledged" until the user explicitly confirms receipt, ensuring operational accountability.
```