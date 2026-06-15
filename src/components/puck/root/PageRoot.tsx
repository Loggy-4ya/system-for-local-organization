"use client";

/**
 * @fileoverview Puck Root component for Project Nexus.
 *
 * @module src/components/puck/root/PageRoot
 */

import React from "react";
import { useTheme } from "@teispace/next-themes";
import { PageBackgroundFieldGroup } from "../fields/PageBackgroundFieldGroup";
import { PageLayoutFieldGroup } from "../fields/PageLayoutFieldGroup";
import type { PageSettingsValue } from "../fields/PageSettingsFieldGroup";
import { PageSettingsFieldGroup } from "../fields/PageSettingsFieldGroup";
import { resolveAccentPreset } from "../fields/AccentPresetField";
import {
  contentWidthContainerStyle,
  DEFAULT_CONTENT_WIDTH,
  GLOBAL_LAYOUT_PAGE_CONTENT_SLOT_CLASS,
  pageContentBlockGutterStyle,
  pageContentTopGutterStyle,
} from "../lib/contentWidthTokens";
import {
  resolvePageRootAppearance,
  type PageRootStoredProps,
} from "../lib/pageRootFieldProps";
import { useNexusEditorCanvas } from "../NexusEditorCanvasContext";
import { InfiniteGrid } from "@/components/background/InfiniteGrid";

/** Root props shape for PageRoot render and field resolution. */
interface PageRootProps extends PageRootStoredProps {
  children: React.ReactNode;
  puck?: { isEditing?: boolean };
}

/** Shared page shell body — edit, interactive preview, and published paths. */
interface PageRootBodyProps extends PageRootProps {
  /**
   * When true, paint the site-default grid inside the Puck preview document.
   * Required on desktop too — the scrollport grid sits behind the iframe element
   * and cannot show through the preview viewport.
   */
  showPreviewIframeGrid: boolean;
}

/**
 * Shared PageRoot layout — background, optional editor chrome, and content gutter.
 *
 * @param props - Page settings, appearance, and chrome flags.
 * @returns Page shell JSX.
 */
function PageRootBody({
  children,
  showPreviewIframeGrid,
  ...props
}: PageRootBodyProps) {
  const { resolvedTheme } = useTheme();
  const { background, backgroundGridMotion, backgroundPreset, backgroundImage, contentWidth } =
    resolvePageRootAppearance(props);
  const bgStyles: React.CSSProperties = {};
  const widthStyle = contentWidthContainerStyle(contentWidth ?? DEFAULT_CONTENT_WIDTH);
  const isPublishedView = !showPreviewIframeGrid;

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
        minHeight: isPublishedView ? undefined : "100vh",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        transition: "background 0.3s ease",
        ...bgStyles,
      }}
    >
      {showPreviewIframeGrid && background === "site-default" ? (
        <InfiniteGrid
          key={resolvedTheme ?? "dark"}
          isContained
          isStatic={backgroundGridMotion === "static"}
        />
      ) : null}
      <div
        className={GLOBAL_LAYOUT_PAGE_CONTENT_SLOT_CLASS}
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          flex: isPublishedView ? undefined : 1,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: isPublishedView ? undefined : 1,
            boxSizing: "border-box",
            ...widthStyle,
            ...(isPublishedView ? pageContentTopGutterStyle() : pageContentBlockGutterStyle()),
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * PageRoot render entry — routes chrome based on Puck edit vs interactive vs published.
 *
 * @param props - Puck root props including `puck.isEditing`.
 * @returns Page shell JSX.
 */
function PageRootRender(props: PageRootProps) {
  const isNexusEditorCanvas = useNexusEditorCanvas();
  const isPuckEditMode = Boolean(props.puck?.isEditing);
  const showEditorBackground = isPuckEditMode || isNexusEditorCanvas;
  const showPreviewIframeGrid = showEditorBackground;

  return (
    <PageRootBody
      {...props}
      showPreviewIframeGrid={showPreviewIframeGrid}
    />
  );
}

export const PageRoot = {
  fields: {
    pageSettings: {
      type: "custom" as const,
      label: "",
      render: PageSettingsFieldGroup as never,
    },
    pageLayout: {
      type: "custom" as const,
      label: "",
      render: PageLayoutFieldGroup as never,
    },
    pageBackground: {
      type: "custom" as const,
      label: "",
      render: PageBackgroundFieldGroup as never,
    },
  },
  defaultProps: {
    pageSettings: {
      title: "Untitled Page",
      slug: "",
      slugLocked: false,
    },
    pageLayout: {
      contentWidth: DEFAULT_CONTENT_WIDTH,
    },
    pageBackground: {
      background: "site-default" as const,
      backgroundGridMotion: "dynamic" as const,
      backgroundPreset: "hue-blue",
      backgroundImage: "",
    },
  },
  render: PageRootRender,
};

export default PageRoot;
