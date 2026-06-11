"use client";

/**
 * @fileoverview Puck block for a KPI Stat Card.
 *
 * Maps to Figma StatCard components with icon selection, border-radius,
 * and background overrides.
 *
 * @module src/components/puck/blocks/user/NexusStatCard
 */

import React from "react";

export const NexusStatCard = {
  label: "Stat Card",
  fields: {
    label: {
      type: "text" as const,
      label: "Label",
    },
    value: {
      type: "text" as const,
      label: "Value",
    },
    icon: {
      type: "select" as const,
      label: "Icon (Emoji)",
      options: [
        { label: "None", value: "" },
        { label: "Star (⭐)", value: "⭐" },
        { label: "Warning (⚠️)", value: "⚠️" },
        { label: "Tasks (📋)", value: "📋" },
        { label: "Trophy (🏆)", value: "🏆" },
        { label: "Fire (🔥)", value: "🔥" },
        { label: "Coin (🪙)", value: "🪙" },
      ],
    },
    borderRadius: {
      type: "select" as const,
      label: "Border Radius",
      options: [
        { label: "Small (4px)", value: "var(--radius-sm)" },
        { label: "Medium (8px)", value: "var(--radius-md)" },
        { label: "Large (12px)", value: "var(--radius-lg)" },
      ],
    },
    backgroundOverride: {
      type: "text" as const,
      label: "Background Color/Gradient (Optional)",
    },
  },
  defaultProps: {
    label: "Stars",
    value: "128",
    icon: "⭐",
    borderRadius: "var(--radius-lg)" as const,
    backgroundOverride: "",
  },
  render({
    label,
    value,
    icon,
    borderRadius,
    backgroundOverride,
  }: {
    label: string;
    value: string;
    icon?: string;
    borderRadius: string;
    backgroundOverride?: string;
  }) {
    return (
      <div
        className="glass-panel"
        style={{
          padding: "16px 20px",
          borderRadius: borderRadius || "var(--radius-lg)",
          border: "1px solid var(--color-border-default)",
          background: backgroundOverride || "var(--color-bg-panel)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          width: "100%",
          margin: "0 auto",
          boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "4px", textAlign: "left" }}>
          <p
            style={{
              margin: 0,
              fontSize: "12px",
              color: "var(--color-text-secondary)",
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            {label}
          </p>
          <p
            style={{
              margin: 0,
              fontSize: "24px",
              fontWeight: 700,
              color: "var(--color-text-primary)",
              lineHeight: 1.1,
            }}
          >
            {value}
          </p>
        </div>

        {icon && (
          <span
            style={{
              fontSize: "28px",
              opacity: 0.9,
              userSelect: "none",
            }}
            aria-hidden="true"
          >
            {icon}
          </span>
        )}
      </div>
    );
  },
};

export default NexusStatCard;
