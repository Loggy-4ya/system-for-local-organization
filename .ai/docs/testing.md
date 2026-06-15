# Nexus — Repository Test Registry

Living catalog of automated tests in this repo. **Every new test file or `npm run test:*` script MUST be registered here** so agents and developers can find and reuse them without searching the tree.

## Agent protocol

When you add, rename, or remove a test:

1. Add or update the row in the registry table below.
2. Add a matching `test:*` script in `package.json` when the suite should be run on demand.
3. Keep the test file header comment in sync (`Run: …` line).
4. Add a reciprocal `Tests:` line in the module-under-test JSDoc header.
5. Reference this file from [architecture_map.md](./architecture_map.md) and [AGENTS.md](../AGENTS.md).

## Directory layout

All automated tests live under **`tests/`** — a single-purpose root folder (see [directory_hygiene.md](./directory_hygiene.md)). Subfolders mirror the source tree they exercise:

```
tests/
  puck/
    lib/          ← unit tests for src/components/puck/lib/*.ts
```

**Do not** place `*.test.ts` files inside `src/`, `shared/`, or application component folders. Extract pure logic from React components into testable modules under `src/`, then add the suite under the matching `tests/` path.

## Runner

All current suites use **Node.js built-in test runner** via `tsx`:

```bash
npx tsx --test tests/path/to/file.test.ts
```

Imports in test files use the same `@/` and `@shared/` path aliases as application code (`tsconfig.json`).

## Registry

| Script | Test file | Module under test | What it verifies |
|--------|-----------|-------------------|------------------|
| `npm run test:mobile-nav-gestures` | `tests/puck/lib/mobileNavPanelGestureLogic.test.ts` | `mobileNavPanelGestureLogic.ts`, `NexusMobileNavPanelGestures.tsx` | Compact editor bottom-rail **double-tap** detection (touch `button === -1`, ghost-click suppression with new-press guard, back-to-back expand/collapse), active nav link resolution from icon/label descendants, expand vs collapse toggle using `mobilePanelExpanded`, active-tab block rules during the double-tap pairing window. DOM wiring: document capture for `touchstart`/`pointerdown`/`mousedown` block; tap completion on active **`NavItem-link`** div via `touchend`/`pointerup`/`click`. |
| `npm run test:carousel-pagination` | `tests/puck/lib/carouselPagination.test.ts` | `carouselPagination.ts` | Visible slide counts and pagination tiers at 500 / 640 / 720 / 1024px viewport widths. |
| `npm run test:carousel-nav` | `tests/puck/lib/carouselNavController.test.ts` | `carouselNavController.ts` | Carousel prev/next controller state and wrap-around at bounds. |
| `npm run test:outline-sortable` | `tests/puck/lib/outlineSortableLogic.test.ts` | `outlineSortableLogic.ts` | Outline drag reorder slot resolution (before/after/nest/outdent). |
| `npm run test:island-defaults` | `tests/puck/lib/applyIslandDefaultsOnInsert.test.ts` | `applyIslandDefaultsOnInsert.ts` | Island defaults on block insert and outline move; root canvas move seeds **SM** top/bottom margin (`ROOT_BLOCK_VERTICAL_MARGIN`); nested section move resets margins to **None**. |
| `npm run test:block-shell-band` | `tests/puck/lib/blockShellBand.test.ts` | `spacingFields.tsx` | Island-off blocks honor `islandMaxWidth` via centered width band; **Full Width** opts into edge-to-edge bleed. |
| `npm run test:content-width-tokens` | `tests/puck/lib/contentWidthTokens.test.ts` | `contentWidthTokens.ts` | Page layout clamp (`full` → xl); site chrome fixed at 1400px band. |
| `npm run test:separator-block` | `tests/puck/lib/separatorBlockLogic.test.ts` | `separatorBlockLogic.ts`, `NexusSpacer.tsx` | Style preset bundles, prop normalization/inference, render model resolution for **Spacer & Divider** (`NexusSpacer`). |
| `npm run test:embed-media` | `tests/puck/lib/embedMedia.test.ts` | `embedMedia.ts`, `mediaFitMode.ts` | YouTube/Vimeo URL parsing, embed aspect lock (16:9), direct-file aspect fallback, media fit normalization. |
| `npm run test:canvas-drop-target` | `tests/puck/lib/canvasDropTargetLogic.test.ts` | `canvasDropTargetLogic.ts`, `NexusCanvasDragCoordinator.tsx` | Canvas drag hover sizing, deepest drop-zone hit-test, top-anchor drop probe, slot kind classification. |
| `npm run test:canvas-reparent` | `tests/puck/lib/canvasReparentLogic.test.ts` | `canvasReparentLogic.ts`, `NexusCanvasDragCoordinator.tsx` | Canvas reparent destination index, descendant guard, move/reorder commit builder, override detection. |
| `npm run test:canvas-carousel-drag` | `tests/puck/lib/canvasDragCarouselScenarios.test.ts` | `canvasDragCommitPlan.ts`, `canvasDropTargetLogic.ts`, `canvasReparentLogic.ts`, `NexusCanvasDragCoordinator.tsx` | Screencast-driven carousel drag scenarios: cross-slide move without revert, drag in/out of slides, release snap-back guards, outline cross-slide targets. |
| `npm run test:canvas-section-drop` | `tests/puck/lib/canvasSectionDropTarget.test.ts` | `canvasDropTargetLogic.ts`, `NexusSection.tsx`, `NexusCanvasDragCoordinator.tsx` | Default section glass-shell hit-testing, section vs root pick, occupied-section overlay outline, carousel slide vs wrapper pick. |
| `npm run test:block-render-visibility` | `tests/puck/lib/blockRenderVisibility.test.ts` | `blockRenderVisibility.ts`, all Puck block defaults | Page-root visibility models for every registered Puck block; guards video/image fill-slide collapse (outline exists but canvas height is 0). |
| `npm run test:global-layout` | `tests/shared/domains/globalLayoutValidation.test.ts` | `GlobalLayoutDomain.ts` | Header and footer layout configuration validation rules. |
| `npm run test:global-layout-sortable` | `tests/global-layout/lib/editorSortableLogic.test.ts` | `editorSortableLogic.ts`, `useEditorSortableList.ts`, `HeaderNavItemSortableContext.tsx` | Global Layout Editor flat-list reorder, drop-slot helpers, and cross-category header nav moves. |
| `npm run test:global-layout-align` | `tests/global-layout/lib/headerNavAlignLogic.test.ts` | `headerNavAlignLogic.ts`, `DesktopHeaderNavZones` | Header nav zone grouping, per-category alignment, dense-nav threshold, and gap CSS mapping. |
| `npm run test:drag-scroll` | `tests/lib/dragAutoScrollLogic.test.ts` | `dragAutoScrollLogic.ts`, `useDragAutoScroll.ts` | Edge auto-scroll speed ramp for Global Layout Editor and Puck pointer drags. |
| `npm run test:page-edit-access` | `tests/lib/pageEditAccess.test.ts` | `pageEditAccess.ts`, `PageEditFab.tsx` | Puck page edit FAB visibility (all CMS slugs except `/`, Admin/StudentCouncil only, hidden in edit mode). |
| `npm run test:validation` | `tests/shared/validation/schemas.test.ts` | `authSchemas.ts`, `profileSchemas.ts` | Input validation rules for credentials login, signup, registration, and profile settings. |
| `npm run test:puck` | *(meta)* | All Puck lib suites above | Runs every registered Puck unit test script in sequence. |

## Running tests

```bash
# Single suite
npm run test:mobile-nav-gestures

# All Puck lib unit tests
npm run test:puck
```

## Mobile nav gestures — manual smoke (real device or DevTools)

After changing `NexusMobileNavPanelGestures.tsx` or `mobileNavPanelGestureLogic.ts`:

1. Open Puck editor at **≤900px width** (phone or Chrome DevTools → device toolbar, e.g. iPhone 14).
2. Open a bottom-rail tab (Blocks / Outline / Fields) — panel must be **open**.
3. **Double-click/tap the active tab** (the highlighted one, icon or label) within **~300ms** between taps → panel animates to max height.
4. **Double-click/tap again** → panel returns to height before step 3.
5. **Single click/tap** active tab → panel closes after ~**340ms**.

**DevTools notes:** Emulated clicks are mouse events, not touch — use two separate clicks or a native double-click on the **active** tab label. Clicks on inactive tabs switch tabs instead. Always hard-refresh after code changes.

Always run `npm run test:mobile-nav-gestures` before marking the task complete.

## Adding a new test (template)

**Module under test** (top of source file JSDoc):

```typescript
/**
 * …
 * Tests: `tests/your/path/module.test.ts` — `npm run test:your-suite`
 */
```

**Test file header** (top of `tests/**/*.test.ts`):

```typescript
/**
 * @fileoverview Unit tests for …
 *
 * Module under test: src/your/path/module.ts
 * Registry: .ai/docs/testing.md
 * Run: `npm run test:your-suite`
 */
```

**package.json**:

```json
"test:your-suite": "npx tsx --test tests/your/path/module.test.ts"
```

**This registry**: add a row to the table above.
