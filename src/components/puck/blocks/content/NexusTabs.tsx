"use client";

/**
 * @fileoverview Puck block for interactive tabs with per-tab drag-and-drop content slots.
 *
 * @module src/components/puck/blocks/content/NexusTabs
 */

import { NexusTabsRender } from "./NexusTabsRender";

/** Default empty tab with slot array for Puck inline data model. */
const emptyTab = { label: "New Tab", panel: [] as never[] };

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
      getItemSummary: (item: { label?: string }) => item.label || "Tab",
      arrayFields: {
        label: { type: "text" as const, label: "Tab Label" },
        panel: {
          type: "slot" as const,
          label: "Tab Content",
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
    size: {
      type: "radio" as const,
      label: "Size",
      options: [
        { label: "Small", value: "sm" },
        { label: "Medium", value: "md" },
      ],
    },
    accentColor: {
      type: "text" as const,
      label: "Active Tab Color (optional css color)",
    },
  },
  defaultProps: {
    tabs: [
      { label: "Overview", panel: [] },
      { label: "Details", panel: [] },
      { label: "Resources", panel: [] },
    ],
    defaultActiveIndex: 0,
    align: "left" as const,
    size: "md" as const,
    accentColor: "",
  },
  render: NexusTabsRender,
};

export default NexusTabs;
