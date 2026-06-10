"use client";

/**
 * @fileoverview Toggle between Puck edit and interactive preview modes.
 *
 * Uses Puck's built-in `previewMode` UI state (`edit` | `interactive`).
 *
 * @module src/components/puck/EditorModeToggle
 */

import { usePuck } from "@measured/puck";

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
  const { appState, dispatch } = usePuck();
  const isInteractive = appState.ui.previewMode === "interactive";

  const handleToggle = () => {
    dispatch({
      type: "setUi",
      ui: (ui) => ({
        previewMode: ui.previewMode === "edit" ? "interactive" : "edit",
      }),
    });
  };

  return (
    <button
      type="button"
      className={className}
      onClick={handleToggle}
      title={isInteractive ? "Switch to Edit mode (Ctrl+I)" : "Switch to Interactive mode (Ctrl+I)"}
      aria-pressed={isInteractive}
    >
      {isInteractive ? "Edit" : "Interactive"}
    </button>
  );
}

export default EditorModeToggle;
