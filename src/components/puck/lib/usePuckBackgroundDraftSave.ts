"use client";

/**
 * @fileoverview Background Puck draft autosave — interval + quiet-period gating.
 *
 * @module src/components/puck/lib/usePuckBackgroundDraftSave
 */

import {
  PUCK_DRAFT_AUTOSAVE_INTERVAL_MS,
  PUCK_DRAFT_AUTOSAVE_QUIET_MS,
  PUCK_RESERVED_PATHS_CACHE_MS,
} from "@shared/constants/editorSettings";
import {
  fingerprintPuckDraftData,
  resolvePuckDraftSaveStatus,
  shouldAttemptPuckDraftAutosave,
} from "@shared/lib/puckDraftAutosaveLogic";
import type { Data } from "@puckeditor/core";
import { useCallback, useEffect, useRef } from "react";
import { setPuckDraftSaveStatus } from "@/components/puck/lib/puckDraftSaveStatusStore";

/** Background save handler (draft only, no publish). */
export type PuckBackgroundDraftSaveHandler = (
  data: Data,
) => Promise<{ ok: true; path: string } | { ok: false }>;

/** Options for {@link usePuckBackgroundDraftSave}. */
export interface UsePuckBackgroundDraftSaveOptions {
  /** When true, autosave is disabled (homepage, etc.). */
  disabled?: boolean;
  /** Read the latest in-memory Puck document. */
  getLatestData: () => Data;
  /** Persist draft without publishing; returns success + normalized path. */
  saveDraft: PuckBackgroundDraftSaveHandler;
  /** Called after a successful background save (path may have changed). */
  onAutoSaved?: (nextPath: string) => void;
  /** Seed fingerprint from the initial hydrated document. */
  initialData: Data;
}

/**
 * Periodically persist Puck drafts when the document is dirty and the editor is idle.
 *
 * @param options - Autosave wiring from {@link PuckEditorShell}.
 */
export function usePuckBackgroundDraftSave({
  disabled = false,
  getLatestData,
  saveDraft,
  onAutoSaved,
  initialData,
}: UsePuckBackgroundDraftSaveOptions): {
  /** Wrap Puck `onChange` to mark the document dirty. */
  notifyDocumentEdited: () => void;
  /** Mark the current document as persisted (after manual save). */
  markDocumentSaved: (data?: Data) => void;
} {
  const lastEditAtRef = useRef(0);
  const lastTickAtRef = useRef(0);
  const lastSavedFingerprintRef = useRef(fingerprintPuckDraftData(initialData));
  const saveInFlightRef = useRef(false);
  const dirtyRef = useRef(false);

  const syncStatus = useCallback(() => {
    setPuckDraftSaveStatus(
      resolvePuckDraftSaveStatus({
        dirty: dirtyRef.current,
        saveInFlight: saveInFlightRef.current,
      }),
    );
  }, []);

  const markDocumentSaved = useCallback(
    (data?: Data) => {
      const snapshot = data ?? getLatestData();
      lastSavedFingerprintRef.current = fingerprintPuckDraftData(snapshot);
      dirtyRef.current = false;
      syncStatus();
    },
    [getLatestData, syncStatus],
  );

  const notifyDocumentEdited = useCallback(() => {
    lastEditAtRef.current = Date.now();
    if (!dirtyRef.current) {
      dirtyRef.current = true;
      syncStatus();
    }
  }, [syncStatus]);

  const tryAutosave = useCallback(async () => {
    const now = Date.now();
    const currentData = getLatestData();
    const currentFingerprint = fingerprintPuckDraftData(currentData);

    if (
      !shouldAttemptPuckDraftAutosave({
        disabled,
        saveInFlight: saveInFlightRef.current,
        lastEditAt: lastEditAtRef.current,
        lastTickAt: lastTickAtRef.current,
        now,
        quietMs: PUCK_DRAFT_AUTOSAVE_QUIET_MS,
        intervalMs: PUCK_DRAFT_AUTOSAVE_INTERVAL_MS,
        currentFingerprint,
        lastSavedFingerprint: lastSavedFingerprintRef.current,
      })
    ) {
      lastTickAtRef.current = now;
      return;
    }

    lastTickAtRef.current = now;
    saveInFlightRef.current = true;
    syncStatus();

    try {
      const result = await saveDraft(currentData);
      if (result.ok) {
        lastSavedFingerprintRef.current = currentFingerprint;
        dirtyRef.current = false;
        onAutoSaved?.(result.path);
      }
    } finally {
      saveInFlightRef.current = false;
      syncStatus();
    }
  }, [disabled, getLatestData, onAutoSaved, saveDraft, syncStatus]);

  useEffect(() => {
    if (disabled) {
      setPuckDraftSaveStatus("saved");
      return;
    }

    const id = window.setInterval(() => {
      void tryAutosave();
    }, PUCK_DRAFT_AUTOSAVE_INTERVAL_MS);

    return () => window.clearInterval(id);
  }, [disabled, tryAutosave]);

  useEffect(() => {
    lastSavedFingerprintRef.current = fingerprintPuckDraftData(initialData);
    dirtyRef.current = false;
    syncStatus();
  }, [initialData, syncStatus]);

  return { notifyDocumentEdited, markDocumentSaved };
}

export { PUCK_RESERVED_PATHS_CACHE_MS };
