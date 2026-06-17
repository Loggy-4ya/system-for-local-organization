/**
 * @fileoverview Puck preview iframe vs editor shell detection.
 *
 * Site-default background is painted only by the global `InfiniteGrid` in `layout.tsx`
 * (`#nexus-bg`). No duplicate scrollport or iframe-contained grids.
 *
 * Tests: `tests/puck/lib/previewIframeGridBacking.test.ts` — `npm run test:preview-iframe-grid-backing`
 *
 * @module src/components/puck/lib/previewIframeGridBacking
 */

/**
 * Whether the given window renders inside (or hosts) the Puck editor shell.
 *
 * @param target - Window to inspect; defaults to the current window.
 * @returns True when `.Puck` is mounted on the parent or current document.
 */
export function isInsidePuckEditorShell(target: Window = window): boolean {
  if (typeof target === "undefined") return false;

  try {
    const parent = target.parent;
    if (parent && parent !== target) {
      return parent.document.querySelector(".Puck") !== null;
    }
  } catch {
    /* cross-origin parent */
  }

  try {
    return target.document.querySelector(".Puck") !== null;
  } catch {
    return false;
  }
}
