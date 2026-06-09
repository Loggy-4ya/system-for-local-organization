"use client";

/**
 * @fileoverview Puck Root component for Project Nexus.
 *
 * Defines the root page wrapper that supports choosing page-level backgrounds
 * (site-default InfiniteGrid, solid color, or custom uploaded image).
 *
 * @module src/components/puck/root/PageRoot
 */

import React from "react";
import { ImageField } from "../fields/ImageField";
import { InfiniteGrid } from "@/components/background/InfiniteGrid";

export const PageRoot = {
  fields: {
    title: {
      type: "text" as const,
      label: "Page Title",
    },
    background: {
      type: "select" as const,
      label: "Page Background Style",
      options: [
        { label: "Site Default (InfiniteGrid)", value: "site-default" },
        { label: "Solid Color", value: "solid" },
        { label: "Custom Image", value: "custom-image" },
      ],
    },
    backgroundColor: {
      type: "text" as const,
      label: "Background Color (HEX/RGB)",
    },
    backgroundImage: {
      type: "custom" as const,
      label: "Background Image",
      render: ImageField as any,
    },
  },
  defaultProps: {
    title: "Untitled Page",
    background: "site-default" as const,
    backgroundColor: "#0f1729",
    backgroundImage: "",
  },
  render({
    children,
    background,
    backgroundColor,
    backgroundImage,
  }: {
    children: React.ReactNode;
    title: string;
    background: "site-default" | "solid" | "custom-image";
    backgroundColor: string;
    backgroundImage: string;
  }) {
    const bgStyles: React.CSSProperties = {};

    if (background === "solid") {
      bgStyles.backgroundColor = backgroundColor || "#0f1729";
      bgStyles.backgroundImage = "none";
    } else if (background === "custom-image") {
      bgStyles.backgroundImage = backgroundImage ? `url(${backgroundImage})` : "none";
      bgStyles.backgroundSize = "cover";
      bgStyles.backgroundPosition = "center";
      bgStyles.backgroundRepeat = "no-repeat";
    } else {
      // site-default: transparent wrapper so InfiniteGrid from root layout shows through
      bgStyles.background = "transparent";
    }

    return (
      <div
        style={{
          position: "relative", // Required for absolute positioning of contained InfiniteGrid
          minHeight: "100vh",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          transition: "background 0.3s ease",
          ...bgStyles,
        }}
      >
        {background === "site-default" && <InfiniteGrid isContained />}
        <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", flex: 1, width: "100%" }}>
          {children}
        </div>
      </div>
    );
  },
};

export default PageRoot;
