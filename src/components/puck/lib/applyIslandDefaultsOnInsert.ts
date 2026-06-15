/**
 * @fileoverview Apply admin-configured island defaults to newly inserted components.
 *
 * Tests: `tests/puck/lib/applyIslandDefaultsOnInsert.test.ts` — `npm run test:island-defaults`
 *
 * @module src/components/puck/lib/applyIslandDefaultsOnInsert
 */

import type { Data } from "@puckeditor/core";
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

/** Params passed to Puck component resolveData hooks. */
export interface PuckResolveDataParams {
  trigger: "insert" | "replace" | "move" | "load" | "force" | string;
  parent?: { type?: string; props?: BlockShellProps } | null;
  changed?: Record<string, unknown>;
}

/**
 * Convert Puck resolveData parent param to a tree node reference.
 *
 * @param parent - Parent from Puck resolveData params.
 * @returns Parent node or null at root content level.
 */
function toParentNode(
  parent: PuckResolveDataParams["parent"],
): PuckComponentNode | null {
  if (!parent?.type) return null;
  return {
    type: parent.type,
    props: (parent.props ?? {}) as Record<string, unknown>,
  };
}

/**
 * Whether insert-time defaults are fully applied for a single block.
 *
 * @param node - Component node after patching.
 * @param parent - Parent node or null at root content level.
 * @param allowed - Admin-configured island-default type keys.
 * @param props - Patched block props.
 * @returns True when margin/island seeding should run again.
 */
function nodeStillNeedsInsertDefaults(
  node: PuckComponentNode,
  parent: PuckComponentNode | null,
  allowed: Set<string>,
  props: BlockShellProps,
): boolean {
  const spacing = (props.spacing as SpacingProps | undefined) ?? {};

  if (isEligibleForAutoIsland(node, parent, allowed)) return true;
  if (shouldSeedIslandInsertSpacing(node, parent, allowed)) return true;
  if (shouldSeedRootInsertSpacing(node, parent)) return true;
  return insertSpacingStillNeeded(node, spacing);
}

/**
 * Apply island + margin insert defaults inside Puck resolveData (no global setData).
 *
 * Tracks pending ids across the async insert → replace cycle so carousel and other
 * blocks keep stable Embla/slot state while margins are seeded.
 *
 * @param componentType - Puck registry key for the block.
 * @param props - Current block props from resolveData.
 * @param params - Puck resolveData params including trigger and parent.
 * @param settings - Admin island default component list.
 * @returns Updated props when insert defaults should apply.
 */
export function resolveInsertDefaultsProps(
  componentType: string,
  props: BlockShellProps,
  params: PuckResolveDataParams,
  settings: EditorIslandSettings,
): BlockShellProps {
  const id = String((props as Record<string, unknown>).id ?? "");
  if (params.trigger === "insert" && id) {
    pendingInsertIds.add(id);
  }

  const parent = toParentNode(params.parent);
  const node: PuckComponentNode = {
    type: componentType,
    props: props as Record<string, unknown>,
  };

  /** Puck 0.21+ fires resolveData on move — sync parent context and root island defaults. */
  if (params.trigger === "move") {
    const allowed = new Set(settings.islandDefaultComponents);
    const parent = toParentNode(params.parent);
    let next: BlockShellProps = { ...props };

    const nodeForParent = (): PuckComponentNode => ({
      type: componentType,
      props: next as Record<string, unknown>,
    });

    if (isNestedUnderIslandShell(parent)) {
      const existingIsland = next.island ?? {};
      if (existingIsland.islandUserOverride !== true) {
        next = {
          ...next,
          island: {
            ...ISLAND_DEFAULTS,
            ...existingIsland,
            islandEnabled: false,
          },
        };
      }
    }

    if (shouldClearNestedInsertMargins(nodeForParent(), parent)) {
      const spacing = (next.spacing ?? {}) as SpacingProps;
      next = {
        ...next,
        spacing: {
          ...spacing,
          marginTop: "none",
          marginBottom: "none",
        },
      };
    } else if (isEligibleForAutoIsland(nodeForParent(), parent, allowed)) {
      next = {
        ...next,
        ...(buildNewIslandInsertPatch(nodeForParent()) as BlockShellProps),
      };
    } else if (shouldSeedIslandInsertSpacing(nodeForParent(), parent, allowed)) {
      next = {
        ...next,
        spacing: mergeRootInsertSpacing(
          componentType,
          (next.spacing ?? {}) as SpacingProps,
        ),
      };
    } else if (shouldSeedRootInsertSpacing(nodeForParent(), parent)) {
      next = {
        ...next,
        spacing: mergeRootInsertSpacing(
          componentType,
          (next.spacing ?? {}) as SpacingProps,
        ),
      };
    }

    return next;
  }

  const shouldApply =
    params.trigger === "insert" ||
    (params.trigger === "replace" && Boolean(id && pendingInsertIds.has(id)));

  if (!shouldApply) {
    return props;
  }

  const allowed = new Set(settings.islandDefaultComponents);
  let next: BlockShellProps = { ...props };

  if (isSlotShellComponentType(params.parent?.type)) {
    const existingIsland = next.island ?? {};
    if (existingIsland.islandUserOverride !== true) {
      next = {
        ...next,
        island: {
          ...ISLAND_DEFAULTS,
          ...existingIsland,
          islandEnabled: false,
        },
      };
    }
  }

  if (shouldClearNestedInsertMargins(node, parent)) {
    const spacing = (next.spacing ?? {}) as SpacingProps;
    next = {
      ...next,
      spacing: {
        ...spacing,
        marginTop: "none",
        marginBottom: "none",
      },
    };
  } else if (isEligibleForAutoIsland(node, parent, allowed)) {
    const patch = buildNewIslandInsertPatch(node);
    next = {
      ...next,
      ...(patch as BlockShellProps),
    };
  } else if (shouldSeedIslandInsertSpacing(node, parent, allowed)) {
    next = {
      ...next,
      spacing: mergeRootInsertSpacing(
        componentType,
        (next.spacing ?? {}) as SpacingProps,
      ),
    };
  } else if (shouldSeedRootInsertSpacing(node, parent)) {
    next = {
      ...next,
      spacing: mergeRootInsertSpacing(
        componentType,
        (next.spacing ?? {}) as SpacingProps,
      ),
    };
  }

  if (id && !nodeStillNeedsInsertDefaults(node, parent, allowed, next)) {
    pendingInsertIds.delete(id);
  }

  return next;
}

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

  return result;
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
