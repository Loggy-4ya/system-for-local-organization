"use client";

/**
 * @fileoverview Puck block for a standalone Avatar.
 *
 * Maps to Figma Avatar components with size (sm, md, lg, xl) and shape (circle, rounded, square) settings.
 *
 * @module src/components/puck/blocks/user/NexusAvatar
 */

import React from "react";
import { sanitizeMediaUrl } from "@shared/lib/safeMediaUrl";
import { ImageField } from "../../fields/ImageField";

export const NexusAvatar = {
  label: "Avatar",
  fields: {
    image: {
      type: "custom" as const,
      label: "Avatar Image",
      render: ImageField as any,
    },
    size: {
      type: "radio" as const,
      label: "Size",
      options: [
        { label: "Small (28px)", value: "sm" },
        { label: "Medium (40px)", value: "md" },
        { label: "Large (54px)", value: "lg" },
        { label: "X-Large (80px)", value: "xl" },
      ],
    },
    shape: {
      type: "radio" as const,
      label: "Shape",
      options: [
        { label: "Circle", value: "circle" },
        { label: "Rounded Square", value: "rounded" },
        { label: "Square", value: "square" },
      ],
    },
    name: {
      type: "text" as const,
      label: "Name (for fallback initials)",
    },
  },
  defaultProps: {
    image: "",
    size: "md" as const,
    shape: "circle" as const,
    name: "User",
  },
  render({
    image,
    size,
    shape,
    name,
  }: {
    image: string;
    size: "sm" | "md" | "lg" | "xl";
    shape: "circle" | "rounded" | "square";
    name: string;
  }) {
    const safeImage = sanitizeMediaUrl(image);
    const sizePixels = {
      sm: 28,
      md: 40,
      lg: 54,
      xl: 80,
    };

    const px = sizePixels[size] || 40;

    const shapeRadius = {
      circle: "50%",
      rounded: "var(--radius-lg)",
      square: "0px",
    };

    return (
      <div
        style={{
          width: `${px}px`,
          height: `${px}px`,
          borderRadius: shapeRadius[shape] || "50%",
          border: "2px solid var(--color-accent-user)",
          background: "var(--color-bg-elevated)",
          overflow: "hidden",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {safeImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={safeImage}
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
              fontSize: px > 54 ? "24px" : px > 40 ? "18px" : px > 28 ? "14px" : "11px",
            }}
          >
            {name.split(" ").map(n => n[0]).join("").toUpperCase() || "U"}
          </div>
        )}
      </div>
    );
  },
};

export default NexusAvatar;
