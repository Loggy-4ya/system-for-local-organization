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
