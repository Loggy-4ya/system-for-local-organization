/**
 * @fileoverview Resolve page comment availability from the NexusComments Puck block.
 *
 * Page-level `commentsEnabled` in MongoDB is derived on save from block presence and
 * the block's own toggle — not from Page Publication settings. Form Input blocks are
 * unaffected.
 *
 * Tests: `npm run test:page-comments-block-logic`
 *
 * @module shared/lib/pageCommentsBlockLogic
 */

/** Puck component type key for the comments launcher block. */
export const NEXUS_COMMENTS_BLOCK_TYPE = "NexusComments";

/** Minimal puck component node for tree walks. */
interface PuckComponentNodeLike {
  type?: string;
  props?: Record<string, unknown>;
}

/**
 * Normalize the block-level comments toggle stored on {@link NEXUS_COMMENTS_BLOCK_TYPE}.
 *
 * Defaults to enabled when the block is present and the prop is unset (legacy layouts).
 *
 * @param value - Raw puck prop (`on` / `off`, boolean, or undefined).
 * @returns True when the block should allow live comments.
 */
export function normalizeNexusCommentsBlockEnabled(value: unknown): boolean {
  if (value === false || value === "off" || value === "no") {
    return false;
  }
  return true;
}

/**
 * Recursively visit nested puck prop arrays that may contain component nodes.
 *
 * @param value - Prop value from a parent component.
 * @param visit - Callback for each discovered node.
 */
function walkNestedComponentArrays(
  value: unknown,
  visit: (node: PuckComponentNodeLike) => void,
): void {
  if (!Array.isArray(value)) return;

  for (const item of value) {
    if (!item || typeof item !== "object") continue;

    const node = item as PuckComponentNodeLike;
    if (typeof node.type === "string" && node.props && typeof node.props === "object") {
      visit(node);
      for (const nested of Object.values(node.props)) {
        walkNestedComponentArrays(nested, visit);
      }
      continue;
    }

    for (const nested of Object.values(item as Record<string, unknown>)) {
      walkNestedComponentArrays(nested, visit);
    }
  }
}

/**
 * Resolve whether comments are enabled for a page from its puck content tree.
 *
 * Requires at least one {@link NEXUS_COMMENTS_BLOCK_TYPE} with its toggle on.
 * Pages without the block (or with every block toggled off) return false.
 *
 * @param content - Puck `content` array (root-level blocks).
 * @returns Derived page-level comments flag for MongoDB and APIs.
 */
export function resolvePageCommentsEnabledFromPuckContent(
  content: readonly unknown[] | null | undefined,
): boolean {
  let hasCommentsBlock = false;
  let enabled = false;

  const visit = (node: PuckComponentNodeLike): void => {
    if (node.type !== NEXUS_COMMENTS_BLOCK_TYPE) return;
    hasCommentsBlock = true;
    if (normalizeNexusCommentsBlockEnabled(node.props?.commentsEnabled)) {
      enabled = true;
    }
  };

  for (const raw of content ?? []) {
    if (!raw || typeof raw !== "object") continue;
    const node = raw as PuckComponentNodeLike;
    if (typeof node.type !== "string") continue;
    visit(node);
    if (node.props) {
      for (const value of Object.values(node.props)) {
        walkNestedComponentArrays(value, visit);
      }
    }
  }

  return hasCommentsBlock && enabled;
}

/**
 * Resolve page comment availability from a full puck document payload.
 *
 * @param puckData - Puck document (`content` array at top level).
 * @returns Derived comments-enabled flag.
 */
export function resolvePageCommentsEnabledFromPuckData(
  puckData: { content?: readonly unknown[] } | null | undefined,
): boolean {
  return resolvePageCommentsEnabledFromPuckContent(puckData?.content);
}
