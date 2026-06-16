# Icon Sizes — Nexus Design System

Central reference for Lucide glyph sizes across Nexus. **Do not hardcode one-off pixel sizes** in site chrome; use the tokens and helpers listed here.

---

## Tier overview

| Tier | Size | Stroke | When to use |
|------|------|--------|-------------|
| **Site chrome** | **18px** | **2.25** | Public header/footer nav, global layout editor whitelisted icons, layout preview |
| **Puck editor header toolbar** | **18px** (text chips) / **16px** (icon-only squares) | **2.25** | Puck `headerActions` + MenuBar undo/redo — matches `GlobalHeader` via `--site-header-*` tokens and `siteChromeLucideProps()` |
| **Puck editor sidebar** | **14px** | **1.75** | Puck block drawer, field chapters, sidebar category labels inside `/edit` |
| **Puck compact rail** | **16px → 11px** (responsive) | — | Bottom plugin rail on narrow Puck editor viewports only |
| **Editor chrome / affordances** | **12–16px** | **2–2.25** | Delete, drag handle, Add Link, Save/Reset — utility controls, not nav content |
| **Micro UI** | **11–14px** | varies | Theme-toggle knob, chevrons, decorative indicators inside a fixed control |

**Rule of thumb:** If the icon represents **navigation or social content the admin configured** (header link, category, footer social), it is **site chrome → 18px**. If it is **Puck editor header toolbar** (Pages, Interactive, Publish), use **site chrome → 18px** in text chips and **16px** inside square icon-only controls (matches hamburger menu). If it is **Puck sidebar** chrome (blocks drawer, field labels), use **puckIcon() → 14px**.

---

## 1. Site chrome (18px) — canonical public nav icons

All whitelisted Lucide icons shown in the live site header, mobile drawer, footer social row, and the Global Layout Editor pickers **must** use the same size.

### Tokens

| Layer | Name | Value |
|-------|------|-------|
| TypeScript | `SITE_CHROME_ICON_SIZE` | `18` |
| TypeScript | `SITE_CHROME_ICON_STROKE` | `2.25` |
| CSS | `--site-chrome-icon-size` | `18px` |
| CSS class | `.site-chrome-icon` | sets `width` / `height` to the token |

**Source files:**

- `shared/constants/globalLayout.ts` — numeric constants
- `src/app/globals.css` — `:root { --site-chrome-icon-size: 18px; }`
- `src/components/global-layout/resolveLucideIcon.tsx` — `siteChromeLucideProps()`

### Helper (required for TS-rendered icons)

```typescript
import { resolveLucideIcon, siteChromeLucideProps } from "@/components/global-layout/resolveLucideIcon";

resolveLucideIcon("Home", siteChromeLucideProps());
// Optional className merge:
resolveLucideIcon("Mail", siteChromeLucideProps({ className: "site-header-bar__nav-dropdown-icon" }));
```

Direct Lucide components in site chrome (e.g. sign-in `LogIn`) should spread the same props:

```typescript
import { siteChromeLucideProps } from "@/components/global-layout/resolveLucideIcon";

<LogIn {...siteChromeLucideProps({ className: "site-header-bar__signin-icon" })} aria-hidden />
```

### Surfaces that must use 18px

| Surface | Module |
|---------|--------|
| Desktop header inline links & pill buttons | `siteHeaderNavCategories.tsx` |
| Desktop category dropdown triggers & menu items | `siteHeaderNavCategories.tsx` |
| Mobile drawer links & category accordion heads | `siteHeaderNavCategories.tsx` |
| Header sign-in / account fallback icons | `SiteHeaderBar.tsx` |
| Puck editor header toolbar (Pages, Interactive, Publish, MenuBar) | `puckEditorOverrides.tsx`, `EditorModeToggle.tsx`, `NexusPublishButton.tsx` |
| Footer social link glyphs | `SiteFooterBar.tsx` |
| Global Layout Editor icon picker (trigger + grid) | `LucideIconPicker.tsx` |
| Global Layout Editor flag badges (Pill / Admin only) | `HeaderNavFlagToggles.tsx` |

### Wrapper classes (CSS enforces box size)

These wrappers align to `--site-chrome-icon-size` in `globals.css`:

- `.site-header-bar__nav-link-icon`
- `.site-header-bar__nav-category-icon`
- `.site-header-bar__nav-dropdown-icon-wrap`
- `.site-header-mobile-menu__link-icon`
- `.site-header-mobile-menu__category-icon`
- `.site-footer-bar__social-icon`

Global Layout Editor scoped rules in `global-layout-editor.css` also bind picker and flag-badge icons to the same token.

### Placement

Nav content icons render **before** the label (desktop links, dropdown items, category triggers, mobile links/accordions). Chevron disclosure glyphs are separate UI affordances (see §4).

### Changing the size project-wide

1. Update `SITE_CHROME_ICON_SIZE` and `--site-chrome-icon-size` together.
2. Keep stroke at `2.25` unless Figma spec changes.
3. Do **not** scatter new literals (`size={16}`, etc.) in site chrome files.

---

## 2. Puck editor sidebar (14px)

Dense sidebar UI inside Puck routes (`/*/edit`) uses a smaller tier so block names and field chapters fit the panel.

| Constant | Value | Module |
|----------|-------|--------|
| `ICON_SIZE` | `14` | `src/components/puck/lib/puckIcons.tsx` |
| `ICON_STROKE` | `1.75` | same |

**Helper:** `puckIcon(LucideComponent)` — use for component drawer entries, `FieldChapter` icons, and field-label icons in the Puck sidebar.

**Do not** use `puckIcon()` for site header/footer or Global Layout Editor nav icons — those are site chrome (18px).

---

## 3. Puck compact bottom rail (responsive)

On narrow Puck editor viewports, the bottom plugin rail scales icon size via CSS variable `--nexus-compact-nav-icon-size` in `src/app/puck-editor.css`:

| Breakpoint | Token value |
|------------|-------------|
| Default (tablet rail) | `16px` |
| `≤480px` | `14px` |
| `≤360px` | `13px` |
| `≤280px` | `12px` |
| `≤240px` | `11px` |

Applied to `.Puck [class*="NavItem-linkIcon"] svg`. This tier is **editor-only** and independent of site chrome.

---

## 4. Allowed smaller icons (not site chrome content)

These are structural or micro controls — they are **not** whitelisted nav/social content icons and may stay smaller:

| Glyph | Typical size | Example |
|-------|--------------|---------|
| `ChevronDown` (category disclosure) | 14px | Header category trigger / mobile accordion |
| Theme toggle sun/moon (inside knob) | 11px | `ThemeToggleLink.tsx` |
| Drag handle `GripVertical` | 14px | `EditorDragHandle.tsx` |
| Row delete `Trash2` | 12–14px | Global Layout Editor action buttons |
| Add link `Plus` (button label) | 12px | Category “Add Link” |
| Editor toolbar Save / Reset | 16px | `GlobalLayoutEditorShell.tsx` |
| Preview viewport device icons | 16px | `ChromePreviewPanel.tsx` |

When adding a **new** icon to this list, prefer reusing an existing tier (14px editor chrome, 16px toolbar) rather than inventing a new size.

---

## 5. Figma alignment

Public header/footer nav icons in Figma should target **18×18px** Lucide glyphs at **2.25 stroke**, aligned before label text with **6px** gap (matches `.site-header-bar__nav-trigger` and link `gap-1.5`).

Puck sidebar / field icons in Figma should target **14×14px** at **1.75 stroke**.

See [figma_ui_integration.md](./features/figma_ui_integration.md) for the broader token architecture.

---

## 6. Agent checklist

When touching icons:

- [ ] Is this a **configured nav/social** icon? → `siteChromeLucideProps()` + `.site-chrome-icon` (18px).
- [ ] Is this **Puck editor header toolbar**? → `siteChromeLucideProps()` (18px text chips; 16px when icon-only square via `--site-header-icon-btn-icon-size`).
- [ ] Is this **Puck sidebar** chrome? → `puckIcon()` (14px).
- [ ] Is this a **button affordance** (delete, drag, save)? → 12–16px per §4; do not reuse for nav links.
- [ ] Did you avoid inline `size={13|14|16}` in site chrome components?
- [ ] If you changed a canonical size, update this file and `global_layout.md` acceptance notes.

---

## Related docs

- [global_layout.md](./features/global_layout.md) — header/footer schema and editor behavior
- [figma_ui_integration.md](./features/figma_ui_integration.md) — Figma variables and frames
- [architecture_map.md](./architecture_map.md) — where icon modules live in the repo
