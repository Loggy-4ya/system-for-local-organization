/**
 * @fileoverview Default Puck canvas content for new / empty pages.
 *
 * @module src/components/puck/lib/defaultEditorContent
 */

import type { Data } from "@puckeditor/core";
import { ISLAND_DEFAULTS, SPACING_DEFAULTS } from "./spacingFields";

/** Shared spacing defaults for starter child blocks (no island — parent section owns the shell). */
const STARTER_CHILD_SHELL = {
  spacing: { ...SPACING_DEFAULTS },
  island: { ...ISLAND_DEFAULTS, islandEnabled: false },
};

/** Starter section with heading + body text for empty editor canvases. */
export function createDefaultEditorContent(): Data["content"] {
  return [
    {
      type: "NexusSection",
      props: {
        id: "nexus-starter-section",
        maxWidth: { preset: DEFAULT_CONTENT_WIDTH, custom: "1400px" },
        padding: "normal",
        backgroundOverride: "",
        textColor: "",
        borderTop: "none",
        borderBottom: "none",
        content: [
          {
            type: "NexusHeading",
            props: {
              id: "nexus-starter-heading",
              text: "Welcome to your page",
              level: "h1",
              align: "left",
              colorPreset: "text-primary",
              fontFamily: "sans",
              fontWeight: "700",
              ...STARTER_CHILD_SHELL,
            },
          },
          {
            type: "NexusText",
            props: {
              id: "nexus-starter-text",
              text: "<p>Start building by dragging components from the left sidebar, or edit this text directly.</p>",
              align: "left",
              colorPreset: "text-primary",
              fontFamily: "sans",
              fontWeight: "400",
              fontSize: "0.9375rem",
              lineHeight: "1.6",
              ...STARTER_CHILD_SHELL,
            },
          },
        ],
        spacing: {
          paddingTop: "none",
          paddingRight: "none",
          paddingBottom: "none",
          paddingLeft: "none",
          marginTop: "sm",
          marginRight: "none",
          marginBottom: "sm",
          marginLeft: "none",
        },
        island: {
          ...ISLAND_DEFAULTS,
          islandEnabled: true,
          islandMaxWidth: "full",
          islandAlign: "center",
          islandFillPreset: "glass-panel",
          islandBorderPreset: "border-default",
          islandBorderWidth: "thin",
          islandRadius: "md",
          islandPadding: "md",
        },
      },
    },
  ];
}

/**
 * Ensure editor data includes starter content when the canvas is empty.
 *
 * @param data - Loaded or initial Puck payload.
 * @returns Data with at least one section when content was empty.
 */
export function withDefaultEditorContent(data: Data | null): Data {
  const base = data ?? { content: [], zones: {}, root: { props: {} } };
  const content = base.content?.length ? base.content : createDefaultEditorContent();

  return {
    ...base,
    content,
    root: base.root ?? { props: {} },
  };
}
