/**
 * @fileoverview Apply admin-configured island defaults to newly inserted components.
 *
 * @module src/components/puck/lib/applyIslandDefaultsOnInsert
 */

import type { Data } from "@measured/puck";
import {
  findComponentById,
  findNewComponentIds,
  replaceComponentProps,
  walkAllComponents,
  type PuckComponentNode,
} from "./puckDataTree";
import {
  ISLAND_DEFAULTS,
  isIslandActive,
  SPACING_DEFAULTS,
  type BlockShellProps,
} from "./spacingFields";

/** Editor settings consumed by the insert hook. */
export interface EditorIslandSettings {
  islandDefaultComponents: string[];
}

/**
 * Build props patch that enables island mode with full shell defaults.
 *
 * @param node - Target component node.
 * @returns Partial props to merge onto the component.
 */
function buildIslandEnablePatch(node: PuckComponentNode): Record<string, unknown> {
  const existingIsland = (node.props.island as Record<string, unknown> | undefined) ?? {};
  const existingSpacing = (node.props.spacing as Record<string, unknown> | undefined) ?? {};

  return {
    spacing: {
      ...SPACING_DEFAULTS,
      ...existingSpacing,
    },
    island: {
      ...ISLAND_DEFAULTS,
      ...existingIsland,
      islandEnabled: true,
    },
  };
}

/**
 * Whether a node is eligible for auto island under admin rules.
 *
 * @param node - Component node.
 * @param parent - Parent node or null at root content level.
 * @param allowed - Admin-configured type keys.
 * @returns True when island should be auto-enabled.
 */
function isEligibleForAutoIsland(
  node: PuckComponentNode,
  parent: PuckComponentNode | null,
  allowed: Set<string>,
): boolean {
  if (!allowed.has(node.type)) return false;
  if (isIslandActive(node.props as BlockShellProps)) return false;

  const parentProps = parent?.props as BlockShellProps | undefined;
  if (parentProps && isIslandActive(parentProps)) return false;

  return true;
}

/**
 * Enable island mode on newly inserted components when allowed by admin settings.
 *
 * Skips components whose parent already has island mode active to avoid nested glass shells.
 *
 * @param prev - Document snapshot before the change.
 * @param next - Document snapshot after the change.
 * @param settings - Admin island default component list.
 * @returns Document with island defaults applied to eligible new nodes.
 */
export function applyIslandDefaultsOnInsert(
  prev: Data,
  next: Data,
  settings: EditorIslandSettings,
): Data {
  const newIds = findNewComponentIds(prev, next);
  if (!newIds.length) return next;
  return applyIslandDefaultsToIds(next, newIds, settings);
}

/**
 * Enable island mode on specific component ids in the current document.
 *
 * Used by deferred insert patching — targets captured ids instead of prev/next diff.
 *
 * @param data - Current Puck document state.
 * @param ids - Component ids to patch (typically from a recent insert).
 * @param settings - Admin island default component list.
 * @returns Document with island defaults applied to eligible nodes.
 */
export function applyIslandDefaultsToIds(
  data: Data,
  ids: string[],
  settings: EditorIslandSettings,
): Data {
  const allowed = new Set(settings.islandDefaultComponents);
  let result = data;

  for (const id of ids) {
    const match = findComponentById(result, id);
    if (!match) continue;

    const { parent, node } = match;
    if (!isEligibleForAutoIsland(node, parent, allowed)) continue;

    result = replaceComponentProps(result, id, buildIslandEnablePatch(node));
  }

  return result;
}

/**
 * Enable island on eligible existing blocks that still lack it (e.g. saved starter content).
 *
 * @param data - Puck document state.
 * @param settings - Admin island default component list.
 * @returns Document with island defaults applied to eligible existing nodes.
 */
export function ensureIslandOnEligibleBlocks(
  data: Data,
  settings: EditorIslandSettings,
): Data {
  const allowed = new Set(settings.islandDefaultComponents);
  const eligible: Array<{ id: string; node: PuckComponentNode }> = [];

  walkAllComponents(data, (node, parent) => {
    if (!isEligibleForAutoIsland(node, parent, allowed)) return;
    eligible.push({ id: String(node.props.id), node });
  });

  let result = data;
  for (const { id, node } of eligible) {
    result = replaceComponentProps(result, id, buildIslandEnablePatch(node));
  }

  return result;
}

export { findNewComponentIds };
