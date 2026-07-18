/**
 * @fileoverview Puck editor grid host ids (legacy markers).
 *
 * Site-default background uses one global layout grid (`#nexus-bg`) only. Puck edit mode uses
 * inline preview (`iframe.enabled: false`) so the canvas stays transparent — no contained mirror.
 *
 * @module src/components/background/puckCanvasGridHostStore
 */

/** @deprecated Canvas mirror host — no longer mounted. */
export const NEXUS_PUCK_GRID_HOST_ID = "nexus-puck-grid-host";

/** @deprecated Canvas mirror wrapper — no longer mounted. */
export const NEXUS_CANVAS_EDIT_GRID_ID = "nexus-canvas-edit-grid";

/** DOM id for the optional mount marker inside the preview iframe. */
export const NEXUS_IFRAME_GRID_HOST_ID = "nexus-iframe-grid-host";

let puckEditorSiteGridRelocated = false;
/** @deprecated Host pointer kept for tests that inspect portal targets. */
let puckCanvasGridHost: HTMLElement | null = null;
const listeners = new Set<() => void>();

/**
 * Notify `useSyncExternalStore` subscribers when edit-mode grid flags change.
 */
function notifyListeners(): void {
  listeners.forEach((listener) => listener());
}

/**
 * @deprecated Canvas mirror removed — always false.
 * @returns Always false.
 */
export function getPuckEditorCanvasGridMounted(): boolean {
  return false;
}

/**
 * @deprecated Canvas mirror removed.
 */
export function subscribePuckEditorCanvasGridMounted(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

/**
 * @deprecated No-op.
 */
export function setPuckEditorCanvasGridMounted(_mounted: boolean): void {
  /* deprecated */
}

/**
 * Whether the layout grid renders inside the Puck preview iframe instead of the shell layout.
 *
 * @returns True while the Puck editor owns the single `#nexus-bg` instance.
 */
export function getPuckEditorSiteGridRelocated(): boolean {
  return puckEditorSiteGridRelocated;
}

/**
 * Subscribe to Puck grid relocation for `useSyncExternalStore`.
 *
 * @param onStoreChange - Invalidation callback.
 * @returns Unsubscribe function.
 */
export function subscribePuckEditorSiteGridRelocated(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

/**
 * Toggle whether {@link LayoutInfiniteGrid} should defer to the iframe copy.
 *
 * @param relocated - True when Puck edit routes mount `#nexus-bg` in the preview iframe.
 */
export function setPuckEditorSiteGridRelocated(relocated: boolean): void {
  if (puckEditorSiteGridRelocated === relocated) {
    return;
  }

  puckEditorSiteGridRelocated = relocated;
  notifyListeners();
}

/**
 * @deprecated Use {@link getPuckEditorSiteGridRelocated}.
 * @returns Preview iframe grid host when present.
 */
export function getPuckCanvasGridHost(): HTMLElement | null {
  return puckCanvasGridHost;
}

/**
 * @deprecated Use {@link subscribePuckEditorSiteGridRelocated}.
 */
export function subscribePuckCanvasGridHost(onStoreChange: () => void): () => void {
  return subscribePuckEditorSiteGridRelocated(onStoreChange);
}

/**
 * Record the preview iframe grid host for diagnostics (optional).
 *
 * @param host - Host marker inside the iframe, or null when leaving edit.
 */
export function setPuckCanvasGridHost(host: HTMLElement | null): void {
  puckCanvasGridHost = host;
}
