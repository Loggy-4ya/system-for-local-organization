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
- **`NexusGrid`** — CSS grid container (1–12 columns, configurable gap). Slot composition: `content` **allow** `NexusGridItem` only (no direct `NexusGrid` children).
- **`NexusGridItem`** — Grid cell with column/row span. Slot composition: `content` **disallow** `NexusGridItem` and `NexusGrid` (no nested grid cells or nested grids inside a cell).
- **`NexusColumns`** — Fixed 2-column split with asymmetrical ratio controls (e.g. 50/50, 60/40, 70/30).
- **`NexusSpacer`** *(sidebar label: **Spacer & Divider**)* — Single layout block for vertical spacing **and** horizontal rules. One top-level **Style Preset** bundles height, line visibility, thickness, width, color, and alignment. Preset groups:
  - **Space** — XS → 2XL (gap only)
  - **Divider** — full-width thin/medium/thick; centered 50% / 20%
  - **Section break** — small / medium / large (spacing + centered line)
  - **Custom** — exposes **Size** and **Line** sidebar chapters
  - Logic: [`separatorBlockLogic.ts`](../../src/components/puck/lib/separatorBlockLogic.ts); block: [`NexusSpacer.tsx`](../../src/components/puck/blocks/layout/NexusSpacer.tsx)
  - Default insert preset: **Space — MD (16px)**. Island-default component (see `shared/constants/editorSettings.ts`).

### B. Content Category
For standard typography, actions, and form inputs:
- **`NexusHeading`** — Styled headings (H1, H2, H3) with alignment controls.
- **`NexusText`** — Paragraph body copy with Tiptap rich text (bold, headings, lists, blockquote) plus alignment and color presets.
- **`NexusButton`** — Action button mapping to Figma variants (Primary, Secondary, Ghost) with optional link URL.
- **`NexusTabs`** — Interactive tab group; each tab has a drag-and-drop slot for arbitrary block content.
- **`NexusCarousel`** — Image carousel with slides, captions, optional links, arrows, dots, autoplay, and a runtime pause/play toggle when autoplay is enabled.
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

## 3b. Root-level block spacing (default margin)

Every block dropped on the **top-level page canvas** (a direct sibling under the page root, not inside a Section/Grid/Carousel slot) receives **SM (8px)** top and bottom margin by default so blocks do not touch each other edge-to-edge.

**Design choice:** The default reuses the existing **`sm`** spacing token (`--spacing-sm` in `globals.css`). There is **no** separate CSS variable or Puck token (e.g. no `rootBlock` / `--nexus-root-block-margin-y`). Editors see the same **SM (8px)** label in the sidebar as everywhere else spacing is used.

| Mechanism | File | Role |
|-----------|------|------|
| Design token | `src/app/globals.css` → `--spacing-sm` | **User-facing knob** — change this value to adjust the default root-block gap (and every other `sm` spacing use site-wide) |
| Code constant | `spacingFields.tsx` → `ROOT_BLOCK_VERTICAL_MARGIN` (`"sm"`) | Semantic name for developers; resolves to `--spacing-sm` at render time |
| Insert / move | `applyIslandDefaultsOnInsert.ts` → `resolveInsertDefaultsProps`, `mergeRootInsertSpacing` | Applies margins when a block lands on or moves to the root canvas |
| Block registry | `config.tsx` → `shellBlock()` | New components **must** register via `shellBlock()` so spacing + island chapters apply; optional `ROOT_SHELL_SPACING` seeds palette defaults |
| Render shell | `spacingFields.tsx` → `applyBlockShell()` | Reads `marginTop` / `marginBottom` from block props and outputs CSS `margin` |
| Per-block override | Puck sidebar → **Spacing** chapter | Editors can set Top/Bottom margin to **SM (8px)**, **None**, **MD (16px)**, etc. |

**Data flow:**

```
globals.css --spacing-sm
       ↓
ROOT_BLOCK_VERTICAL_MARGIN ("sm")
       ↓
mergeRootInsertSpacing (insert/move to root)  +  shellBlock defaultProps (palette)
       ↓
block props.spacing.marginTop / marginBottom
       ↓
applyBlockShell() → var(--spacing-sm) on canvas
```

**Scope:** Margins are seeded on **insert and move to root only**. Saved pages, starter content, and blocks already on disk are **not** retroactively patched. Nested inserts (Section slots, Grid, Carousel slides, Tabs panels) **reset** vertical margins to **None**.

### Changing the default gap (for designers / site owners)

Open `src/app/globals.css` and edit the existing spacing scale:

```css
--spacing-sm: 8px; /* default top/bottom margin for root-level Puck blocks (SM token) */
```

Examples:

```css
--spacing-sm: 12px;
--spacing-sm: 0.75rem;
```

Root-level blocks use the **`sm`** token. Changing `--spacing-sm` updates new inserts and any block whose margin is still set to **SM**. Blocks already set to MD/LG/Custom are unchanged.

**Note:** Because the default shares the global **`sm`** scale, raising `--spacing-sm` also affects other UI that uses the SM token (section padding presets, island padding labels, etc.). To change only one block, use the Puck **Spacing** chapter instead.

### Adding a new Puck block (for developers)

1. Register with **`shellBlock("YourBlock", YourBlock)`** in `config.tsx` (use `chapterOnlyBlock` only for inline grid items like `NexusGridItem`).
2. Do **not** bake vertical margin into the block render — `applyBlockShell()` applies margin from spacing props.
3. Nested inserts reset vertical margins to **None** automatically via `applyIslandDefaultsOnInsert.ts`.
4. Optional: add the type to `DEFAULT_ISLAND_COMPONENTS` in `shared/constants/editorSettings.ts` if it should also auto-enable island mode on root insert (those types also show SM margins in palette defaults).

**Content width band (all shell-wrapped blocks):** When **Island mode** is off, blocks still honor **Max width** / **Align** from the Island sidebar chapter — centered lg/xl band without glass chrome. Set **Max width → Full Width** for bleed within the page column. Island mode adds the glass panel, border, and padding on top of the same width band.

**Page layout vs global layout:** Puck **Page Content Width** (`pageLayout.contentWidth`) applies **only** to that page's body (`PageRoot`). Header and footer always use the fixed global layout band (`GLOBAL_LAYOUT_CONTENT_WIDTH`, 1400px). Page layout presets are capped at 1400px (`xl`); legacy **Full Width** values clamp to `xl` on read.

**See also:** [puck_editor_enhancements.md §6](./puck_editor_enhancements.md#6-block-spacing--island-layout) · `npm run test:island-defaults`

---

## 4. Editor Background Transparency

To ensure the editor canvas matches the live site exactly:
- **`src/app/puck-editor.css`** — Overrides Puck's default opaque canvas and preview backgrounds to `transparent`.
- **Root Background Picker** — Added `background` (site-default, solid, custom-image) to Puck's root metadata fields.
- **`PageRoot.tsx`** — Renders the selected background. When set to `site-default`, a contained `InfiniteGrid` paints inside the Puck preview iframe on all editor breakpoints (respects **Static** / **Dynamic** `backgroundGridMotion`). **Desktop ≥901px:** `NexusEditorScrollportGrid` additionally fills letterbox gutters on the canvas shell (the iframe viewport cannot show the scrollport layer). Layout-level grid is hidden on `/edit` routes.
- **Grid motion** (`backgroundGridMotion`) defaults to **Dynamic** (scrolling tiles + cursor spotlight); pages may opt into **Static** (frozen tile offset, no RAF scroll loop — ambient blur and cursor glow remain). Published pages use the full animated layout-level grid from `layout.tsx`.

---

## 5. Editor Theme & Readability

The global `GlobalHeader` (and its theme toggle) is hidden on `/edit` routes. The editor uses a unified full-width glass header island (`NexusPuckHeaderShell`) — spans the Puck header row with `clamp(12px, 3vw, 24px)` inset and rounded corners; compact mobile stacks logo + title + toolbar in two rows:

| File | Role |
|------|------|
| `src/components/puck/NexusPuckHeaderShell.tsx` | Puck `overrides.header` — Nexus logo + embedded toolbar in a glass panel |
| `src/components/ui/ThemeToggle.tsx` | Animated pill switch (`role="switch"`) with sliding knob and lucide sun/moon icons — used in Puck `headerActions` |
| `src/components/puck/EditorModeToggle.tsx` | Edit vs Interactive preview toggle in Puck `headerActions` |
| `src/components/puck/NexusEditorCanvasContext.tsx` | Marks Puck editor canvas so `PageRoot` keeps grid + header in interactive preview |
| `src/components/puck/PuckIframeTheme.tsx` | Puck `iframe` override — sets `data-theme` and injects Nexus CSS variables into the preview iframe |
| `src/app/puck-editor.css` | Remaps Puck's internal `--puck-color-*` palette when `[data-theme="dark"]` so sidebars/fields stay readable |

**Data flow:** `ThemeProvider` (`layout.tsx`) → `useTheme()` → `ThemeToggle` updates `<html data-theme>` → `PuckIframeTheme` mirrors the attribute inside the preview iframe so block text (`var(--color-text-primary)`) contrasts correctly on light or dark backgrounds.

---

## 6b. Mobile & Tablet Editor

Nexus uses **Puck 0.21** (`@puckeditor/core`) with the default **plugin rail** — no `legacySideBarPlugin`.

| Viewport | Editor UX |
|----------|-----------|
| **≤ 900px** (compact) | Bottom plugin rail: **Blocks**, **Outline**, **Fields**; full-screen canvas (`_experimentalFullScreenCanvas`); collapsible panel above canvas; compact Nexus header actions; Fields open as overlay (avoids clunky narrow settings) |
| **901px – 960px** (tight desktop) | Left vertical plugin rail; **minimal** sidebars (left 150–170px, right 190–220px) so the canvas keeps ~450px+ at ~906px viewports |
| **961px – 1023px** (narrow desktop) | Left vertical plugin rail; narrower sidebars (left 180–200px, right 220–260px); canvas clamped inside center column |
| **≥ 1024px** (desktop) | Left vertical plugin rail + side panel; sidebar drag range clamped (left 280–320px, right 320–400px) via `NexusSidebarWidthClamp` |

| File | Role |
|------|------|
| `PuckEditorShell.tsx` | Mounts `<Puck>` with `@puckeditor/core/puck.css` + Nexus overrides; remounts on compact/desktop crossing (`key` suffix) |
| `usePuckMobileEditorChrome.ts` | `PUCK_COMPACT_EDITOR_MAX_WIDTH` (900), `PUCK_NARROW_DESKTOP_MAX_WIDTH` (1023) |
| `sidebarLayoutLimits.ts` | Shared min/max sidebar widths and compact panel height limits |
| `NexusSidebarWidthClamp.tsx` | Clamps desktop sidebar drag widths + sanitizes `puck-sidebar-widths` localStorage |
| `NexusMobilePanelResizer.tsx` | Compact-mode vertical drag handle for Blocks/Outline/Fields panel (`--nexus-mobile-panel-height`) |
| `puckEditorOverrides.tsx` | `headerActions` — error chip, All Pages link, Edit/Interactive + theme toggles (`.nexus-editor-header-btn` 36px toolbar); mounts `PageHeaderLabel`, clamp/resizer enhancers |
| `puck-editor.css` | Compact-editor safe-area padding, 44px nav touch targets, narrow-desktop sidebar/canvas rules, mobile panel resize handle |
| `nexusOutlinePlugin.tsx` | Outline tab — draggable page tree with per-zone sibling reorder (grip handle + Puck `reorder` dispatch) |
| `PuckAutoViewportSync.tsx` | Auto-selects Phone / Tablet / Desktop / Full-width canvas preset on window resize |
| `resolveAutoViewport.ts` | Viewport preset list + frame-aware closest-match algorithm |

**Outline drag reorder:** Press and drag **anywhere on a row** (not just the grip icon) to reorder siblings or move across slot zones — works in touch mode via pointer events. While dragging, blue **insertion lines** appear between rows; a **bottom drop pad** fills empty space below the list for append-to-end moves. Drop onto slot zone titles or empty slide rows (e.g. move Video Player between carousel slides). Dispatches Puck `reorder` within a zone or `move` across zones.

### 6c. Canvas drag-and-drop (slot reparenting)

On the **preview canvas**, drag an existing block by its overlay handle and drop it into any slot (carousel slide, grid cell, tab panel, column, section). Nexus enhances Puck's default drop zones so highlights **fill the target container** based on the dragged block's placed height.

| File | Role |
|------|------|
| [`NexusCanvasDragCoordinator.tsx`](../../src/components/puck/NexusCanvasDragCoordinator.tsx) | Preview iframe overlay drop previews + post-drop reparent commits |
| [`canvasDropTargetLogic.ts`](../../src/components/puck/lib/canvasDropTargetLogic.ts) | Pure sizing math for empty vs append slots |
| [`puck-editor.css`](../../src/app/puck-editor.css) | `[data-puck-dragging]` — pointer pass-through, full highlights, expanded hitboxes |
| Layout slot blocks | `nexus-section__dropzone`, `nexus-columns__dropzone`, `nexus-grid`, `nexus-grid-item`, carousel/tabs markers |

**Tests:** `npm run test:canvas-drop-target` · Full spec: [puck_canvas_drag_drop.md](./puck_canvas_drag_drop.md)

**Auto viewport:** Canvas preview width follows measured canvas frame width when available (360 / 768 / 1280 / 100% when frame is wider). Presets never exceed the available frame. Manual icon taps work; resize re-syncs.

**Viewport island:** Canvas device/zoom controls styled as a centered Nexus glass pill; on compact layouts (≤900px) `_experimentalFullScreenCanvas` collapses controls into a bottom-right FAB that expands into an animated pill. When the plugin panel is closed, the expanded pill sits bottom-center; when the panel is open, it anchors top-center of the canvas so device preset buttons are not obscured by the panel resize handle.

**Compact panel resize:** When a bottom-rail tab is open (≤900px), drag the handle on the panel top edge to resize height (160px min, `min(60vh, 480px)` max). Double-tap the active tab to expand to max or restore the previous height; single-tap the active tab to close with a smooth animation; opening a tab animates the panel from 0 to the persisted height. The maximize button is hidden; nav tabs are spread evenly across the bar. Height persists in `nexus-mobile-panel-height` localStorage.

**Sidebar motion:** Desktop sidebars (Blocks/Outline left, Fields right) ease open and closed via animated grid columns (280ms). Blocks drawer categories (Layout, Content, …) and **FieldChapter** settings chapters (block Content/Typography/Layout, Spacing, Island, Page Settings) expand and collapse smoothly via the same grid-accordion tokens (240ms). Respects `prefers-reduced-motion`.

**Desktop sidebar caps:** Horizontal drag remains enabled but cannot exceed left 320px / right 400px at ≥1024px (narrower caps apply at 901–1023px).

**Note:** Puck AI tab is **not** enabled — requires optional `@puckeditor/plugin-ai` setup. Page title/slug editing lives in **Page Settings** sidebar (`PageSettingsFieldGroup`); the Puck header center label (`PageHeaderLabel`) mirrors drafts live via `editorPageMetadataStore` without canvas rerenders.

---

## 6. Directory Mapping

All Puck-related files are structured according to the Single-Purpose Folder policy:

```
src/components/puck/
├── config.tsx              # Main block registry & categories (shellBlock / ROOT_SHELL_SPACING)
├── PagePathEditor.tsx      # normalizePagePath + shared handle type
├── PageHeaderLabel.tsx     # Live title + slug in Puck header center (metadata store portal)
├── PagePathHeaderChip.tsx  # Legacy URL pill (not mounted)
├── PageTitleEditor.tsx     # Legacy inline title (deprecated; not mounted)
├── fields/
│   └── ImageField.tsx      # Custom image URL + upload field
├── lib/
│   ├── spacingFields.tsx   # Block shell margins, ROOT_BLOCK_VERTICAL_MARGIN (sm)
│   └── applyIslandDefaultsOnInsert.ts  # Root insert/move margin + island seeding
├── root/
│   └── PageRoot.tsx        # Root layout & background picker
└── blocks/
    ├── layout/             # Section, Grid, Columns, Spacer & Divider (NexusSpacer)
    ├── content/            # Heading, Text, Button, Tabs, Input
    ├── news/               # NewsCard
    └── user/               # UserBadge, StatCard, Avatar
```

---

## 7. Metadata Editing & Custom Fields

To provide a seamless visual editing experience, page metadata (URL path and Title) can be edited directly within the Puck interface and is synchronized with MongoDB on Publish:

### A. Page Title Synchronization
- **Hydration:** The database `Page.title` is loaded on the server and merged into `root.props.pageSettings.title` during initialization (`buildEditorData` in `PuckClient`).
- **Header label:** `PageHeaderLabel` portals into the Puck header title slot and reads `editorPageMetadataStore` via `useSyncExternalStore` — updates live while typing in the sidebar without Puck document mutations.
- **Deferred commit:** `PageSettingsFieldGroup` commits title and slug to Puck on blur only (`useDeferredFieldCommit`, `textDebounceMs: 0`).
- **Persistence:** When the user clicks **Publish**, metadata is extracted via `resolvePageMetadata()` in `PuckEditorShell` and saved to MongoDB.

### B. Page URL Path Renaming
- **Sidebar editor:** `PageSettingsFieldGroup` in the Puck right sidebar — title + slug with live preview. Publish reads metadata via `resolvePageMetadata()` in `PuckEditorShell`.
- **Legacy:** `PagePathHeaderChip` / `PageTitleEditor` are not mounted in the current shell.
- **Safety Guards:** The homepage at `/` is **not** Puck-managed (see `src/app/page.tsx` in code). Visiting `/edit` redirects to Page Manager. Puck pages use `/<slug>/edit`. Slugs `edit`, `pages`, and `api` are reserved. Slugs are normalized to lowercase alphanumeric characters, hyphens, and slashes.
- **Page edit FAB:** Published Puck CMS routes (any MongoDB page except the code-only homepage) show a fixed bottom-right **Edit** button for `Admin` and `StudentCouncil` sessions (`PageEditFab`, `pageEditAccess.ts`). Links to `/<path>/edit`; hidden in editor mode.
- **Rename Flow:** Renaming a page on Publish performs a safe rename in MongoDB. If the target path is already taken, the API returns a `409 Conflict` error, which is displayed directly in the editor header. On successful rename, the editor redirects to the new URL (`/new-path/edit`).

### C. Unified Custom Field Styling
- Custom fields (`ImageField`, `NexusColorPresetField`, `MediaUploadField`) use `.nexus-puck-field` in `puck-editor.css`.
- This ensures all custom text inputs, buttons, and hover/focus states look visually identical to Puck's native fields across both light and dark themes.

---

## 8. UI/UX Enhancements (Phase 1 Refinements)

Full specification: [puck_editor_enhancements.md](./puck_editor_enhancements.md)

| Feature | Implementation |
|---------|----------------|
| Path edit state fix | `PuckClient` + `PuckEditorShell` (`ssr: false`); path via `PagePathHeaderChip` ref at publish |
| Design-system colors | `nexusColorTokens.ts` — simplified dual-theme hue catalog |
| Island layout | `IslandFieldGroup.tsx` — compact categorized chapter |
| Custom spacing | `SpacingFieldGroup.tsx` — Padding/Margin 2×2 grids |
| Inline path editing | `PageSettingsFieldGroup.tsx` — title + slug in Page Settings sidebar |
| Media upload (image/video) | `MediaUploadField.tsx` + `lib/mediaUpload.ts`; `/api/upload` accepts video up to 50MB |
| Accent background presets | `AccentPresetField.tsx` — 6 hue families for solid page backgrounds |
| Header chrome preview | Removed from canvas — unified `NexusPuckHeaderShell` wraps Puck toolbar in a `SiteHeaderBar`-style glass bar (logo + title/slug + editor controls). Published pages use `GlobalHeader` from `layout.tsx`. |
| Editor header toolbar | `NexusPuckHeaderShell.tsx` + `.nexus-editor-header-btn` — All Pages, Interactive, theme, Publish/undo/redo inside one glass panel |
| Live header metadata | `PageHeaderLabel.tsx` + `editorPageMetadataStore.ts` — title + slug in Puck header center |
| Animated theme toggle | `ThemeToggle.tsx` pill switch + `globals.css` `.nexus-theme-toggle` |
| Block spacing & islands | `SpacingFieldGroup` + `IslandFieldGroup` custom fields in `spacingFields.tsx` |
| Dark theme contrast | Grey + azure token remap in `puck-editor.css`; hover/selection overrides for Outline and array lists |
| Interactive preview mode | `EditorModeToggle.tsx` — toggles Puck `previewMode` (`edit` \| `interactive`); `PageRoot` keeps contained grid via `NexusEditorCanvasContext` (no duplicate header in canvas) |
| Rich body text | `TiptapField.tsx` + `richTextContent.ts` — StarterKit editor; sanitized HTML via `.nexus-rich-text` |
| Carousel | `NexusCarousel.tsx` — multi-slide carousel with media upload per slide |
| Functional tabs | `NexusTabs.tsx` — per-tab Puck slots for nested block content |
| Inline links | `@tiptap/extension-link` — accent-colored links in body text |
| Editor icons | `puckIcons.tsx` + `lucide-react` — icons in component drawer and field labels |
| Unified content width | `contentWidthTokens.ts` — xs–xl + full; page, section, island share one system |
| Full-width sidebar controls | `SegmentedControl.tsx` — all Off/On and radio groups span 100% sidebar width |
| Typography system | `nexusTypography.ts` — role defaults (sans/serif) + weight 100–900 overrides |
| Spacing custom inputs | `spacingCustomValue.ts` — numeric + unit picker with validation bounds |
| List markers | `NexusList.tsx` — explicit `listStyleType` for bullet/numbered lists |
| Canvas performance | [puck_editor_performance.md](./puck_editor_performance.md) — ref-only parent sync, selective `useNexusPuck`, deferred fields, tight `resolveData` |
| Sidebar switches | `PuckSwitchField.tsx`, `binaryToggleFields.ts`, `puckEditorOverrides.tsx` — binary yes/no/on/off radios render as Shadcn switches |

### Directory Mapping (updated)

```
src/components/puck/
├── config.tsx
├── PagePathEditor.tsx       # normalizePagePath + shared handle type
├── PageHeaderLabel.tsx      # Live title + slug in Puck header center
├── NexusPuckHeaderShell.tsx # Site-header glass shell for Puck toolbar
├── PagePathHeaderChip.tsx   # Legacy URL pill (not mounted)
├── PageTitleEditor.tsx      # Legacy inline title (deprecated; not mounted)
├── EditorModeToggle.tsx     # edit vs interactive preview toggle
├── puckEditorOverrides.tsx  # stable module-level Puck overrides (see performance doc)
├── PuckEditorErrorContext.tsx
├── fields/
│   ├── CustomDimensionInput.tsx
│   ├── DeferredTextInputField.tsx
│   ├── StripArrayLabelField.tsx
│   ├── PuckSwitchField.tsx
│   ├── FieldChapter.tsx
│   ├── SpacingFieldGroup.tsx
│   ├── IslandFieldGroup.tsx
│   ├── PageAppearanceFieldGroup.tsx
│   ├── NexusColorPresetField.tsx
│   ├── TiptapField.tsx
│   ├── MediaUploadField.tsx
│   ├── AccentPresetField.tsx
│   └── ImageField.tsx
├── lib/
│   ├── nexusColorTokens.ts
│   ├── spacingFields.tsx
│   ├── spacingCustomValue.ts
│   ├── spacingDisplay.ts
│   ├── contentWidthTokens.ts
│   ├── nexusTypography.ts
│   ├── richTextContent.ts
│   ├── FontFamilyField.tsx
│   ├── FontWeightField.tsx
│   ├── SegmentedControl.tsx
│   ├── mediaUpload.ts
│   ├── useDeferredFieldCommit.ts
│   ├── binaryToggleFields.ts
│   └── useNexusPuck.ts      # createUsePuck selectors — never bare usePuck() in renders
├── root/
│   └── PageRoot.tsx
└── blocks/
    ├── layout/
    ├── content/
    ├── news/
    └── user/
```
