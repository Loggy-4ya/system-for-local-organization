# Puck Editor UI/UX Enhancements

**Status:** `[x] Completed`

**Related:** [puck_editor.md](./puck_editor.md) · [figma_ui_integration.md](./figma_ui_integration.md)

---

## 1. Overview

Phase 1 refinements to the Puck.js visual editor: unified field styling, design-system color presets, island layout architecture, page metadata editing, PageRoot presets, fixed header chrome, and block-level spacing controls.

---

## 2. Path Edit State Bug (Critical)

### Symptom
Typing in the header URL path editor resets Puck canvas state.

### Fix
- `PuckClient` holds `editorData` in `useState` + Puck `onChange`.
- Puck editor loaded via `dynamic(..., { ssr: false })` in `PuckEditorShell.tsx` to avoid hydration mismatches.
- Path draft decoupled from Puck data; publish reads via `PagePathEditorHandle`.

---

## 3. Shared Custom Fields

| Field | File | Purpose |
|-------|------|---------|
| `NexusColorPresetField` | `src/components/puck/fields/NexusColorPresetField.tsx` | Design-system color presets (text, island fill, island border) |
| `MediaUploadField` | `src/components/puck/fields/MediaUploadField.tsx` | Drag-and-drop image/video upload + URL input |
| `AccentPresetField` | `src/components/puck/fields/AccentPresetField.tsx` | Page solid background — accent families + surface panel |
| Token catalog | `src/components/puck/lib/nexusColorTokens.ts` | Maps token ids → CSS vars from `globals.css` |
| Upload helper | `src/components/puck/lib/mediaUpload.ts` | Shared POST to `/api/upload` |

**Removed:** free-form `RgbaColorField` — admins pick presets only, preserving the Nexus color system.

### Color performance
`useDeferredFieldCommit.ts` available for fields that must not spam Puck `onChange` during drag (preset selects commit immediately; no canvas thrash).

---

## 4. PageRoot Enhancements

- **Accent presets:** `backgroundPreset` maps to CSS vars (`--accent-*`, `surface-panel`).
- **No custom hex override** — solid backgrounds use presets only.
- **Header chrome:** `EditorHeaderChrome.tsx` at top of every Puck page.

---

## 5. Inline Title & Path Editing

| Component | Location | Behavior |
|-----------|----------|----------|
| `PageTitleEditor.tsx` | Puck header title slot (left) | Click-to-edit page title |
| `PagePathHeaderChip.tsx` | Puck `headerActions` (right) | URL pill chip, click-to-edit slug |

---

## 6. Block Spacing & Island Layout

**Module:** `src/components/puck/lib/spacingFields.tsx`

- **`SpacingFieldGroup`** / **`IslandFieldGroup`** — Padding/Margin and Island sub-categories; closed by default via controlled `FieldChapter`.
- Puck component categories use `defaultExpanded: false` in `config.tsx`.
- `flattenBlockShellProps()` reads nested `spacing` / `island` objects **or** legacy flat props.
- `applyBlockShell()` — margin shell + optional centered island wrapper with preset fill/border.
- `resolveSpacingFieldVisibility()` — omits inactive `*Custom` and island sub-fields.

Applied to all 18 blocks via `withBlockShell()` in `config.tsx`. PageRoot groups background fields under **Page Background**.

---

## 7. Simplified Color Palette

Dual-theme catalog in `nexusColorTokens.ts` — one balanced hue per color-wheel family (no soft/medium/strong tiers):

| Group | Options |
|-------|---------|
| Text | Primary, Secondary, Accent |
| Island fill | Glass, Surface, Accent Wash |
| Island border | Default, Accent |
| Page solid background | Neutral, Blue, Green, Purple, Warm, Gold |

Legacy token ids (e.g. `blue-medium`) map to canonical ids at resolve time.

---

## 8. Dark Theme Contrast

**File:** `puck-editor.css` under `[data-theme="dark"] .Puck`

| Fix | Detail |
|-----|--------|
| Grey token remap | Sidebars, fields, headers use dark surfaces + light text |
| Azure token remap | Hover/selected rows (Outline, array lists, drawer) use dark azure surfaces instead of near-white |
| Select chevron | Explicit dark chevron SVG — prevents zigzag tile artefact |
| Targeted overrides | ArrayField summary, Layer-inner — readable text when Puck omits hover `color` |
| Canvas selection | Accent fill + outline on selected/hovered blocks in preview |
| Sidebar scrollbar | Thin, low-contrast thumb; `scrollbar-gutter: stable` prevents width jump |
| Components spacing | 12px margin before first category under Components title |
| Sidebar chapters | `FieldChapter` — icons, categorized custom fields, no tree lines |

---

## 9. Acceptance Criteria

- [x] Path typing does not reset Puck editor state
- [x] Dark theme dropdowns are readable (no chevron zigzag)
- [x] Dark theme hover/selection readable in Outline, array lists, and drawer
- [x] Colors use simplified dual-theme preset catalog
- [x] Header shows title (left) and URL chip (right toolbar)
- [x] Sidebar spacing/island settings categorized in compact chapters
- [x] Drag-and-drop upload works for images and videos
- [x] Page solid background uses accent presets
- [x] Header chrome visible on all Puck pages
- [x] Inline title and path edit in header
- [x] Island layout: contained width, preset fill/border
- [x] Custom spacing fields appear when `custom` token selected
- [x] Spacing token labels show pixel equivalents (e.g. `MD (16px)`)
- [x] Custom spacing uses bounded numeric + unit inputs (`px`, `rem`, `em`, `%`)
- [x] Interactive mode toggle in Puck header (`EditorModeToggle`)
- [x] List block restores bullet/number markers (`listStyleType`)
- [x] Body Text uses Tiptap rich text editor (`TiptapField`) with sanitized HTML render

---

## 10. Interactive Mode & Rich Text (Phase 2)

| Feature | File | Detail |
|---------|------|--------|
| Edit / Interactive toggle | `EditorModeToggle.tsx` | Toggles Puck `ui.previewMode` via `setUi`; rendered in `PuckEditorShell` header actions |
| Spacing pixel labels | `SpacingFieldGroup.tsx` | Token options show design-system px values |
| Safe custom spacing | `spacingCustomValue.ts` | Parses/formats `24px`-style values; bounds: px ≤ 200, rem/em ≤ 12, % ≤ 100 |
| List markers | `NexusList.tsx` | `listStyleType: disc \| decimal`; removed flex layout that hid markers |
| Rich body text | `TiptapField.tsx` | StarterKit toolbar (bold, italic, strike, code, H1–H3, lists, blockquote) |
| HTML sanitize/render | `richTextContent.ts` | Allowlist sanitizer + legacy plain-text fallback for `NexusText` canvas/publish |
| Editor styles | `puck-editor.css` | Tiptap toolbar/content, mode toggle, spacing custom row |
| Published styles | `globals.css` | `.nexus-rich-text` typography for headings, lists, blockquote, code |

**Dependencies:** `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/pm` — Tiptap uses `immediatelyRender: false` for Next.js SSR safety.

---

## 11. Carousel, Functional Tabs, Links & Editor Icons (Phase 3)

| Feature | File | Detail |
|---------|------|--------|
| Carousel block | `NexusCarousel.tsx` | Slide array (image, title, caption, link), arrows, dots, autoplay |
| Functional tabs | `NexusTabs.tsx` | Each tab has a Puck `slot` panel — drag any blocks into tab content |
| Rich text links | `TiptapField.tsx` + `@tiptap/extension-link` | Link / unlink toolbar; safe href allowlist in `richTextContent.ts` |
| Link styling | `globals.css` | `.nexus-rich-text__link` uses accent color + underline (distinct from body text) |
| Editor icons | `puckIcons.tsx` + `lucide-react` | Lucide icons on drawer items, field labels, and field chapters |
| Drawer override | `PuckEditorShell.tsx` | `drawerItem` + `fieldLabel` overrides inject icons |

**New dependency:** `lucide-react`, `@tiptap/extension-link`

---

## 12. Unified Width, Sidebar Controls & Typography (Phase 4)

### Content width tokens

Single source: [`contentWidthTokens.ts`](../../src/components/puck/lib/contentWidthTokens.ts)

| Token | Width |
|-------|-------|
| `xs` | 640px |
| `sm` | 800px |
| `md` | 1024px |
| `lg` | 1200px (default) |
| `xl` | 1400px |
| `full` | 100% |

Wired into: `PageRoot` (Page Content Width), `NexusSection`, island shell, `globals.css` (`--content-width-*`), `GlobalHeader` / `EditorHeaderChrome`.

Legacy values `contained` → `lg`, `narrow` → `sm` at read time.

Per-block hardcoded `maxWidth` caps removed from NewsCard, StatCard, UserBadge, Video, Image placeholder.

### Sidebar control standards

> **Rule:** All binary and small-option controls (Show/Hide, Off/On, Left/Center/Right) **must span 100% of the sidebar field width**.
>
> - Prefer Puck `type: "radio"` for native fields (already full-width).
> - Custom toggles use [`SegmentedControl.tsx`](../../src/components/puck/fields/SegmentedControl.tsx) with `.nexus-segmented { width: 100% }` and `.nexus-segmented__btn { flex: 1 }`.

### Spacing pixel hints

- Token selects show labels like `MD (16px)` via [`spacingDisplay.ts`](../../src/components/puck/lib/spacingDisplay.ts).
- Resolved hint row (e.g. `MD · 16px`) rendered under each spacing/island token select via `.nexus-field-grid__resolved`.

### Typography

| Role | Default family | Default weight |
|------|----------------|----------------|
| Heading | Sans (Inter) | 700 |
| Body Text | Sans (Inter) | 400 |
| Blockquote | Serif (Source Serif 4) | 400 italic |

Fonts loaded in `layout.tsx`: Inter, Source Serif 4, JetBrains Mono → `--font-sans`, `--font-serif`, `--font-mono`.

Per-block overrides: `FontFamilyField` + `FontWeightField` (100–900) on Heading, Body Text, Blockquote. Module: [`nexusTypography.ts`](../../src/components/puck/lib/nexusTypography.ts).

---

## 13. Starter Content, Responsive Header, Tabs & Interactive Components (Phase 5)

| Feature | File | Detail |
|---------|------|--------|
| Default starter section | `defaultEditorContent.ts` | Empty editor pages seed a Section + Heading + Body Text |
| Responsive header | `SiteHeaderBar.tsx` | Mobile hamburger menu; shared by `GlobalHeader` + `EditorHeaderChrome` |
| Tabs slot fix | `NexusTabs.tsx` | Each tab includes `panel: []` for Puck inline slots |
| Tabs editor UX | `NexusTabsRender.tsx` | Edit mode stacks all tab panels with drop zones; Interactive mode switches tabs |
| Carousel editor UX | `NexusCarouselRender.tsx` | Controls + autoplay in Interactive/published; hint in edit layout mode |

---

## 14. Page Gutter & Editor Stability Fixes (Phase 6)

### Page content gutter

| Token | Value | Usage |
|-------|-------|-------|
| `--page-content-gutter` | `clamp(12px, 3vw, 24px)` | Horizontal/vertical inset on Puck pages and `.page-shell` |

Applied via `pageGutterStyle()` in [`contentWidthTokens.ts`](../../src/components/puck/lib/contentWidthTokens.ts) and wired into [`PageRoot.tsx`](../../src/components/puck/root/PageRoot.tsx). Ensures the InfiniteGrid background remains visible on mobile and desktop even when content width is `full`.

### Carousel edit mode

In **Edit** layout mode, [`NexusCarouselRender.tsx`](../../src/components/puck/blocks/content/NexusCarouselRender.tsx) stacks all slides vertically (`.nexus-carousel__slides--edit`) with per-slide labels. Navigation arrows/dots are disabled to avoid fighting Puck drag overlays. **Interactive** and published modes retain single-slide carousel behavior.

### Video embeds in edit mode

[`NexusVideoRender.tsx`](../../src/components/puck/blocks/content/NexusVideoRender.tsx) sets `pointer-events: none` on iframe/video in edit layout mode only. **No capturing overlay shield** — a previous `.nexus-video__edit-shield` with `pointer-events: auto` blocked Puck's portaled action bar. Re-enabled in interactive preview via `.nexus-video--interactive`. Global rule in `puck-editor.css`: `[data-puck-component] iframe/video { pointer-events: none }` with interactive exception.

### Sidebar typing stability

| Layer | File | Behavior |
|-------|------|----------|
| Tiptap field | `TiptapField.tsx` | Debounced `onChange` (400ms); flush on blur; skip external `setContent` while focused |
| Parent state | `client.tsx` | **Immediate** `setEditorData` (debounce removed — it broke drag-and-drop); `latestDataRef` kept for publish flush |

Tiptap debounce alone prevents typing rerenders without stale controlled `data` fighting Puck DnD.

### Tabs & carousel slot drop zones (Phase 6b)

| Block | Pattern |
|-------|---------|
| Tabs | [`NexusTabsRender.tsx`](../../src/components/puck/blocks/content/NexusTabsRender.tsx) — render `<Panel />` directly (no memo wrapper); `typeof Panel === "function"` guard; index-only keys; editor padding via slot `style` |
| Carousel | [`NexusCarousel.tsx`](../../src/components/puck/blocks/content/NexusCarousel.tsx) — per-slide `content` slot; stacked drop zones in edit mode, active slide only in interactive/published |

CSS: `[data-puck-dropzone]` selectors in `puck-editor.css` with `min-height`, padding, `z-index: 2`.

---

## 15. Island Defaults on Insert & Page Settings Slug (Phase 7)

### Editor settings API

| Piece | File | Detail |
|-------|------|--------|
| Constants | [`shared/constants/editorSettings.ts`](../../shared/constants/editorSettings.ts) | Seed list of small/content blocks (`NexusHeading`, `NexusText`, …) |
| Model | [`shared/models/EditorSettings.ts`](../../shared/models/EditorSettings.ts) | Singleton `_id: "puck-editor"` with `islandDefaultComponents: string[]` |
| API | [`src/app/api/editor-settings/route.ts`](../../src/app/api/editor-settings/route.ts) | `GET` upserts seed; `POST` saves list (bearer guard matches `/api/puck`) |

### Page Manager — Editor Defaults tab

[`PageManagerShell.tsx`](../../src/app/pages/PageManagerShell.tsx) adds **Pages** / **Editor Defaults** tabs on `/pages`. [`EditorDefaultsPanel.tsx`](../../src/app/pages/EditorDefaultsPanel.tsx) renders a category-grouped checklist of all Puck component keys from `config.tsx` and persists via `POST /api/editor-settings`.

### Island-on-insert (resolveData)

| Piece | Role |
|-------|------|
| [`editorIslandSettings.ts`](../../src/components/puck/lib/editorIslandSettings.ts) | Shared `editorIslandSettingsRef` — admin list from `/api/editor-settings` |
| [`spacingFields.tsx`](../../src/components/puck/lib/spacingFields.tsx) | `withBlockShell` → `resolveData` on `insert` / `move` with `params.parent`; enables island when type is in admin list and parent island is off |
| [`applyIslandDefaultsOnInsert.ts`](../../src/components/puck/lib/applyIslandDefaultsOnInsert.ts) | `ensureIslandOnEligibleBlocks` only — heals starter/saved pages at init and viewer render |

Drag-insert island is handled **inside Puck's data pipeline** via `resolveData` (runs after `defaultProps` merge). Client `onChange` is pass-through only (preserves move/delete overlays). Skips when parent has `isIslandActive()` (no nested glass shells). Does not re-run on `replace` (user can turn island off permanently).

**Starter content:** [`defaultEditorContent.ts`](../../src/components/puck/lib/defaultEditorContent.ts) — `NexusSection` shell off; each `NexusHeading` + `NexusText` gets its **own** island (separate glass wrappers, not one shared parent island). `buildEditorData` + viewer `ensureIslandOnEligibleBlocks` heal older saved pages.

### Page Settings sidebar (title + slug)

| Piece | File | Detail |
|-------|------|--------|
| Field group | [`PageSettingsFieldGroup.tsx`](../../src/components/puck/fields/PageSettingsFieldGroup.tsx) | **Page Settings** chapter: title, slug (`/` prefix), live preview |
| Root config | [`PageRoot.tsx`](../../src/components/puck/root/PageRoot.tsx) | Replaces flat `title` field with `pageSettings` custom group |
| Init | `client.tsx` `buildEditorData` | Seeds `slug` from MongoDB `path`; `slugLocked` for homepage |
| Publish | [`PuckEditorShell.tsx`](../../src/app/[...puckPath]/PuckEditorShell.tsx) | Reads `pageSettings.title` + `normalizePagePath(slug)`; header path/title editors removed |

