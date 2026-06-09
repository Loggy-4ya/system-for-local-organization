"use client";

/**
 * @fileoverview Puck block for a styled Button.
 *
 * Maps to Figma Button variants (Primary, Secondary, Ghost, Success, Danger),
 * with size, full-width, border-radius, and icon selection.
 *
 * @module src/components/puck/blocks/content/NexusButton
 */

import React from "react";

export const NexusButton = {
  label: "Button",
  fields: {
    label: {
      type: "text" as const,
      label: "Label",
    },
    variant: {
      type: "select" as const,
      label: "Variant",
      options: [
        { label: "Primary (Accent)", value: "primary" },
        { label: "Secondary (Elevated)", value: "secondary" },
        { label: "Ghost (Transparent)", value: "ghost" },
        { label: "Success (Green)", value: "success" },
        { label: "Danger (Red)", value: "danger" },
      ],
    },
    size: {
      type: "radio" as const,
      label: "Size",
      options: [
        { label: "Small", value: "sm" },
        { label: "Medium", value: "md" },
        { label: "Large", value: "lg" },
      ],
    },
    fullWidth: {
      type: "radio" as const,
      label: "Full Width",
      options: [
        { label: "No", value: "no" },
        { label: "Yes", value: "yes" },
      ],
    },
    borderRadius: {
      type: "select" as const,
      label: "Border Radius",
      options: [
        { label: "Small (4px)", value: "var(--radius-sm)" },
        { label: "Medium (8px)", value: "var(--radius-md)" },
        { label: "Large (12px)", value: "var(--radius-lg)" },
        { label: "Full (Pill)", value: "var(--radius-full)" },
      ],
    },
    icon: {
      type: "select" as const,
      label: "Icon (Optional)",
      options: [
        { label: "None", value: "" },
        { label: "Arrow Right (→)", value: "→" },
        { label: "Plus (+)", value: "+" },
        { label: "Checkmark (✓)", value: "✓" },
        { label: "Cross (❌)", value: "❌" },
        { label: "Warning (⚠️)", value: "⚠️" },
        { label: "Star (⭐)", value: "⭐" },
      ],
    },
    iconPosition: {
      type: "radio" as const,
      label: "Icon Position",
      options: [
        { label: "Left", value: "left" },
        { label: "Right", value: "right" },
      ],
    },
    href: {
      type: "text" as const,
      label: "Link URL (Optional)",
    },
  },
  defaultProps: {
    label: "Action",
    variant: "primary" as const,
    size: "md" as const,
    fullWidth: "no" as const,
    borderRadius: "var(--radius-md)" as const,
    icon: "",
    iconPosition: "right" as const,
    href: "",
  },
  render({
    label,
    variant,
    size,
    fullWidth,
    borderRadius,
    icon,
    iconPosition,
    href,
  }: {
    label: string;
    variant: "primary" | "secondary" | "ghost" | "success" | "danger";
    size: "sm" | "md" | "lg";
    fullWidth: "no" | "yes";
    borderRadius: string;
    icon?: string;
    iconPosition: "left" | "right";
    href?: string;
  }) {
    const styles: Record<"primary" | "secondary" | "ghost" | "success" | "danger", React.CSSProperties> = {
      primary: {
        background: "var(--color-accent-user)",
        color: "#fff",
        border: "none",
      },
      secondary: {
        background: "var(--color-bg-elevated)",
        color: "var(--color-text-primary)",
        border: "1px solid var(--color-border-default)",
      },
      ghost: {
        background: "transparent",
        color: "var(--color-text-secondary)",
        border: "1px solid var(--color-border-default)",
      },
      success: {
        background: "var(--color-success)",
        color: "#0f1729",
        border: "none",
        fontWeight: 600,
      },
      danger: {
        background: "var(--color-danger)",
        color: "#fff",
        border: "none",
      },
    };

    const sizeStyles = {
      sm: { padding: "6px 12px", fontSize: "12px" },
      md: { padding: "10px 18px", fontSize: "13px" },
      lg: { padding: "14px 24px", fontSize: "15px" },
    };

    const buttonElement = (
      <button
        style={{
          borderRadius: borderRadius || "var(--radius-md)",
          fontWeight: 500,
          cursor: "pointer",
          transition: "opacity 0.2s, transform 0.1s",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "6px",
          width: fullWidth === "yes" ? "100%" : "auto",
          boxSizing: "border-box",
          ...styles[variant],
          ...sizeStyles[size],
        }}
      >
        {icon && iconPosition === "left" && <span aria-hidden="true">{icon}</span>}
        <span>{label}</span>
        {icon && iconPosition === "right" && <span aria-hidden="true">{icon}</span>}
      </button>
    );

    if (href) {
      return (
        <a href={href} style={{ textDecoration: "none", display: fullWidth === "yes" ? "block" : "inline-block", width: fullWidth === "yes" ? "100%" : "auto" }}>
          {buttonElement}
        </a>
      );
    }

    return buttonElement;
  },
};

export default NexusButton;
