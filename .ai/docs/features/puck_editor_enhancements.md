# Puck Editor UI/UX Enhancements

**Status:** `[x] Completed`

**Related:** [puck_editor.md](./puck_editor.md) · [puck_editor_performance.md](./puck_editor_performance.md) · [figma_ui_integration.md](./figma_ui_integration.md)

---

## 1. Overview

Phase 1 refinements to the Puck.js visual editor: unified field styling, design-system color presets, island layout architecture, page metadata editing, PageRoot presets, fixed header chrome, and block-level spacing controls.

---

## 2. Path Edit State Bug (Critical)

### Symptom
Typing in the header URL path editor resets Puck canvas state.

### Fix
- Puck editor loaded via `dynamic(..., { ssr: false })` in `PuckEditorShell.tsx` to avoid hydration mismatches.
- Path/title drafts decoupled from Puck document mutations; publish reads live data from Puck / `latestDataRef`.
- See [puck_editor_performance.md §3](./puck_editor_performance.md#3-ref-only-parent-sync-mandatory) for current ref-only parent sync (do not lift `editorData` on every `onChange`).

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
See [puck_editor_performance.md §6](./puck_editor_performance.md#6-deferred-field-commits-non-dnd-fields) — `useDeferredFieldCommit.ts` for typing/slider fields; preset selects commit immediately.

---

## 4. PageRoot Enhancements

- **Accent presets:** `backgroundPreset` maps to CSS vars (`--accent-*`, `surface-panel`).
- **No custom hex override** — solid backgrounds use presets only.
- **Header chrome:** Editor toolbar in `NexusPuckHeaderShell` (`overrides.header`); stays visible in Interactive mode (`NexusPreviewModeAttr` + compact CSS override). Published `<Render>` uses `GlobalHeader` from `layout.tsx`.
- **Site-default background grid:** contained `InfiniteGrid` in `PageRoot` while editing or in interactive preview; **Grid motion** toggle (Dynamic default / Static) under Background → Style when **Site Default (Grid)** is selected — Static freezes tile scroll only (ambient blur + cursor glow stay); published pages use the layout-level grid.

---

## 5. Inline Title & Path Editing

| Component | Location | Behavior |
|-----------|----------|----------|
| `PageSettingsFieldGroup.tsx` | Puck right sidebar — **Page Settings** chapter | Title + slug (`/` prefix), live preview; deferred Puck commits on blur; drafts sync to `editorPageMetadataStore` |
| `PageLayoutFieldGroup.tsx` | Puck root — **Layout** chapter | Content width select; stored on `pageLayout` |
| `PageBackgroundFieldGroup.tsx` | Puck root — **Background** chapter | Background mode, grid motion, accent/image; stored on `pageBackground` |
| `pageRootFieldProps.ts` | Page root prop normalization | Merges `pageLayout` + `pageBackground` + legacy `appearance` for render |
| `PageHeaderLabel.tsx` | Puck header center (portal) | Live title + monospace slug pill on desktop; **hidden at ≤900px** (compact phones) |
| `PageTitleEditor.tsx` / `PagePathHeaderChip.tsx` | Legacy (not mounted) | Replaced by Page Settings sidebar + header label store in Phase 7 |

---

## 5b. Editor Header & Theme Polish

| Feature | File | Detail |
|---------|------|--------|
| Toolbar button sizing | `puck-editor.css` `.nexus-editor-header-btn` | 36px height for All Pages, Interactive, theme pill, Puck Publish/undo/redo |
| Animated theme toggle | `ThemeToggle.tsx` + `globals.css` | Pill switch with sliding knob; lucide sun/moon crossfade; `prefers-reduced-motion` safe |
| Live header label | `PageHeaderLabel.tsx` + `editorPageMetadataStore.ts` | Title + slug in Puck header without canvas rerenders while typing |
| Unified editor header shell | `NexusPuckHeaderShell.tsx` + `puck-editor.css` | Full-width glass island aligned to editor panel gutter (`PuckLayout-inner` 8px); desktop `PuckHeader-inner` 3-column grid (toggles | title | tools); strips Puck 67px plugin-rail padding |
| Narrow desktop header | `puck-editor.css` `@media (901px–1023px)` | Grid `auto minmax(0,1fr) auto` so title/slug truncate instead of MenuBar history overlapping center chips; 901–960px also uses icon-only All Pages link |

---

## 6. Block Spacing & Island Layout

**Module:** `src/components/puck/lib/spacingFields.tsx`  
**Canonical spec:** [puck_editor.md §3b — Root-level block spacing](./puck_editor.md#3b-root-level-block-spacing-default-margin)

- **`SpacingFieldGroup`** / **`IslandFieldGroup`** — Padding/Margin and Island sub-categories; closed by default via controlled `FieldChapter`.
- Puck component categories use `defaultExpanded: false` in `config.tsx`.
- `flattenBlockShellProps()` reads nested `spacing` / `island` objects **or** legacy flat props.
- `applyBlockShell()` — margin shell + optional centered island wrapper with preset fill/border. **New root-level inserts** (any `shellBlock()` type) receive **SM (8px)** top/bottom margin via `ROOT_BLOCK_VERTICAL_MARGIN` (`sm` → `--spacing-sm`). Seeded on insert/move only (`mergeRootInsertSpacing` / `mergeIslandAutoSpacing`); saved/starter content is not retroactively patched.
- `resolveSpacingFieldVisibility()` — omits inactive `*Custom` and island sub-fields.

Applied to all 18 blocks via `withBlockShell()` in `config.tsx`. PageRoot groups background fields under **Page Background**.

### Root-level default margin (SM token)

| Concern | Detail |
|---------|--------|
| Token | Reuses existing **`sm`** / `--spacing-sm` — no dedicated CSS variable or Puck-only token |
| Code | `ROOT_BLOCK_VERTICAL_MARGIN = "sm"` in `spacingFields.tsx` |
| Insert/move | `applyIslandDefaultsOnInsert.ts` → `resolveInsertDefaultsProps` + `mergeRootInsertSpacing` when `parent === null` |
| Palette | `config.tsx` → `shellBlock()`; island-default types also seed SM in `defaultProps.spacing` |
| Nested | Inserts under Section/Grid/Carousel/Tabs shells reset margins to **None** |
| User override | Puck **Spacing** chapter — per-block Top/Bottom margin |
| Change default site-wide | Edit `--spacing-sm` in `globals.css` (affects all SM spacing uses, not root blocks alone) |
| Tests | `npm run test:island-defaults` — root move seeds non-`none` vertical margins |

---

## 6b. Content & Layout Block Field Chapters

**Modules:**
- `src/components/puck/lib/blockFieldChapters.tsx` — `withFieldChapters()`, `flattenChapterProps()`, `nestChapterDefaultProps()`
- `src/components/puck/lib/blockFieldChapterConfigs.tsx` — per-block chapter map (17 Content + Layout blocks)
- `src/components/puck/fields/BlockFieldChapterGroup.tsx` — generic `FieldChapter` + Puck `AutoField` renderer

**Sidebar order (each Content/Layout block):**
1. Top-level arrays/slots (`slides`, `tabs`, `content`, …) — always visible
2. Collapsed block chapters (Content, Typography, Layout, Behavior, …) — closed by default via `FieldChapter`; smooth grid-accordion unfold (240ms, `--nexus-drawer-accordion-*` tokens in `puck-editor.css`; disabled under `prefers-reduced-motion`)
3. **Spacing** + **Island** shell chapters (unchanged)

**Data model:** Chapter values nest under chapter ids in Puck props (e.g. `headingTypography: { colorPreset, fontFamily, … }`). `flattenChapterProps()` merges nested chapter objects back to flat keys at render/`resolveData` time; legacy flat props on saved pages still work without migration.

**Uniform spacing:** `.nexus-sidebar-field` wraps every `AutoField` inside chapters; adjacent Puck `Field` rows use `border-top` dividers (see `puck-editor.css`). Hidden `visibleWhenFlat` chapters are omitted via `resolveChapterFieldVisibility()` in `resolveFields` — not just `null` render — so conditional blocks leave no empty divider strip.

**Conditional sub-fields (inside chapter renderers):**
- `NexusSpacer` (**Spacer & Divider**) — top-level `stylePreset` always visible; **Size** and **Line** chapter fields removed from the sidebar unless `stylePreset === "custom"`; line sub-fields (`thickness`, `borderColorPreset`, `width`, `align`) only when `showLine === "yes"`

**Style preset bundles (`NexusSpacer`):** Non-`custom` presets apply bundled props via `applySeparatorStylePreset()` in [`separatorBlockLogic.ts`](../../src/components/puck/lib/separatorBlockLogic.ts). `resolveData` re-syncs bundled fields when the preset changes. Preset ids: `space-xs` … `space-2xl`, `line-full-thin` … `line-center-20`, `break-sm` … `break-lg`, `custom`.

**Wiring:** `shellBlock()` in `config.tsx` applies `withFieldChapters()` before `withBlockShell()`. News/User blocks are unchanged.

---

## 6c. Unified Dimension & Stepped Slider Controls (Layout + Content)

**Goal:** All Layout and Content block size fields share the same sidebar UX — labeled preset selects, optional custom value row, or stepped sliders for finite enums.

**Shared modules:**

| Module | Purpose |
|--------|---------|
| [`PresetDimensionField.tsx`](../../src/components/puck/fields/PresetDimensionField.tsx) | Label + `PuckSelectField` + `CustomDimensionInput` (or text custom row) |
| [`createPresetDimensionPuckField.tsx`](../../src/components/puck/lib/createPresetDimensionPuckField.tsx) | Factory for Puck `custom` fields storing `{ preset, custom }` objects |
| [`createSteppedSliderField.tsx`](../../src/components/puck/lib/createSteppedSliderField.tsx) | Factory wrapping [`SteppedSliderField.tsx`](../../src/components/puck/fields/SteppedSliderField.tsx) |
| [`resolvePresetDimension.ts`](../../src/components/puck/lib/resolvePresetDimension.ts) | Normalize legacy flat tokens → preset/custom; resolve CSS at render |
| [`resolveSpacingDimension.ts`](../../src/components/puck/lib/resolveSpacingDimension.ts) | Spacing-token gaps/padding/heights |
| [`separatorBlockLogic.ts`](../../src/components/puck/lib/separatorBlockLogic.ts) | `NexusSpacer` style presets, prop normalization, render model (`resolveSeparatorRenderModel`) |
| [`resolveSectionDimensions.ts`](../../src/components/puck/lib/resolveSectionDimensions.ts) | Section max-width + asymmetric padding |
| [`fieldOptionLabels.ts`](../../src/components/puck/lib/fieldOptionLabels.ts) | Centralized option catalogs (spacing, radius, thickness, font size, grid spans, …) |

**Control patterns:**

| Pattern | Used for |
|---------|----------|
| Preset + custom dimension | Gap, padding, height, radius, width, thickness, font size, line height, shadow, video/image sizing |
| Stepped slider | Grid columns/spans, button/tab size, carousel slides visible / scroll step |
| Segmented control (labeled) | List type, alignment, 3–4 option radios |
| Switch | Binary toggles only (`yes/no`, `on/off`) |

**Chapter label fix:** [`BlockFieldChapterGroup.tsx`](../../src/components/puck/fields/BlockFieldChapterGroup.tsx) shows sub-field labels for all fields except binary toggles (uses same rule as [`binaryToggleFields.ts`](../../src/components/puck/lib/binaryToggleFields.ts)). Fixes unlabeled List Style controls.

**List position removed:** `listPosition` chapter and [`ListPositionField.tsx`](../../src/components/puck/fields/ListPositionField.tsx) deleted — vertical margins use block shell **Spacing** only (full token scale + custom).

**Legacy compatibility:** Render resolvers accept old flat tokens (`gap: "medium"`, `itemSpacing: "md"`, `padding: "normal"`, raw CSS strings) without DB migration.


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
| Sidebar chapters | `FieldChapter` — icons, categorized custom fields, animated grid-accordion unfold (shared drawer tokens), no tree lines |

---

## 9. Acceptance Criteria

- [x] Path typing does not reset Puck editor state
- [x] Dark theme dropdowns are readable (no chevron zigzag)
- [x] Dark theme hover/selection readable in Outline, array lists, and drawer
- [x] Colors use simplified dual-theme preset catalog
- [x] Header shows live title + slug in Puck center label (`PageHeaderLabel`)
- [x] Editor header toolbar buttons share 36px height (`.nexus-editor-header-btn`)
- [x] Theme toggle is animated pill switch project-wide (`ThemeToggle`)
- [x] Sidebar spacing/island settings categorized in compact chapters
- [x] Content/Layout block settings grouped in collapsed FieldChapter groups with uniform field spacing
- [x] FieldChapter settings unfold with grid-accordion animation (shared drawer tokens; `prefers-reduced-motion` safe)
- [x] Drag-and-drop upload works for images and videos
- [x] Page solid background uses accent presets
- [x] Header chrome visible on all Puck pages
- [x] Inline title and path edit in Page Settings sidebar (header mirrors drafts live)
- [x] Island layout: contained width, preset fill/border
- [x] Custom spacing fields appear when `custom` token selected
- [x] Spacing token labels show pixel equivalents (e.g. `MD (16px)`)
- [x] Custom spacing uses bounded numeric + unit inputs (`px`, `rem`, `em`, `%`)
- [x] Interactive mode toggle in Puck header (`EditorModeToggle`)
- [x] Layout/Content block size fields use unified preset+custom or stepped slider controls (§6c)
- [x] List Style chapter shows labeled controls; List Position removed in favor of shell Spacing
- [x] Body Text uses site-wide `NexusRichTextEditor` via `TiptapField` (`@` mentions, `/` slash commands) with `NexusRichTextView` canvas render

---

## 10. Interactive Mode & Rich Text (Phase 2)

| Feature | File | Detail |
|---------|------|--------|
| Edit / Interactive toggle | `EditorModeToggle.tsx`, `editorModePanelSnapshot.ts` | Toggles Puck `ui.previewMode` via `setUi`; entering interactive closes plugin panels; returning to edit restores prior sidebar visibility via in-memory snapshot (`npm run test:editor-mode-panel`) |
| Spacing pixel labels | `SpacingFieldGroup.tsx` | Token options show design-system px values |
| Safe custom spacing | `spacingCustomValue.ts` | Parses/formats `24px`-style values; bounds: px ≤ 200, rem/em ≤ 12, % ≤ 100 |
| List markers | `NexusList.tsx` | `listStyleType: disc \| decimal`; removed flex layout that hid markers |
| Rich body text | `TiptapField.tsx` → `NexusRichTextEditor` | Full toolbar + `@` mentions + `/` slash commands |
| HTML sanitize/render | `richTextContent.ts` → `nexusEditorContent.ts` | Allowlist sanitizer (mentions, `hr`, `pre`) + legacy plain-text fallback; `NexusRichTextView` on canvas |
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

Wired into: `PageRoot` (Page Content Width), `NexusSection`, island shell, `globals.css` (`--content-width-*`), `GlobalHeader`, `NexusPuckHeaderShell`.

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
| Responsive header | `SiteHeaderBar.tsx` | Mobile `<details>` nav (no JS) + `ThemeToggleLink` server route; shared by `GlobalHeader`; editor shell mirrors styling via `NexusPuckHeaderShell` |
| Tabs slot fix | `NexusTabs.tsx` | Each tab includes `panel: []` for Puck inline slots |
| Tabs editor UX | `NexusTabsRender.tsx` | Strip edit mode: one active panel drop zone; tab strip switches panel |
| Carousel editor UX | `NexusCarouselRender.tsx` | Strip edit mode: one active slide drop zone; Embla in Interactive/published |

---

## 14. Page Gutter & Editor Stability Fixes (Phase 6)

### Page content gutter

| Token | Value | Usage |
|-------|-------|-------|
| `--page-content-gutter` | `clamp(12px, 3vw, 24px)` | Horizontal/vertical inset on Puck pages and `.page-shell` |

Horizontal gutter via `.global-layout-page-content-slot` (matches header/footer slots). Published pages use top gutter only (`pageContentTopGutterStyle()`); editor preview keeps full block gutter. Global footer sits after content with `--spacing-sm` (8px) via `.global-layout-footer-slot` padding-top.

### Carousel edit mode

In **Edit** layout mode, [`NexusCarouselRender.tsx`](../../src/components/puck/blocks/content/NexusCarouselRender.tsx) uses the same Embla carousel as published/interactive preview: Shadcn prev/next arrows and pagination dots (when enabled). All slide slot DropZones remain mounted in the carousel track; inactive slides stay off-screen. Active slide index is tracked via [`useStripActiveIndex`](../../src/components/puck/lib/useStripActiveIndex.ts) + [`stripEditorState.ts`](../../src/components/puck/lib/stripEditorState.ts) — not Puck `replace`.

### Video embeds in edit mode

[`NexusVideoRender.tsx`](../../src/components/puck/blocks/content/NexusVideoRender.tsx) sets `pointer-events: none` on iframe/video in edit layout mode only. **No capturing overlay shield** — a previous `.nexus-video__edit-shield` with `pointer-events: auto` blocked Puck's portaled action bar. Re-enabled in interactive preview via `.nexus-video--interactive`. Global rule in `puck-editor.css`: `[data-puck-component] iframe/video { pointer-events: none }` with interactive exception.

### Sidebar typing stability & canvas performance (Phase 13)

**Full playbook:** [puck_editor_performance.md](./puck_editor_performance.md) — mandatory reading before changing editor state, overrides, block render hooks, custom fields, or `resolveData`.

| Layer | File | Behavior |
|-------|------|----------|
| Tiptap field | `TiptapField.tsx` | Debounced `onChange` (400ms); flush on blur; skip external `setContent` while focused |
| Parent state | `client.tsx` | **Ref-only** `onChange` → `latestDataRef` (no `setState` per edit); Puck owns live document. `setInitialEditorData` + `puckMountKey` only when server `data` / `path` changes |
| Overrides | `puckEditorOverrides.tsx` | Module-level `PUCK_EDITOR_OVERRIDES` — stable reference (no inline object per render) |
| Store hooks | `useNexusPuck.ts` | `createUsePuck` selectors — blocks subscribe to `previewMode` only, not full `appState.data` |
| Spacing custom | `SpacingFieldGroup.tsx` | Custom amount inputs commit on blur via `useDeferredFieldCommit` |
| Carousel resolveData | `NexusCarousel.tsx` | Normalizes `carouselSize` only on `load` / `insert` or when size props change |

Tiptap + ref-only parent sync prevent parent shell re-renders during typing and DnD. Publish reads `latestDataRef` / Puck `onPublish` payload.

### Tabs & carousel slot drop zones (Phase 6b)

| Block | Pattern |
|-------|---------|
| Tabs | [`NexusTabsRender.tsx`](../../src/components/puck/blocks/content/NexusTabsRender.tsx) — render `<Panel />` directly; strip edit shows one active panel drop zone |
| Carousel | [`NexusCarousel.tsx`](../../src/components/puck/blocks/content/NexusCarousel.tsx) — per-slide `content` slot; strip edit shows one active slide drop zone |

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

**Starter content:** [`defaultEditorContent.ts`](../../src/components/puck/lib/defaultEditorContent.ts) — `NexusSection` has island **ON** (single glass wrapper); child `NexusHeading` + `NexusText` have island **OFF**. `normalizeNestedIslands()` strips redundant child islands when a parent already has island active. `buildEditorData` + viewer `ensureIslandOnEligibleBlocks` heal older saved pages.

### Page Settings sidebar (title + slug)

| Piece | File | Detail |
|-------|------|--------|
| Field group | [`PageSettingsFieldGroup.tsx`](../../src/components/puck/fields/PageSettingsFieldGroup.tsx) | **Page Settings** chapter: title, slug (`/` prefix), live preview |
| Root config | [`PageRoot.tsx`](../../src/components/puck/root/PageRoot.tsx) | Replaces flat `title` field with `pageSettings` custom group |
| Init | `client.tsx` `buildEditorData` | Seeds `slug` from MongoDB `path`; `slugLocked` for homepage |
| Publish | [`PuckEditorShell.tsx`](../../src/app/[...puckPath]/PuckEditorShell.tsx) | Reads `pageSettings.title` + `normalizePagePath(slug)`; header path/title editors removed |

---

## 16. Shadcn UI (Base UI) Component Layer (Phase 8)

### Setup

| Piece | File | Detail |
|-------|------|--------|
| CLI config | [`components.json`](../../components.json) | `style: base-vega`, Base UI (not Radix) |
| Utilities | [`src/lib/utils.ts`](../../src/lib/utils.ts) | `cn()` via `clsx` + `tailwind-merge` |
| Token bridge | [`globals.css`](../../src/app/globals.css) | Shadcn vars alias Nexus tokens; vendored [`tw-animate.css`](../../src/app/tw-animate.css) + [`shadcn-tailwind.css`](../../src/app/shadcn-tailwind.css) |
| Primitives | [`src/components/ui/`](../../src/components/ui/) | button, card, carousel, accordion, aspect-ratio, select, command, dialog |

### Puck block refactors

| Block | Shadcn primitive | Notes |
|-------|------------------|-------|
| `NexusButton` | `Button` | Custom `success` / `danger` variants in `button.tsx` |
| `NexusAccordion` | `Accordion` | Base UI `multiple` prop |
| `NexusCarouselRender` | `Carousel` | Strip edit mode; slot-only slides; Embla in interactive/published |
| `NexusVideoRender` / `NexusImage` | `AspectRatio`, [`mediaAspectRatio.ts`](../../src/components/puck/lib/mediaAspectRatio.ts) | Shared preset + custom aspect ratios (16:9, 4:3, 1:1, 21:9, 9:16, 3:2, 2:3, 5:4, 4:5, custom `W/H`) for video frames, image auto-height frames, and carousel fill sizing |
| `NexusNewsCard` / `NexusStatCard` | `Card` | Glass styling retained via utility classes |

### App chrome and fields

| Surface | Change |
|---------|--------|
| `SiteHeaderBar` | Mobile nav uses native `<details>`; theme uses `ThemeToggleLink` → `/api/theme/toggle` |
| Puck sidebar | [`PuckSelectField.tsx`](../../src/components/puck/fields/PuckSelectField.tsx) wraps Shadcn `Select` |

---

## 17. Island Nesting, Video, Carousel, and List Fixes (Phase 9)

| Fix | Files | Detail |
|-----|-------|--------|
| Island nesting | [`defaultEditorContent.ts`](../../src/components/puck/lib/defaultEditorContent.ts), [`applyIslandDefaultsOnInsert.ts`](../../src/components/puck/lib/applyIslandDefaultsOnInsert.ts), [`editorSettings.ts`](../../shared/constants/editorSettings.ts) | Section island ON; children OFF; `normalizeNestedIslands()`; `NexusSection` in default island list |
| Video sizing | [`NexusVideo.tsx`](../../src/components/puck/blocks/content/NexusVideo.tsx), [`NexusVideoRender.tsx`](../../src/components/puck/blocks/content/NexusVideoRender.tsx), [`createPresetAspectRatioPuckField.tsx`](../../src/components/puck/lib/createPresetAspectRatioPuckField.tsx) | Width, max-width, alignment; universal aspect-ratio presets + custom; `AspectRatio` on all media paths. **EditorShell / View split** — Puck hooks only when `puck.isEditing`; nested carousel slots on `<Render>` use the hook-free view path. Same pattern on [`NexusImageRender.tsx`](../../src/components/puck/blocks/content/NexusImageRender.tsx) and [`NexusTabsRender.tsx`](../../src/components/puck/blocks/content/NexusTabsRender.tsx). |
| Carousel arrows | [`NexusCarouselRender.tsx`](../../src/components/puck/blocks/content/NexusCarouselRender.tsx), [`carousel.tsx`](../../src/components/ui/carousel.tsx) | Merged click handlers so `scrollPrev`/`scrollNext` are not overwritten. **`carousel.tsx`** defers Embla viewport attach and breakpoint `matchMedia` until `ownerDocument.defaultView` exists (Puck preview iframe mount); **`NexusCarouselRender`** skips `reInit` breakpoints until the same guard passes. |
| List reorder + spacing | [`ListItemLabelField.tsx`](../../src/components/puck/fields/ListItemLabelField.tsx), [`listItemLabels.ts`](../../src/components/puck/lib/listItemLabels.ts), [`NexusList.tsx`](../../src/components/puck/blocks/content/NexusList.tsx), [`globals.css`](../../src/app/globals.css) | **List Items** uses Puck native `array` field (same chrome as Carousel slides). `label` drives the collapsed row (`Item N`, like `Slide N`); `text` is canvas body copy. `ensureListItemLabels` on load/insert mirrors `ensureCarouselSlideLabels`. Vertical margins use block shell Spacing (List Position chapter removed) |

---

## 18. Carousel Slot-Only & Strip Edit UX (Phase 10)

| Change | Files | Detail |
|--------|-------|--------|
| Carousel schema | [`NexusCarousel.tsx`](../../src/components/puck/blocks/content/NexusCarousel.tsx) | Slot-only slides: `{ label, content }` — same composition model as Tabs; sidebar image/title/caption/link fields removed |
| Carousel render | [`NexusCarouselRender.tsx`](../../src/components/puck/blocks/content/NexusCarouselRender.tsx) | Edit + published: Embla carousel with slot body per slide; prev/next + dots when enabled |
| Tabs strip edit | [`NexusTabsRender.tsx`](../../src/components/puck/blocks/content/NexusTabsRender.tsx) | Edit mode unified with interactive: tab strip + one visible panel (no stacked panels) |
| Strip editor CSS | [`globals.css`](../../src/app/globals.css), [`puck-editor.css`](../../src/app/puck-editor.css) | `.nexus-strip-editor__panel`, `.nexus-carousel__strip`; removed stacked `.nexus-*--edit` layout rules |
| Legacy migration | [`puckDataTree.ts`](../../src/components/puck/lib/puckDataTree.ts), [`client.tsx`](../../src/app/[...puckPath]/client.tsx) | `normalizeCarouselSlides()` maps `title` → `label`, prepends `NexusImage` when legacy `image` URL exists |

**Edit workflow:** Use carousel arrows/dots (or swipe in interactive mode) to switch slides/tabs. Drag any Puck blocks into the visible slide/tab slot. Tabs still use a label strip in edit mode; carousel uses native Embla navigation.

---

## 19. Strip Portal, Slug Validation & Shadcn Selects (Phase 11)

| Fix | Files | Detail |
|-----|-------|--------|
| Tabs/Carousel strip clicks | [`usePuckOverlayPortal.ts`](../../src/components/puck/lib/usePuckOverlayPortal.ts), [`stripEditorState.ts`](../../src/components/puck/lib/stripEditorState.ts), [`NexusTabsRender.tsx`](../../src/components/puck/blocks/content/NexusTabsRender.tsx), [`NexusCarouselRender.tsx`](../../src/components/puck/blocks/content/NexusCarouselRender.tsx) | `registerOverlayPortal()` on strip/control containers; active index via module Map (`useStripActiveIndex`), not live `replace` dispatch; carousel edit mode mounts all slide slots in Embla with prev/next + dots navigation |
| Page slug validation | [`/api/pages/paths`](../../src/app/api/pages/paths/route.ts), [`pageSlugValidation.ts`](../../src/components/puck/lib/pageSlugValidation.ts), [`PageSettingsFieldGroup.tsx`](../../src/components/puck/fields/PageSettingsFieldGroup.tsx), [`PuckEditorShell.tsx`](../../src/app/[...puckPath]/PuckEditorShell.tsx), [`NewPageForm.tsx`](../../src/app/pages/NewPageForm.tsx) | Debounced slug field; duplicate/paste guard; publish blocked when invalid; API 409 on conflicting upsert |
| Shadcn selects | [`puck-editor.css`](../../src/app/puck-editor.css), [`PuckSelectField.tsx`](../../src/components/puck/fields/PuckSelectField.tsx), [`PuckEditorShell.tsx`](../../src/app/[...puckPath]/PuckEditorShell.tsx) | Removed tiled triangle `background-image` from Shadcn triggers; global `fieldTypes.select` override routes all Puck native selects through `PuckSelectField` |

**Root cause (selects):** `.nexus-puck-select` reused native `<select>` chevron CSS on Shadcn `SelectTrigger`, tiling a 12px SVG across the full control.

**Root cause (strip):** Puck `DraggableComponent` swallows clicks unless the target is inside a `registerOverlayPortal` element.

**Regression fix (Phase 11 follow-up):** Per-click `replace` to persist `editorActiveIndex` caused `getItemById` errors and canvas remounts that broke DnD and ActionBar overlays. Index persistence uses `stripEditorState` only; hidden `editorActiveIndex` field remains for optional publish-time sync.

| Fix | Files | Detail |
|-----|-------|--------|
| Image aspect frame | [`aspect-ratio.tsx`](../../src/components/ui/aspect-ratio.tsx) | Use CSS `aspectRatio` instead of fragile Tailwind `aspect-(--ratio)` so Image blocks render with non-zero height |

---

## 20. Carousel Edit Navigation, Dimension Fields & Sidebar Layout (Phase 12)

| Fix | Files | Detail |
|-----|-------|--------|
| Carousel edit navigation | [`NexusCarouselRender.tsx`](../../src/components/puck/blocks/content/NexusCarouselRender.tsx), [`carouselEditSwipeLogic.ts`](../../src/components/puck/lib/carouselEditSwipeLogic.ts), [`useCarouselEditSwipe.ts`](../../src/components/puck/lib/useCarouselEditSwipe.ts), [`puck-editor.css`](../../src/app/puck-editor.css) | Edit swipe: Embla `watchDrag` + animated `scrollTo` for single-slide and multi-slide overflow. Embla drag is blocked when the pointer starts on nested Puck blocks so canvas drafting still works (no viewport `disableDrag` portal). Pointer flick fallback complements Embla on static-fit and blocked surfaces. Arrows/dots/sidebar use the same animated scroll. Embla `loop` stays **off** in edit. |
| Carousel autoplay pause | [`NexusCarouselRender.tsx`](../../src/components/puck/blocks/content/NexusCarouselRender.tsx), [`globals.css`](../../src/app/globals.css) | When **Autoplay** is **On** and the carousel can paginate (interactive/published, ≥2 slides), a frosted **Pause** / **Play** toggle appears top-right (`.nexus-carousel__autoplay-toggle`). Pause is viewer-only React state — not saved to Puck props; resets when autoplay is turned off in the sidebar. Hidden in Edit layout mode. Visible even when arrows and dots are hidden. |
| Carousel edit height parity | [`NexusCarouselRender.tsx`](../../src/components/puck/blocks/content/NexusCarouselRender.tsx), [`globals.css`](../../src/app/globals.css), [`puck-editor.css`](../../src/app/puck-editor.css) | Default **Min Slide Height** **auto**; auto mode uses `CAROUSEL_AUTO_MIN_HEIGHT_PX` (240px) floor. Fixed presets use `nexus-carousel--fixed-height` + `--nexus-carousel-height`. **Max Slide Height** (default **auto**) always caps rendered height via `--nexus-carousel-max-height` / `nexus-carousel--max-height`; when min fixed exceeds max, max wins. Edit `--nexus-carousel-edit-height` sync respects max cap. |
| Carousel height & radius | [`CarouselDimensionFields.tsx`](../../src/components/puck/fields/CarouselDimensionFields.tsx), [`CustomDimensionInput.tsx`](../../src/components/puck/fields/CustomDimensionInput.tsx), [`NexusCarousel.tsx`](../../src/components/puck/blocks/content/NexusCarousel.tsx) | **Min Slide Height** + **Max Slide Height** preset selects with **Custom** (carousel custom clamp **0–2000px**, not spacing’s 200px cap). Corner radius unchanged. Custom inputs render inline under presets (batched `carouselSize` object field). |
| Spacing custom row height | [`SpacingFieldGroup.tsx`](../../src/components/puck/fields/SpacingFieldGroup.tsx), [`puck-editor.css`](../../src/app/puck-editor.css) | Custom numeric + unit row matches 42px preset select height (`align-items: stretch`, explicit `min-height`) |
| Sidebar min-width | [`puck-editor.css`](../../src/app/puck-editor.css) | `@media (min-width: 1024px)` — left sidebar `min-width: 280px`, right sidebar `min-width: 320px` |

---

## 21. Sidebar Group Defaults & Shadcn Switches (Phase 14)

**Related:** [puck_editor_performance.md](./puck_editor_performance.md)

### Collapsible groups — all closed by default

| Group | File | Default |
|-------|------|---------|
| Spacing (all blocks) | `SpacingFieldGroup.tsx` | Closed |
| Island (all blocks) | `IslandFieldGroup.tsx` | Closed |
| Page Settings (root) | `PageSettingsFieldGroup.tsx` | Closed |
| Layout (root) | `PageLayoutFieldGroup.tsx` | Closed |
| Background (root) | `PageBackgroundFieldGroup.tsx` | Closed |
| Drawer categories | `config.tsx` | `defaultExpanded: false` on layout, content, news, user |

[`FieldChapter.tsx`](../../src/components/puck/fields/FieldChapter.tsx) defaults `defaultOpen = false`. Block-level fields (align, size, content) remain flat in the sidebar — not wrapped in chapters.

### Binary toggles → Shadcn Switch

| Piece | File | Role |
|-------|------|------|
| Switch primitive | [`switch.tsx`](../../src/components/ui/switch.tsx) | Shadcn / Base UI switch |
| Switch row | [`PuckSwitchField.tsx`](../../src/components/puck/fields/PuckSwitchField.tsx) | Label + switch row (Island); inline switch when Puck supplies label |
| Toggle detection | [`binaryToggleFields.ts`](../../src/components/puck/lib/binaryToggleFields.ts) | `isBinaryToggleField()` — values ⊆ `{yes, no, on, off}` |
| Radio override | [`puckEditorOverrides.tsx`](../../src/components/puck/puckEditorOverrides.tsx) | `fieldTypes.radio` → `PuckSwitchField` with `showLabel={true}` (no Puck `Label` wrapper) for binary toggles; `SegmentedControl` + `Label` for multi-option |
| Styles | [`puck-editor.css`](../../src/app/puck-editor.css) | `.nexus-switch-row` — label left, switch right, `flex-wrap: nowrap` |

**Auto-switch fields** (via radio override): `showLine`, `allowMultiple`, `fullWidth`, `required`, `hoverEffect`, carousel `autoplay` / `showArrows` / `showDots`, video `autoplay` / `controls`.

**Stay segmented radio:** alignment, heading level, button size, list type, item spacing, tabs size, avatar size/shape, borders (none/thin), icon position, layout horizontal/vertical.

**Island enable:** explicit `PuckSwitchField` labeled **Island mode** (replaces Off/On segmented control).

### Settings inventory (reference)

All 18 shell-wrapped blocks share **Spacing** + **Island** chapters. **PageRoot** adds **Page Settings**, **Layout**, **Background**. Per-block flat fields are documented in [puck_editor.md](./puck_editor.md) §2 registry; use that file when adding new blocks or grouping fields in a future phase.

---

## 22. Carousel Sidebar UX (Phase 15)

| Fix | Files | Detail |
|-----|-------|--------|
| Preset select labels | [`PuckSelectField.tsx`](../../src/components/puck/fields/PuckSelectField.tsx) | Trigger shows option **label** (e.g. “Medium”), not raw stored value (`var(--radius-md)`) |
| Custom dimension rule | [`CustomDimensionInput.tsx`](../../src/components/puck/fields/CustomDimensionInput.tsx), [`CarouselDimensionFields.tsx`](../../src/components/puck/fields/CarouselDimensionFields.tsx), [`SpacingFieldGroup.tsx`](../../src/components/puck/fields/SpacingFieldGroup.tsx) | Any “Custom” preset uses **number input + unit select** (`px` / `rem` / `em`; spacing also `%`). Custom rows stay mounted, toggled with `hidden` — no `resolveFields` |
| Switch row layout | [`puckEditorOverrides.tsx`](../../src/components/puck/puckEditorOverrides.tsx), [`puck-editor.css`](../../src/app/puck-editor.css) | Binary toggles render as full-width settings rows (label left, switch right) |
| Strip sync on array edit | [`StripArrayLabelField.tsx`](../../src/components/puck/fields/StripArrayLabelField.tsx), [`usePuckArrayOpenStripSync.ts`](../../src/components/puck/lib/usePuckArrayOpenStripSync.ts), [`NexusCarousel.tsx`](../../src/components/puck/blocks/content/NexusCarousel.tsx), [`NexusTabs.tsx`](../../src/components/puck/blocks/content/NexusTabs.tsx) | Expanding a slide/tab row in the sidebar updates canvas index via `ui.arrayState.openId` + `setStripActiveIndex`; label focus uses the same path (no Puck `replace` dispatch) |

### Custom dimension convention (mandatory)

When a sidebar field offers a **Custom** preset:

1. Use [`CustomDimensionInput`](../../src/components/puck/fields/CustomDimensionInput.tsx) — never a single free-text CSS box.
2. Keep the custom row **mounted**; hide with the `hidden` attribute when the preset is not `custom` (avoids Puck field-tree remounts).
3. Batch object-field patches (carousel `carouselSize`) instead of `resolveFields` or `setData` for custom visibility.

---

## 23. Carousel Multi-Slide, Overlay Sync & Island Toggle Fixes (Phase 16)

| Fix | Files | Detail |
|-----|-------|--------|
| Slides per view | [`NexusCarousel.tsx`](../../src/components/puck/blocks/content/NexusCarousel.tsx), [`NexusCarouselRender.tsx`](../../src/components/puck/blocks/content/NexusCarouselRender.tsx), [`carouselPagination.ts`](../../src/components/puck/lib/carouselPagination.ts), [`carouselEngine.ts`](../../src/components/puck/lib/carouselEngine.ts), [`puck-editor.css`](../../src/app/puck-editor.css), [`globals.css`](../../src/app/globals.css) | **Slides Visible** applies in edit and interactive modes (2/3/auto). **spv-1** (and **auto** when container resolves to 1 visible slide) use `nexus-carousel--edit-single-slide`: Embla scrolls the full-width track with animated `scrollTo`; inactive slides stay off-screen via pointer-events only. When every slide fits (`nexus-carousel--edit-static-fit`), CSS-pinned track + pointer flick. When slides overflow, edit dots/arrows/swipe use interactive **page snaps**. **Overflow:** clip on edit root + Embla viewport only. |
| Auto slide labels | [`CarouselSlideLabelField.tsx`](../../src/components/puck/fields/CarouselSlideLabelField.tsx), [`carouselSlideLabels.ts`](../../src/components/puck/lib/carouselSlideLabels.ts), [`NexusCarousel.tsx`](../../src/components/puck/blocks/content/NexusCarousel.tsx) | New slides default to `Slide N`; labels stay **editable** in the sidebar. `ensureCarouselSlideLabels` fills empty labels on load/insert only (reorder preserves custom names). Default carousel ships with **3** empty slides. |
| Selection overlay height | [`puck-editor.css`](../../src/app/puck-editor.css), [`NexusCarouselRender.tsx`](../../src/components/puck/blocks/content/NexusCarouselRender.tsx) | **Multi-slide edit:** **`nexus-carousel--equal-row-height`** — CSS flex `align-items: stretch` (dynamic equal cards) with **`--nexus-carousel-edit-min-height`** floor (`resolveCarouselEditSlideFloorPx`, **240px** auto min + 16:9 at slide width) so empty slides stay droppable. **Single-slide edit:** **`nexus-carousel--per-slide-height-sync`** on the active slide only. |
| Slides per view CSS | [`globals.css`](../../src/app/globals.css) | Root classes `nexus-carousel--spv-1|2|3|auto` set `flex-basis` with loop-safe spacing (`padding-left` + negative track margin + `width: calc(100% + gap)` so the row fills the viewport — not flex `gap`, which breaks at the loop seam). **`spv-auto` uses `@container nexus-carousel` queries** (not viewport `@media`) so island max-width and padding match Embla loop/pagination math. `nexus-carousel--single-frame` (1 visible) vs `nexus-carousel--multi-slide` (2+ visible) — multi-slide renders **separate bordered cards** per slide, not one outer panel. Nested video blocks and images with carousel fill use `nexus-carousel__slide-media-fill` to cover the slide card in edit and interactive modes. |
| Scroll step | [`NexusCarousel.tsx`](../../src/components/puck/blocks/content/NexusCarousel.tsx), [`carouselPagination.ts`](../../src/components/puck/lib/carouselPagination.ts) | **Scroll Step** sidebar field: advance 1 / 2 / 3 slides or **Full page** — **interactive/published only**. Edit mode always uses step **1**. Page plan math lives in `carouselPagination.ts` (`resolveCarouselPagePlan`). When the standard grid misses the final slide **or** the final slide is not a standard leading snap, navigation **alternates standard and remainder cycles** — e.g. 7 / spv 2 / step 2 → standard `1–2, 3–4, 5–6`, remainder `7–1, 2–3, 4–5, 6–7`; 7 / spv 3 / step 2 → standard `1–2–3, 3–4–5, 5–6–7`, remainder `7–1–2, 2–3–4, 4–5–6, 6–7–1`, then back to standard. |
| Pagination dots | [`NexusCarouselRender.tsx`](../../src/components/puck/blocks/content/NexusCarouselRender.tsx), [`useCarouselNavController.ts`](../../src/components/puck/lib/useCarouselNavController.ts), [`carouselNavController.ts`](../../src/components/puck/lib/carouselNavController.ts), [`carouselPagination.ts`](../../src/components/puck/lib/carouselPagination.ts), [`carouselEngine.ts`](../../src/components/puck/lib/carouselEngine.ts), [`globals.css`](../../src/app/globals.css) | Interactive nav centralized in **`useCarouselNavController`**: `goNext` / `goPrev` / `goToDot` / `syncFromSnap`. Nav mode `nativeStep1` (step 1) uses Embla `scrollNext`/`scrollPrev`; `pagePlan` (step 2+) uses `scrollEngineToSnap` with arrow/dot loop direction. Dot count = active cycle page count. Loop/autoplay require `canPaginate`. Arrows/dots hidden on published/interactive view when `canPaginate` is false (all slides fit). Edit mode keeps `count > 1` navigation for strip selection. Dual-cycle wrap handled in `carouselNavController.ts`. |
| Anti-flicker sizing | [`NexusCarouselRender.tsx`](../../src/components/puck/blocks/content/NexusCarouselRender.tsx), [`carouselMediaFill.ts`](../../src/components/puck/lib/carouselMediaFill.ts), [`puck-editor.css`](../../src/app/puck-editor.css), [`globals.css`](../../src/app/globals.css), [`selectPuckComponentById.ts`](../../src/components/puck/lib/selectPuckComponentById.ts) | **Multi-slide edit + interactive:** dynamic equal row via CSS flex stretch (`equal-row-height`); no `--nexus-carousel-row-height` lock. **Single-slide edit:** per-slide `--nexus-carousel-slide-height`. **Single-visible interactive/phone:** active-slide row sync only. **Carousel settings** button + shell click select the carousel block programmatically. |
| Select option labels | [`fieldOptionLabels.ts`](../../src/components/puck/lib/fieldOptionLabels.ts) | Shared human-readable labels with resolved sizes (e.g. “Medium (8px)”, “Small (32px height)”) for carousel, button, tabs, section padding, island, shadows, layout gaps. Carousel **Slides Visible** uses short labels: “Auto (responsive)”, “1 slide”, “2 slides”, “3 slides”. |
| Island user override | [`spacingFields.tsx`](../../src/components/puck/lib/spacingFields.tsx), [`applyIslandDefaultsOnInsert.ts`](../../src/components/puck/lib/applyIslandDefaultsOnInsert.ts), [`IslandFieldGroup.tsx`](../../src/components/puck/fields/IslandFieldGroup.tsx), [`puckDataTree.ts`](../../src/components/puck/lib/puckDataTree.ts) | `islandUserOverride: true` when user toggles island. **New root-level inserts** (any block type, including Carousel) get **SM (8px)** top/bottom margin via `ROOT_BLOCK_VERTICAL_MARGIN` (`sm` → `--spacing-sm`); palette `defaultProps.spacing` seeds the same. Island-default types also auto-enable island. `pendingInsertIds` + `resolveInsertDefaultsProps()` in `withBlockShell` `resolveData` retries margin seeding after Puck async `resolveData` → `replace` **without** a global `setData` dispatch (avoids resetting Embla/slot state). Nested inserts under an active island/slot shell reset margins to **None**. Saved pages and the welcome section are **not** auto-margin-healed on load. Blocks inserted into `NexusCarousel` / `NexusTabs` slots disable island on the child unless user override. `normalizeNestedIslands()` strips redundant child islands under slot shells and parent islands, but respects `islandUserOverride`. Island toggle stays **enabled** in carousel/tab slides with an optional hint — only nested-under-active-island remains disabled. |

### Slides visible presets

Root class on `.nexus-carousel` (see [`globals.css`](../../src/app/globals.css)):

| Preset | Class | Visible slides |
|--------|-------|----------------|
| `1` | `nexus-carousel--spv-1` | 1 (full width) |
| `2` | `nexus-carousel--spv-2` | 2 (`calc` flex-basis with gap) |
| `3` | `nexus-carousel--spv-3` | 3 |
| `auto` | `nexus-carousel--spv-auto` | 1 → 2 @ 640px carousel width → 3 @ 1024px (CSS container queries; aligned with `AUTO_SLIDES_PER_VIEW_BREAKPOINTS` in `carouselPagination.ts`) |

Auto-height carousels stretch visible slides to the **tallest slide** in the track (`align-items: stretch`) in **interactive/published** mode only. **Edit mode (multi-slide visible)** keeps each slide content-sized (`flex-start`).

### Scroll step presets

| Preset | Behavior |
|--------|----------|
| `1` | Advance one slide per tick via **`nativeStep1`** nav mode (`scrollNext`/`scrollPrev`) |
| `2` / `3` | Advance by the page plan — each arrow/autoplay tick moves to the next/previous page’s `leadingSnap` in the active cycle. When `hasDualCycle`, finishing the last page of one cycle switches to the other (standard ↔ remainder). |
| `page` | Advance by visible count (`1`/`2`/`3` for fixed presets; responsive 1→2→3 for `auto`) |

---

## 24. Grid Layout Editor Fixes (Phase 17)

| Fix | Files | Detail |
|-----|-------|--------|
| Inline shell bypass | [`config.tsx`](../../src/components/puck/config.tsx), [`spacingFields.tsx`](../../src/components/puck/lib/spacingFields.tsx) | `NexusGridItem` registers via `chapterOnlyBlock()` (no `withBlockShell`). `withBlockShell` returns early when `block.inline === true` so CSS grid `grid-column` / `grid-row` apply to direct grid children per [Puck multi-column docs](https://puckeditor.com/docs/integrating-puck/multi-column-layouts). |
| Slot render pattern | [`NexusGrid.tsx`](../../src/components/puck/blocks/layout/NexusGrid.tsx), [`NexusGridItem.tsx`](../../src/components/puck/blocks/layout/NexusGridItem.tsx), [`gridEditSizing.ts`](../../src/components/puck/lib/gridEditSizing.ts) | Grid container: `className="nexus-grid"` + `minEmptyHeight` in edit. Grid item edit: `.nexus-grid-item-shell` + `.nexus-grid-item__dropzone-shell` + flex-filled `nexus-grid-item__dropzone` (carousel-parity) — see [puck_canvas_drag_drop.md §2a](./puck_canvas_drag_drop.md#2a-grid-item-drop-targeting-carousel-parity-stock-puck). |
| Nested grid guard | [`NexusGridItem.tsx`](../../src/components/puck/blocks/layout/NexusGridItem.tsx) | `content` slot `disallow: ["NexusGridItem", "NexusGrid"]` — editors cannot place a second grid inside a grid cell (Grid → GridItem → Grid). Parent grid already `allow: ["NexusGridItem"]` only. |
| Grid item placement | [`puck_grid_item_zone_policy.md`](puck_grid_item_zone_policy.md), [`nexusGridItemZonePolicy.ts`](../../src/components/puck/lib/nexusGridItemZonePolicy.ts), layout blocks, [`NexusGridItemPlacementGuard.tsx`](../../src/components/puck/NexusGridItemPlacementGuard.tsx), [`NexusDraggableOutline.tsx`](../../src/components/puck/NexusDraggableOutline.tsx) | Grid Item only in `{gridId}:content` (parent `NexusGrid`): slot `disallow`, outline filter, root `onAction` revert. |
| Drop-zone affordances | [`puck-editor.css`](../../src/app/puck-editor.css) | `.nexus-grid` / `.nexus-grid-item` min-height + dashed outlines; grid item edit hides Puck append hitboxes and flex-fills the cell (240px empty floor, 120px in carousel slides). |
| Chapter prop migration | [`blockFieldChapters.tsx`](../../src/components/puck/lib/blockFieldChapters.tsx) | `ensureNestedChapterProps()` copies flat legacy keys (`columns`, `gap`, `spanCol`, `spanRow`) into nested chapter objects so pre-migration pages show values in the Layout chapter UI. Wired through `resolveData` on all chapter-wrapped blocks. |
| Layout chapter visibility | [`blockFieldChapterConfigs.tsx`](../../src/components/puck/lib/blockFieldChapterConfigs.tsx), [`FieldChapter.tsx`](../../src/components/puck/fields/FieldChapter.tsx), [`BlockFieldChapterGroup.tsx`](../../src/components/puck/fields/BlockFieldChapterGroup.tsx) | `defaultOpen: true` on `gridLayout` / `itemLayout` chapters; optional `defaultOpen` plumbed from chapter config to `FieldChapter`. |

---

## 25. Carousel + Grid Composite Layout Fixes (Phase 18)

| Fix | Files | Detail |
|-----|-------|--------|
| Composite fill guard | [`carouselMediaFill.ts`](../../src/components/puck/lib/carouselMediaFill.ts), [`NexusVideoRender.tsx`](../../src/components/puck/blocks/content/NexusVideoRender.tsx), [`NexusImageRender.tsx`](../../src/components/puck/blocks/content/NexusImageRender.tsx) | `isCompositeCarouselSlideContent()` suppresses `auto` fill-slide only when a **grid lives inside the same carousel slide** (not when the carousel block sits in a grid cell). Video in carousel-in-grid-item fills the slide card again. |
| Carousel in grid cell | [`NexusCarouselRender.tsx`](../../src/components/puck/blocks/content/NexusCarouselRender.tsx), [`globals.css`](../../src/app/globals.css), [`puck-editor.css`](../../src/app/puck-editor.css) | `nexus-carousel--in-grid-cell` skips edit-height sync (content-driven track, no 240px empty-slide floor). Grid-item canvas drop targets measure cell bounds, not the full slide card. |
| Fill-slide CSS scope | [`globals.css`](../../src/app/globals.css), [`puck-editor.css`](../../src/app/puck-editor.css), [`carouselMediaFill.ts`](../../src/components/puck/lib/carouselMediaFill.ts) | **Two-path model:** default fill media is **in-flow** — React sets inline `aspect-ratio` on the media frame; CSS keeps roots `position: relative`. **Stretch paths only** (`.nexus-carousel--fixed-height`, `.nexus-carousel--edit-height-sync`) switch to absolute cover. Removed duplicate edit/interactive override blocks and global absolute-fill defaults that fought each other. Edit occupied fill dropzones: `height: auto` (reverts to `100%` under `edit-height-sync`). |

---

## 25b. Unified Media Cover / Contain (Phase 18b)

| Change | Files | Detail |
|--------|-------|--------|
| Cover frame | [`CoverMediaFrame.tsx`](../../src/components/puck/fields/CoverMediaFrame.tsx), [`globals.css`](../../src/app/globals.css) | Shared overflow frame: `object-fit` for img/video; container-query iframe scaling for YouTube/Vimeo (replaces ineffective `object-fit` on iframes). |
| Embed aspect lock | [`embedMedia.ts`](../../src/components/puck/lib/embedMedia.ts), [`NexusVideoRender.tsx`](../../src/components/puck/blocks/content/NexusVideoRender.tsx) | YouTube/Vimeo URLs force 16:9 layout ratio regardless of sidebar aspect preset — prevents black letterboxing from aspect mismatch. |
| Media fit control | [`mediaFitMode.ts`](../../src/components/puck/lib/mediaFitMode.ts), [`NexusImage.tsx`](../../src/components/puck/blocks/content/NexusImage.tsx), [`NexusVideo.tsx`](../../src/components/puck/blocks/content/NexusVideo.tsx) | Sidebar **Media Fit**: Cover (default, crop to fill) vs Contain (show full media with themed letterbox). |
| Video carousel fill | [`NexusVideo.tsx`](../../src/components/puck/blocks/content/NexusVideo.tsx), [`blockFieldChapterConfigs.tsx`](../../src/components/puck/lib/blockFieldChapterConfigs.tsx) | Video blocks gain **In Carousel Slides** (`auto` / `fill` / `natural`) — parity with Image. |
| Carousel shell flush | [`globals.css`](../../src/app/globals.css), [`NexusCarouselRender.tsx`](../../src/components/puck/blocks/content/NexusCarouselRender.tsx) | **`nexus-carousel--static-fit`** / **`nexus-carousel--no-loop`** (flex `gap` + calc flex-basis) flush track to content edges when not looping. **`nexus-carousel--edit-height-sync`** / **`nexus-carousel--all-fill-only`** toggle fill sizing: cover full synced slide vs per-slide aspect ratio. |
| Media frame flush | [`NexusVideoRender.tsx`](../../src/components/puck/blocks/content/NexusVideoRender.tsx), [`NexusImageRender.tsx`](../../src/components/puck/blocks/content/NexusImageRender.tsx), [`globals.css`](../../src/app/globals.css) | `CoverMediaFrame` uses `absolute inset-0` inside aspect-ratio frames (fixes muted gutter between border and thumbnail). Full-width video drops root vertical padding. |
| Tests | [`embedMedia.test.ts`](../../tests/puck/lib/embedMedia.test.ts) | `npm run test:embed-media` — URL parsing, embed aspect lock, fit normalization. |
| Grid flush in carousel | [`NexusGrid.tsx`](../../src/components/puck/blocks/layout/NexusGrid.tsx), [`globals.css`](../../src/app/globals.css), [`puck-editor.css`](../../src/app/puck-editor.css) | Removed outer vertical padding from grid host; zero padding on `.nexus-grid` / `.nexus-grid-item` inside `.nexus-carousel__slide`. |
| Grid height feedback loop | [`globals.css`](../../src/app/globals.css), [`NexusCarouselRender.tsx`](../../src/components/puck/blocks/content/NexusCarouselRender.tsx), [`NexusGridItem.tsx`](../../src/components/puck/blocks/layout/NexusGridItem.tsx), [`gridEditSizing.ts`](../../src/components/puck/lib/gridEditSizing.ts) | Carousel flex/`height:100%` rules scoped away from nested grid hosts; `measureGridLayoutHeight()` intrinsic sizing. Grid items **inside carousel slides** use 120px edit floor (not 240px) to avoid stretch loops; top-level grid cells use carousel-parity shells + 240px floor for stock Puck drops — [§2a](./puck_canvas_drag_drop.md#2a-grid-item-drop-targeting-carousel-parity-stock-puck). |
| Grid + auto carousel | [`NexusCarouselRender.tsx`](../../src/components/puck/blocks/content/NexusCarouselRender.tsx), [`NexusGrid.tsx`](../../src/components/puck/blocks/layout/NexusGrid.tsx), [`NexusGridRender.tsx`](../../src/components/puck/blocks/layout/NexusGridRender.tsx), [`gridCellPlacement.ts`](../../src/components/puck/lib/gridCellPlacement.ts), [`gridEditSizing.ts`](../../src/components/puck/lib/gridEditSizing.ts), [`applyIslandDefaultsOnInsert.ts`](../../src/components/puck/lib/applyIslandDefaultsOnInsert.ts), [`globals.css`](../../src/app/globals.css), [`puck-editor.css`](../../src/app/puck-editor.css) | When a slide contains `.nexus-grid`, carousel gets `nexus-carousel--has-grid-slide`. **Grid cell inserts** (Image, Video, etc.) reset root **SM (8px)** vertical margins to **None** via `NESTED_MARGIN_RESET_HOST_TYPES` (`NexusGrid` + carousel/tab shells). **Nested carousels** blocked — slide slots `disallow: NexusCarousel`. **Explicit row-major placement** via `resolveGridCellPlacements()` (array order). **Carousel grids force `spanRow: 1` at render** (`resolveCarouselAwareGridCellSpanRow`) so legacy `spanRow: "2"` data does not create phantom row tracks. **Grid slides skip `--nexus-carousel-slide-height` sync** — pure content height (`min-height: 0`); non-grid slides keep per-slide edit floors. **Embla viewport** stays `overflow: hidden`. **Carousel grid gap:** default MD → **8px**. Stable cell React keys prefer nested block ids. |

---

## 26. Mobile Editor & Puck 0.21 (Phase 19)

| Change | Files | Detail |
|--------|-------|--------|
| Package upgrade | [`package.json`](../../package.json), all Puck imports | `@measured/puck` 0.20.2 → `@puckeditor/core` 0.21.3; CSS import `@puckeditor/core/puck.css` |
| Plugin rail | [`PuckEditorShell.tsx`](../../src/app/[...puckPath]/PuckEditorShell.tsx) | Default core plugins (`blocks`, `outline`, `fields`) — no `legacySideBarPlugin`; mobile shows bottom nav (Blocks / Outline / Fields) per [Puck 0.21 plugin rail](https://puckeditor.com/docs/extending-puck/plugins) |
| AI tab | — | **Not enabled** — optional `@puckeditor/plugin-ai` requires separate setup |
| Move trigger guard | [`applyIslandDefaultsOnInsert.ts`](../../src/components/puck/lib/applyIslandDefaultsOnInsert.ts), [`NexusDraggableOutline.tsx`](../../src/components/puck/NexusDraggableOutline.tsx) | Puck 0.21 `resolveData` on `move` enables island + root margins when eligible blocks (Heading, Text, Quote, List, etc.) leave a section/slot shell for the root canvas; disables island when nested. Outline commits call `resolveDataById(id, "move")` after dispatch so move rules run (canvas `moveComponent` already did this). |
| Header compaction | [`puckEditorOverrides.tsx`](../../src/components/puck/puckEditorOverrides.tsx), [`NexusPublishButton.tsx`](../../src/components/puck/NexusPublishButton.tsx), [`EditorModeToggle.tsx`](../../src/components/puck/EditorModeToggle.tsx), [`puck-editor.css`](../../src/app/puck-editor.css), [`globals.css`](../../src/app/globals.css) | Custom `NexusPublishButton` (lucide Globe) replaces Puck default publish control — icon-only ≤1023px; `PuckEditorErrorProvider` also supplies `onPublish` to header overrides |
| Mobile chrome CSS | [`puck-editor.css`](../../src/app/puck-editor.css) | Safe-area padding on bottom plugin rail/panel; **36px** nav tab targets at ≤900px (**28px** at ≤480px via `--nexus-compact-nav-*` tokens); responsive canvas viewport island + header chips; **forces Puck mobile stack grid** (overrides Puck core `min-width: 638px` desktop grid); **compact header two-row stack** — title/path island on row 1, undo · publish · theme toolbar always inline on row 2 (no absolute MenuBar dropdown under the island); dark-theme overrides for Fields plugin + nav active/hover states |

**Breakpoints:** Nexus compact editor at **900px** (`PUCK_COMPACT_EDITOR_MAX_WIDTH`); narrow-desktop band **901–1023px** (`PUCK_NARROW_DESKTOP_MAX_WIDTH`). Puck core defaults to 638px — Nexus CSS overrides extend bottom-rail layout to 900px.

---

## 26b. Carousel Auto Tablet Tier (Phase 19)

| Change | Files | Detail |
|--------|-------|--------|
| Tablet breakpoint | [`carouselPagination.ts`](../../src/components/puck/lib/carouselPagination.ts) | Exported `AUTO_SLIDES_PER_VIEW_BREAKPOINTS`: tablet **640px** (was 768), desktop 1024px |
| Container CSS | [`globals.css`](../../src/app/globals.css) | `@container nexus-carousel (min-width: 640px)` for 2-slide tier |
| Edit single-slide gate | [`NexusCarouselRender.tsx`](../../src/components/puck/blocks/content/NexusCarouselRender.tsx) | `singleSlideEditView` for `auto` uses `resolveVisibleSlideCountAtWidth(...) === 1` instead of hardcoded `< 768` |
| Phone single-slide height | [`NexusCarouselRender.tsx`](../../src/components/puck/blocks/content/NexusCarouselRender.tsx), [`carouselMediaFill.ts`](../../src/components/puck/lib/carouselMediaFill.ts), [`puck-editor.css`](../../src/app/puck-editor.css), [`globals.css`](../../src/app/globals.css) | **`--nexus-carousel-row-height`** (single-visible row sync) and **`--nexus-carousel-slide-height`** (per-slide edit sync). **Multi-slide edit + interactive:** CSS flex stretch (`equal-row-height`, content-adaptive). **Single-slide edit:** per-slide sync on active slide. **Interactive phone:** active-slide row sync. Grid-in-slide carousels skip row sync in published mode (feedback-loop guard). |
| Tests | [`carouselPagination.test.ts`](../../tests/puck/lib/carouselPagination.test.ts) | Auto tier coverage at 500 / 640 / 720 / 1024px |

**Rationale:** Page gutter shrinks carousel containers on 768px-wide tablets below the old 768px tier; 640px aligns tablet containers (~720px after gutters) with 2 visible slides.

---

## 27. Outline Drag Reorder, Auto Viewport & Instrument Island (Phase 20)

| Feature | Files | Detail |
|---------|-------|--------|
| Outline drag reorder | [`nexusOutlinePlugin.tsx`](../../src/components/puck/nexusOutlinePlugin.tsx), [`NexusDraggableOutline.tsx`](../../src/components/puck/NexusDraggableOutline.tsx), [`NexusOutlineDragContext.tsx`](../../src/components/puck/NexusOutlineDragContext.tsx), [`useOutlineRowPointerDrag.ts`](../../src/components/puck/lib/useOutlineRowPointerDrag.ts), [`outlineTreeModel.ts`](../../src/components/puck/lib/outlineTreeModel.ts), [`outlineSortableLogic.ts`](../../src/components/puck/lib/outlineSortableLogic.ts), [`puck-editor.css`](../../src/app/puck-editor.css) | Pointer-based full-row drag (touch + mouse). Multi-expand outline tree (`expandedIds` set) keeps several containers open at once; tap toggles expand without collapsing siblings. Horizontal swipe while dragging: **left** outdents nested blocks to the parent zone (before/after the escaped container based on pointer proximity to the container group's top/bottom edge); **right** nests into a hovered container's primary slot. Insertion slots below expanded child zones; root bottom pad for append-to-end drops. Outline commits call `resolveDataById(id, "move")` for island defaults. |
| Auto viewport sync | [`PuckAutoViewportSync.tsx`](../../src/components/puck/PuckAutoViewportSync.tsx), [`resolveAutoViewport.ts`](../../src/components/puck/lib/resolveAutoViewport.ts), [`puckCanvasSelectors.ts`](../../src/components/puck/lib/puckCanvasSelectors.ts), [`puckEditorOverrides.tsx`](../../src/components/puck/puckEditorOverrides.tsx) | `NEXUS_EDITOR_VIEWPORTS` (360 / 768 / 1280 / 100%); debounced sync on **window resize**, **`ResizeObserver`** on `PuckCanvas-inner`, **layout class** mutations (sidebar open/close), and `grid-template-columns` **transitionend**; measures `clientWidth` (excludes scrollbar gutter); toggles `data-nexus-viewport-full-width` on `.Puck` for full-width root CSS; skipped during sidebar drag. **Must mount via `overrides.puck`**. |
| Sidebar resize stability | [`NexusSidebarResizeStabilizer.tsx`](../../src/components/puck/NexusSidebarResizeStabilizer.tsx), [`InfiniteGrid.tsx`](../../src/components/background/InfiniteGrid.tsx), [`puck-editor.css`](../../src/app/puck-editor.css) | Toggles `data-nexus-sidebar-resizing` during Puck **horizontal** sidebar drag only; **freezes `#puck-canvas-root` height/transform** via rAF + `!important` (prevents Puck auto-zoom `NaN` height + flicker); compact vertical panel drag does **not** freeze canvas; dev build also sanitizes `setZoomConfig`; contained preview grid debounces canvas resync (~140ms) |
| Mobile canvas chrome | [`usePuckMobileEditorChrome.ts`](../../src/components/puck/usePuckMobileEditorChrome.ts), [`PuckEditorShell.tsx`](../../src/app/[...puckPath]/PuckEditorShell.tsx) | `_experimentalFullScreenCanvas={true}` when width ≤900px — collapsible viewport island; Puck remounts on compact/desktop crossing |
| Unified editor header | [`NexusPuckHeaderShell.tsx`](../../src/components/puck/NexusPuckHeaderShell.tsx), [`puckEditorOverrides.tsx`](../../src/components/puck/puckEditorOverrides.tsx), [`puck-editor.css`](../../src/app/puck-editor.css), [`puck_plugin_panel_rhythm.md`](puck_plugin_panel_rhythm.md) | Puck `overrides.header` wraps toolbar in `SiteHeaderBar`-style glass panel. Desktop: Nexus wordmark link (no logo mark) + sidebar toggle buttons + centered title/slug + MenuBar/actions on one flex row (`align-items: center`); **Puck `PuckHeader-toggle` must stay visible on desktop** (left/right sidebar hide buttons). Mobile (≤900px): compact single row — wordmark left, undo/redo + theme + All Pages + Interactive + Publish right; page title/slug and sidebar toggles hidden; `MenuBar` forced `position: static` (no absolute dropdown row). **Plugin panel rhythm:** Blocks, Outline, and Fields share `--nexus-plugin-*` tokens (Outline is canonical) — same font (`--nexus-plugin-font-family`), leaf-row padding/margins, section headers, and dark-mode label color (`azure-04`); see [`puck_plugin_panel_rhythm.md`](puck_plugin_panel_rhythm.md). Theme switch uses square-rounded corners globally (`globals.css`). |
| Responsive canvas overlap fix | [`usePuckMobileEditorChrome.ts`](../../src/components/puck/usePuckMobileEditorChrome.ts), [`puck-editor.css`](../../src/app/puck-editor.css), [`resolveAutoViewport.ts`](../../src/components/puck/lib/resolveAutoViewport.ts), [`puckCanvasSelectors.ts`](../../src/components/puck/lib/puckCanvasSelectors.ts), [`NexusEditorScrollportGrid.tsx`](../../src/components/puck/NexusEditorScrollportGrid.tsx) | Three-tier layout: compact ≤900px, narrow desktop 901–1023px, full desktop ≥1024px. Desktop ≥901px: unified `grid-template-columns` via `--nexus-grid-left-width` / `--nexus-grid-right-width` (0 when sidebar hidden, Puck var when visible) + literal `minmax(0, 1fr)` editor track; hidden sidebars + resize handles forced `width: 0`. Canvas shell `width: 100%` + scrollport grid on shell; `PuckCanvas-inner` owns vertical scroll. |
| Desktop sidebar width clamp | [`sidebarLayoutLimits.ts`](../../src/components/puck/lib/sidebarLayoutLimits.ts), [`NexusSidebarWidthClamp.tsx`](../../src/components/puck/NexusSidebarWidthClamp.tsx), [`puck-editor.css`](../../src/app/puck-editor.css) | Four bands: compact ≤900; **tight** 901–960 (left 150–170 / right 190–220); narrow 961–1023 (180–200 / 220–260); desktop ≥1024 (280–320 / 320–400). Clamps live CSS vars during drag, sanitizes `puck-sidebar-widths` localStorage. Sidebar panels fill their grid tracks (`width: 100%`) — no element-level min/max that could be narrower than the track. |
| Compact panel vertical resize | [`NexusMobilePanelResizer.tsx`](../../src/components/puck/NexusMobilePanelResizer.tsx), [`mobilePanelDismissLogic.ts`](../../src/components/puck/lib/mobilePanelDismissLogic.ts), [`NexusMobilePanelCanvasStabilizer.tsx`](../../src/components/puck/NexusMobilePanelCanvasStabilizer.tsx), [`mobilePanelLayout.ts`](../../src/components/puck/lib/mobilePanelLayout.ts), [`mobileNavPanelGestureLogic.ts`](../../src/components/puck/lib/mobileNavPanelGestureLogic.ts), [`NexusMobileNavPanelGestures.tsx`](../../src/components/puck/NexusMobileNavPanelGestures.tsx), [`NexusMobilePanelOpenAnimation.tsx`](../../src/components/puck/NexusMobilePanelOpenAnimation.tsx), [`PuckAutoViewportSync.tsx`](../../src/components/puck/PuckAutoViewportSync.tsx), [`puck-editor.css`](../../src/app/puck-editor.css) | ≤900px: `--nexus-mobile-panel-height` replaces fixed 30%/55% rows; top-edge drag handle (160px min, `min(60vh, 480px)` max); **swipe-to-dismiss:** drag handle downward below min height — release at/below `min(120px, 35% start height)` dispatches `nexus-mobile-panel-close-request` → same close animation as nav single-tap; otherwise snaps back to 160px min. **~16px layout strip** (6px host padding + **4×42%** centered pill) with a **30px** transparent hit area (`top: -14px`, `bottom: 0` — no overlap into bottom nav tabs, `touch-action: none`); drag uses rAF-coalesced height writes (one layout pass per frame). **Performance (weak phones):** open/close/expand/collapse animate only registered `@property --nexus-mobile-panel-height` (**400ms**) — no `grid-template-rows` transition (avoids early `transitionend` snap); canvas transform-only freeze via `NexusMobilePanelCanvasStabilizer`; scrollport grid fixed backdrop on `PuckLayout-inner` (`mobileScrollportGridFreeze.ts`) — panel/canvas uncover it; bitmap metrics lock during panel ease; `PuckAutoViewportSync` pauses `ResizeObserver` during mutations. **Layout sync:** compact plugin sidebar shell binds directly to `--nexus-mobile-panel-height` (mirrored on `<html>`) with `overflow: clip` so panel background/dividers track open/close/resize — not just during drag; inner `FieldsPlugin` / scroll regions use `max-height: 100%`; close dispatches `leftSideBarVisible: false` on the frame after height settles. **Nav gestures:** double-tap active `NavItem-link` toggles max ↔ pre-expand; single-tap closes (**340ms** defer / **300ms** double-tap window). Bottom-rail tabs: `NavItem-link` fills `--nexus-compact-nav-rail-height`; icon/label use `pointer-events: none` so the whole tab (icon + label) is one hit target; document capture blocks Puck only on press (`touchstart`/`pointerdown`/`mousedown`), tap completion on the active link. Tests: `npm run test:mobile-nav-gestures`, `npm run test:mobile-panel-dismiss`. |
| Viewport instrument island | [`puck-editor.css`](../../src/app/puck-editor.css), [`canvasIslandStackSync.ts`](../../src/components/puck/lib/canvasIslandStackSync.ts), [`NexusEditorScrollportGrid.tsx`](../../src/components/puck/NexusEditorScrollportGrid.tsx), [`NexusViewportZoomEnhancer.tsx`](../../src/components/puck/NexusViewportZoomEnhancer.tsx), [`formatViewportZoomLabel.ts`](../../src/components/puck/lib/formatViewportZoomLabel.ts), [`NexusMobileViewportToggleIcon.tsx`](../../src/components/puck/NexusMobileViewportToggleIcon.tsx), [`NexusHistoryToolbar.tsx`](../../src/components/puck/NexusHistoryToolbar.tsx) | Desktop + mobile: native zoom `<select>` hidden; `NexusViewportZoomEnhancer` renders flat text picker (no SVG chevron artifact) with `formatViewportZoomLabel` fallback (`NN%` when Puck value mismatches options). **Desktop + compact:** collapsible viewport island — collapsed preset FAB (`NexusMobileViewportToggleIcon`), expanded glass pill with **X** close; zoom enhancer mounts only while expanded. Mobile collapsed FAB shows active preset icon. Expanded mobile pill: bottom-center. **Compact panel open/close:** `--nexus-mobile-panel-height` eases on `PuckLayout-inner`; sidebar height transition disabled during eases; FABs use shared `--nexus-canvas-island-stack-bottom` (`6px + height + min(4px, height)`) so close lands at `6px` without racing the panel; `data-nexus-panel-closing` keeps stack rules until `leftSideBarVisible` clears. `PuckCanvas-controls` uses `position: absolute; inset: 0` for correct bottom anchoring. **Mobile clip fix:** Puck 0.21 fullScreen tray still applies `translateX(42px)` + centered flex on `actionsInner` — Nexus resets slide-out transforms/padding, left-aligns presets (`justify-content: flex-start`), enables horizontal scroll inside the pill, clamps width with `min(100%, calc(100vw − safe-area − 16px))`, and uses `width: max-content` + `overflow: visible` on the expanded shell so the phone preset is fully tappable at 320–430px. |

---

## 28. Editor Layout Panel Islands (Phase 21)

| Surface | File | Detail |
|---------|------|--------|
| Panel tokens | [`puck-editor.css`](../../src/app/puck-editor.css) | `--nexus-editor-panel-gap: 4px`, `--nexus-editor-panel-radius: var(--radius-lg)`, subtle `color-mix` borders on `--puck-color-grey-09`, glass `--nexus-editor-panel-bg`, light shadow; dark theme uses remapped puck greys |
| Desktop ≥901px | same | `PuckLayout-inner` — transparent background, `4px` padding + grid `gap` so rounded corners read between zones. **Plugin rail** (`PuckLayout-nav`), **left/right sidebars**, **canvas** (`PuckCanvas`, not fullScreen) — bordered rounded panels with `backdrop-filter: blur(12px)`, `overflow: hidden`. Preview iframe (`PuckPreview-frame`) gets `var(--radius-md)` clip |
| Header gutter | same | `nexus-puck-header-shell` — horizontal inset matches panel gap; header bar restores `var(--radius-lg)` glass island (was full-bleed square) |
| Mobile ≤900px | same | Bottom **plugin rail** + visible **left plugin panel** — both use glass islands (`var(--radius-lg)`, `--nexus-compact-nav-island-inset-x` horizontal inset, `var(--color-border-default)` border, `var(--site-header-bar-shadow)`); canvas stays fullScreen (no outer panel chrome) |
| Sidebar motion | same | Desktop ≥901px: `grid-template-columns` ease (280ms) + fade/slide-in on visible left/right panels; compact ≤900px: `--nexus-mobile-panel-height` ease (400ms) + `NexusMobilePanelOpenAnimation` (0→persisted height); Blocks drawer categories (`ComponentList`) use grid `0fr→1fr` accordion with chevron rotation; transitions disabled during sidebar/panel drag (`data-nexus-sidebar-resizing`, `data-nexus-panel-resizing`) |
| Preview transparency | same, [`NexusEditorScrollportGrid.tsx`](../../src/components/puck/NexusEditorScrollportGrid.tsx), [`NexusCanvasWheelBridge.tsx`](../../src/components/puck/NexusCanvasWheelBridge.tsx), [`PuckIframeTheme.tsx`](../../src/components/puck/PuckIframeTheme.tsx), [`PageRoot.tsx`](../../src/components/puck/root/PageRoot.tsx), [`InfiniteGrid.tsx`](../../src/components/background/InfiniteGrid.tsx) | **Site-default grid** paints inside the preview iframe via `PageRoot` on every editor breakpoint (desktop scrollport grid only fills letterbox gutters — it cannot show through `iframe#preview-frame`). Scrollport `InfiniteGrid` remains on the canvas shell for gutter fill. Preview iframe + `html/body` stay transparent. **Theme toggle:** grid surface + tile tint follow `useTheme().resolvedTheme`; editor grids remount on theme change. |

**Regression guard:** Sidebar resize handles remain grid siblings (not clipped by sidebar `overflow: hidden`); compact panel height drag, viewport island, and outline DnD unchanged.

**Plugins wiring:** `plugins={[blocksPlugin(), nexusOutlinePlugin(), fieldsPlugin()]}` in `PuckEditorShell`.

---

## 29. Canvas Drag-and-Drop — Slot Reparenting & Full Highlights (Phase 22)

| Feature | Files | Detail |
|---------|-------|--------|
| Drop-target metrics | [`canvasDropTargetLogic.ts`](../../src/components/puck/lib/canvasDropTargetLogic.ts), [`canvasDropTargetLogic.test.ts`](../../tests/puck/lib/canvasDropTargetLogic.test.ts) | Pure resolver: empty slots use `max(container, dragged)` height; append slots reserve space below children; `80px` floor; deepest-zone hit-test. Tests: `npm run test:canvas-drop-target`. |
| Canvas reparent logic | [`canvasReparentLogic.ts`](../../src/components/puck/lib/canvasReparentLogic.ts), [`canvasReparentLogic.test.ts`](../../tests/puck/lib/canvasReparentLogic.test.ts) | Destination index, descendant guard, move/reorder commit builder. Tests: `npm run test:canvas-reparent`. |
| Canvas drag coordinator | [`NexusCanvasDragCoordinator.tsx`](../../src/components/puck/NexusCanvasDragCoordinator.tsx), [`puckEditorOverrides.tsx`](../../src/components/puck/puckEditorOverrides.tsx) | *(Unmounted 2026-06-17)* Preview overlay + post-drop corrective dispatch caused browser bugs; stock Puck DnD active. Pure helpers in `canvasDropTargetLogic.ts` remain for tests / future rework. |
| Slot class markers | [`NexusSection.tsx`](../../src/components/puck/blocks/layout/NexusSection.tsx), [`NexusGrid.tsx`](../../src/components/puck/blocks/layout/NexusGrid.tsx), [`gridEditSizing.ts`](../../src/components/puck/lib/gridEditSizing.ts), [`canvasDropTargetLogic.ts`](../../src/components/puck/lib/canvasDropTargetLogic.ts) | Grid item edit mirrors carousel slide slots: `nexus-grid-item__dropzone-shell`, flex-filled drop zone, hidden Puck append hitboxes, `resolveGridItemDropZoneAtPoint` shell hit-test. Empty floor 240px (120px in carousel slides). Default span 6×2. |
| Canvas drag CSS | [`puck-editor.css`](../../src/app/puck-editor.css), [`globals.css`](../../src/app/globals.css) | Overlay drop previews; pointer pass-through on nested media/controls; inactive carousel slides accept drops; expanded Puck hitboxes. |
| Spec | [`puck_canvas_drag_drop.md`](./puck_canvas_drag_drop.md) | Slot inventory, **§2a grid item carousel-parity drop targeting**, architecture diagram, developer checklist, troubleshooting. |
