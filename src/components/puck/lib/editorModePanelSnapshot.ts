/**
 * @fileoverview Save and restore Puck plugin panel UI when toggling edit ↔ interactive preview.
 *
 * Interactive mode hides sidebars for a full-width canvas. Returning to edit mode must
 * restore the prior panel visibility instead of leaving everything closed.
 *
 * Tests: `tests/puck/lib/editorModePanelSnapshot.test.ts` — `npm run test:editor-mode-panel`
 *
 * @module src/components/puck/lib/editorModePanelSnapshot
 */

/** Puck sidebar UI fields saved across edit ↔ interactive preview toggles. */
export interface EditorModePanelSnapshot {
  /** Left plugin panel (Blocks / Outline / Settings rail). */
  leftSideBarVisible: boolean;
  /** Desktop right fields column. */
  rightSideBarVisible: boolean;
  /** Width of the right fields column when it was open. */
  rightSideBarWidth: number | undefined;
  /** Compact-mode full-height panel expansion flag. */
  mobilePanelExpanded: boolean;
}

/** Minimal Puck `appState.ui` slice used for panel snapshotting. */
export interface EditorModePanelUiSlice {
  previewMode?: "edit" | "interactive";
  leftSideBarVisible?: boolean;
  rightSideBarVisible?: boolean;
  rightSideBarWidth?: number | null;
  mobilePanelExpanded?: boolean;
}

/** In-memory snapshot — module singleton, not persisted across reloads. */
let savedPanelSnapshot: EditorModePanelSnapshot | null = null;

/**
 * Remember plugin panel visibility before entering interactive preview.
 *
 * @param ui - Current Puck UI state.
 */
export function captureEditorModePanelSnapshot(ui: EditorModePanelUiSlice): void {
  savedPanelSnapshot = {
    leftSideBarVisible: ui.leftSideBarVisible ?? false,
    rightSideBarVisible: ui.rightSideBarVisible ?? false,
    rightSideBarWidth: ui.rightSideBarWidth ?? undefined,
    mobilePanelExpanded: ui.mobilePanelExpanded ?? false,
  };
}

/**
 * Build Puck `setUi` patch to restore plugin panels when returning to edit mode.
 *
 * @param snapshot - Optional explicit snapshot (defaults to the in-memory save).
 * @returns Partial UI patch or null when nothing was saved.
 */
export function resolveEditorModePanelRestore(
  snapshot: EditorModePanelSnapshot | null = savedPanelSnapshot,
): Partial<EditorModePanelUiSlice> | null {
  if (!snapshot) {
    return null;
  }

  if (snapshot === savedPanelSnapshot) {
    savedPanelSnapshot = null;
  }

  return {
    leftSideBarVisible: snapshot.leftSideBarVisible,
    rightSideBarVisible: snapshot.rightSideBarVisible,
    ...(snapshot.rightSideBarVisible && snapshot.rightSideBarWidth !== undefined
      ? { rightSideBarWidth: snapshot.rightSideBarWidth }
      : {}),
    mobilePanelExpanded: snapshot.mobilePanelExpanded,
  };
}

/**
 * Resolve the full Puck `setUi` patch for an edit ↔ interactive toggle.
 *
 * @param ui - Current Puck UI state at toggle time.
 * @returns UI patch for `dispatch({ type: "setUi", ui })`.
 */
export function resolveEditorModeToggleUiPatch(
  ui: EditorModePanelUiSlice,
): Partial<EditorModePanelUiSlice> {
  const enteringInteractive = (ui.previewMode ?? "edit") === "edit";

  if (enteringInteractive) {
    captureEditorModePanelSnapshot(ui);
    return {
      previewMode: "interactive",
      leftSideBarVisible: false,
      mobilePanelExpanded: false,
      rightSideBarVisible: false,
    };
  }

  const restore = resolveEditorModePanelRestore();
  return {
    previewMode: "edit",
    ...(restore ?? {}),
  };
}

/**
 * Clear any saved panel snapshot (test helper).
 */
export function clearEditorModePanelSnapshot(): void {
  savedPanelSnapshot = null;
}

/**
 * Read the current in-memory snapshot without consuming it (test helper).
 *
 * @returns Saved snapshot or null.
 */
export function peekEditorModePanelSnapshot(): EditorModePanelSnapshot | null {
  return savedPanelSnapshot;
}
