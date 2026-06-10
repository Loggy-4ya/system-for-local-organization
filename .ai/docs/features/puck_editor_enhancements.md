# Puck Editor UI/UX Enhancements

**Status:** `[x] Completed`

**Related:** [puck_editor.md](./puck_editor.md) · [figma_ui_integration.md](./figma_ui_integration.md)

---

## 1. Overview

Phase 1 refinements to the Puck.js visual editor: unified field styling, shared custom fields, page metadata editing fixes, PageRoot presets, fixed header chrome, and block-level spacing/lining controls.

---

## 2. Path Edit State Bug (Critical)

### Symptom
Typing in the header URL path editor resets Puck canvas state (selection, unsaved block edits).

### Root cause
`PuckClient` passed a freshly allocated `initialData` object on every parent re-render. `PagePathEditor` called `setCurrentPath` on each keystroke, triggering re-renders. Puck treats the `data` prop as authoritative and resets internal editor state.

### Fix
- Hold editor data in `useState`, initialized once from server payload.
- Wire Puck `onChange` to sync `editorData`.
- Decouple pending URL path via `useRef`; commit only on Publish.
- `PagePathEditor` uses imperative handle `getNormalizedPath()` for publish-time read.

---

## 3. Shared Custom Fields

| Field | File | Purpose |
|-------|------|---------|
| `RgbaColorField` | `src/components/puck/fields/RgbaColorField.tsx` | Hex/RGBA picker with alpha slider |
| `MediaUploadField` | `src/components/puck/fields/MediaUploadField.tsx` | Drag-and-drop image/video upload + URL input |
| `AccentPresetField` | `src/components/puck/fields/AccentPresetField.tsx` | Page solid background — 5 accent families × 3 shades |
| Upload helper | `src/components/puck/lib/mediaUpload.ts` | Shared POST to `/api/upload` |

All custom fields use `.nexus-puck-field` wrapper; styles in `src/app/puck-editor.css`.

### Upload API
`POST /api/upload` accepts `image/*` (max 5MB) and `video/*` (max 50MB).

---

## 4. PageRoot Enhancements

- **Accent presets:** `backgroundPreset` select maps to CSS vars (`--accent-*-soft/medium/strong`).
- **Custom override:** `backgroundColor` via `RgbaColorField` when preset is `custom`.
- **Header chrome:** `EditorHeaderChrome.tsx` — fixed non-draggable preview of `GlobalHeader` at top of every Puck page (`data-header-nav`, `data-header-actions` for future CRUD).

---

## 5. Inline Title Editing

`PageTitleEditor.tsx` replaces Puck preview frame title via `overrides.headerTitle`. Click-to-edit; syncs with sidebar `root.props.title` through Puck `onChange`.

---

## 6. Block Spacing & Lining

**Module:** `src/components/puck/lib/spacingFields.tsx`

- `SPACING_FIELD_DEFS` — padding/margin token selects + custom px overrides.
- `LINING_FIELD_DEFS` — optional highlight wrapper (enabled, color, radius, padding).
- `applyBlockShell()` — returns `{ shellStyle, innerStyle }` for block render.

Applied to all 18 registered blocks in `config.tsx`.

---

## 7. Dark Theme Select Contrast

Additional rules in `puck-editor.css` under `[data-theme="dark"] .Puck` for `select`, `option`, and radio group labels.

---

## 8. Acceptance Criteria

- [x] Path typing does not reset Puck editor state
- [x] Dark theme dropdowns are readable
- [x] RGBA picker outputs valid CSS colors
- [x] Drag-and-drop upload works for images and videos
- [x] Page solid background uses accent presets
- [x] Header chrome visible on all Puck pages
- [x] Inline title edits sync with sidebar
- [x] All blocks expose spacing + lining controls with safe defaults
