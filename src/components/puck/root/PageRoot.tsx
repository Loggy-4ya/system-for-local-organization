"use client";

/**
 * @fileoverview Puck Root component for Project Nexus.
 *
 * @module src/components/puck/root/PageRoot
 */

import React from "react";
import { MediaUploadField } from "../fields/MediaUploadField";
import { AccentPresetField, resolveAccentPreset } from "../fields/AccentPresetField";
import { RgbaColorField } from "../fields/RgbaColorField";
import { InfiniteGrid } from "@/components/background/InfiniteGrid";
import { EditorHeaderChrome } from "./EditorHeaderChrome";

/** Root props shape for PageRoot render and field resolution. */
interface PageRootProps {
  children: React.ReactNode;
  title: string;
  background: "site-default" | "solid" | "custom-image";
  backgroundPreset?: string;
  backgroundColor?: string;
  backgroundImage?: string;
  puck?: { isEditing?: boolean };
}

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
    backgroundPreset: {
      type: "custom" as const,
      label: "Accent Background Preset",
      render: AccentPresetField as never,
    },
    backgroundColor: {
      type: "custom" as const,
      label: "Custom Background Color",
      render: RgbaColorField as never,
    },
    backgroundImage: {
      type: "custom" as const,
      label: "Background Image",
      render: MediaUploadField as never,
    },
  },
  defaultProps: {
    title: "Untitled Page",
    background: "site-default" as const,
    backgroundPreset: "blue-medium",
    backgroundColor: "#0f1729",
    backgroundImage: "",
  },
  resolveFields: (data: { props: PageRootProps }, params: { fields: Record<string, { visible?: boolean }> }) => {
    const { background, backgroundPreset } = data.props;
    const fields = { ...params.fields };

    if (fields.backgroundPreset) {
      fields.backgroundPreset.visible = background === "solid";
    }
    if (fields.backgroundColor) {
      fields.backgroundColor.visible = background === "solid" && backgroundPreset === "custom";
    }
    if (fields.backgroundImage) {
      fields.backgroundImage.visible = background === "custom-image";
    }

    return fields;
  },
  render({
    children,
    background,
    backgroundPreset,
    backgroundColor,
    backgroundImage,
    puck,
  }: PageRootProps) {
    const bgStyles: React.CSSProperties = {};
    const isEditing = Boolean(puck?.isEditing);

    if (background === "solid") {
      const presetColor = resolveAccentPreset(backgroundPreset);
      bgStyles.backgroundColor = presetColor || backgroundColor || "#0f1729";
      bgStyles.backgroundImage = "none";
    } else if (background === "custom-image") {
      bgStyles.backgroundImage = backgroundImage ? `url(${backgroundImage})` : "none";
      bgStyles.backgroundSize = "cover";
      bgStyles.backgroundPosition = "center";
      bgStyles.backgroundRepeat = "no-repeat";
    } else {
      bgStyles.background = "transparent";
    }

    return (
      <div
        style={{
          position: "relative",
          minHeight: "100vh",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          transition: "background 0.3s ease",
          ...bgStyles,
        }}
      >
        {background === "site-default" && <InfiniteGrid isContained />}
        <EditorHeaderChrome isEditor={isEditing} />
        <div
          style={{
            position: "relative",
            zIndex: 1,
            display: "flex",
            flexDirection: "column",
            flex: 1,
            width: "100%",
          }}
        >
          {children}
        </div>
      </div>
    );
  },
};

export default PageRoot;
