"use client";

/**
 * @fileoverview Puck block for interactive tabs with per-tab drag-and-drop content slots.
 *
 * @module src/components/puck/blocks/content/NexusTabs
 */

import { NexusTabsRender } from "./NexusTabsRender";
import { TAB_SIZE_OPTIONS } from "../../lib/fieldOptionLabels";
import { createSteppedSliderField } from "../../lib/createSteppedSliderField";
import { StripArrayLabelField } from "../../fields/StripArrayLabelField";
import { formatTabLabel } from "../../lib/arrayItemLabels";
import { DISALLOW_NEXUS_GRID_ITEM } from "../../lib/nexusGridItemZonePolicy";

/** Default empty tab with slot array for Puck inline data model. */
const emptyTab = { label: "", panel: [] as never[] };

/**
 * Tab group — each tab exposes a slot for arbitrary Puck blocks.
 */
export const NexusTabs = {
  label: "Tabs Group",
  fields: {
    tabs: {
      type: "array" as const,
      label: "Tabs",
      min: 1,
      max: 8,
      getItemSummary: (item: { label?: string }, index?: number) =>
        item.label?.trim() || formatTabLabel(index ?? 0),
      arrayFields: {
        label: {
          type: "custom" as const,
          label: "Tab Label",
          render: StripArrayLabelField as never,
        },
        panel: {
          type: "slot" as const,
          label: "Tab Content",
          disallow: [...DISALLOW_NEXUS_GRID_ITEM],
        },
      },
      defaultItemProps: emptyTab,
    },
    defaultActiveIndex: {
      type: "number" as const,
      label: "Default Active Tab",
      min: 0,
    },
    align: {
      type: "radio" as const,
      label: "Alignment",
      options: [
        { label: "Left", value: "left" },
        { label: "Center", value: "center" },
        { label: "Right", value: "right" },
      ],
    },
    size: createSteppedSliderField("Size", TAB_SIZE_OPTIONS),
    accentColor: {
      type: "text" as const,
      label: "Active Tab Color (optional css color)",
    },
    editorActiveIndex: {
      type: "number" as const,
      label: "Editor Active Tab",
      min: 0,
      visible: false,
    },
  },
  defaultProps: {
    tabs: [
      { label: "Overview", panel: [] },
      { label: "Details", panel: [] },
      { label: "Resources", panel: [] },
    ],
    defaultActiveIndex: 0,
    editorActiveIndex: 0,
    align: "left" as const,
    size: "md" as const,
    accentColor: "",
  },
  render: NexusTabsRender,
};

export default NexusTabs;
