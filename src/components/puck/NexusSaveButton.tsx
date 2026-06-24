"use client";

/**
 * @fileoverview Nexus draft-save control for the Puck editor header.
 *
 * Persists layout and metadata without publishing. Pair with {@link NexusPublishButton}
 * so editors can work in draft until an explicit publish.
 *
 * @module src/components/puck/NexusSaveButton
 */

import { useGetPuck } from "@puckeditor/core";
import { Save } from "lucide-react";
import { siteChromeLucideProps } from "@/components/global-layout/resolveLucideIcon";
import { useCallback, useState, useSyncExternalStore } from "react";
import { Spinner } from "@/components/ui/spinner";
import { usePuckEditorSave } from "@/components/puck/PuckEditorErrorContext";
import { useIconOnlyEditorHeader } from "@/components/puck/usePuckMobileEditorChrome";
import {
  getPuckDraftSaveStatus,
  subscribePuckDraftSaveStatus,
} from "@/components/puck/lib/puckDraftSaveStatusStore";

/** Props for {@link NexusSaveButton}. */
export interface NexusSaveButtonProps {
  /** Optional extra CSS class names. */
  className?: string;
}

/**
 * Save the current Puck document as a draft via the shell's `onSave` handler.
 *
 * @param props - See {@link NexusSaveButtonProps}.
 * @returns Save draft button JSX.
 */
export function NexusSaveButton({
  className = "nexus-mode-toggle nexus-editor-header-btn nexus-save-btn",
}: NexusSaveButtonProps) {
  const getPuck = useGetPuck();
  const onSave = usePuckEditorSave();
  const iconOnly = useIconOnlyEditorHeader();
  const [loading, setLoading] = useState(false);
  const draftStatus = useSyncExternalStore(
    subscribePuckDraftSaveStatus,
    getPuckDraftSaveStatus,
    getPuckDraftSaveStatus,
  );
  const showAutosaveHint = !iconOnly && !loading && draftStatus === "saved";

  const handleSave = useCallback(async () => {
    if (!onSave || loading) return;

    setLoading(true);
    try {
      const { appState } = getPuck();
      await onSave(appState.data);
    } finally {
      setLoading(false);
    }
  }, [getPuck, loading, onSave]);

  return (
    <button
      type="button"
      className={
        iconOnly
          ? `${className} nexus-save-btn--icon-only`
          : className
      }
      onClick={() => void handleSave()}
      disabled={!onSave || loading}
      aria-label={showAutosaveHint ? "Save draft (autosaved)" : "Save draft"}
      title={showAutosaveHint ? "Draft autosaved in background" : "Save draft"}
    >
      {loading ? (
        <Spinner className="nexus-save-btn__icon size-3.5" aria-hidden />
      ) : (
        <Save className="nexus-save-btn__icon site-chrome-icon" {...siteChromeLucideProps()} aria-hidden />
      )}
      {iconOnly ? null : (
        <span className="nexus-save-btn__label">
          {loading || draftStatus === "saving" ? "Saving…" : "Save draft"}
        </span>
      )}
    </button>
  );
}

export default NexusSaveButton;
