"use client";

/**
 * @fileoverview Reverts invalid {@link NexusGridItem} placements on the page-root zone.
 *
 * Nested slots use `disallow`; legacy `root:default-zone` is guarded via `onAction`.
 *
 * @module src/components/puck/NexusGridItemPlacementGuard
 */

import { useGetPuck, type PuckAction } from "@puckeditor/core";
import {
  hasMisplacedNexusGridItems,
  isGridItemPlacementAction,
  resolvePuckEditorIndexes,
  type PuckEditorStoreWithPrivate,
} from "@/components/puck/lib/nexusGridItemZonePolicy";

/**
 * Bridge ref populated by {@link NexusGridItemPlacementGuard} for shell-level `onAction`.
 *
 * @internal
 */
export const nexusGridItemPlacementGetPuckRef: {
  current: (() => PuckEditorStoreWithPrivate) | null;
} = { current: null };

/**
 * Handle Puck `onAction` — revert when a placement action leaves grid items outside grids.
 *
 * @param action - Dispatched Puck action.
 * @param _appState - Public app state after the action (no indexes).
 * @param prevAppState - Public app state before the action.
 */
export function handleNexusGridItemPlacementAction(
  action: PuckAction,
  _appState: { data: unknown },
  prevAppState: { data: unknown },
): void {
  if (!isGridItemPlacementAction(action)) {
    return;
  }

  const getPuck = nexusGridItemPlacementGetPuckRef.current;
  if (!getPuck) {
    return;
  }

  const puck = getPuck();
  const indexes = resolvePuckEditorIndexes(puck);
  if (!indexes || !hasMisplacedNexusGridItems(indexes)) {
    return;
  }

  puck.dispatch({
    type: "setData",
    data: prevAppState.data as never,
    recordHistory: false,
  });
}

/**
 * Registers `useGetPuck` for {@link handleNexusGridItemPlacementAction}.
 *
 * @returns Null render.
 */
export function NexusGridItemPlacementGuard(): null {
  nexusGridItemPlacementGetPuckRef.current = useGetPuck() as () => PuckEditorStoreWithPrivate;
  return null;
}

export default NexusGridItemPlacementGuard;
