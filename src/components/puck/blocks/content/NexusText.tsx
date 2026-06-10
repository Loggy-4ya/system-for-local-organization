"use client";

/**
 * @fileoverview Puck block for Body Text.
 *
 * @module src/components/puck/blocks/content/NexusText
 */

import React from "react";
import { RgbaColorField } from "../../fields/RgbaColorField";

export const NexusText = {
  label: "Body Text",
  fields: {
    text: {
      type: "textarea" as const,
      label: "Text Content",
    },
    align: {
      type: "radio" as const,
      label: "Alignment",
      options: [
        { label: "Left", value: "left" },
        { label: "Center", value: "center" },
        { label: "Right", value: "right" },
        { label: "Justify", value: "justify" },
      ],
    },
    colorType: {
      type: "select" as const,
      label: "Color Style",
      options: [
        { label: "Primary Text (Default)", value: "primary" },
        { label: "Secondary Text (Muted)", value: "secondary" },
        { label: "User Accent Color", value: "accent" },
        { label: "Custom HEX/RGB", value: "custom" },
      ],
    },
    customColor: {
      type: "custom" as const,
      label: "Custom Color",
      render: RgbaColorField as never,
    },
    fontSize: {
      type: "select" as const,
      label: "Font Size",
      options: [
        { label: "Small (13px)", value: "0.8125rem" },
        { label: "Normal (15px)", value: "0.9375rem" },
        { label: "Large (18px)", value: "1.125rem" },
      ],
    },
    lineHeight: {
      type: "text" as const,
      label: "Line Height (e.g. 1.5, 1.8)",
    },
  },
  defaultProps: {
    text: "This is a paragraph of body text. You can edit this text inline or in the sidebar.",
    align: "left" as const,
    colorType: "primary" as const,
    customColor: "",
    fontSize: "0.9375rem" as const,
    lineHeight: "1.6",
  },
  resolveFields: (data: { props: { colorType?: string } }, params: { fields: Record<string, { visible?: boolean }> }) => {
    const fields = { ...params.fields };
    if (fields.customColor) {
      fields.customColor.visible = data.props.colorType === "custom";
    }
    return fields;
  },
  render({
    text,
    align,
    colorType,
    customColor,
    fontSize,
    lineHeight,
  }: {
    text: string;
    align: "left" | "center" | "right" | "justify";
    colorType: "primary" | "secondary" | "accent" | "custom";
    customColor?: string;
    fontSize: string;
    lineHeight?: string;
  }) {
    const colors = {
      primary: "var(--color-text-primary)",
      secondary: "var(--color-text-secondary)",
      accent: "var(--color-accent-user)",
      custom: customColor || "var(--color-text-primary)",
    };

    return (
      <p
        style={{
          margin: 0,
          fontSize: fontSize || "0.9375rem",
          lineHeight: lineHeight || "1.6",
          textAlign: align || "left",
          color: colors[colorType] || colors.primary,
          whiteSpace: "pre-wrap",
          width: "100%",
        }}
      >
        {text}
      </p>
    );
  },
};

export default NexusText;
