/**
 * @fileoverview Utilities for walking and mutating Puck document trees.
 *
 * @module src/components/puck/lib/puckDataTree
 */

import type { Data } from "@puckeditor/core";
import { isIslandActive, type BlockShellProps } from "./spacingFields";
import {
  formatGridItemLabel,
  type GridItemRecord,
} from "./gridItemLabels";
import {
  NEXUS_GRID_ITEM_DEFAULT_SPAN_COL,
  NEXUS_GRID_ITEM_DEFAULT_SPAN_ROW,
} from "./gridEditSizing";

/** Legacy standalone grid item block type (pre-array refactor). */
const LEGACY_NEXUS_GRID_ITEM_TYPE = "NexusGridItem";

/** Minimal Puck component node shape. */
export interface PuckComponentNode {
  type: string;
  props: Record<string, unknown>;
}

/** Parent lookup result for a component id. */
export interface PuckParentRef {
  /** Parent component node, or null when inserted at root content. */
  parent: PuckComponentNode | null;
  /** Matched child node. */
  node: PuckComponentNode;
}

/**
 * Determine whether a value looks like a Puck component instance.
 *
 * @param value - Arbitrary prop value.
 * @returns True when value has `type` and `props.id`.
 */
function isComponentNode(value: unknown): value is PuckComponentNode {
  if (!value || typeof value !== "object") return false;
  const record = value as PuckComponentNode;
  return typeof record.type === "string" && typeof record.props?.id === "string";
}

/**
 * Determine whether a value is an array containing Puck component instances.
 *
 * @param value - Arbitrary prop value.
 * @returns True when the array has at least one component node.
 */
function isComponentArray(value: unknown): value is PuckComponentNode[] {
  return Array.isArray(value) && value.length > 0 && value.some(isComponentNode);
}

/**
 * Recursively visit every component node in the document.
 *
 * @param nodes - Component array to walk.
 * @param parent - Parent node (null at root content level).
 * @param visit - Callback invoked per node.
 */
function walkComponentNodes(
  nodes: PuckComponentNode[],
  parent: PuckComponentNode | null,
  visit: (node: PuckComponentNode, parent: PuckComponentNode | null) => void,
): void {
  for (const node of nodes) {
    visit(node, parent);

    for (const value of Object.values(node.props)) {
      if (isComponentArray(value)) {
        walkComponentNodes(value.filter(isComponentNode), node, visit);
        continue;
      }

      if (Array.isArray(value)) {
        for (const item of value) {
          if (item && typeof item === "object" && !isComponentNode(item)) {
            for (const nested of Object.values(item as Record<string, unknown>)) {
              if (isComponentArray(nested)) {
                walkComponentNodes(nested, node, visit);
              }
            }
          }
        }
      }
    }
  }
}

/**
 * Visit every component in a Puck document with parent context.
 *
 * @param data - Puck document state.
 * @param visit - Callback invoked per node.
 */
export function walkAllComponents(
  data: Data,
  visit: (node: PuckComponentNode, parent: PuckComponentNode | null) => void,
): void {
  walkComponentNodes((data.content ?? []) as PuckComponentNode[], null, visit);
}

/**
 * Collect all component ids in a Puck document.
 *
 * @param data - Puck document state.
 * @returns Set of component ids.
 */
export function collectComponentIds(data: Data): Set<string> {
  const ids = new Set<string>();

  walkComponentNodes((data.content ?? []) as PuckComponentNode[], null, (node) => {
    ids.add(String(node.props.id));
  });

  return ids;
}

/**
 * Find ids present in `next` but not in `prev`.
 *
 * @param prev - Previous document snapshot.
 * @param next - Current document snapshot.
 * @returns Newly inserted component ids.
 */
export function findNewComponentIds(prev: Data, next: Data): string[] {
  const prevIds = collectComponentIds(prev);
  const added: string[] = [];

  collectComponentIds(next).forEach((id) => {
    if (!prevIds.has(id)) added.push(id);
  });

  return added;
}

/**
 * Locate a component and its parent by id.
 *
 * @param data - Puck document state.
 * @param id - Target component id.
 * @returns Parent reference or null when not found.
 */
export function findComponentById(data: Data, id: string): PuckParentRef | null {
  let found: PuckParentRef | null = null;

  walkComponentNodes((data.content ?? []) as PuckComponentNode[], null, (node, parent) => {
    if (node.props.id === id) {
      found = { parent, node };
    }
  });

  return found;
}

import { NEXUS_GRID_TYPE } from "./nexusGridItemZonePolicy";

/** Puck block types whose slot children already live inside a framed shell. */
export const SLOT_SHELL_COMPONENT_TYPES = new Set(["NexusCarousel", "NexusTabs"]);

/**
 * Host types whose nested children should not retain root-level auto margins on insert/move.
 *
 * Includes carousel/tab slot shells and {@link NEXUS_GRID_TYPE} cell slots.
 */
export const NESTED_MARGIN_RESET_HOST_TYPES = new Set([
  ...SLOT_SHELL_COMPONENT_TYPES,
  NEXUS_GRID_TYPE,
]);

/**
 * Whether a component type provides a slot shell that replaces per-block island framing.
 *
 * @param type - Puck registry key.
 * @returns True for carousel slides and tab panels.
 */
export function isSlotShellComponentType(type: string | undefined): boolean {
  return Boolean(type && SLOT_SHELL_COMPONENT_TYPES.has(type));
}

/**
 * Whether a host type resets nested block vertical margins (grid cells, carousel slides, tabs).
 *
 * @param type - Puck registry key.
 * @returns True when children should not keep root canvas SM margins.
 */
export function isNestedMarginResetHostType(type: string | undefined): boolean {
  return Boolean(type && NESTED_MARGIN_RESET_HOST_TYPES.has(type));
}

/**
 * Whether any ancestor of the component has island mode active.
 *
 * Used by the island sidebar to disable nested island toggles.
 *
 * @param data - Puck document state.
 * @param componentId - Target component id.
 * @returns True when a parent block already renders an island shell.
 */
export function hasAncestorWithActiveIsland(data: Data, componentId: string): boolean {
  let match = findComponentById(data, componentId);

  while (match?.parent) {
    const parentProps = match.parent.props as BlockShellProps;
    if (isIslandActive(parentProps)) {
      return true;
    }

    const parentId = String(match.parent.props.id ?? "");
    if (!parentId) break;
    match = findComponentById(data, parentId);
  }

  return false;
}

/**
 * Whether any ancestor is a slot-shell block (carousel slide / tab panel host).
 *
 * Slot children should not auto-enable island — the parent strip already frames content.
 *
 * @param data - Puck document state.
 * @param componentId - Target component id.
 * @returns True when nested under {@link SLOT_SHELL_COMPONENT_TYPES}.
 */
export function hasAncestorWithSlotShell(data: Data, componentId: string): boolean {
  let match = findComponentById(data, componentId);

  while (match?.parent) {
    if (isSlotShellComponentType(match.parent.type)) {
      return true;
    }

    const parentId = String(match.parent.props.id ?? "");
    if (!parentId) break;
    match = findComponentById(data, parentId);
  }

  return false;
}

/**
 * Deep-clone and patch props on a component node.
 *
 * @param node - Source component node.
 * @param patch - Partial props to merge.
 * @returns Cloned node with patched props.
 */
function patchNodeProps(node: PuckComponentNode, patch: Record<string, unknown>): PuckComponentNode {
  const nextProps: Record<string, unknown> = {
    ...node.props,
    ...patch,
  };

  if (patch.spacing && typeof patch.spacing === "object") {
    nextProps.spacing = {
      ...((node.props.spacing as Record<string, unknown> | undefined) ?? {}),
      ...(patch.spacing as Record<string, unknown>),
    };
  }

  if (patch.island && typeof patch.island === "object") {
    nextProps.island = {
      ...((node.props.island as Record<string, unknown> | undefined) ?? {}),
      ...(patch.island as Record<string, unknown>),
    };
  }

  return {
    ...node,
    props: nextProps,
  };
}

/**
 * Recursively map component trees, replacing the node matching `targetId`.
 *
 * @param nodes - Component array at the current level.
 * @param targetId - Id to replace.
 * @param patch - Props patch for the matched node.
 * @returns Updated component array.
 */
function mapComponentNodes(
  nodes: PuckComponentNode[],
  targetId: string,
  patch: Record<string, unknown>,
): PuckComponentNode[] {
  return nodes.map((node) => {
    const nextNode =
      node.props.id === targetId ? patchNodeProps(node, patch) : { ...node, props: { ...node.props } };

    const nextProps: Record<string, unknown> = { ...nextNode.props };

    for (const [key, value] of Object.entries(nextProps)) {
      if (isComponentArray(value)) {
        nextProps[key] = mapComponentNodes(value.filter(isComponentNode), targetId, patch);
        continue;
      }

      if (Array.isArray(value)) {
        nextProps[key] = value.map((item) => {
          if (!item || typeof item !== "object") return item;

          const record = { ...(item as Record<string, unknown>) };
          for (const [nestedKey, nestedValue] of Object.entries(record)) {
            if (isComponentArray(nestedValue)) {
              record[nestedKey] = mapComponentNodes(nestedValue, targetId, patch);
            }
          }
          return record;
        });
      }
    }

    return { ...nextNode, props: nextProps };
  });
}

/**
 * Immutably merge props into a component identified by id.
 *
 * @param data - Puck document state.
 * @param id - Target component id.
 * @param patch - Partial props to merge onto the component.
 * @returns Updated document, or the original when id is missing.
 */
export function replaceComponentProps(
  data: Data,
  id: string,
  patch: Record<string, unknown>,
): Data {
  if (!findComponentById(data, id)) return data;

  return {
    ...data,
    content: mapComponentNodes((data.content ?? []) as PuckComponentNode[], id, patch),
  };
}

/** Legacy carousel slide shape before slot-only refactor. */
interface LegacyCarouselSlide {
  label?: string;
  title?: string;
  caption?: string;
  image?: string;
  linkUrl?: string;
  content?: PuckComponentNode[];
}

/**
 * Determine whether a slide array item uses the legacy carousel schema.
 *
 * @param slide - Slide record from Puck props.
 * @returns True when legacy image/title fields are present.
 */
function isLegacyCarouselSlide(slide: Record<string, unknown>): boolean {
  return (
    "image" in slide ||
    "title" in slide ||
    "caption" in slide ||
    "linkUrl" in slide
  );
}

/**
 * Build a synthetic NexusImage node for migrated carousel hero images.
 *
 * @param imageUrl - Legacy slide image URL.
 * @param alt - Alt text derived from slide metadata.
 * @returns Puck component node for NexusImage.
 */
function buildMigratedCarouselImage(imageUrl: string, alt: string): PuckComponentNode {
  return {
    type: "NexusImage",
    props: {
      id: crypto.randomUUID(),
      image: imageUrl,
      alt,
      width: "100%",
      height: "auto",
      align: "center",
      borderRadius: "var(--radius-md)",
      shadowDepth: "none",
    },
  };
}

/**
 * Normalize a single carousel slide to the slot-only `{ label, content }` model.
 *
 * @param slide - Raw slide props from saved Puck data.
 * @param index - Zero-based slide index for fallback labels.
 * @returns Normalized slide record.
 */
function normalizeCarouselSlide(
  slide: Record<string, unknown>,
  index: number,
): { label: string; content: PuckComponentNode[] } {
  const legacy = slide as LegacyCarouselSlide;
  const existingContent = Array.isArray(legacy.content)
    ? legacy.content.filter(isComponentNode)
    : [];

  const label =
    (typeof legacy.label === "string" && legacy.label.trim()) ||
    (typeof legacy.title === "string" && legacy.title.trim()) ||
    (typeof legacy.caption === "string" && legacy.caption.trim().slice(0, 40)) ||
    `Slide ${index + 1}`;

  const alt =
    (typeof legacy.title === "string" && legacy.title.trim()) ||
    (typeof legacy.caption === "string" && legacy.caption.trim()) ||
    label;

  const hasImageBlock = existingContent.some((node) => node.type === "NexusImage");
  const imageUrl = typeof legacy.image === "string" ? legacy.image.trim() : "";

  const content =
    imageUrl && !hasImageBlock
      ? [buildMigratedCarouselImage(imageUrl, alt), ...existingContent]
      : existingContent;

  return { label, content };
}

/**
 * Migrate legacy NexusCarousel slides (image/title/caption) to slot-only `{ label, content }`.
 *
 * @param data - Puck document state.
 * @returns Document with normalized carousel slide arrays.
 */
export function normalizeCarouselSlides(data: Data): Data {
  let result = data;

  walkAllComponents(data, (node) => {
    if (node.type !== "NexusCarousel") return;

    const slides = node.props.slides;
    if (!Array.isArray(slides) || slides.length === 0) return;

    const needsMigration = slides.some(
      (slide) => slide && typeof slide === "object" && isLegacyCarouselSlide(slide as Record<string, unknown>),
    );

    if (!needsMigration) return;

    const normalizedSlides = slides.map((slide, index) => {
      if (!slide || typeof slide !== "object") {
        return { label: `Slide ${index + 1}`, content: [] };
      }

      const record = slide as Record<string, unknown>;
      if (!isLegacyCarouselSlide(record) && typeof record.label === "string") {
        return {
          label: record.label,
          content: Array.isArray(record.content) ? record.content : [],
        };
      }

      return normalizeCarouselSlide(record, index);
    });

    result = replaceComponentProps(result, String(node.props.id), { slides: normalizedSlides });
  });

  return result;
}

/**
 * Read slot content for a legacy {@link LEGACY_NEXUS_GRID_ITEM_TYPE} from zones or inline props.
 *
 * @param data - Puck document.
 * @param itemId - Grid item component id.
 * @param inlineContent - Optional inline slot array on the item props.
 * @returns Normalized child component nodes.
 */
function readLegacyGridItemSlotContent(
  data: Data,
  itemId: string,
  inlineContent: unknown,
): PuckComponentNode[] {
  const zones = (data.zones ?? {}) as Record<string, unknown>;
  const zoneKey = `${itemId}:content`;
  const zoneValue = zones[zoneKey];

  if (Array.isArray(zoneValue)) {
    return zoneValue.filter(isComponentNode);
  }

  if (Array.isArray(inlineContent)) {
    return inlineContent.filter(isComponentNode);
  }

  return [];
}

/**
 * Migrate legacy slot-based {@link NexusGrid} + standalone grid item blocks
 * to the array model (`items[].content` slots).
 *
 * @param data - Puck document state.
 * @returns Document with grid cells embedded in `NexusGrid.props.items`.
 */
export function migrateLegacyNexusGridItems(data: Data): Data {
  let result: Data = {
    ...data,
    zones: { ...(data.zones ?? {}) },
  };

  walkAllComponents(result, (node) => {
    if (node.type !== "NexusGrid") {
      return;
    }

    const gridId = String(node.props.id ?? "");
    if (!gridId) {
      return;
    }

    const existingItems = Array.isArray(node.props.items)
      ? (node.props.items as GridItemRecord[])
      : [];
    const zones = (result.zones ?? {}) as Record<string, unknown>;
    const legacyZoneKey = `${gridId}:content`;
    const legacyZone = zones[legacyZoneKey];
    const legacyGridItems = Array.isArray(legacyZone)
      ? legacyZone.filter(
          (entry): entry is PuckComponentNode =>
            isComponentNode(entry) && entry.type === LEGACY_NEXUS_GRID_ITEM_TYPE,
        )
      : [];

    if (legacyGridItems.length === 0 && existingItems.length > 0) {
      if (legacyZoneKey in zones) {
        const nextZones = { ...zones };
        delete nextZones[legacyZoneKey];
        result = { ...result, zones: nextZones };
      }
      return;
    }

    if (legacyGridItems.length === 0 && existingItems.length === 0) {
      return;
    }

    const migratedItems: GridItemRecord[] = legacyGridItems.map((gridItem, index) => {
      const itemId = String(gridItem.props.id ?? "");
      const content = readLegacyGridItemSlotContent(
        result,
        itemId,
        gridItem.props.content,
      );

      if (itemId) {
        const itemZoneKey = `${itemId}:content`;
        if (itemZoneKey in (result.zones as Record<string, unknown>)) {
          const nextZones = { ...(result.zones as Record<string, unknown>) };
          delete nextZones[itemZoneKey];
          result = { ...result, zones: nextZones };
        }
      }

      const label =
        (typeof gridItem.props.label === "string" && gridItem.props.label.trim()) ||
        formatGridItemLabel(index);

      return {
        label,
        spanCol:
          (typeof gridItem.props.spanCol === "string" && gridItem.props.spanCol) ||
          NEXUS_GRID_ITEM_DEFAULT_SPAN_COL,
        spanRow:
          (typeof gridItem.props.spanRow === "string" && gridItem.props.spanRow) ||
          NEXUS_GRID_ITEM_DEFAULT_SPAN_ROW,
        content,
      };
    });

    const nextZones = { ...(result.zones as Record<string, unknown>) };
    delete nextZones[legacyZoneKey];
    result = {
      ...result,
      zones: nextZones,
    };

    result = replaceComponentProps(result, gridId, {
      items: migratedItems.length > 0 ? migratedItems : existingItems,
    });
  });

  return result;
}
