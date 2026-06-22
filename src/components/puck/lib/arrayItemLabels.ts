/**
 * @fileoverview Unified auto-label formatters for Puck array fields (`Slide N`, `Cell N`, …).
 *
 * @module src/components/puck/lib/arrayItemLabels
 */

/** Supported generative array item label kinds across Puck blocks. */
export type ArrayItemLabelKind =
  | "slide"
  | "cell"
  | "step"
  | "tab"
  | "substep"
  | "panel";

const ARRAY_ITEM_LABEL_PREFIX: Record<Exclude<ArrayItemLabelKind, "substep">, string> = {
  slide: "Slide",
  cell: "Cell",
  step: "Step",
  tab: "Tab",
  panel: "Panel",
};

/**
 * Format a consistent auto-label for any Puck array field item.
 *
 * @param kind - Block-specific array item kind.
 * @param index - Zero-based item index.
 * @param parentIndex - Parent index when {@link kind} is `substep`.
 * @returns Human-readable label such as `Slide 1` or `Sub-step 1.2`.
 */
export function formatArrayItemLabel(
  kind: ArrayItemLabelKind,
  index: number,
  parentIndex = 0,
): string {
  if (kind === "substep") {
    return `Sub-step ${parentIndex + 1}.${index + 1}`;
  }
  return `${ARRAY_ITEM_LABEL_PREFIX[kind]} ${index + 1}`;
}

/**
 * Format the default sidebar label for a carousel slide at the given index.
 *
 * @param index - Zero-based slide index.
 * @returns Human-readable label such as `Slide 1`.
 */
export function formatCarouselSlideLabel(index: number): string {
  return formatArrayItemLabel("slide", index);
}

/**
 * Format the default sidebar label for a grid cell at the given index.
 *
 * @param index - Zero-based cell index.
 * @returns Human-readable label such as `Cell 1`.
 */
export function formatGridItemLabel(index: number): string {
  return formatArrayItemLabel("cell", index);
}

/**
 * Format the default sidebar label for a list step at the given index.
 *
 * @param index - Zero-based step index.
 * @returns Human-readable label such as `Step 1`.
 */
export function formatListStepLabel(index: number): string {
  return formatArrayItemLabel("step", index);
}

/**
 * Format the default sidebar label for a nested list sub-step.
 *
 * @param parentIndex - Zero-based parent step index.
 * @param childIndex - Zero-based child index within the parent.
 * @returns Human-readable label such as `Sub-step 1.1`.
 */
export function formatListSubStepLabel(parentIndex: number, childIndex: number): string {
  return formatArrayItemLabel("substep", childIndex, parentIndex);
}

/**
 * Format the default sidebar label for a tab at the given index.
 *
 * @param index - Zero-based tab index.
 * @returns Human-readable label such as `Tab 1`.
 */
export function formatTabLabel(index: number): string {
  return formatArrayItemLabel("tab", index);
}

/**
 * Format the default sidebar label for an accordion panel at the given index.
 *
 * @param index - Zero-based panel index.
 * @returns Human-readable label such as `Panel 1`.
 */
export function formatAccordionPanelLabel(index: number): string {
  return formatArrayItemLabel("panel", index);
}

/** Minimal accordion panel shape stored on NexusAccordion props. */
export interface AccordionPanelRecord {
  title?: string;
  content?: string;
  [key: string]: unknown;
}

/**
 * Resolve a sidebar summary for any generative array item.
 *
 * Falls back to {@link formatArrayItemLabel} when the label field is empty or the
 * row has not hydrated yet (Puck otherwise shows `Item #N`).
 *
 * @param kind - Generative item kind.
 * @param item - Stored array row (may be undefined while Puck hydrates).
 * @param index - Zero-based item index.
 * @param textKey - Prop key holding the user-visible label (`label`, `title`, …).
 * @param parentIndex - Parent index when {@link kind} is `substep`.
 * @returns Sidebar summary such as `Slide 1` or `Panel 2`.
 */
export function resolveArrayItemSummaryLabel(
  kind: ArrayItemLabelKind,
  item: Record<string, unknown> | null | undefined,
  index: number,
  textKey: string,
  parentIndex = 0,
): string {
  const trimmed =
    item && typeof item[textKey] === "string" ? (item[textKey] as string).trim() : "";
  return trimmed || formatArrayItemLabel(kind, index, parentIndex);
}

/**
 * Assign `Panel N` only when a panel has no title yet (preserves user renames).
 *
 * @param panels - Raw panel array from Puck props.
 * @returns Panels with fallback titles where missing.
 */
export function ensureAccordionPanelTitles<T extends AccordionPanelRecord>(
  panels: T[] | undefined,
): T[] {
  if (!Array.isArray(panels)) return [];

  return panels.map((panel, index) => {
    const trimmed = typeof panel.title === "string" ? panel.title.trim() : "";
    return {
      ...panel,
      title: trimmed || formatAccordionPanelLabel(index),
    };
  });
}
