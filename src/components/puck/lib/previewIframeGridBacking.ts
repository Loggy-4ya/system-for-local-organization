/**
 * @fileoverview Resolve when PageRoot should paint site-default InfiniteGrid inside the
 * Puck preview iframe.
 *
 * Default: shell scrollport grid only (single grid). Edit and interactive preview use an
 * iframe-contained grid when shell bleed-through fails (see {@link previewIframeShellComposite}).
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
 * Resolve whether PageRoot should mount InfiniteGrid inside the preview iframe.
 *
 * @param input - Edit/preview flags from PageRoot render.
 * @returns True when the iframe document should own the site-default grid.
 */
export function resolveShowPreviewIframeGrid(input: {
  showEditorBackground: boolean;
  background: string;
  shellScrollportGrid: boolean;
  insidePuckEditorShell: boolean;
  requiresIframeContainedEditGrid: boolean;
}): boolean {
  const {
    showEditorBackground,
    background,
    shellScrollportGrid,
    insidePuckEditorShell,
    requiresIframeContainedEditGrid,
  } = input;

  if (!showEditorBackground || background !== "site-default") {
    return false;
  }

  if (insidePuckEditorShell && requiresIframeContainedEditGrid) {
    return true;
  }

  if (insidePuckEditorShell || shellScrollportGrid) {
    return false;
  }

  return true;
}

/**
 * Whether the shell scrollport grid should defer to the iframe-contained edit grid.
 *
 * @param input - Parent shell flags.
 * @returns True when `NexusEditorScrollportGrid` should not mount.
 */
export function shouldSuppressShellScrollportGridForIframeContainedEdit(input: {
  requiresIframeContainedEditGrid: boolean;
}): boolean {
  return input.requiresIframeContainedEditGrid;
}
