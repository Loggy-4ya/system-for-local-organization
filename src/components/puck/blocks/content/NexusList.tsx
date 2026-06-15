"use client";

/**
 * @fileoverview Puck block for bulleted or numbered Lists.
 *
 * Renders a list of items with customizable list styles, Puck array reorder UI,
 * and spacing between items via design-system tokens.
 *
 * @module src/components/puck/blocks/content/NexusList
 */

import { ListItemLabelField } from "../../fields/ListItemLabelField";
import { createPresetDimensionPuckField } from "../../lib/createPresetDimensionPuckField";
import { LIST_ITEM_SPACING_OPTIONS } from "../../lib/fieldOptionLabels";
import {
  ensureListItemLabels,
  formatListItemLabel,
} from "../../lib/listItemLabels";
import { resolveSpacingDimension } from "../../lib/resolveSpacingDimension";

/** Default empty list item — label filled by `ensureListItemLabels` on insert. */
const emptyListItem = { label: "", text: "" };

const ITEM_SPACING_DEFAULTS = { preset: "md", custom: "8px" };

export const NexusList = {
  label: "List",
  fields: {
    items: {
      type: "array" as const,
      label: "List Items",
      getItemSummary: (item: { label?: string }, index?: number) =>
        item.label?.trim() || formatListItemLabel(index ?? 0),
      arrayFields: {
        label: {
          type: "custom" as const,
          label: "Item",
          render: ListItemLabelField as never,
        },
        text: {
          type: "text" as const,
          label: "Text",
        },
      },
      defaultItemProps: emptyListItem,
    },
    listType: {
      type: "radio" as const,
      label: "List Type",
      options: [
        { label: "Bulleted", value: "bullet" },
        { label: "Numbered", value: "number" },
      ],
    },
    itemSpacing: createPresetDimensionPuckField({
      label: "Item Spacing",
      options: LIST_ITEM_SPACING_OPTIONS,
      defaultPreset: "md",
      defaultCustom: "8px",
      legacyMap: { sm: "sm", md: "md" },
      showSpacingHint: true,
    }),
  },
  defaultProps: {
    items: [
      { label: formatListItemLabel(0), text: "" },
      { label: formatListItemLabel(1), text: "" },
      { label: formatListItemLabel(2), text: "" },
    ],
    listType: "bullet" as const,
    itemSpacing: { preset: "md", custom: "8px" },
  },
  resolveData: (
    { props }: { props: { items?: Array<{ label?: string; text?: string }> } },
    params: {
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
        items: ensureListItemLabels(props.items),
      },
    };
  },
  render({
    items,
    listType,
    itemSpacing,
  }: {
    items?: Array<{ label?: string; text?: string }>;
    listType: "bullet" | "number";
    itemSpacing: unknown;
  }) {
    const Tag = listType === "number" ? "ol" : "ul";
    const resolvedItems =
      items?.filter((item) => item && typeof item.text === "string").length
        ? items
        : [{ text: "" }];

    const itemGap = resolveSpacingDimension(itemSpacing, ITEM_SPACING_DEFAULTS, {
      sm: "sm",
      md: "md",
    });
    const listClassName = listType === "number" ? "nexus-list nexus-list--ordered" : "nexus-list";

    return (
      <Tag className={listClassName}>
        {resolvedItems.map((item, idx) => (
          <li
            key={idx}
            className="nexus-list__item"
            style={{
              marginBottom: idx < resolvedItems.length - 1 ? itemGap : undefined,
            }}
          >
            {item.text?.trim() || "List item"}
          </li>
        ))}
      </Tag>
    );
  },
};

export default NexusList;
