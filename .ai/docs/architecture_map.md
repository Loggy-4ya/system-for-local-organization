# Project Nexus — Architecture Map

Central directory-purpose map for the Nexus monorepo. Update this file whenever a new root or sub-directory is created.

**Directory hygiene policy:** Every folder must contain only files dedicated to its declared purpose — no unrelated assets, duplicates, or dump-folder clutter. See [directory_hygiene.md](./directory_hygiene.md) for the full rule, violation examples, and agent workflow.

## Root

| Path | Purpose | Allowed | Not allowed |
|------|---------|---------|-------------|
| `src/` | Next.js App Router application (UI, API routes, client components) | Pages, layouts, components, hooks, lib utilities | Mongoose models, domain business logic |
| `shared/` | Cross-service shared code consumed by web, workers, and containers | Mongoose models (`shared/models/`), domain engines (`shared/domains/`) | React components, Next.js-specific code |
| `public/` | Static assets served at URL root | Organised subfolders: `icons/`, `brand/` | Secrets, compiled bundles, create-next-app boilerplate SVGs |
| `public/icons/` | Browser favicon and app icons | `favicon.ico`, future `apple-icon.png` | Logos, UI illustrations |
| `public/brand/` | Brand marks used in UI | `logo.svg` | Favicons, unrelated stock assets |
| `public/uploads/` | User-uploaded images and media | Uploaded files | Brand marks, static icons |
| `.ai/docs/` | Living architectural truth and feature specs | Markdown specs, roadmap, structure maps | Application runtime code |
| `.ai/assets/` | Design-time media symlinked from `.ai/docs/assets/` | Background engine sources, exported Figma preview PNGs | Application runtime code |
| `docker-compose.yml` | Container orchestration for stateless services | Service definitions, env wiring | Application logic |

## `src/` Sub-directories

| Path | Purpose | Status |
|------|---------|--------|
| `src/app/` | App Router routes, root layout, API handlers | Active |
| `src/app/layout.tsx` | Root layout: Inter font, ThemeProvider, InfiniteGrid, GlobalHeader | Active |
| `src/app/globals.css` | Nexus CSS Custom Properties (spacing, color, radius, glass utilities) | Active |
| `src/lib/assets.ts` | Canonical `public/` URL paths (`ICONS`, `BRAND`, `SITE_ICONS` for metadata) | Active |
| `src/app/[...puckPath]/` | Puck catch-all route (viewer + `/edit` editor mode); colocated `client.tsx` only | Active |
| `src/app/pages/` | Page Manager UI (`/pages`) and route-local `NewPageForm.tsx` | Active |
| `src/app/api/puck/` | REST API for loading/saving Puck page layouts to MongoDB | Active |
| `src/app/api/upload/` | REST API for uploading image/video files to `public/uploads/` | Active |
| `src/app/(marketing)/` | Hardcoded landing and public marketing pages (excluded from Puck) | Planned |
| `src/app/(dashboard)/` | Hardcoded admin dashboard shell (excluded from Puck) | Planned |
| `src/app/(auth)/` | Authentication flows (login, student registration) | Planned |
| `src/components/` | Reusable UI primitives bound to design tokens | Active |
| `src/components/background/` | `InfiniteGrid` dual-canvas client component; light theme uses `logo-grid.svg` (no stroke rings) | Active |
| `src/components/ui/` | Shared UI: `GlobalHeader`, `ThemeProvider` | Active |
| `src/components/puck/` | Puck block registry (`config.tsx`) + individual block files | Active |
| `src/components/puck/blocks/` | Puck block definitions grouped by category (layout, content, news, user) | Active |
| `src/components/puck/fields/` | Custom Puck fields (`NexusColorPresetField`, `MediaUploadField`, `AccentPresetField`, `ImageField`) | Active |
| `src/components/puck/lib/` | Shared helpers (`nexusColorTokens.ts`, `spacingFields.tsx`, `mediaUpload.ts`, `useDeferredFieldCommit.ts`) | Active |
| `src/components/puck/root/` | Puck root page wrapper (`PageRoot.tsx`), `EditorHeaderChrome.tsx` | Active |
| `src/lib/` | App-local utilities and constants (no React, no routes) | Active |

## `shared/` Sub-directories

| Path | Purpose | Status |
|------|---------|--------|
| `shared/lib/db.ts` | Mongoose connection helper with global cache | Active |
| `shared/models/User.ts` | Unified User schema (cross-platform auth, RBAC, gamification) | Active |
| `shared/models/Page.ts` | Puck page layout schema (path → puckData) | Active |
| `shared/domains/` | Consolidated domain engines (one file per domain) | Planned |

## `.ai/docs/` Sub-directories

| Path | Purpose | Allowed | Not allowed |
|------|---------|---------|-------------|
| `.ai/docs/features/` | Per-feature specifications with acceptance criteria | `*.md` spec files | Runtime `.ts` / `.tsx` imported by the app |
| `.ai/docs/features/puck_editor.md` | Puck Editor overhaul and block specifications | Markdown spec | — |
| `.ai/docs/features/puck_editor_enhancements.md` | Editor UI/UX refinements (fields, path bug, spacing) | Markdown spec | — |
| `.ai/docs/assets/` | Design-time media (background engine sources, Figma exports) | Reference images, prototype HTML/JS | Production bundles, duplicates of `public/` without documented reason |
| `.ai/docs/directory_hygiene.md` | Single-purpose folder policy and placement decision tree | Policy documentation | — |
| `.ai/docs/architecture_map.md` | This file — directory purpose registry | Structure maps | Application code |
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
