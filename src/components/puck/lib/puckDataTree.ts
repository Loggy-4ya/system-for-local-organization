/**
 * @fileoverview Utilities for walking and mutating Puck document trees.
 *
 * @module src/components/puck/lib/puckDataTree
 */

import type { Data } from "@measured/puck";

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

/**
 * Deep-clone and patch props on a component node.
 *
 * @param node - Source component node.
 * @param patch - Partial props to merge.
 * @returns Cloned node with patched props.
 */
function patchNodeProps(node: PuckComponentNode, patch: Record<string, unknown>): PuckComponentNode {
  return {
    ...node,
    props: {
      ...node.props,
      ...patch,
    },
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
