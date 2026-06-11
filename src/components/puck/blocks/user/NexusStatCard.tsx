"use client";

/**
 * @fileoverview Puck block for a KPI Stat Card.
 *
 * Maps to Figma StatCard components with icon selection, border-radius,
 * and background overrides.
 *
 * @module src/components/puck/blocks/user/NexusStatCard
 */

import { Card, CardContent } from "@/components/ui/card";

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
      <Card
        className="glass-panel mx-auto w-full border-border py-0"
        style={{
          borderRadius: borderRadius || "var(--radius-lg)",
          background: backgroundOverride || undefined,
        }}
      >
        <CardContent className="flex items-center justify-between gap-3 px-5 py-4">
          <div className="flex flex-col gap-1 text-left">
            <p className="m-0 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {label}
            </p>
            <p className="m-0 text-2xl leading-tight font-bold text-foreground">{value}</p>
          </div>

          {icon ? (
            <span className="text-[28px] opacity-90 select-none" aria-hidden="true">
              {icon}
            </span>
          ) : null}
        </CardContent>
      </Card>
    );
  },
};

export default NexusStatCard;
