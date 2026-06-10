"use client";

/**
 * @fileoverview Puck Root component for Project Nexus.
 *
 * @module src/components/puck/root/PageRoot
 */

import React from "react";
import { PageAppearanceFieldGroup } from "../fields/PageAppearanceFieldGroup";
import { resolveAccentPreset } from "../fields/AccentPresetField";
import { InfiniteGrid } from "@/components/background/InfiniteGrid";
import { EditorHeaderChrome } from "./EditorHeaderChrome";

/** Page background settings grouped in the Puck sidebar. */
interface PageAppearanceProps {
  background: "site-default" | "solid" | "custom-image";
  backgroundPreset?: string;
  backgroundImage?: string;
}

/** Root props shape for PageRoot render and field resolution. */
interface PageRootProps {
  children: React.ReactNode;
  title: string;
  appearance?: PageAppearanceProps;
  /** @deprecated Flat props kept for pages saved before grouping. */
  background?: PageAppearanceProps["background"];
  backgroundPreset?: string;
  backgroundImage?: string;
  puck?: { isEditing?: boolean };
}

function resolveAppearance(props: PageRootProps): PageAppearanceProps {
  return {
    background: props.appearance?.background ?? props.background ?? "site-default",
    backgroundPreset: props.appearance?.backgroundPreset ?? props.backgroundPreset,
    backgroundImage: props.appearance?.backgroundImage ?? props.backgroundImage,
  };
}

export const PageRoot = {
  fields: {
    title: { type: "text" as const, label: "Page Title" },
    appearance: {
      type: "custom" as const,
      label: "",
      render: PageAppearanceFieldGroup as never,
    },
  },
  defaultProps: {
    title: "Untitled Page",
    appearance: {
      background: "site-default" as const,
      backgroundPreset: "hue-blue",
      backgroundImage: "",
    },
  },
  render(props: PageRootProps) {
    const { children, puck } = props;
    const { background, backgroundPreset, backgroundImage } = resolveAppearance(props);
    const bgStyles: React.CSSProperties = {};
    const isEditing = Boolean(puck?.isEditing);

    if (background === "solid") {
      bgStyles.backgroundColor = resolveAccentPreset(backgroundPreset);
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
