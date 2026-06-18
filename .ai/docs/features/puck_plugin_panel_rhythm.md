# Puck plugin panel rhythm (Blocks / Outline / Fields)

## Purpose

Blocks, Outline, and Fields share one visual system inside the Puck plugin sidebars (left rail on desktop, bottom panel on mobile ≤900px). **Outline is the canonical reference** for leaf-row spacing, section headers, typography, and label colors.

## Source of truth

| Layer | CSS | Role |
|-------|-----|------|
| Design tokens | `.Puck { --nexus-plugin-* }` in [`puck-editor.css`](../../src/app/puck-editor.css) | Single token set for all three plugins |
| Reference implementation | `.nexus-outline-layer__*`, `.nexus-outline-zone__title` | Outline tree rows — do not fork spacing |
| Blocks leaf rows | `.nexus-plugin-panel-row--block` | Drawer items (`PuckDrawerItemOverride`) — Puck renders **bg + fg** dnd-kit layers; global CSS hides `Drawer-draggableBg` so rows do not double |
| Fields leaf rows | `[class*="ArrayFieldItem-summary"]`, `.nexus-sidebar-field`, `[class*="FieldLabel"]` | Array slides, chapter controls, top-level labels |
| Section headers | `.nexus-field-chapter__head`, Blocks `FieldChapter`, Outline zone titles | Accordion / category headers |
| Field control surface | `.nexus-plugin-field-surface` on `FieldChapter` body | Scopes outline-flat select/segmented/input/switch styles — see [puck_field_controls.md](./puck_field_controls.md) |

## Field controls (outline-flat)

All sidebar form controls (select, segmented, switch, text input, Puck radio) must match Outline row rhythm — transparent background, inset dividers, accent hover tint. **Not** boxed Shadcn cards with borders/shadows.

| Requirement | Implementation |
|-------------|----------------|
| Chapter scope | `FieldChapter` body adds `nexus-plugin-field-surface` |
| Select | `PuckSelectField` with `nexus-plugin-flat-control` on trigger |
| Segmented | `SegmentedControl` with `nexus-plugin-segmented` |
| Binary | `PuckSwitchField` row layout |
| CSS | `puck-editor.css` — “Plugin field controls — outline-flat rows” |

Full spec: [puck_field_controls.md](./puck_field_controls.md)

## CSS custom properties

Defined on `.Puck` (desktop defaults mirror Outline desktop tree):

| Token | Desktop (Outline) | Mobile ≤900px override |
|-------|-------------------|-------------------------|
| `--nexus-plugin-font-family` | `var(--puck-font-family, inherit)` | unchanged |
| `--nexus-plugin-leaf-min-height` | `28px` | `36px` |
| `--nexus-plugin-leaf-margin-block` | `1px` | `0` |
| `--nexus-plugin-panel-gutter-x` | `12px` | `12px` |
| `--nexus-plugin-leaf-margin-inline` | alias → gutter | alias → gutter |
| `--nexus-plugin-leaf-pad-block` | `4px` | `7px` |
| `--nexus-plugin-leaf-pad-inline` | `8px` | `12px` |
| `--nexus-plugin-leaf-handle-pad-inline-start` | `6px` | unchanged |
| `--nexus-plugin-leaf-gap` | `2px` (inner flex) | unchanged |
| `--nexus-plugin-leaf-icon-gap` | `6px` | unchanged |
| `--nexus-plugin-leaf-label-size` | `13px` | `12px` |
| `--nexus-plugin-leaf-label-weight` | `400` | unchanged |
| `--nexus-plugin-section-title-size` | `11px` | unchanged |
| `--nexus-plugin-section-header-pad-*` | `4px` / `12px` | `2px` / `12px` |

Legacy aliases (`--nexus-plugin-row-height`, `--nexus-plugin-row-pad-x`, etc.) map to the leaf tokens for older rules and mobile `--nexus-mobile-plugin-*` aliases.

## Mobile scroll (≤900px)

Puck 0.21 plugins render inside `PuckPluginTab` → `PuckPluginTab-body` (not `SidebarSection`). The compact slide-up panel scrolls on **`PuckPluginTab-body`**:

| Layer | Role |
|-------|------|
| `Sidebar--left` | Fixed height (`--nexus-mobile-panel-height`), `overflow: hidden`, flex column |
| `nexus-mobile-panel-resize-host` | `flex-shrink: 0` drag handle; `display: none` during height eases, shown only when `data-nexus-panel-row-open` (settled open) so a 32px invisible strip does not linger on close |
| `PuckPluginTab--visible` | `flex: 1; min-height: 0` — fills remaining panel height |
| `PuckPluginTab-body` | **Primary scrollport** — `overflow-y: auto`, `touch-action: pan-y` |
| `.nexus-blocks-plugin` / `.nexus-outline-plugin` / `FieldsPlugin` | Natural height inside tab body (`overflow: visible`) |

Height drag (`data-nexus-panel-resizing`) freezes `PuckPluginTab-body` scroll only while the handle tracks.

**Open section bands (≤900px):** Collapsed sections show only the header row band. When a `FieldChapter` opens, the collapse row uses `grid-template-rows: minmax(0, auto)` (not `1fr` stretch) with the same full-width background as the header. `--nexus-mobile-plugin-section-end-gap` is `0` — no trailing spacer before the next category.

**Flush category stack (≤900px):** Puck field wrappers use `display: contents` so page/block chapters stack with no panel-island gutter between rows. Chapter shells use the header band background; dividers are `border-bottom` on the header row only. Stacked chapters use `flex: 0 0 auto` so an expanded category does not grow to fill the tab scrollport.

## Typography

- **Font family:** always `var(--nexus-plugin-font-family)` on `.nexus-blocks-plugin`, `.nexus-outline-plugin`, and `[class*="FieldsPlugin"]`.
- **Leaf labels** (block name, outline layer name, field label, array slide summary): `--nexus-plugin-leaf-label-size`, weight `400`, line-height `1.3`.
- **Section headers** (Blocks category, Fields chapter, nested Outline zone): `--nexus-plugin-section-title-size`, weight `600`, uppercase, letter-spacing `0.04em`.

## Colors (dark theme)

| Element | Token |
|---------|--------|
| Leaf label text | `var(--puck-color-azure-04)` |
| Leaf icon / grip | `var(--puck-color-grey-05)` / `var(--puck-color-grey-06)` |
| Section header text | `var(--puck-color-grey-06)` |
| Row divider | `var(--nexus-editor-panel-border)` |

Light theme uses `var(--puck-color-black)` for leaf labels (same as Outline).

## Usage rules for new UI

1. **Do not** introduce plugin-specific margins, font sizes, or label colors — consume `--nexus-plugin-*` tokens.
2. **Do not** add card chrome (rounded borders, azure panel backgrounds) inside Blocks/Outline/Fields lists.
3. **Leaf rows:** inset with `margin-inline: var(--nexus-plugin-panel-gutter-x)`; separate rows with `border-bottom: var(--nexus-editor-panel-border)` (mobile flat mode) or Outline’s transparent border + hover (desktop).
4. **Stacked section headers** (FieldChapter, Blocks category): flush band stack on mobile — solid chapter shell background (same as header row), **no** sibling `border-top` gaps; use `border-bottom` on the header row for inset dividers. Desktop keeps sibling `border-top` via global Fields rules.
5. **Nested Outline zones only:** use `--nexus-plugin-section-title-margin-block-*` on `.nexus-outline-zone__title`.
6. **Select + segmented controls** inside plugin panels: flat outline rows — transparent background, no box border, inset row dividers, accent hover/selected tint. Use `PuckSelectField` + `SegmentedControl`; see [puck_field_controls.md](../../.ai/docs/features/puck_field_controls.md).
7. When adding a new plugin panel row component, mirror Outline DOM rhythm: grip → optional chevron → icon → label.

## Related files

- [`puck-editor.css`](../../src/app/puck-editor.css) — token definitions + shared rules
- [`NexusDraggableOutline.tsx`](../../src/components/puck/NexusDraggableOutline.tsx) — reference row structure
- [`puckEditorOverrides.tsx`](../../src/components/puck/puckEditorOverrides.tsx) — `PuckDrawerItemOverride` block rows
- [`FieldChapter.tsx`](../../src/components/puck/fields/FieldChapter.tsx) — shared accordion shell (Blocks categories + Fields chapters)

## Tests

No dedicated CSS regression suite. Manual smoke: compare Blocks drawer row, Outline layer row, and Fields array slide row at the same sidebar width — label size, inset, and divider alignment should match.
