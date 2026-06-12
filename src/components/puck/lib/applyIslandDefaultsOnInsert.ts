/**
 * @fileoverview Apply admin-configured island defaults to newly inserted components.
 *
 * @module src/components/puck/lib/applyIslandDefaultsOnInsert
 */

import type { Data } from "@measured/puck";
import {
  findComponentById,
  findNewComponentIds,
  isSlotShellComponentType,
  replaceComponentProps,
  walkAllComponents,
  type PuckComponentNode,
} from "./puckDataTree";
import {
  ISLAND_DEFAULTS,
  isIslandActive,
  mergeIslandAutoSpacing,
  mergeRootInsertSpacing,
  type BlockShellProps,
  type SpacingProps,
} from "./spacingFields";

/** Editor settings consumed by the insert hook. */
export interface EditorIslandSettings {
  islandDefaultComponents: string[];
}

/** Ids from recent inserts — kept until vertical margins are written (survives resolveData replace). */
const pendingInsertIds = new Set<string>();

/**
 * Build props patch that enables island mode (no spacing mutation — for saved-page heal only).
 *
 * @param node - Target component node.
 * @returns Partial props to merge onto the component.
 */
function buildIslandEnablePatch(node: PuckComponentNode): Record<string, unknown> {
  const existingIsland = (node.props.island as Record<string, unknown> | undefined) ?? {};

  return {
    island: {
      ...ISLAND_DEFAULTS,
      ...existingIsland,
      islandEnabled: true,
    },
  };
}

/**
 * Build props for a newly inserted island-default block (island + default vertical margins).
 *
 * @param node - Target component node.
 * @returns Partial props to merge onto the component.
 */
function buildNewIslandInsertPatch(node: PuckComponentNode): Record<string, unknown> {
  const existingSpacing = (node.props.spacing as Record<string, unknown> | undefined) ?? {};

  return {
    ...buildIslandEnablePatch(node),
    spacing: mergeRootInsertSpacing(node.type, existingSpacing as SpacingProps),
  };
}

/**
 * Whether bottom margin still needs insert-time seeding.
 *
 * @param spacing - Block spacing props.
 * @returns True when bottom margin is missing or `none`.
 */
function marginBottomNeedsSeeding(spacing: SpacingProps = {}): boolean {
  return !spacing.marginBottom || spacing.marginBottom === "none";
}

/**
 * Whether top or bottom margin still needs insert-time seeding.
 *
 * @param spacing - Block spacing props.
 * @returns True when either vertical margin is missing or `none`.
 */
function marginsNeedSeeding(spacing: SpacingProps = {}): boolean {
  return (
    !spacing.marginTop ||
    spacing.marginTop === "none" ||
    marginBottomNeedsSeeding(spacing)
  );
}

/**
 * Whether insert-time spacing still needs to be applied for a node.
 *
 * @param node - Component node.
 * @param spacing - Current spacing props.
 * @returns True when seeding should run again.
 */
function insertSpacingStillNeeded(node: PuckComponentNode, spacing: SpacingProps): boolean {
  return marginsNeedSeeding(spacing);
}

/**
 * Whether a block sits under a parent that owns the island shell (no auto margins).
 *
 * @param parent - Parent node or null at root content level.
 * @returns True when insert margins must not be applied.
 */
function isNestedUnderIslandShell(parent: PuckComponentNode | null): boolean {
  if (!parent) return false;

  const parentProps = parent.props as BlockShellProps;
  if (isIslandActive(parentProps)) return true;
  return isSlotShellComponentType(parent.type);
}

/**
 * Whether a newly inserted node should receive island-default vertical margins.
 *
 * @param node - Inserted component node.
 * @param parent - Parent node or null at root content level.
 * @param allowed - Admin-configured type keys.
 * @returns True when margin spacing should be seeded.
 */
function shouldSeedIslandInsertSpacing(
  node: PuckComponentNode,
  parent: PuckComponentNode | null,
  allowed: Set<string>,
): boolean {
  if (!allowed.has(node.type)) return false;
  if (!isIslandActive(node.props as BlockShellProps)) return false;
  if (isNestedUnderIslandShell(parent)) return false;

  return insertSpacingStillNeeded(node, (node.props.spacing as SpacingProps | undefined) ?? {});
}

/**
 * Whether a root-level block should receive default vertical margins on insert.
 *
 * Applies to all component types (e.g. Carousel) when dropped as a root sibling.
 *
 * @param node - Inserted component node.
 * @param parent - Parent node or null at root content level.
 * @returns True when root margin spacing should be seeded.
 */
function shouldSeedRootInsertSpacing(
  node: PuckComponentNode,
  parent: PuckComponentNode | null,
): boolean {
  if (parent !== null) return false;
  if (isNestedUnderIslandShell(parent)) return false;

  const spacing = (node.props.spacing as SpacingProps | undefined) ?? {};
  return marginsNeedSeeding(spacing);
}

/**
 * Reset vertical margins on blocks inserted under an existing island shell.
 *
 * @param node - Inserted component node.
 * @param parent - Parent node or null at root content level.
 * @returns True when auto margins from defaultProps should be cleared.
 */
function shouldClearNestedInsertMargins(
  node: PuckComponentNode,
  parent: PuckComponentNode | null,
): boolean {
  if (!isNestedUnderIslandShell(parent)) return false;

  const spacing = (node.props.spacing as SpacingProps | undefined) ?? {};
  return !marginsNeedSeeding(spacing);
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

  const existingIsland = (node.props.island as Record<string, unknown> | undefined) ?? {};
  if (existingIsland.islandUserOverride === true) return false;
  if (isNestedUnderIslandShell(parent)) return false;

  return true;
}

/**
 * Whether a component still needs insert-time margin seeding.
 *
 * @param data - Current Puck document.
 * @param id - Component id.
 * @param settings - Admin island default component list.
 * @returns True when patching should be retried for this id.
 */
export function stillNeedsInsertSpacing(
  data: Data,
  id: string,
  settings: EditorIslandSettings,
): boolean {
  const match = findComponentById(data, id);
  if (!match) return false;

  const allowed = new Set(settings.islandDefaultComponents);
  const { parent, node } = match;
  const spacing = (node.props.spacing as SpacingProps | undefined) ?? {};

  if (isEligibleForAutoIsland(node, parent, allowed)) return true;
  if (shouldSeedIslandInsertSpacing(node, parent, allowed)) return true;
  if (shouldSeedRootInsertSpacing(node, parent)) return true;
  return insertSpacingStillNeeded(node, spacing);
}

/**
 * Track new ids and apply island/root insert defaults (handles post-resolveData replace).
 *
 * @param prev - Document snapshot before the change.
 * @param next - Document snapshot after the change.
 * @param settings - Admin island default component list.
 * @returns Document with island defaults applied to eligible nodes.
 */
export function applyIslandDefaultsOnInsert(
  prev: Data,
  next: Data,
  settings: EditorIslandSettings,
): Data {
  const newIds = findNewComponentIds(prev, next);
  newIds.forEach((id) => pendingInsertIds.add(id));

  const idsToPatch = [...new Set([...newIds, ...pendingInsertIds])];
  if (!idsToPatch.length) return next;

  const patched = applyIslandDefaultsToIds(next, idsToPatch, settings);

  for (const id of [...pendingInsertIds]) {
    if (!stillNeedsInsertSpacing(patched, id, settings)) {
      pendingInsertIds.delete(id);
    }
  }

  return patched;
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

    if (shouldClearNestedInsertMargins(node, parent)) {
      const spacing = (node.props.spacing as SpacingProps | undefined) ?? {};
      result = replaceComponentProps(result, id, {
        spacing: {
          ...spacing,
          marginTop: "none",
          marginBottom: "none",
        },
      });
      continue;
    }

    if (isEligibleForAutoIsland(node, parent, allowed)) {
      result = replaceComponentProps(result, id, buildNewIslandInsertPatch(node));
      continue;
    }

    if (shouldSeedIslandInsertSpacing(node, parent, allowed)) {
      const spacing = (node.props.spacing as SpacingProps | undefined) ?? {};
      result = replaceComponentProps(result, id, {
        spacing: mergeRootInsertSpacing(node.type, spacing),
      });
      continue;
    }

    if (shouldSeedRootInsertSpacing(node, parent)) {
      const spacing = (node.props.spacing as SpacingProps | undefined) ?? {};
      result = replaceComponentProps(result, id, {
        spacing: mergeRootInsertSpacing(node.type, spacing),
      });
    }
  }

  return normalizeNestedIslands(result);
}

/**
 * Disable island mode on direct children when the parent already has island active.
 *
 * Prevents nested glass shells on saved pages and after auto-island healing.
 *
 * @param data - Puck document state.
 * @returns Document with redundant child islands stripped.
 */
export function normalizeNestedIslands(data: Data): Data {
  let result = data;

  walkAllComponents(data, (node, parent) => {
    if (!parent) return;

    const parentProps = parent.props as BlockShellProps;
    const shouldStripChildIsland =
      isIslandActive(parentProps) || isSlotShellComponentType(parent.type);

    if (!shouldStripChildIsland) return;

    const childProps = node.props as BlockShellProps;
    if (!isIslandActive(childProps)) return;

    const existingIsland = (node.props.island as Record<string, unknown> | undefined) ?? {};
    if (existingIsland.islandUserOverride === true) return;

    const id = String(node.props.id);

    result = replaceComponentProps(result, id, {
      island: {
        ...existingIsland,
        islandEnabled: false,
      },
    });
  });

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

  return normalizeNestedIslands(result);
}

export { findNewComponentIds };
