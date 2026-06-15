/**
 * @fileoverview Re-sync Puck DraggableComponent overlay geometry after layout shifts.
 *
 * Puck positions the blue selection frame from `getBoundingClientRect()` on
 * `[data-puck-component]`. Carousel fill media changes height after mount (fill
 * class, poster load, edit-height sync) — without a sync call the overlay stays
 * at the old (often min-height) box.
 *
 * @module src/components/puck/lib/puckOverlaySync
 */

/** Puck node registry entry exposed on the editor store. */
interface PuckNodeMethods {
  /** Re-measure component bounds and reposition the overlay portal. */
  sync?: () => void;
}

/** Minimal Puck store surface for overlay sync. */
export interface PuckOverlaySyncStore {
  nodes?: {
    nodes: Record<string, { methods?: PuckNodeMethods } | undefined>;
  };
  [key: string]: any;
}

/**
 * Re-sync the selection overlay for one canvas block.
 *
 * @param store - Puck store from `useGetPuck()`.
 * @param componentId - Block id (`props.id`).
 */
export function syncPuckComponentOverlay(
  store: PuckOverlaySyncStore,
  componentId: string | undefined,
): void {
  if (!componentId) return;

  requestAnimationFrame(() => {
    store.nodes?.nodes[componentId]?.methods?.sync?.();
  });
}

/**
 * Re-sync every nested block overlay under a DOM root (e.g. carousel slides).
 *
 * @param store - Puck store from `useGetPuck()`.
 * @param root - Container to scan for `[data-puck-component]` nodes.
 */
export function syncPuckOverlaysInRoot(
  store: PuckOverlaySyncStore,
  root: HTMLElement | null | undefined,
): void {
  if (!root) return;

  requestAnimationFrame(() => {
    root.querySelectorAll<HTMLElement>("[data-puck-component]").forEach((el) => {
      const id = el.getAttribute("data-puck-component");
      if (id) {
        store.nodes?.nodes[id]?.methods?.sync?.();
      }
    });
  });
}

/**
 * Sync one block after layout on the next two frames (poster / aspect-ratio paint).
 *
 * @param store - Puck store from `useGetPuck()`.
 * @param componentId - Block id (`props.id`).
 */
export function syncPuckComponentOverlayAfterLayout(
  store: PuckOverlaySyncStore,
  componentId: string | undefined,
): void {
  if (!componentId) return;

  requestAnimationFrame(() => {
    syncPuckComponentOverlay(store, componentId);
    requestAnimationFrame(() => {
      syncPuckComponentOverlay(store, componentId);
    });
  });
}

export default syncPuckComponentOverlay;
