"use client";

/**
 * @fileoverview Puck block for a User Profile Badge.
 *
 * Maps to Figma profile hero components. Renders the user's avatar,
 * name, subtitle, group badge, and role badge with layout, background,
 * and shadow options.
 *
 * @module src/components/puck/blocks/user/NexusUserBadge
 */

import React from "react";
import { ImageField } from "../../fields/ImageField";

export const NexusUserBadge = {
  label: "User Profile Badge",
  fields: {
    avatar: {
      type: "custom" as const,
      label: "Avatar Image",
      render: ImageField as any,
    },
    name: {
      type: "text" as const,
      label: "Full Name",
    },
    subtitle: {
      type: "text" as const,
      label: "Subtitle (e.g. Specialty / Email)",
    },
    group: {
      type: "text" as const,
      label: "Group Badge (e.g. SE-42)",
    },
    role: {
      type: "text" as const,
      label: "Role Badge (e.g. Starosta)",
    },
    layout: {
      type: "radio" as const,
      label: "Layout Style",
      options: [
        { label: "Horizontal", value: "horizontal" },
        { label: "Vertical (Centered)", value: "vertical" },
      ],
    },
    backgroundOverride: {
      type: "text" as const,
      label: "Background Color/Gradient (Optional)",
    },
    shadowDepth: {
      type: "select" as const,
      label: "Shadow Depth",
      options: [
        { label: "None", value: "none" },
        { label: "Soft", value: "0 4px 12px rgba(0,0,0,0.1)" },
        { label: "Medium", value: "0 8px 24px rgba(0,0,0,0.2)" },
        { label: "Strong (Figma)", value: "0 8px 24px -4px rgba(0,0,0,0.35)" },
      ],
    },
  },
  defaultProps: {
    avatar: "",
    name: "Anna Koval",
    subtitle: "Software Engineering · anna.koval@college.edu",
    group: "SE-42",
    role: "Starosta",
    layout: "horizontal" as const,
    backgroundOverride: "",
    shadowDepth: "0 8px 24px -4px rgba(0,0,0,0.35)" as const,
  },
  render({
    avatar,
    name,
    subtitle,
    group,
    role,
    layout,
    backgroundOverride,
    shadowDepth,
  }: {
    avatar: string;
    name: string;
    subtitle: string;
    group: string;
    role: string;
    layout: "horizontal" | "vertical";
    backgroundOverride?: string;
    shadowDepth: string;
  }) {
    const isVertical = layout === "vertical";

    return (
      <div
        className="glass-panel"
        style={{
          display: "flex",
          flexDirection: isVertical ? "column" : "row",
          alignItems: "center",
          justifyContent: isVertical ? "center" : "flex-start",
          gap: "16px",
          padding: "20px",
          width: "100%",
          maxWidth: isVertical ? "320px" : "480px",
          margin: "0 auto",
          textAlign: isVertical ? "center" : "left",
          background: backgroundOverride || "var(--color-bg-panel)",
          boxShadow: shadowDepth || "none",
          boxSizing: "border-box",
        }}
      >
        {/* Avatar */}
        <div
          style={{
            width: "64px",
            height: "64px",
            borderRadius: "50%",
            border: "2px solid var(--color-accent-user)",
            background: "var(--color-bg-elevated)",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatar}
              alt={name}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                background: "var(--color-accent-user)",
                opacity: 0.6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontWeight: 600,
                fontSize: "20px",
              }}
            >
              {name.split(" ").map(n => n[0]).join("").toUpperCase() || "U"}
            </div>
          )}
        </div>

        {/* Info */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: isVertical ? "center" : "flex-start",
            gap: "6px",
            minWidth: 0,
            flex: 1,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: isVertical ? "column" : "row",
              alignItems: "center",
              gap: "8px",
              flexWrap: "wrap",
              justifyContent: isVertical ? "center" : "flex-start",
            }}
          >
            <span
              style={{
                fontSize: "16px",
                fontWeight: 600,
                color: "var(--color-text-primary)",
              }}
            >
              {name}
            </span>

            {/* Badges */}
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", justifyContent: "center" }}>
              {group && <span className="badge badge-group">{group}</span>}
              {role && <span className="badge badge-role">{role}</span>}
            </div>
          </div>

          {subtitle && (
            <span
              style={{
                fontSize: "12px",
                color: "var(--color-text-secondary)",
                whiteSpace: isVertical ? "normal" : "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: "100%",
              }}
            >
              {subtitle}
            </span>
          )}
        </div>
      </div>
    );
  },
};

export default NexusUserBadge;
