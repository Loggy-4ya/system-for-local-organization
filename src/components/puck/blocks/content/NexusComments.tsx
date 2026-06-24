"use client";

/**
 * @fileoverview Puck block — compact comments launcher with slide-up discussion drawer.
 *
 * Maps to Figma `CommentInput` + `CommentRow`. Comment availability is controlled by
 * this block's **Enable comments** toggle; Form Input blocks are unaffected.
 *
 * @module src/components/puck/blocks/content/NexusComments
 */

import type {
  CommentsLayoutAlign,
  CommentsLayoutWidth,
  CommentsViewMode,
} from "@shared/lib/pageCommentsLayoutLogic";
import { normalizeNexusCommentsBlockEnabled } from "@shared/lib/pageCommentsBlockLogic";
import { PageCommentsPanel } from "@/components/comments/PageCommentsPanel";
import { createSteppedSliderField } from "../../lib/createSteppedSliderField";
import { usePageEditorMeta } from "../../lib/pageEditorMetaContext";
import { useInsidePuckEditorShell } from "../../lib/useInsidePuckEditorShell";

/** Puck render props for {@link NexusComments}. */
interface NexusCommentsRenderProps {
  /** Optional launcher label override. */
  launcherLabel?: string;
  /** Surface style for the block. */
  viewMode?: CommentsViewMode;
  /** Band width inside the page container. */
  layoutWidth?: CommentsLayoutWidth;
  /** Horizontal band alignment. */
  layoutAlign?: CommentsLayoutAlign;
  /** Seconds between top-liked preview rotations. */
  previewIntervalSeconds?: number | string;
  /** Block toggle — allows comments without removing the block from the layout. */
  commentsEnabled?: string | boolean;
  /** Puck editor context. */
  puck?: { isEditing?: boolean };
}

const PREVIEW_INTERVAL_OPTIONS = [
  { label: "3s", value: "3" },
  { label: "4s", value: "4" },
  { label: "6s", value: "6" },
  { label: "8s", value: "8" },
  { label: "12s", value: "12" },
] as const;

export const NexusComments = {
  label: "Comments",
  fields: {
    launcherLabel: {
      type: "text" as const,
      label: "Launcher Label",
    },
    viewMode: {
      type: "radio" as const,
      label: "View",
      options: [
        { label: "Launcher", value: "launcher" },
        { label: "Top liked preview", value: "topLiked" },
      ],
    },
    layoutWidth: {
      type: "radio" as const,
      label: "Width",
      options: [
        { label: "Full container", value: "full" },
        { label: "Medium", value: "medium" },
        { label: "Narrow", value: "narrow" },
      ],
    },
    layoutAlign: {
      type: "radio" as const,
      label: "Alignment",
      options: [
        { label: "Left", value: "left" },
        { label: "Center", value: "center" },
        { label: "Right", value: "right" },
      ],
    },
    previewIntervalSeconds: createSteppedSliderField(
      "Preview Rotation",
      PREVIEW_INTERVAL_OPTIONS,
    ),
    commentsEnabled: {
      type: "radio" as const,
      label: "Enable comments",
      options: [
        { label: "On", value: "on" },
        { label: "Off", value: "off" },
      ],
    },
  },
  defaultProps: {
    launcherLabel: "Comments",
    viewMode: "launcher",
    layoutWidth: "full",
    layoutAlign: "center",
    previewIntervalSeconds: "6",
    commentsEnabled: "on",
  },
  render({
    launcherLabel,
    viewMode,
    layoutWidth,
    layoutAlign,
    previewIntervalSeconds,
    commentsEnabled,
    puck,
  }: NexusCommentsRenderProps) {
    return (
      <NexusCommentsRender
        launcherLabel={launcherLabel}
        viewMode={viewMode}
        layoutWidth={layoutWidth}
        layoutAlign={layoutAlign}
        previewIntervalSeconds={previewIntervalSeconds}
        commentsEnabled={commentsEnabled}
        isEditing={puck?.isEditing}
      />
    );
  },
};

/**
 * Runtime renderer wired to page metadata context.
 *
 * @param props - Label, layout, and editor flag.
 * @returns Comments launcher UI.
 */
function NexusCommentsRender({
  launcherLabel = "Comments",
  viewMode = "launcher",
  layoutWidth = "full",
  layoutAlign = "center",
  previewIntervalSeconds = "6",
  commentsEnabled = "on",
  isEditing = false,
}: {
  launcherLabel?: string;
  viewMode?: CommentsViewMode;
  layoutWidth?: CommentsLayoutWidth;
  layoutAlign?: CommentsLayoutAlign;
  previewIntervalSeconds?: string | number;
  commentsEnabled?: string | boolean;
  isEditing?: boolean;
}) {
  const meta = usePageEditorMeta();
  const insideEditorShell = useInsidePuckEditorShell();
  const preview = Boolean(isEditing) || insideEditorShell;
  const intervalSeconds = Number(previewIntervalSeconds);

  return (
    <PageCommentsPanel
      pagePath={meta.path}
      commentsEnabled={normalizeNexusCommentsBlockEnabled(commentsEnabled)}
      preview={preview}
      launcherLabel={launcherLabel?.trim() || "Comments"}
      viewMode={viewMode}
      layoutWidth={layoutWidth}
      layoutAlign={layoutAlign}
      previewIntervalSeconds={Number.isFinite(intervalSeconds) ? intervalSeconds : 6}
    />
  );
}

export default NexusComments;
