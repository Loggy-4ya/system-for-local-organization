"use client";

/**
 * @fileoverview Puck Root component for Project Nexus.
 *
 * @module src/components/puck/root/PageRoot
 */

import React from "react";
import { PageAppearanceFieldGroup, type PageAppearanceProps } from "../fields/PageAppearanceFieldGroup";
import {
  PageSettingsFieldGroup,
  type PageSettingsValue,
} from "../fields/PageSettingsFieldGroup";
import { resolveAccentPreset } from "../fields/AccentPresetField";
import {
  contentWidthContainerStyle,
  DEFAULT_CONTENT_WIDTH,
  pageGutterStyle,
} from "../lib/contentWidthTokens";
import { InfiniteGrid } from "@/components/background/InfiniteGrid";
import { EditorHeaderChrome } from "./EditorHeaderChrome";

/** Root props shape for PageRoot render and field resolution. */
interface PageRootProps {
  children: React.ReactNode;
  pageSettings?: PageSettingsValue;
  /** @deprecated Flat title kept for pages saved before pageSettings grouping. */
  title?: string;
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
    contentWidth: props.appearance?.contentWidth ?? DEFAULT_CONTENT_WIDTH,
  };
}

export const PageRoot = {
  fields: {
    pageSettings: {
      type: "custom" as const,
      label: "",
      render: PageSettingsFieldGroup as never,
    },
    appearance: {
      type: "custom" as const,
      label: "",
      render: PageAppearanceFieldGroup as never,
    },
  },
  defaultProps: {
    pageSettings: {
      title: "Untitled Page",
      slug: "",
      slugLocked: false,
    },
    appearance: {
      background: "site-default" as const,
      backgroundPreset: "hue-blue",
      backgroundImage: "",
      contentWidth: DEFAULT_CONTENT_WIDTH,
    },
  },
  render(props: PageRootProps) {
    const { children, puck } = props;
    const { background, backgroundPreset, backgroundImage, contentWidth } = resolveAppearance(props);
    const bgStyles: React.CSSProperties = {};
    const isEditing = Boolean(puck?.isEditing);
    const widthStyle = contentWidthContainerStyle(
      contentWidth ?? DEFAULT_CONTENT_WIDTH,
    );

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
            boxSizing: "border-box",
            ...widthStyle,
            ...pageGutterStyle(),
          }}
        >
          {children}
        </div>
      </div>
    );
  },
};

export default PageRoot;
