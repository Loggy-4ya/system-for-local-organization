/**
 * @fileoverview Flat index helpers for the NexusList stepper tree (parent + nested children).
 *
 * @module src/components/puck/lib/listStepTree
 */

/** Connector style between step dots on the canvas. */
export type ListConnectorStyle =
  | "spine"
  | "dashed"
  | "dotted"
  | "tree"
  | "rail"
  | "ring"
  | "arrow"
  | "minimal";

/** @deprecated Legacy alias — migrated to {@link normalizeConnectorStyle}. */
export type LegacyListConnectorStyle = ListConnectorStyle | "segment";

/**
 * Normalize stored connector style (maps legacy `segment` → `dashed`).
 *
 * @param value - Raw prop from Puck data.
 * @returns Supported connector style token.
 */
export function normalizeConnectorStyle(value: unknown): ListConnectorStyle {
  if (value === "segment") return "dashed";
  if (
    value === "spine" ||
    value === "dashed" ||
    value === "dotted" ||
    value === "tree" ||
    value === "rail" ||
    value === "ring" ||
    value === "arrow" ||
    value === "minimal"
  ) {
    return value;
  }
  return "spine";
}

/** Editor-authored emphasis level for a visible step row. */
export type StepEmphasis = "none" | "soft" | "full";

/** Nested step stored on a parent list item. */
export interface ListStepChild {
  label?: string;
  text?: string;
  /** Editor-authored emphasis — brighter label on publish. */
  highlighted?: boolean;
}

/** Top-level stepper row with optional nested children. */
export interface ListStepItem {
  label?: string;
  text?: string;
  /** Editor-authored emphasis on this parent row. */
  highlighted?: boolean;
  /** Fixed publish-time open state for chapters with sub-steps. */
  chapterOpen?: "yes" | "no";
  children?: ListStepChild[];
  [key: string]: unknown;
}

/** Resolved pointer into the flattened stepper tree. */
export interface FlatStepRef {
  /** Zero-based index across visible steps (used for editor selection sync). */
  flatIndex: number;
  /** Index of the parent row in `items`. */
  parentIndex: number;
  /** Child index under the parent, or `null` for the parent row itself. */
  childIndex: number | null;
}

/** One row in the flattened visible step list for canvas rendering. */
export interface VisibleStepRow {
  flatIndex: number;
  parentIndex: number;
  childIndex: number | null;
  depth: 0 | 1;
  labelHtml: string;
  fallbackLabel: string;
  hasChildren: boolean;
  chapterOpen: boolean;
  emphasis: StepEmphasis;
}

/**
 * Whether a parent chapter is open on the published canvas.
 *
 * @param item - Parent step from block props.
 * @param defaultExpandNested - Fallback for legacy rows without `chapterOpen`.
 * @returns True when nested children should render.
 */
export function isChapterOpen(
  item: ListStepItem,
  defaultExpandNested: "yes" | "no" = "yes",
): boolean {
  if (item.chapterOpen === "yes") return true;
  if (item.chapterOpen === "no") return false;
  return defaultExpandNested === "yes";
}

/**
 * True when any nested child under the parent is editor-highlighted.
 *
 * @param item - Parent step row.
 * @returns Whether a descendant child has `highlighted: true`.
 */
export function parentHasHighlightedChild(item: ListStepItem): boolean {
  const children = Array.isArray(item.children) ? item.children : [];
  return children.some((child) => child.highlighted === true);
}

/**
 * Resolve authored emphasis for a parent or nested row.
 *
 * @param item - Parent step row.
 * @param child - Nested child when rendering a sub-step, else `null`.
 * @param defaultExpandNested - Fallback for legacy `chapterOpen`.
 * @returns Emphasis level for canvas styling.
 */
export function resolveRowEmphasis(
  item: ListStepItem,
  child: ListStepChild | null,
  defaultExpandNested: "yes" | "no" = "yes",
): StepEmphasis {
  if (child) {
    return child.highlighted ? "full" : "none";
  }
  if (item.highlighted) return "full";
  if (parentHasHighlightedChild(item) && !isChapterOpen(item, defaultExpandNested)) {
    return "soft";
  }
  return "none";
}

/**
 * Format the default sidebar label for a nested step at the given child index.
 *
 * @param parentIndex - Zero-based parent row index.
 * @param childIndex - Zero-based child index.
 * @returns Human-readable label such as "Sub-step 1.1".
 */
export function formatListStepChildLabel(parentIndex: number, childIndex: number): string {
  return `Sub-step ${parentIndex + 1}.${childIndex + 1}`;
}

/**
 * Assign fallback labels for nested steps where the label is still empty.
 *
 * @param children - Raw child rows from Puck props.
 * @param parentIndex - Parent row index used for default labels.
 * @returns Children with generated labels where missing.
 */
export function ensureListStepChildLabels(
  children: ListStepChild[] | undefined,
  parentIndex: number,
): ListStepChild[] {
  if (!Array.isArray(children)) return [];

  return children.map((child, childIndex) => {
    const trimmed = typeof child.label === "string" ? child.label.trim() : "";
    return {
      ...child,
      label: trimmed || formatListStepChildLabel(parentIndex, childIndex),
    };
  });
}

/**
 * Migrate legacy list items — labels, chapterOpen, and highlight flags.
 *
 * @param items - Raw step array from Puck props.
 * @param defaultExpandNested - Fallback open state for rows without `chapterOpen`.
 * @returns Normalized items ready for render and sidebar.
 */
export function migrateListItems(
  items: ListStepItem[] | undefined,
  defaultExpandNested: "yes" | "no" = "yes",
): ListStepItem[] {
  if (!Array.isArray(items)) return [];

  return items.map((item, parentIndex) => {
    const trimmed = typeof item.label === "string" ? item.label.trim() : "";
    const children = ensureListStepChildLabels(item.children, parentIndex).map((child) => ({
      ...child,
      highlighted: child.highlighted === true,
    }));

    return {
      ...item,
      label: trimmed || `Step ${parentIndex + 1}`,
      highlighted: item.highlighted === true,
      chapterOpen:
        item.chapterOpen === "yes" || item.chapterOpen === "no"
          ? item.chapterOpen
          : defaultExpandNested === "yes"
            ? "yes"
            : "no",
      children,
    };
  });
}

/**
 * Ensure parent and nested labels exist after load/insert.
 *
 * @param items - Raw step array from Puck props.
 * @returns Items with fallback labels for parents and children.
 * @deprecated Prefer {@link migrateListItems} which also normalizes highlight/collapse.
 */
export function ensureListStepLabels(items: ListStepItem[] | undefined): ListStepItem[] {
  return migrateListItems(items);
}

/**
 * Build visible canvas rows from stored props (fixed publish collapse).
 *
 * @param items - Step tree from block props.
 * @param defaultExpandNested - Fallback when `chapterOpen` is unset.
 * @returns Flattened visible rows with emphasis metadata.
 */
export function buildVisibleStepRows(
  items: ListStepItem[],
  defaultExpandNested: "yes" | "no" = "yes",
  options?: { expandAll?: boolean },
): VisibleStepRow[] {
  const rows: VisibleStepRow[] = [];

  items.forEach((item, parentIndex) => {
    const children = Array.isArray(item.children) ? item.children : [];
    const hasChildren = children.length > 0;
    const chapterOpen = options?.expandAll
      ? hasChildren
      : isChapterOpen(item, defaultExpandNested);
    const parentFallback = item.label?.trim() || `Step ${parentIndex + 1}`;
    const parentLabel = item.text?.trim() ? item.text : normalizeListStepHtml(parentFallback);

    rows.push({
      flatIndex: rows.length,
      parentIndex,
      childIndex: null,
      depth: 0,
      labelHtml: parentLabel,
      fallbackLabel: parentFallback,
      hasChildren,
      chapterOpen,
      emphasis: resolveRowEmphasis(item, null, defaultExpandNested),
    });

    if (hasChildren && chapterOpen) {
      children.forEach((child, childIndex) => {
        const childFallback =
          child.label?.trim() ||
          listStepPlainLabel(child.text, `Sub-step ${parentIndex + 1}.${childIndex + 1}`);
        const childLabel = child.text?.trim()
          ? child.text
          : normalizeListStepHtml(childFallback);

        rows.push({
          flatIndex: rows.length,
          parentIndex,
          childIndex,
          depth: 1,
          labelHtml: childLabel,
          fallbackLabel: childFallback,
          hasChildren: false,
          chapterOpen: false,
          emphasis: resolveRowEmphasis(item, child, defaultExpandNested),
        });
      });
    }
  });

  return rows;
}

/**
 * Build a flat list of visible step refs for editor selection-index mapping.
 *
 * @param items - Step tree from block props.
 * @param defaultExpandNested - Fallback when `chapterOpen` is unset.
 * @returns Flattened refs in render order.
 */
export function buildFlatStepRefs(
  items: ListStepItem[] | undefined,
  defaultExpandNested: "yes" | "no" = "yes",
  options?: { expandAll?: boolean },
): FlatStepRef[] {
  return buildVisibleStepRows(items ?? [], defaultExpandNested, options).map((row) => ({
    flatIndex: row.flatIndex,
    parentIndex: row.parentIndex,
    childIndex: row.childIndex,
  }));
}

/**
 * Resolve the flat active index for a parent or nested step.
 *
 * @param items - Step tree from block props.
 * @param parentIndex - Target parent row index.
 * @param childIndex - Nested child index, or `null` for the parent row.
 * @param defaultExpandNested - Fallback when `chapterOpen` is unset.
 * @returns Matching flat index, or `0` when not found.
 */
export function resolveFlatStepIndex(
  items: ListStepItem[] | undefined,
  parentIndex: number,
  childIndex: number | null,
  defaultExpandNested: "yes" | "no" = "yes",
  options?: { expandAll?: boolean },
): number {
  const refs = buildFlatStepRefs(items, defaultExpandNested, options);
  const match = refs.find(
    (ref) => ref.parentIndex === parentIndex && ref.childIndex === childIndex,
  );
  return match?.flatIndex ?? 0;
}

/**
 * Parse a Puck field path for list step sidebar fields.
 *
 * Supports `items[2].label`, `items[2].text`, and `items[2].children`.
 *
 * @param name - Puck field name.
 * @returns Parsed parent/child indices, or `null` when not a list step field.
 */
export function parseListStepFieldPath(
  name?: string,
): { parentIndex: number; childIndex: number | null } | null {
  if (!name) return null;

  const parentMatch = /^items\[(\d+)\]/.exec(name);
  if (!parentMatch) return null;

  const parentIndex = parseInt(parentMatch[1], 10);
  const childMatch = /^items\[\d+\]\.children\[(\d+)\]/.exec(name);
  const childIndex = childMatch ? parseInt(childMatch[1], 10) : null;

  return { parentIndex, childIndex };
}

/**
 * Normalize legacy plain-text step copy to HTML for {@link NexusRichTextView}.
 *
 * @param text - Stored step label HTML or legacy plain string.
 * @returns Sanitized-ready HTML string.
 */
export function normalizeListStepHtml(text: string | undefined): string {
  const trimmed = text?.trim() ?? "";
  if (!trimmed) return "";
  if (trimmed.includes("<")) return trimmed;
  return `<p>${trimmed}</p>`;
}

/**
 * Derive plain-text fallback when HTML is empty (canvas placeholder / summaries).
 *
 * @param html - Stored rich-text HTML for a step.
 * @param fallback - Label to show when HTML is empty.
 * @returns Visible plain label.
 */
export function listStepPlainLabel(html: string | undefined, fallback: string): string {
  const trimmed = html?.trim() ?? "";
  if (!trimmed) return fallback;
  return trimmed.replace(/<[^>]+>/g, "").trim() || fallback;
}
