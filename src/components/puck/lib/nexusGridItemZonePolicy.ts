/**
 * @fileoverview Zone policy — {@link NexusGridItem} may only live in {@link NexusGrid} `content`.
 *
 * **Canonical rule:** the only valid destination is `{gridBlockId}:content` where the
 * parent node's type is {@link NEXUS_GRID_TYPE}. See
 * [`.ai/docs/features/puck_grid_item_zone_policy.md`](../../../../.ai/docs/features/puck_grid_item_zone_policy.md).
 *
 * Enforcement: slot `disallow` on non-grid containers; outline drop filter;
 * {@link NexusGridItemPlacementGuard} reverts invalid root placements (`root:default-zone`).
 *
 * Tests: `tests/puck/lib/nexusGridItemZonePolicy.test.ts` — `npm run test:nexus-grid-item-zone`
 *
 * @module src/components/puck/lib/nexusGridItemZonePolicy
 */

/** Puck registry key for the grid cell block. */
export const NEXUS_GRID_ITEM_TYPE = "NexusGridItem";

/** Puck registry key for the CSS grid container block. */
export const NEXUS_GRID_TYPE = "NexusGrid";

/** Slot field on {@link NEXUS_GRID_TYPE} that accepts grid items. */
export const NEXUS_GRID_CONTENT_SLOT = "content";

/** Puck legacy page-root zone compound key. */
export const PUCK_ROOT_DROPPABLE_ID = "root:default-zone";

/** Slot `disallow` list for every zone except {@link NEXUS_GRID_CONTENT_SLOT}. */
export const DISALLOW_NEXUS_GRID_ITEM = [NEXUS_GRID_ITEM_TYPE] as const;

/** Minimal Puck node index entry for parent type lookup. */
export interface NexusGridItemZoneNode {
  /** Component payload. */
  data: { type: string };
}

/** Puck indexes subset used for placement validation. */
export interface NexusGridItemZoneIndexes {
  /** Component id → node metadata. */
  nodes: Record<string, NexusGridItemZoneNode>;
}

/**
 * Split a Puck zone compound key into parent id and slot path.
 *
 * @param zoneCompound - Puck zone compound key (`parentId:slotPath`).
 * @returns Parsed parent id and slot path.
 */
export function parseZoneCompound(zoneCompound: string): { parentId: string; slotId: string } {
  const colonIndex = zoneCompound.indexOf(":");
  if (colonIndex === -1) {
    return { parentId: zoneCompound, slotId: "" };
  }

  return {
    parentId: zoneCompound.slice(0, colonIndex),
    slotId: zoneCompound.slice(colonIndex + 1),
  };
}

/**
 * Whether a zone is the primary `content` slot on a {@link NEXUS_GRID_TYPE} block.
 *
 * @param zoneCompound - Destination zone compound key.
 * @param nodes - Puck node index.
 * @returns True when grid items may be inserted or moved here.
 */
export function isNexusGridContentZone(
  zoneCompound: string,
  nodes: NexusGridItemZoneIndexes["nodes"],
): boolean {
  const { parentId, slotId } = parseZoneCompound(zoneCompound);

  if (parentId === "root" || slotId !== NEXUS_GRID_CONTENT_SLOT) {
    return false;
  }

  return nodes[parentId]?.data.type === NEXUS_GRID_TYPE;
}

/**
 * Whether a grid item may be placed in the given destination zone.
 *
 * @param zoneCompound - Destination zone compound key.
 * @param nodes - Puck node index.
 * @returns True when the destination accepts {@link NEXUS_GRID_ITEM_TYPE}.
 */
export function isValidNexusGridItemDestinationZone(
  zoneCompound: string,
  nodes: NexusGridItemZoneIndexes["nodes"],
): boolean {
  return isNexusGridContentZone(zoneCompound, nodes);
}

/**
 * Find the zone compound that currently contains a block id.
 *
 * @param itemId - Puck block id.
 * @param zones - Puck zone index (`contentIds` per zone).
 * @returns Zone compound key, or null when not found.
 */
export function findZoneCompoundForItemId(
  itemId: string,
  zones: Record<string, { contentIds: string[] }>,
): string | null {
  for (const [zoneCompound, zone] of Object.entries(zones)) {
    if (zone.contentIds.includes(itemId)) {
      return zoneCompound;
    }
  }

  return null;
}

/**
 * List grid item ids that sit outside a {@link NEXUS_GRID_TYPE} `content` slot.
 *
 * @param indexes - Puck indexes.
 * @returns Misplaced grid item block ids.
 */
export function findMisplacedNexusGridItemIds(indexes: NexusGridItemZoneIndexes & {
  zones: Record<string, { contentIds: string[] }>;
}): string[] {
  const misplaced: string[] = [];

  for (const [itemId, node] of Object.entries(indexes.nodes)) {
    if (node.data.type !== NEXUS_GRID_ITEM_TYPE) {
      continue;
    }

    const zoneCompound = findZoneCompoundForItemId(itemId, indexes.zones);
    if (!zoneCompound || !isValidNexusGridItemDestinationZone(zoneCompound, indexes.nodes)) {
      misplaced.push(itemId);
    }
  }

  return misplaced;
}

/** Puck actions that can change block placement. */
const PLACEMENT_ACTION_TYPES = new Set(["insert", "move", "reorder", "duplicate", "replace"]);

/**
 * Whether a Puck action can change where blocks live in the tree.
 *
 * @param action - Puck reducer action.
 * @returns True for insert/move/reorder/duplicate/replace.
 */
export function isGridItemPlacementAction(action: { type: string }): boolean {
  return PLACEMENT_ACTION_TYPES.has(action.type);
}

/**
 * Whether an insert action targets a zone that rejects grid items.
 *
 * @param action - Puck insert action.
 * @param nodes - Puck node index.
 * @returns True when the insert should be rejected.
 */
export function shouldRejectNexusGridItemInsert(
  action: { type: string; componentType?: string; destinationZone?: string },
  nodes: NexusGridItemZoneIndexes["nodes"],
): boolean {
  if (action.type !== "insert" || action.componentType !== NEXUS_GRID_ITEM_TYPE) {
    return false;
  }

  const destinationZone = action.destinationZone ?? "";
  return !isValidNexusGridItemDestinationZone(destinationZone, nodes);
}

/**
 * Whether indexes contain any grid item outside {@link NEXUS_GRID_TYPE} `content`.
 *
 * @param indexes - Puck indexes with zones map.
 * @returns True when at least one grid item is misplaced.
 */
export function hasMisplacedNexusGridItems(
  indexes: NexusGridItemZoneIndexes & {
    zones: Record<string, { contentIds: string[] }>;
  },
): boolean {
  return findMisplacedNexusGridItemIds(indexes).length > 0;
}

/** Puck indexes map shape on `getPuck().__private.appState`. */
export type PuckEditorIndexes = NexusGridItemZoneIndexes & {
  zones: Record<string, { contentIds: string[] }>;
};

/** Subset of `useGetPuck()` used for placement guard reads and revert dispatch. */
export interface PuckEditorStoreWithPrivate {
  /** Puck reducer dispatch. */
  dispatch: (action: {
    type: string;
    data?: unknown;
    recordHistory?: boolean;
  }) => void;
  /** Private app state (indexes live here — not on public `appState`). */
  __private?: {
    appState: {
      indexes: PuckEditorIndexes;
    };
  };
}

/**
 * Read Puck editor indexes from a `getPuck()` store snapshot.
 *
 * @param puck - Store returned by {@link useGetPuck} / `getPuck()`.
 * @returns Index maps, or null when private state is unavailable.
 */
export function resolvePuckEditorIndexes(puck: PuckEditorStoreWithPrivate): PuckEditorIndexes | null {
  return puck.__private?.appState.indexes ?? null;
}
