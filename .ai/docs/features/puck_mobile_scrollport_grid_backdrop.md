# Puck mobile scrollport grid backdrop (≤900px)

## Problem (regression — screencast 2026-06-16)

On narrow editor routes (DevTools ~485px or phone), opening or closing the bottom plugin panel (Blocks / Outline / Fields) caused the **lightbulb grid** to **snap** — tiles jumped or rescaled sharply during the animation.

### Root cause (final)

The plugin panel lived in the **CSS grid row** (`grid-template-rows`), so opening the panel **shrunk the canvas row** every frame. That resized the grid container and triggered bitmap relayout — even with JS “freeze” logic.

## Architecture (current — overlay + CSS backdrop)

| Layer | z-index | Behaviour |
|-------|---------|-----------|
| `#nexus-editor-scrollport-grid` on `PuckLayout-inner` | 0 | **Fixed wallpaper** — `position: absolute; inset: 0; width/height/min-height: 100%`. Browser sizes it; **no JS px vars**. |
| `PuckCanvas--fullScreen` | 1 | Full editor row height; **does not shrink** when panel opens. |
| `Sidebar--left` (plugin panel) | 2 | **Absolute overlay** docked above bottom nav (`bottom: var(--nexus-compact-nav-rail-height)` from `syncCompactNavRailHeight`); height eases via `@property --nexus-mobile-panel-height`. |
| Bottom nav | grid row | Unchanged. |

**Grid row for panel is always `0`** — panel height is only on the overlay sidebar, not `grid-template-rows`.

### Key modules

| File | Role |
|------|------|
| `src/app/puck-editor.css` | Overlay panel + CSS-only backdrop (`inset: 0`) |
| `src/components/puck/lib/mobileScrollportGridFreeze.ts` | Backdrop tag + paint lock during panel ease |
| `src/components/puck/NexusEditorScrollportGrid.tsx` | Portal; resync bitmap on **viewport resize** only (not panel) |
| `src/components/background/InfiniteGrid.tsx` | Skips bitmap resize when `isMobileScrollportGridPaintFrozen()` |

## Acceptance criteria

- [ ] Grid wrapper height unchanged during panel open/close (≤4px tolerance).
- [ ] Canvas shell height unchanged during panel open/close (overlay model).
- [ ] Panel grows upward from nav without shrinking editor grid row.
- [ ] No visible tile snap when toggling Outline at 485px DevTools width.

## Tests

| Command | Covers |
|---------|--------|
| `npm run test:run -- mobile-scrollport-grid-freeze` | Backdrop helpers |
| `PLAYWRIGHT_BASE_URL=http://localhost:8080 npm run test:run -- browser:puck-mobile-panel` | Overlay + fixed grid/canvas E2E |

E2E: *grid and canvas stay fixed while overlay panel opens*.

## Agent checklist (prevent recurrence)

1. **Never** allocate plugin panel height in `grid-template-rows` on ≤900px — use absolute overlay.
2. **Never** size the backdrop grid with JS `--nexus-scrollport-grid-bg-*` px vars — use `inset: 0` / `min-height: 100%`.
3. Do not mount scrollport grid on `PuckCanvas--fullScreen` for narrow routes.
4. Do not attach `ResizeObserver` resync to layout-inner for backdrop mode (panel must not trigger bitmap resize).
5. Run `test:mobile-scrollport-grid-freeze` + `test:browser:puck-mobile-panel` before closing panel/grid bugs.
