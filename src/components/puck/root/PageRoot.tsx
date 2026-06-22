"use client";

/**
 * @fileoverview Puck Root component for Project Nexus.
 *
 * @module src/components/puck/root/PageRoot
 */

import React from "react";
import { PageBackgroundFieldGroup } from "../fields/PageBackgroundFieldGroup";
import { PageLayoutFieldGroup } from "../fields/PageLayoutFieldGroup";
import type { PageSettingsValue } from "../fields/PageSettingsFieldGroup";
import { PageSettingsFieldGroup } from "../fields/PageSettingsFieldGroup";
import { PagePublicationFieldGroup } from "../fields/PagePublicationFieldGroup";
import { resolveAccentPreset } from "../fields/AccentPresetField";
import {
  contentWidthContainerStyle,
  DEFAULT_CONTENT_WIDTH,
  GLOBAL_LAYOUT_PAGE_CONTENT_SLOT_CLASS,
  resolveContentWidth,
  pageContentBlockGutterStyle,
  pageContentTopGutterStyle,
  type ContentWidthToken,
} from "../lib/contentWidthTokens";
import { PageContentWidthProvider } from "../lib/PageContentWidthContext";
import { NexusPageVariablesFromRoot } from "../lib/nexusPageVariablesContext";
import {
  resolvePageRootAppearance,
  type PageRootStoredProps,
} from "../lib/pageRootFieldProps";
import { useInsidePuckEditorShell } from "../lib/useInsidePuckEditorShell";
import { useNexusEditorCanvas } from "../NexusEditorCanvasContext";

/** Root props shape for PageRoot render and field resolution. */
interface PageRootProps extends PageRootStoredProps {
  children: React.ReactNode;
  puck?: { isEditing?: boolean };
}

/** Shared page shell body — edit, interactive preview, and published paths. */
interface PageRootBodyProps extends PageRootProps {
  /** True on Puck edit / interactive preview chrome (not a standalone published page). */
  showEditorBackground: boolean;
}

/**
 * Shared PageRoot layout — background, optional editor chrome, and content gutter.
 *
 * Site-default background uses the global layout {@link LayoutInfiniteGrid} (`#nexus-bg`) only.
 * PageRoot stays transparent so the grid shows through the Puck preview iframe and published pages.
 * Edit layout uses content-sized height; `NexusPuckZoomGuard` syncs Puck `rootHeight` via
 * `previewContentHeight.ts`.
 *
 * Tests: `tests/puck/lib/previewContentHeight.test.ts` — `npm run test:preview-content-height`
 *
 * @param props - Page settings, appearance, and chrome flags.
 * @returns Page shell JSX.
 */
function PageRootBody({ children, showEditorBackground, ...props }: PageRootBodyProps) {
  const isPuckEditMode = Boolean(props.puck?.isEditing);
  const { background, backgroundPreset, backgroundImage, contentWidth } =
    resolvePageRootAppearance(props);
  const bgStyles: React.CSSProperties = {};
  const widthStyle = contentWidthContainerStyle(contentWidth ?? DEFAULT_CONTENT_WIDTH);
  const pageWidthToken = (contentWidth ?? DEFAULT_CONTENT_WIDTH) as ContentWidthToken;
  const isPublishedView = !showEditorBackground;
  const isInteractivePreview = showEditorBackground && !isPuckEditMode;
  const useContentSizedLayout = isPublishedView || isPuckEditMode || isInteractivePreview;

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
    bgStyles.backgroundColor = "transparent";
  }

  return (
    <div
      style={{
        position: "relative",
        minHeight: isInteractivePreview ? "100%" : undefined,
        width: "100%",
        display: "flex",
        flexDirection: "column",
        transition: "background 0.3s ease",
        ...bgStyles,
      }}
    >
      <div
        className={GLOBAL_LAYOUT_PAGE_CONTENT_SLOT_CLASS}
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          flex: useContentSizedLayout ? undefined : 1,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: useContentSizedLayout ? undefined : 1,
            boxSizing: "border-box",
            ...widthStyle,
            ...(isPublishedView ? pageContentTopGutterStyle() : pageContentBlockGutterStyle()),
            ["--nexus-page-content-max-width" as string]: resolveContentWidth(pageWidthToken),
          }}
        >
          <NexusPageVariablesFromRoot
            pageSettings={props.pageSettings}
            pagePublication={props.pagePublication}
          >
            <PageContentWidthProvider value={pageWidthToken}>{children}</PageContentWidthProvider>
          </NexusPageVariablesFromRoot>
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
  const insidePuckEditorShell = useInsidePuckEditorShell();
  const showEditorBackground = isPuckEditMode || isNexusEditorCanvas || insidePuckEditorShell;

  return (
    <PageRootBody {...props} showEditorBackground={showEditorBackground} />
  );
}

export const PageRoot = {
  fields: {
    pageSettings: {
      type: "custom" as const,
      label: "",
      render: PageSettingsFieldGroup as never,
    },
    pagePublication: {
      type: "custom" as const,
      label: "",
      render: PagePublicationFieldGroup as never,
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
      categories: [],
    },
    pagePublication: {
      description: "",
      coverImage: "",
      publishAt: null,
      commentsEnabled: true,
      delegatedEditors: [],
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
