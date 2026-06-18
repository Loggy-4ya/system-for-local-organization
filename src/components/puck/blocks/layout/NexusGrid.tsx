"use client";

/**
 * @fileoverview Puck block for a flexible CSS Grid with array-managed cells.
 *
 * Grid cells are configured from the block sidebar (`items` array) — add, remove, and
 * reorder cells like carousel slides or tabs. Each cell exposes a nested content slot.
 * Canvas drag reorders cells; content blocks drag into cell slots as before.
 *
 * @module src/components/puck/blocks/layout/NexusGrid
 */

import { createPresetDimensionPuckField } from "../../lib/createPresetDimensionPuckField";
import { createSteppedSliderField } from "../../lib/createSteppedSliderField";
import { GridItemLabelField } from "../../fields/GridItemLabelField";
import {
  GRID_COLUMN_OPTIONS,
  GRID_SPAN_COL_OPTIONS,
  GRID_SPAN_ROW_OPTIONS,
  LAYOUT_GAP_OPTIONS,
} from "../../lib/fieldOptionLabels";
import {
  NEXUS_GRID_ITEM_DEFAULT_SPAN_COL,
  NEXUS_GRID_ITEM_DEFAULT_SPAN_ROW,
} from "../../lib/gridEditSizing";
import {
  ensureGridItemLabels,
  formatGridItemLabel,
} from "../../lib/gridItemLabels";
import { resolveSpacingDimension } from "../../lib/resolveSpacingDimension";
import { NexusGridRender, type NexusGridRenderProps } from "./NexusGridRender";

const GAP_DEFAULTS = { preset: "md", custom: "16px" };

/** Default empty grid cell. */
const emptyGridItem = {
  label: "",
  spanCol: NEXUS_GRID_ITEM_DEFAULT_SPAN_COL,
  spanRow: NEXUS_GRID_ITEM_DEFAULT_SPAN_ROW,
  content: [] as never[],
};

/** Props passed to grid render after gap normalization. */
interface GridRenderProps {
  id?: string;
  columns: string;
  gap?: unknown;
  items?: typeof emptyGridItem[];
  puck?: { isEditing?: boolean };
}

export const NexusGrid = {
  label: "Grid Layout",
  fields: {
    columns: createSteppedSliderField("Grid Columns", GRID_COLUMN_OPTIONS),
    gap: createPresetDimensionPuckField({
      label: "Gap Size",
      options: LAYOUT_GAP_OPTIONS,
      defaultPreset: "md",
      defaultCustom: "16px",
      showSpacingHint: true,
    }),
    items: {
      type: "array" as const,
      label: "Grid Cells",
      min: 1,
      getItemSummary: (item: { label?: string }, index?: number) =>
        item.label?.trim() || formatGridItemLabel(index ?? 0),
      arrayFields: {
        label: {
          type: "custom" as const,
          label: "Cell",
          render: GridItemLabelField as never,
        },
        spanCol: createSteppedSliderField("Column Span", GRID_SPAN_COL_OPTIONS),
        spanRow: createSteppedSliderField("Row Span", GRID_SPAN_ROW_OPTIONS),
        content: {
          type: "slot" as const,
          label: "Cell Content",
          disallow: ["NexusGridItem", "NexusGrid"],
        },
      },
      defaultItemProps: emptyGridItem,
    },
  },
  defaultProps: {
    columns: "12" as const,
    gap: { preset: "md", custom: "16px" },
    items: [
      {
        label: formatGridItemLabel(0),
        spanCol: NEXUS_GRID_ITEM_DEFAULT_SPAN_COL,
        spanRow: NEXUS_GRID_ITEM_DEFAULT_SPAN_ROW,
        content: [],
      },
      {
        label: formatGridItemLabel(1),
        spanCol: NEXUS_GRID_ITEM_DEFAULT_SPAN_COL,
        spanRow: NEXUS_GRID_ITEM_DEFAULT_SPAN_ROW,
        content: [],
      },
    ],
  },
  resolveData: (
    { props }: { props: GridRenderProps },
    params: {
      changed: Partial<Record<keyof GridRenderProps, boolean>>;
      trigger: "insert" | "replace" | "load" | "move" | "force";
    },
  ) => {
    const shouldEnsureLabels =
      params.trigger === "load" || params.trigger === "insert";

    if (!shouldEnsureLabels) {
      return { props };
    }

    return {
      props: {
        ...props,
        items: ensureGridItemLabels(props.items),
      },
    };
  },
  render(props: GridRenderProps) {
    const resolvedGap = resolveSpacingDimension(props.gap, GAP_DEFAULTS);

    return (
      <NexusGridRender
        id={props.id}
        columns={props.columns}
        gap={resolvedGap}
        items={props.items as NexusGridRenderProps["items"]}
        puck={props.puck}
      />
    );
  },
};

export default NexusGrid;
