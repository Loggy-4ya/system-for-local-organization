"use client";

/**
 * @fileoverview Toggle between Puck edit and interactive preview modes.
 *
 * Uses Puck's built-in `previewMode` UI state (`edit` | `interactive`).
 *
 * @module src/components/puck/EditorModeToggle
 */

import { MousePointerClick, Pencil } from "lucide-react";
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
      ui: (ui) => ({
        previewMode: ui.previewMode === "edit" ? "interactive" : "edit",
      }),
    });
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
      <span className="nexus-mode-toggle__icon" aria-hidden="true">
        {isInteractive ? (
          <Pencil size={14} strokeWidth={2.25} />
        ) : (
          <MousePointerClick size={14} strokeWidth={2.25} />
        )}
      </span>
      <span className="nexus-mode-toggle__label">{label}</span>
    </button>
  );
}

export default EditorModeToggle;
