"use client";

/**
 * @fileoverview Puck block for a vertical stepper list with editor highlights and connector styles.
 *
 * @module src/components/puck/blocks/content/NexusList
 */

import { ListConnectorStyleField } from "../../fields/ListConnectorStyleField";
import { ListDefaultExpandNestedField } from "../../fields/ListDefaultExpandNestedField";
import { ListItemTiptapField } from "../../fields/ListItemTiptapField";
import { ListStepChapterOpenField } from "../../fields/ListStepChapterOpenField";
import { ListStepChildrenField } from "../../fields/ListStepChildrenField";
import { ListStepHighlightField } from "../../fields/ListStepHighlightField";
import { ListStepLabelField } from "../../fields/ListStepLabelField";
import { createPresetDimensionPuckField } from "../../lib/createPresetDimensionPuckField";
import { LIST_ITEM_SPACING_OPTIONS } from "../../lib/fieldOptionLabels";
import { migrateListItems, normalizeConnectorStyle } from "../../lib/listStepTree";
import { NexusListRender } from "./NexusListRender";

/** Default empty step — labels filled by `migrateListItems` on insert. */
const emptyListStep = {
  label: "",
  text: "",
  highlighted: false,
  chapterOpen: "yes" as const,
  children: [] as never[],
};

/**
 * Stepper list — vertical timeline with editor highlights and configurable dot connectors.
 */
export const NexusList = {
  label: "List",
  fields: {
    items: {
      type: "array" as const,
      label: "Steps",
      getItemSummary: (item: { label?: string; highlighted?: boolean }, index?: number) => {
        const label = item.label?.trim() || `Step ${(index ?? 0) + 1}`;
        return item.highlighted ? `${label} ★` : label;
      },
      arrayFields: {
        label: {
          type: "custom" as const,
          label: "Sidebar name",
          render: ListStepLabelField as never,
        },
        text: {
          type: "custom" as const,
          label: "Canvas label",
          render: ListItemTiptapField as never,
        },
        highlighted: {
          type: "custom" as const,
          label: "Highlight",
          render: ListStepHighlightField as never,
        },
        chapterOpen: {
          type: "custom" as const,
          label: "Chapter open on publish",
          render: ListStepChapterOpenField as never,
        },
        children: {
          type: "custom" as const,
          label: "Sub-steps",
          render: ListStepChildrenField as never,
        },
      },
      defaultItemProps: emptyListStep,
    },
    connectorStyle: {
      type: "custom" as const,
      label: "Connections",
      render: ListConnectorStyleField as never,
    },
    defaultExpandNested: {
      type: "custom" as const,
      label: "Default chapter open",
      render: ListDefaultExpandNestedField as never,
    },
    itemSpacing: createPresetDimensionPuckField({
      label: "Step spacing",
      options: LIST_ITEM_SPACING_OPTIONS,
      defaultPreset: "md",
      defaultCustom: "8px",
      legacyMap: { sm: "sm", md: "md" },
      showSpacingHint: false,
    }),
    editorActiveIndex: {
      type: "number" as const,
      label: "Editor Active Step",
      min: 0,
      visible: false,
    },
  },
  defaultProps: {
    items: [
      {
        label: "Getting started",
        text: "<p>Getting started</p>",
        highlighted: true,
        chapterOpen: "yes",
        children: [],
      },
      {
        label: "Core concepts",
        text: "<p>Core concepts</p>",
        highlighted: false,
        chapterOpen: "yes",
        children: [],
      },
      {
        label: "Developer tools",
        text: "<p>Developer tools</p>",
        highlighted: false,
        chapterOpen: "yes",
        children: [],
      },
      {
        label: "Framework integration",
        text: "<p>Framework integration</p>",
        highlighted: false,
        chapterOpen: "yes",
        children: [
          { label: "Alpine", text: "<p>Alpine</p>", highlighted: false },
          { label: "Angular", text: "<p>Angular</p>", highlighted: false },
          { label: "React", text: "<p>React</p>", highlighted: true },
          { label: "Vue", text: "<p>Vue</p>", highlighted: false },
        ],
      },
    ],
    connectorStyle: "spine",
    defaultExpandNested: "yes" as const,
    editorActiveIndex: 0,
    itemSpacing: { preset: "md", custom: "8px" },
  },
  resolveData: (
    {
      props,
    }: {
      props: {
        items?: Array<{ label?: string; text?: string; children?: unknown[] }>;
        defaultExpandNested?: "yes" | "no";
        defaultActiveIndex?: number;
        connectorStyle?: string;
      };
    },
    params: {
      trigger: "insert" | "replace" | "load" | "move" | "force";
    },
  ) => {
    const shouldMigrate = params.trigger === "load" || params.trigger === "insert";
    const defaultExpandNested = props.defaultExpandNested ?? "yes";
    const connectorStyle = normalizeConnectorStyle(props.connectorStyle);

    if (!shouldMigrate) {
      return {
        props: {
          ...props,
          connectorStyle,
        },
      };
    }

    return {
      props: {
        ...props,
        defaultActiveIndex: undefined,
        connectorStyle,
        items: migrateListItems(props.items, defaultExpandNested),
      },
    };
  },
  render: NexusListRender,
};

export default NexusList;
