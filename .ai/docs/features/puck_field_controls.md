# Puck sidebar field controls — outline-flat style

**Status:** Active. All Fields-tab and block/page chapter controls must match Outline tree row rhythm — not boxed Shadcn cards.

## Visual reference

**Canonical row:** `.nexus-outline-layer__inner` in the Outline plugin — transparent background, no outer box border, inset dividers, accent tint on hover/selected.

Field controls must read as **rows in the same list**, not separate form widgets floating on the panel.

## Scope hook

| Class | Where | Purpose |
|-------|--------|---------|
| `nexus-plugin-field-surface` | `FieldChapter` body (`FieldChapter.tsx`) | Scopes outline-flat CSS to every chapter (block, page root, custom groups) |
| `[class*="FieldsPlugin"]` | Puck Fields tab root | Top-level fields outside a chapter still get flat controls |

CSS lives in [`puck-editor.css`](../../src/app/puck-editor.css) under **Plugin field controls — outline-flat rows**.

## Horizontal gutter

All field UI must inset from the panel’s left/right edges (same as Outline / Blocks rows).

| Token | Desktop | Mobile ≤900px | Role |
|-------|---------|---------------|------|
| `--nexus-plugin-panel-gutter-x` | `12px` | `12px` | Outer `margin-inline` on row wrappers |
| `--nexus-plugin-leaf-pad-inline` | `8px` | `12px` | Inner `padding-inline` on labels and controls |
| `--nexus-plugin-leaf-margin-inline` | alias → gutter | alias → gutter | Shared with Outline/Blocks leaf rows |

**Layout:**

1. **Wrappers** (`nexus-sidebar-field`, `nexus-field-category`, `.nexus-tiptap-editor`): `margin-inline: var(--nexus-plugin-panel-gutter-x)`, `width: auto`, vertical padding only on wrapper.
2. **Labels** (`nexus-field-category__label`, `nexus-field-subfield__label`, Puck `FieldLabel`): `padding-inline: var(--nexus-plugin-leaf-pad-inline)`.
3. **Controls** (select, segmented, inputs): flat row padding on the interactive element — no extra outer margin.

Effective inset to label text ≈ **20px** desktop (12 + 8), **24px** mobile (12 + 12).

## Control mapping

| Control | Component | Required classes / pattern |
|---------|-----------|----------------------------|
| Select | `PuckSelectField` | Trigger: `nexus-puck-select-trigger nexus-plugin-flat-control` — **never** raw Shadcn trigger without flat utilities |
| Multi-option | `SegmentedControl` | Root: `nexus-segmented nexus-plugin-segmented` |
| Binary on/off | `PuckSwitchField` | Label + switch row; no boxed wrapper |
| Puck `radio` (3+ options) | `SegmentedControl` via `PuckRadioFieldOverride` | Same as segmented |
| Puck `select` / `radio` builtins | `puckEditorOverrides.tsx` | Routed through Nexus components above |
| Text / number | Puck `Input-input` or `.nexus-puck-field input` | Flat row via `.nexus-plugin-field-surface` CSS |
| Array slides | Puck `ArrayFieldItem-summary` | Already flat — do not reintroduce card chrome |
| Custom dimension unit | `PuckSelectField` with `nexus-plugin-flat-control` | Unit select inside spacing rows uses flat trigger |

## Rules for new fields

1. **Wrap chapters in `FieldChapter`** — body automatically gets `nexus-plugin-field-surface`.
2. **Use Nexus field components** — `PuckSelectField`, `SegmentedControl`, `PuckSwitchField`; never native `<select>` or ad-hoc button groups in the Puck sidebar.
3. **Category labels** — uppercase sub-labels via `.nexus-field-category__label` (Style, Grid Motion, Padding, …), not Puck `FieldLabel` on every control when a category label suffices.
4. **No box chrome** — no `border-radius`, `shadow-xs`, `border-input`, or filled panel backgrounds on controls inside plugin panels. Hover/selected = subtle `color-mix` accent tint only (same as Outline hover).
5. **Horizontal gutter** — wrappers use `--nexus-plugin-panel-gutter-x`; labels/controls add `--nexus-plugin-leaf-pad-inline` (never flush to panel edges).
6. **Dividers** — row separation via `border-bottom` / `border-inline-end` using `var(--nexus-editor-panel-border)`, not per-control rounded borders.
7. **Typography** — consume `--nexus-plugin-leaf-label-size`, `--nexus-plugin-leaf-label-weight`, `--nexus-plugin-font-family`.
8. **Outside plugin panels** (Global Layout editor, admin pages) may use standard Shadcn surfaces — do not apply `nexus-plugin-flat-control` there.

## Anti-patterns

| Do not | Why |
|--------|-----|
| Pass Shadcn `SelectTrigger` without `nexus-plugin-flat-control` | Tailwind `border shadow-xs` wins and shows boxed controls |
| Use default `.nexus-segmented__btn` outside plugin scope | Base styles use grey fill + rounded borders (marketing forms) |
| Add `glass-panel` / card wrappers inside chapter bodies | Breaks Blocks/Outline/Fields parity |
| Add `width: 100%` without `margin-inline: var(--nexus-plugin-panel-gutter-x)` | Controls bleed to panel edges |
| Duplicate divider logic per field file | Dividers come from `.nexus-field-category` + `.nexus-sidebar-field` CSS |

## Related

- [puck_plugin_panel_rhythm.md](./puck_plugin_panel_rhythm.md) — leaf row tokens and plugin panel rhythm
- [puck-sidebar-chapters.mdc](../../.cursor/rules/puck-sidebar-chapters.mdc) — chapter registration policy
- [`PuckSelectField.tsx`](../../src/components/puck/fields/PuckSelectField.tsx), [`SegmentedControl.tsx`](../../src/components/puck/fields/SegmentedControl.tsx)

## Tests

No automated CSS suite. Manual smoke: open Fields tab → Page Background → Style select and Grid Motion segmented control should match Outline layer row hover/selected tint (no white box outline).
