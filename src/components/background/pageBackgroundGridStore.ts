/**
 * @fileoverview Live sync store for layout-level {@link InfiniteGrid} static mode.
 *
 * Puck page `pageBackground.backgroundGridMotion` is edited in the parent window while
 * `InfiniteGrid` mounts once in root `layout.tsx`. This module bridges page props to
 * `InfiniteGrid.isStatic` via `useSyncExternalStore`.
 *
 * @module src/components/background/pageBackgroundGridStore
 */

import type { Data } from "@puckeditor/core";
import {
  resolvePageBackgroundGridIsStatic,
  type PageRootStoredProps,
} from "@/components/puck/lib/pageRootFieldProps";

let gridIsStatic = false;
const listeners = new Set<() => void>();

/**
 * Notify `useSyncExternalStore` subscribers of a grid motion change.
 */
function notifyListeners(): void {
  listeners.forEach((listener) => listener());
}

/**
 * Read whether the layout-level grid should freeze tile scroll.
 *
 * @returns True when the active Puck page opts into static grid motion.
 */
export function getPageBackgroundGridIsStatic(): boolean {
  return gridIsStatic;
}

/**
 * Subscribe to layout grid motion changes for `useSyncExternalStore`.
 *
 * @param onStoreChange - Invalidation callback.
 * @returns Unsubscribe function.
 */
export function subscribePageBackgroundGrid(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

/**
 * Push resolved static mode from Puck root props into the layout grid store.
 *
 * @param props - Stored PageRoot props from Puck data.
 */
export function setPageBackgroundGridFromRootProps(props: PageRootStoredProps): void {
  const next = resolvePageBackgroundGridIsStatic(props);
  if (gridIsStatic === next) return;
  gridIsStatic = next;
  notifyListeners();
}

/**
 * Sync layout grid motion from a full Puck document.
 *
 * @param data - Puck editor or viewer payload.
 */
export function syncPageBackgroundGridFromPuckData(data: Data | null | undefined): void {
  const rootProps = (data?.root as { props?: PageRootStoredProps } | undefined)?.props ?? {};
  setPageBackgroundGridFromRootProps(rootProps);
}

/**
 * Restore layout grid to default dynamic motion (non-Puck routes).
 */
export function resetPageBackgroundGrid(): void {
  if (!gridIsStatic) return;
  gridIsStatic = false;
  notifyListeners();
}
