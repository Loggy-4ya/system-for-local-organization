/**
 * @fileoverview Build Puck outline zone trees from indexed editor state.
 *
 * Mirrors Puck's internal `buildLayerTree` / `buildLayerNode` helpers so the
 * Nexus draggable outline matches native Outline labels and nesting.
 *
 * @module src/components/puck/lib/outlineTreeModel
 */

import type { Config } from "@puckeditor/core";

/** Puck node index entry (subset used by the outline tree). */
export interface OutlineNodeIndexEntry {
  /** Component payload. */
  data: { type: string; props: { id: string } };
  /** Zone path segments for selection ancestry. */
  path?: string[];
}

/** Puck zone index entry. */
export interface OutlineZoneIndexEntry {
  /** Ordered child component ids in this zone. */
  contentIds: string[];
}

/** Puck indexes consumed by the outline tree builder. */
export interface OutlineIndexes {
  /** Component id → node metadata. */
  nodes: Record<string, OutlineNodeIndexEntry>;
  /** Zone compound key → zone metadata. */
  zones: Record<string, OutlineZoneIndexEntry>;
}

/** Single component row in the outline tree. */
export interface OutlineLayerNode {
  /** Puck block id (`props.id`). */
  itemId: string;
  /** Registry component key. */
  componentType: string;
  /** Human-readable label from config. */
  label: string;
  /** Index within the parent zone. */
  index: number;
  /** Parent zone compound key. */
  zoneCompound: string;
  /** Nested slot / dropzone trees. */
  childZones: OutlineZoneTree[];
}

/** One drop zone and its direct children in the outline. */
export interface OutlineZoneTree {
  /** Zone compound key (`parentId:slotId`). */
  zoneCompound: string;
  /** Slot label from field config, when present. */
  label?: string;
  /** Sibling components in this zone. */
  items: OutlineLayerNode[];
}

const ROOT_AREA_ID = "root";

/**
 * Group zone compound keys by their parent component id.
 *
 * @param zones - Puck zone index.
 * @returns Parent id → zone compound keys.
 */
function getZonesByParent(zones: OutlineIndexes["zones"]): Record<string, string[]> {
  return Object.keys(zones).reduce<Record<string, string[]>>((acc, zone) => {
    const [parentId] = zone.split(":");
    acc[parentId] = [...(acc[parentId] ?? []), zone];
    return acc;
  }, {});
}

/**
 * Resolve a slot / zone title for the outline tree.
 *
 * @param zoneCompound - Zone compound key.
 * @param nodes - Puck node index.
 * @param config - Puck component config.
 * @param label - Explicit label override.
 * @returns Zone title or undefined for the root zone.
 */
function getZoneLabel(
  zoneCompound: string,
  nodes: OutlineIndexes["nodes"],
  config: Config,
  label?: string,
): string | undefined {
  if (label !== undefined) {
    return label;
  }

  const [componentId, slotId] = zoneCompound.split(":");
  if (!slotId) {
    return undefined;
  }

  const componentType = nodes[componentId]?.data.type;
  const configForComponent =
    componentType && componentType !== ROOT_AREA_ID
      ? config.components[componentType]
      : config.root;
  const field = configForComponent?.fields?.[slotId];

  if (field && typeof field === "object" && "label" in field && field.label) {
    return String(field.label);
  }

  return slotId;
}

/**
 * Build one outline row for a component id.
 *
 * @param params - Node build inputs.
 * @returns Outline layer node.
 */
function buildOutlineLayerNode(params: {
  config: Config;
  itemId: string;
  index: number;
  nodes: OutlineIndexes["nodes"];
  zoneCompound: string;
  zones: OutlineIndexes["zones"];
  zonesByParent: Record<string, string[]>;
}): OutlineLayerNode {
  const { config, itemId, index, nodes, zoneCompound, zones, zonesByParent } = params;
  const nodeData = nodes[itemId];
  const componentType = nodeData?.data.type?.toString() ?? "Component";
  const componentConfig = config.components[componentType];
  const label =
    (componentConfig && "label" in componentConfig ? componentConfig.label : undefined) ??
    componentType;
  const childZoneCompounds = zonesByParent[itemId] ?? [];

  return {
    childZones: childZoneCompounds.map((childZoneCompound) =>
      buildOutlineZoneTree({
        config,
        nodes,
        zoneCompound: childZoneCompound,
        zones,
        zonesByParent,
      }),
    ),
    componentType,
    index,
    itemId,
    label: String(label),
    zoneCompound,
  };
}

/**
 * Build an outline tree for one zone compound key.
 *
 * @param params - Zone build inputs.
 * @returns Outline zone tree.
 */
export function buildOutlineZoneTree(params: {
  config: Config;
  label?: string;
  nodes: OutlineIndexes["nodes"];
  zoneCompound: string;
  zones: OutlineIndexes["zones"];
  zonesByParent?: Record<string, string[]>;
}): OutlineZoneTree {
  const { config, label, nodes, zoneCompound, zones } = params;
  const zonesByParent = params.zonesByParent ?? getZonesByParent(zones);
  const contentIds = zones[zoneCompound]?.contentIds ?? [];

  return {
    items: contentIds.map((itemId, index) =>
      buildOutlineLayerNode({
        config,
        itemId,
        index,
        nodes,
        zoneCompound,
        zones,
        zonesByParent,
      }),
    ),
    label: getZoneLabel(zoneCompound, nodes, config, label),
    zoneCompound,
  };
}

/**
 * Find zone compound keys whose area id matches `root`.
 *
 * @param zones - Puck zone index.
 * @returns Root-level zone compound keys.
 */
export function findRootZoneCompounds(zones: OutlineIndexes["zones"]): string[] {
  return Object.keys(zones).filter((zone) => zone.split(":")[0] === ROOT_AREA_ID);
}

/**
 * Build root outline trees for the page.
 *
 * @param config - Puck config.
 * @param indexes - Puck node + zone indexes.
 * @returns Root zone trees rendered in the Outline panel.
 */
export function buildOutlineTrees(config: Config, indexes: OutlineIndexes): OutlineZoneTree[] {
  const rootZones = findRootZoneCompounds(indexes.zones);

  return rootZones.map((zoneCompound) =>
    buildOutlineZoneTree({
      config,
      label: rootZones.length === 1 ? "" : zoneCompound.split(":")[1],
      nodes: indexes.nodes,
      zoneCompound,
      zones: indexes.zones,
    }),
  );
}
