/**
 * @fileoverview Unit tests for edit ↔ interactive panel snapshot restore.
 *
 * Module under test: src/components/puck/lib/editorModePanelSnapshot.ts
 * Related: src/components/puck/EditorModeToggle.tsx
 * Registry: .ai/docs/testing.md
 * Run: `npm run test:editor-mode-panel`
 */

import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import {
  captureEditorModePanelSnapshot,
  clearEditorModePanelSnapshot,
  peekEditorModePanelSnapshot,
  resolveEditorModePanelRestore,
  resolveEditorModeToggleUiPatch,
} from "@/components/puck/lib/editorModePanelSnapshot";

afterEach(() => {
  clearEditorModePanelSnapshot();
});

describe("resolveEditorModeToggleUiPatch", () => {
  it("closes panels and saves snapshot when entering interactive mode", () => {
    const patch = resolveEditorModeToggleUiPatch({
      previewMode: "edit",
      leftSideBarVisible: true,
      rightSideBarVisible: true,
      rightSideBarWidth: 320,
      mobilePanelExpanded: true,
    });

    assert.deepEqual(patch, {
      previewMode: "interactive",
      leftSideBarVisible: false,
      mobilePanelExpanded: false,
      rightSideBarVisible: false,
    });

    assert.deepEqual(peekEditorModePanelSnapshot(), {
      leftSideBarVisible: true,
      rightSideBarVisible: true,
      rightSideBarWidth: 320,
      mobilePanelExpanded: true,
    });
  });

  it("restores saved panel visibility when returning to edit mode", () => {
    resolveEditorModeToggleUiPatch({
      previewMode: "edit",
      leftSideBarVisible: true,
      rightSideBarVisible: false,
      mobilePanelExpanded: false,
    });

    const patch = resolveEditorModeToggleUiPatch({
      previewMode: "interactive",
      leftSideBarVisible: false,
      rightSideBarVisible: false,
      mobilePanelExpanded: false,
    });

    assert.deepEqual(patch, {
      previewMode: "edit",
      leftSideBarVisible: true,
      rightSideBarVisible: false,
      mobilePanelExpanded: false,
    });
    assert.equal(peekEditorModePanelSnapshot(), null);
  });

  it("leaves panels closed when they were closed before interactive mode", () => {
    resolveEditorModeToggleUiPatch({
      previewMode: "edit",
      leftSideBarVisible: false,
      rightSideBarVisible: false,
      mobilePanelExpanded: false,
    });

    const patch = resolveEditorModeToggleUiPatch({
      previewMode: "interactive",
      leftSideBarVisible: false,
      rightSideBarVisible: false,
      mobilePanelExpanded: false,
    });

    assert.deepEqual(patch, {
      previewMode: "edit",
      leftSideBarVisible: false,
      rightSideBarVisible: false,
      mobilePanelExpanded: false,
    });
  });

  it("restores right sidebar width only when the right sidebar was open", () => {
    resolveEditorModeToggleUiPatch({
      previewMode: "edit",
      leftSideBarVisible: true,
      rightSideBarVisible: true,
      rightSideBarWidth: 280,
      mobilePanelExpanded: false,
    });

    const patch = resolveEditorModeToggleUiPatch({
      previewMode: "interactive",
      leftSideBarVisible: false,
      rightSideBarVisible: false,
      mobilePanelExpanded: false,
    });

    assert.deepEqual(patch, {
      previewMode: "edit",
      leftSideBarVisible: true,
      rightSideBarVisible: true,
      rightSideBarWidth: 280,
      mobilePanelExpanded: false,
    });
  });
});

describe("resolveEditorModePanelRestore", () => {
  it("returns null when no snapshot was captured", () => {
    assert.equal(resolveEditorModePanelRestore(), null);
  });

  it("consumes an explicit snapshot without touching module state", () => {
    captureEditorModePanelSnapshot({
      leftSideBarVisible: true,
      rightSideBarVisible: false,
      mobilePanelExpanded: true,
    });

    assert.deepEqual(
      resolveEditorModePanelRestore({
        leftSideBarVisible: false,
        rightSideBarVisible: true,
        rightSideBarWidth: 240,
        mobilePanelExpanded: false,
      }),
      {
        leftSideBarVisible: false,
        rightSideBarVisible: true,
        rightSideBarWidth: 240,
        mobilePanelExpanded: false,
      },
    );

    assert.deepEqual(peekEditorModePanelSnapshot(), {
      leftSideBarVisible: true,
      rightSideBarVisible: false,
      rightSideBarWidth: undefined,
      mobilePanelExpanded: true,
    });
  });
});
