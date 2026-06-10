# Puck Editor — Visual Layout Engine Spec

**Status:** `[x] Completed` — full overhaul applied; block library expanded to match Figma designs, slots/composition added, custom image upload API integrated, and editor canvas styled to show the live InfiniteGrid background.

---

## 1. Overview

Puck.js is the visual form and page builder used on the frontend of Project Nexus. This document specifies the block registry, custom field types, image upload API, and background rendering behavior implemented in Phase 1.

---

## 2. Block Registry & Categories

All components are registered under `src/components/puck/config.tsx` and organized into four distinct sidebar categories:

### A. Layout Category
For structural composition and nested drag-and-drop grids:
- **`NexusSection`** — Wraps content in the standard `.page-shell` container to enforce consistent horizontal alignment and vertical padding.
- **`NexusGrid`** — Arrangements of 2, 3, or 4 equal-width columns with custom gap options.
- **`NexusColumns`** — Fixed 2-column split with asymmetrical ratio controls (e.g. 50/50, 60/40, 70/30).
- **`NexusSpacer`** — Vertical space using design system spacing tokens (XS to 2XL).

### B. Content Category
For standard typography, actions, and form inputs:
- **`NexusHeading`** — Styled headings (H1, H2, H3) with alignment controls.
- **`NexusText`** — Paragraph body copy with alignment and muted options.
- **`NexusButton`** — Action button mapping to Figma variants (Primary, Secondary, Ghost) with optional link URL.
- **`NexusTabs`** — Interactive tab group mapping to Figma `TabGroup`.
- **`NexusInput`** — Form input mapping to Figma `Input/Default` for page-level forms.

### C. News & Cards Category
For rich content display:
- **`NexusNewsCard`** — Replaces the legacy `NexusCard` and `NexusNewsTile`. Supports custom image upload, title, description, category, read time, and optional link.

### D. User & Data Category
For profile representation and statistics:
- **`NexusUserBadge`** — Maps to the Figma profile hero layout. Integrates name, subtitle, avatar, group badge, and role badge into a single cohesive component.
- **`NexusStatCard`** — KPI card showing numeric values and labels (e.g. Stars, Warnings).
- **`NexusAvatar`** — Standalone small avatar (SM, MD, LG) with fallback initials.

---

## 3. Image Upload & Custom Field

To support images on card blocks, we implemented a custom Puck field with file-upload capabilities:

### A. Upload API (`/api/upload`)
- **Route:** `src/app/api/upload/route.ts`
- **Method:** `POST` (multipart form data)
- **Destination:** `public/uploads/`
- **Validation:** Images only, max 5MB size limit.
- **Bypass:** Open dev mode when `NEXTAUTH_SECRET` is not configured.

### B. Custom Field (`ImageField`)
- **File:** `src/components/puck/fields/ImageField.tsx`
- **Type:** `custom`
- **UI:** Text input for direct URL entry + "Upload" button triggering file selection + live thumbnail preview.

---

## 4. Editor Background Transparency

To ensure the editor canvas matches the live site exactly:
- **`src/app/puck-editor.css`** — Overrides Puck's default opaque canvas and preview backgrounds to `transparent`.
- **Root Background Picker** — Added `background` (site-default, solid, custom-image) to Puck's root metadata fields.
- **`PageRoot.tsx`** — Renders the selected background. When set to `site-default`, the canvas is transparent, allowing the underlying layout-level `InfiniteGrid` background to show through.

---

## 5. Editor Theme & Readability

The global `GlobalHeader` (and its theme toggle) is hidden on `/edit` routes. Theme control in the editor is provided separately:

| File | Role |
|------|------|
| `src/components/ui/ThemeToggle.tsx` | Shared ☀/☾ toggle used by `GlobalHeader` and Puck `headerActions` |
| `src/components/puck/PuckIframeTheme.tsx` | Puck `iframe` override — sets `data-theme` and injects Nexus CSS variables into the preview iframe |
| `src/app/puck-editor.css` | Remaps Puck's internal `--puck-color-*` palette when `[data-theme="dark"]` so sidebars/fields stay readable |

**Data flow:** `ThemeProvider` (`layout.tsx`) → `useTheme()` → `ThemeToggle` updates `<html data-theme>` → `PuckIframeTheme` mirrors the attribute inside the preview iframe so block text (`var(--color-text-primary)`) contrasts correctly on light or dark backgrounds.

---

## 6. Directory Mapping

All Puck-related files are structured according to the Single-Purpose Folder policy:

```
src/components/puck/
├── config.tsx              # Main block registry & categories
├── PagePathEditor.tsx      # Editable header URL chip
├── fields/
│   └── ImageField.tsx      # Custom image URL + upload field
├── root/
│   └── PageRoot.tsx        # Root layout & background picker
└── blocks/
    ├── layout/             # Section, Grid, Columns, Spacer
    ├── content/            # Heading, Text, Button, Tabs, Input
    ├── news/               # NewsCard
    └── user/               # UserBadge, StatCard, Avatar
```

---

## 7. Metadata Editing & Custom Fields

To provide a seamless visual editing experience, page metadata (URL path and Title) can be edited directly within the Puck interface and is synchronized with MongoDB on Publish:

### A. Page Title Synchronization
- **Hydration:** The database `Page.title` is loaded on the server and merged into Puck's `root.props.title` during initialization. This ensures the visual canvas label (e.g., "Untitled Page") matches the database state.
- **Persistence:** When the user clicks **Publish**, the updated title from the sidebar is extracted from `nextData.root.props.title` and saved back to MongoDB.

### B. Page URL Path Renaming
- **Header Editor:** An interactive `PagePathEditor` component is rendered in the editor toolbar. It allows editing the page path slug inline (e.g., `/test` to `/news`).
- **Safety Guards:** The homepage `/` is protected and cannot be renamed. Slugs are normalized to lowercase alphanumeric characters, hyphens, and slashes.
- **Rename Flow:** Renaming a page on Publish performs a safe rename in MongoDB. If the target path is already taken, the API returns a `409 Conflict` error, which is displayed directly in the editor header. On successful rename, the editor redirects to the new URL (`/new-path/edit`).

### C. Unified Custom Field Styling
- Custom fields (such as `ImageField`, `RgbaColorField`, `MediaUploadField`) use the `.nexus-puck-field` CSS wrapper class defined in `puck-editor.css`.
- This ensures all custom text inputs, buttons, and hover/focus states look visually identical to Puck's native fields across both light and dark themes.

---

## 8. UI/UX Enhancements (Phase 1 Refinements)

Full specification: [puck_editor_enhancements.md](./puck_editor_enhancements.md)

| Feature | Implementation |
|---------|----------------|
| Path edit state fix | `PuckClient` holds `editorData` via `useState` + Puck `onChange`; `PagePathEditor` uses imperative `getNormalizedPath()` at publish |
| RGBA color picker | `src/components/puck/fields/RgbaColorField.tsx` — used by Heading, Text, Divider, block lining |
| Media upload (image/video) | `MediaUploadField.tsx` + `lib/mediaUpload.ts`; `/api/upload` accepts video up to 50MB |
| Accent background presets | `AccentPresetField.tsx` on `PageRoot` solid backgrounds |
| Header chrome preview | `EditorHeaderChrome.tsx` rendered at top of every Puck page root |
| Inline title editing | `PageTitleEditor.tsx` via `overrides.header` portal into Puck header title |
| Block spacing & lining | `lib/spacingFields.tsx` + `withBlockShell()` applied to all 18 blocks in `config.tsx` |
| Dark select contrast | Additional rules in `puck-editor.css` under `[data-theme="dark"] .Puck` |

### Directory Mapping (updated)

```
src/components/puck/
├── config.tsx
├── PagePathEditor.tsx
├── PageTitleEditor.tsx
├── fields/
│   ├── RgbaColorField.tsx
│   ├── MediaUploadField.tsx
│   ├── AccentPresetField.tsx
│   └── ImageField.tsx          # image-only wrapper around MediaUploadField
├── lib/
│   ├── spacingFields.tsx
│   └── mediaUpload.ts
├── root/
│   ├── PageRoot.tsx
│   └── EditorHeaderChrome.tsx
└── blocks/
    ├── layout/
    ├── content/
    ├── news/
    └── user/
```
