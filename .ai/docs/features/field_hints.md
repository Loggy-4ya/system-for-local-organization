# Field hints — cross-surface helper copy

**Status:** Active. All settings surfaces must surface explanatory field copy through the shared hint pattern — not inline paragraphs under controls.

## Purpose

Settings panels (Puck sidebar, Global Layout editor, admin forms, profile/auth forms) stay scannable when helper text is hidden behind a discoverable **info icon**. Validation feedback, live previews, and empty states remain visible inline.

## Canonical component

| Module | Role |
|--------|------|
| [`NexusFieldHint.tsx`](../../src/components/ui/NexusFieldHint.tsx) | `CircleHelp` trigger + sr-only hint node |
| [`tooltip.tsx`](../../src/components/ui/tooltip.tsx) | Base UI tooltip shell (desktop) |
| [`popover.tsx`](../../src/components/ui/popover.tsx) | Base UI popover shell (touch) |

### Interaction split

| Device | Mechanism |
|--------|-----------|
| `(hover: hover) and (pointer: fine)` | Tooltip on hover / keyboard focus |
| Coarse pointer / touch | Popover on tap; dismiss on outside tap |

Popover and tooltip surfaces use solid `var(--color-bg-panel)` panels — no transparent helper paragraphs on the dynamic grid.

### Accessibility

- Hint body is always present in a **screen-reader-only** span (`sr-only`) with a stable `id`.
- Wrappers wire `aria-describedby` on the associated control when possible (`FormField`, `PuckSwitchField`).
- Info trigger exposes `aria-label` (default: `"Field help"` or `"About {label}"`).

## Wrapper integration

| Surface | Wrapper | Hint prop |
|---------|---------|-----------|
| Admin / profile / auth | `FormField` | `hint` |
| Global Layout editor | `EditorField`, `EditorSectionHeader` | `hint` |
| Puck switches | `PuckSwitchField` | `description` |
| Puck category labels | `FieldLabelRow` | `hint` |

**Do not** add new inline `<p className="…-hint">` blocks for field documentation.

## Keep visible inline

| Type | Examples |
|------|----------|
| Validation | `FormField` errors, slug validation |
| Live preview | `Preview: yoursite.com/…` |
| Computed values | Spacing resolved hints |
| Empty states | “No categories yet” |
| Picker affordances | Connector style `title` on radio options |

## Puck sidebar dividers

Inside `FieldChapter` bodies:

- **No** `border-bottom` between consecutive `.nexus-field-category` rows — vertical `padding-block` only.
- **Keep** chapter-to-chapter separators (`.nexus-field-chapter + .nexus-field-chapter`).
- **Keep** `.nexus-sidebar-field` dividers when multiple AutoField rows stack in one category.

See [puck_field_controls.md](./puck_field_controls.md).

## Manual smoke

1. Puck Page sidebar (desktop) — hover info icons on Categories / Delete / locked slug.
2. Puck Page sidebar (mobile ≤900px) — tap info icons; popover readable.
3. `/admin/global-layout` — header/footer field hints.
4. `/admin/general-rules`, `/profile/settings`, `/signup` — FormField hints.
5. Keyboard — Tab to info icon; sr-only text available to assistive tech.

## Related

- [puck_field_controls.md](./puck_field_controls.md)
- [global_layout.md](./global_layout.md)
