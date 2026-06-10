"use client";

/**
 * @fileoverview Puck block for a horizontal Divider.
 *
 * @module src/components/puck/blocks/content/NexusDivider
 */

import React from "react";
import { NexusColorPresetField } from "../../fields/NexusColorPresetField";
import { resolveNexusColor } from "../../lib/nexusColorTokens";

export const NexusDivider = {
  label: "Divider",
  fields: {
    thickness: {
      type: "select" as const,
      label: "Thickness",
      options: [
        { label: "Thin (1px)", value: "1px" },
        { label: "Medium (2px)", value: "2px" },
        { label: "Thick (4px)", value: "4px" },
      ],
    },
    borderColorPreset: {
      type: "custom" as const,
      label: "Line Color",
      presetGroup: "island-border" as const,
      render: NexusColorPresetField as never,
    },
    width: {
      type: "select" as const,
      label: "Width",
      options: [
        { label: "Full (100%)", value: "100%" },
        { label: "80%", value: "80%" },
        { label: "50%", value: "50%" },
        { label: "20%", value: "20%" },
      ],
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
  },
  defaultProps: {
    thickness: "1px" as const,
    borderColorPreset: "border-default",
    width: "100%" as const,
    align: "center" as const,
  },
  render({
    thickness,
    borderColorPreset,
    colorOverride,
    width,
    align,
  }: {
    thickness: string;
    borderColorPreset?: string;
    colorOverride?: string;
    width: string;
    align: "left" | "center" | "right";
  }) {
    const alignStyles = {
      left: "flex-start",
      center: "center",
      right: "flex-end",
    };
    const lineColor =
      borderColorPreset
        ? resolveNexusColor(borderColorPreset, "var(--color-border-default)")
        : colorOverride || "var(--color-border-default)";

    return (
      <div
        style={{
          display: "flex",
          justifyContent: alignStyles[align] || "center",
          width: "100%",
        }}
      >
        <hr
          style={{
            width: width || "100%",
            border: "none",
            borderTop: `${thickness || "1px"} solid ${lineColor}`,
            margin: 0,
          }}
        />
      </div>
    );
  },
};

export default NexusDivider;
