/**
 * @fileoverview Shared tile offsets for the layout grid and Puck canvas mirror.
 *
 * The layout {@link InfiniteGrid} (`#nexus-bg`) is the sole animation driver. A contained
 * mirror behind the Puck preview iframe repaints from this store so the canvas shares one
 * continuous lining with the rest of the page.
 *
 * @module src/components/background/infiniteGridSyncStore
 */

/** Published paint state from the layout-level grid engine. */
export interface InfiniteGridSyncState {
  /** Horizontal tile scroll offset in CSS px. */
  offsetX: number;
  /** Vertical tile scroll offset in CSS px. */
  offsetY: number;
  /** Whether the light palette is active. */
  isLightTheme: boolean;
  /** Active cell size for modulo alignment. */
  cellGridSize: number;
  /** Monotonic counter bumped on each publish. */
  revision: number;
}

const DEFAULT_STATE: InfiniteGridSyncState = {
  offsetX: 0,
  offsetY: 0,
  isLightTheme: false,
  cellGridSize: 150,
  revision: 0,
};

let syncState: InfiniteGridSyncState = { ...DEFAULT_STATE };
const listeners = new Set<() => void>();

/**
 * Positive modulo for tile offset alignment.
 *
 * @param value - Raw offset.
 * @param modulus - Cell size.
 * @returns Value in `[0, modulus)`.
 */
export function modGridOffset(value: number, modulus: number): number {
  if (modulus <= 0) {
    return 0;
  }

  return ((value % modulus) + modulus) % modulus;
}

/**
 * Resolve mirror offsets so a contained grid aligns with the layout grid at `viewportRect`.
 *
 * @param sync - Layout grid publish snapshot.
 * @param viewportRect - Mirror wrapper position in viewport CSS px.
 * @returns Local tile offsets for the mirror canvas.
 */
export function resolveMirroredGridOffsets(
  sync: InfiniteGridSyncState,
  viewportRect: { left: number; top: number },
): { offsetX: number; offsetY: number } {
  const cell = sync.cellGridSize;

  return {
    offsetX: modGridOffset(sync.offsetX + viewportRect.left, cell),
    offsetY: modGridOffset(sync.offsetY + viewportRect.top, cell),
  };
}

/**
 * Read the latest layout grid sync snapshot.
 *
 * @returns Current published offsets and theme.
 */
export function getInfiniteGridSyncState(): InfiniteGridSyncState {
  return syncState;
}

/**
 * Publish layout grid offsets after each paint frame.
 *
 * @param partial - Fields to merge into the sync snapshot.
 */
export function publishInfiniteGridSync(
  partial: Pick<InfiniteGridSyncState, "offsetX" | "offsetY" | "isLightTheme" | "cellGridSize">,
): void {
  syncState = {
    ...syncState,
    ...partial,
    revision: syncState.revision + 1,
  };

  listeners.forEach((listener) => listener());
}

/**
 * Subscribe to layout grid offset publishes.
 *
 * @param onStoreChange - Invalidation callback.
 * @returns Unsubscribe function.
 */
export function subscribeInfiniteGridSync(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}
