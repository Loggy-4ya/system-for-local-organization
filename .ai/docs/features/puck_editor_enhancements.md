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
| Responsive header | `SiteHeaderBar.tsx` | Mobile command palette (`CommandDialog`); shared by `GlobalHeader` + `EditorHeaderChrome` |
| Tabs slot fix | `NexusTabs.tsx` | Each tab includes `panel: []` for Puck inline slots |
| Tabs editor UX | `NexusTabsRender.tsx` | Strip edit mode: one active panel drop zone; tab strip switches panel |
| Carousel editor UX | `NexusCarouselRender.tsx` | Strip edit mode: one active slide drop zone; Embla in Interactive/published |

---

## 14. Page Gutter & Editor Stability Fixes (Phase 6)

### Page content gutter

| Token | Value | Usage |
|-------|-------|-------|
| `--page-content-gutter` | `clamp(12px, 3vw, 24px)` | Horizontal/vertical inset on Puck pages and `.page-shell` |

Applied via `pageGutterStyle()` in [`contentWidthTokens.ts`](../../src/components/puck/lib/contentWidthTokens.ts) and wired into [`PageRoot.tsx`](../../src/components/puck/root/PageRoot.tsx). Ensures the InfiniteGrid background remains visible on mobile and desktop even when content width is `full`.

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
| `NexusVideoRender` / `NexusImage` | `AspectRatio` | Ratio mapping for video; 16:9 frame for auto-height images |
| `NexusNewsCard` / `NexusStatCard` | `Card` | Glass styling retained via utility classes |

### App chrome and fields

| Surface | Change |
|---------|--------|
| `SiteHeaderBar` | Mobile nav replaced with filterable `CommandDialog` |
| Puck sidebar | [`PuckSelectField.tsx`](../../src/components/puck/fields/PuckSelectField.tsx) wraps Shadcn `Select` |

---

## 17. Island Nesting, Video, Carousel, and List Fixes (Phase 9)

| Fix | Files | Detail |
|-----|-------|--------|
| Island nesting | [`defaultEditorContent.ts`](../../src/components/puck/lib/defaultEditorContent.ts), [`applyIslandDefaultsOnInsert.ts`](../../src/components/puck/lib/applyIslandDefaultsOnInsert.ts), [`editorSettings.ts`](../../shared/constants/editorSettings.ts) | Section island ON; children OFF; `normalizeNestedIslands()`; `NexusSection` in default island list |
| Video sizing | [`NexusVideo.tsx`](../../src/components/puck/blocks/content/NexusVideo.tsx), [`NexusVideoRender.tsx`](../../src/components/puck/blocks/content/NexusVideoRender.tsx) | Width, max-width, alignment; `AspectRatio` on all media paths |
| Carousel arrows | [`NexusCarouselRender.tsx`](../../src/components/puck/blocks/content/NexusCarouselRender.tsx), [`carousel.tsx`](../../src/components/ui/carousel.tsx) | Merged click handlers so `scrollPrev`/`scrollNext` are not overwritten |
| List reorder + position | [`ListItemsField.tsx`](../../src/components/puck/fields/ListItemsField.tsx), [`ListPositionField.tsx`](../../src/components/puck/fields/ListPositionField.tsx), [`NexusList.tsx`](../../src/components/puck/blocks/content/NexusList.tsx), [`config.tsx`](../../src/components/puck/config.tsx) | Up/down item reorder; margin top/bottom presets via `listPosition` |

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
| Carousel edit navigation | [`NexusCarouselRender.tsx`](../../src/components/puck/blocks/content/NexusCarouselRender.tsx), [`puck-editor.css`](../../src/app/puck-editor.css) | Edit mode uses Embla + Shadcn prev/next arrows and dots (not text slide tabs); all slide slot DropZones stay mounted; `useStripActiveIndex` syncs with carousel API; overlay portal on controls |
| Carousel edit height parity | [`NexusCarouselRender.tsx`](../../src/components/puck/blocks/content/NexusCarouselRender.tsx), [`globals.css`](../../src/app/globals.css), [`puck-editor.css`](../../src/app/puck-editor.css) | Default height **auto**; auto mode uses `CAROUSEL_AUTO_MIN_HEIGHT_PX` (240px) floor on drop zones; fixed presets use `nexus-carousel--fixed-height` + `--nexus-carousel-height` |
| Carousel height & radius | [`CarouselDimensionFields.tsx`](../../src/components/puck/fields/CarouselDimensionFields.tsx), [`NexusCarousel.tsx`](../../src/components/puck/blocks/content/NexusCarousel.tsx) | Labeled preset selects with **Custom** option; custom length inputs render **inline** under the preset (no `resolveFields`) to avoid sidebar/canvas remount |
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
| Layout (root) | `PageAppearanceFieldGroup.tsx` | Closed |
| Background (root) | `PageAppearanceFieldGroup.tsx` | Closed |
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
| Strip sync on array edit | [`StripArrayLabelField.tsx`](../../src/components/puck/fields/StripArrayLabelField.tsx), [`NexusCarousel.tsx`](../../src/components/puck/blocks/content/NexusCarousel.tsx), [`NexusTabs.tsx`](../../src/components/puck/blocks/content/NexusTabs.tsx) | Expanding or focusing a slide/tab label in the sidebar patches `editorActiveIndex` via Puck `replace` + `setStripActiveIndex` |

### Custom dimension convention (mandatory)

When a sidebar field offers a **Custom** preset:

1. Use [`CustomDimensionInput`](../../src/components/puck/fields/CustomDimensionInput.tsx) — never a single free-text CSS box.
2. Keep the custom row **mounted**; hide with the `hidden` attribute when the preset is not `custom` (avoids Puck field-tree remounts).
3. Batch object-field patches (carousel `carouselSize`) instead of `resolveFields` or `setData` for custom visibility.

---

## 23. Carousel Multi-Slide, Overlay Sync & Island Toggle Fixes (Phase 16)

| Fix | Files | Detail |
|-----|-------|--------|
| Slides per view | [`NexusCarousel.tsx`](../../src/components/puck/blocks/content/NexusCarousel.tsx), [`NexusCarouselRender.tsx`](../../src/components/puck/blocks/content/NexusCarouselRender.tsx) | Sidebar **Slides Visible**: `auto` (1 / 2 / 3 by breakpoint), or fixed `1` / `2` / `3`. Embla uses `containScroll: "trimSnaps"`; dots count from `scrollSnapList()` (pages, not raw slide count). Edit mode keeps single-slide basis for DnD focus. |
| Selection overlay height | [`puck-editor.css`](../../src/app/puck-editor.css), [`NexusCarouselRender.tsx`](../../src/components/puck/blocks/content/NexusCarouselRender.tsx) | All slides stay in the Embla track so carousel **auto height equals the tallest slide**. Inactive edit slides only disable pointer events (no height collapse). `ResizeObserver` + Puck node sync on slide / resize / `slidesPerView` change. |
| Slides per view CSS | [`globals.css`](../../src/app/globals.css) | Root classes `nexus-carousel--spv-1|2|3|auto` set `flex-basis` with gap math (overrides shadcn `basis-full`). Carousel remounts / `reInit` when preset changes. |
| Island user override | [`spacingFields.tsx`](../../src/components/puck/lib/spacingFields.tsx), [`applyIslandDefaultsOnInsert.ts`](../../src/components/puck/lib/applyIslandDefaultsOnInsert.ts) | `islandUserOverride: true` set when the user toggles island in the sidebar; `ensureIslandOnEligibleBlocks` skips those nodes so manual OFF survives refresh. |
| Parent-blocked island UX | [`IslandFieldGroup.tsx`](../../src/components/puck/fields/IslandFieldGroup.tsx), [`puckDataTree.ts`](../../src/components/puck/lib/puckDataTree.ts) | `hasAncestorWithActiveIsland()` walks the full ancestor chain; switch is **disabled** with hint when a parent already has island mode. |

### Slides visible presets

Root class on `.nexus-carousel` (see [`globals.css`](../../src/app/globals.css)):

| Preset | Class | Visible slides |
|--------|-------|----------------|
| `1` | `nexus-carousel--spv-1` | 1 (full width) |
| `2` | `nexus-carousel--spv-2` | 2 (`calc` flex-basis with gap) |
| `3` | `nexus-carousel--spv-3` | 3 |
| `auto` | `nexus-carousel--spv-auto` | 1 → 2 @ `md` → 3 @ `lg` |

Auto-height carousels stretch all slides to the **tallest slide** in the track (`align-items: stretch`).
