/**
 * @fileoverview Puck editor shell detection and single-grid policy helpers.
 *
 * Site-default background uses one global {@link LayoutInfiniteGrid} (`#nexus-bg`) for the
 * whole app. Puck edit mode renders the preview inline (`iframe={{ enabled: false }}`) so the
 * canvas stays transparent and the layout grid shows through — no duplicate grid.
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

/**
 * Resolve whether PageRoot should mount InfiniteGrid inside the preview document.
 *
 * Always false — only the layout `#nexus-bg` paints the site grid.
 *
 * @param _input - Legacy PageRoot flags (ignored).
 * @returns Always false.
 */
export function resolveShowPreviewIframeGrid(_input: {
  showEditorBackground?: boolean;
  background?: string;
  shellScrollportGrid?: boolean;
  insidePuckEditorShell?: boolean;
  requiresIframeContainedEditGrid?: boolean;
}): boolean {
  return false;
}

/**
 * Whether the shell scrollport grid should stay suppressed.
 *
 * @returns Always true — only `#nexus-bg` may paint the site grid.
 */
export function shouldSuppressShellScrollportGridForIframeContainedEdit(
  _input: { requiresIframeContainedEditGrid?: boolean; showIframeGrid?: boolean } = {},
): boolean {
  return true;
}
