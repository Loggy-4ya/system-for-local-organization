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
