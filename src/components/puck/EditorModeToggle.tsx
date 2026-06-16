"use client";

/**
 * @fileoverview Toggle between Puck edit and interactive preview modes.
 *
 * Uses Puck's built-in `previewMode` UI state (`edit` | `interactive`).
 *
 * @module src/components/puck/EditorModeToggle
 */

import { MousePointerClick, Pencil } from "lucide-react";
import { siteChromeLucideProps } from "@/components/global-layout/resolveLucideIcon";
import { applyMobilePanelHeight } from "./lib/mobilePanelLayout";
import { useNexusPuck } from "./lib/useNexusPuck";

/** Props for the editor mode toggle button. */
export interface EditorModeToggleProps {
  /** Optional extra CSS class names. */
  className?: string;
}

/**
 * Toggle Puck canvas between edit overlays and interactive preview.
 *
 * @param props - See {@link EditorModeToggleProps}.
 * @returns Mode toggle button.
 */
export function EditorModeToggle({
  className = "nexus-mode-toggle",
}: EditorModeToggleProps) {
  const previewMode = useNexusPuck((state) => state.appState.ui.previewMode ?? "edit");
  const dispatch = useNexusPuck((state) => state.dispatch);
  const isInteractive = previewMode === "interactive";

  const handleToggle = () => {
    dispatch({
      type: "setUi",
      ui: (ui) => {
        const enteringInteractive = ui.previewMode === "edit";

        return {
          previewMode: enteringInteractive ? "interactive" : "edit",
          ...(enteringInteractive
            ? {
                leftSideBarVisible: false,
                mobilePanelExpanded: false,
                rightSideBarVisible: false,
              }
            : {}),
        };
      },
      recordHistory: false,
    });

    if (previewMode === "edit") {
      applyMobilePanelHeight("0px");
    }
  };

  const label = isInteractive ? "Edit" : "Interactive";
  const hint = isInteractive
    ? "Switch to Edit mode (Ctrl+I)"
    : "Switch to Interactive mode (Ctrl+I)";

  return (
    <button
      type="button"
      className={className}
      onClick={handleToggle}
      title={hint}
      aria-label={hint}
      aria-pressed={isInteractive}
    >
      <span className="nexus-mode-toggle__icon site-chrome-icon" aria-hidden="true">
        {isInteractive ? (
          <Pencil {...siteChromeLucideProps()} />
        ) : (
          <MousePointerClick {...siteChromeLucideProps()} />
        )}
      </span>
      <span className="nexus-mode-toggle__label">{label}</span>
    </button>
  );
}

export default EditorModeToggle;
