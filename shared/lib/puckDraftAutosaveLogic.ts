/**
 * @fileoverview Pure helpers for Puck editor background draft autosave scheduling.
 *
 * @module shared/lib/puckDraftAutosaveLogic
 *
 * Tests: `npm run test:puck-draft-autosave`
 */

import type { Data } from "@puckeditor/core";

/** Draft save lifecycle exposed to editor chrome. */
export type PuckDraftSaveStatus = "saved" | "unsaved" | "saving";

/** Inputs for {@link shouldAttemptPuckDraftAutosave}. */
export interface PuckDraftAutosaveGateInput {
  /** Whether the editor is disabled (homepage, preview-only, etc.). */
  disabled: boolean;
  /** True while a manual or background save request is in flight. */
  saveInFlight: boolean;
  /** Timestamp of the most recent Puck document mutation. */
  lastEditAt: number;
  /** Timestamp of the last autosave tick (success or skip). */
  lastTickAt: number;
  /** Current clock reading in milliseconds. */
  now: number;
  /** Minimum idle time after the last edit before autosave may run. */
  quietMs: number;
  /** Minimum time between autosave tick evaluations. */
  intervalMs: number;
  /** Fingerprint of the in-memory document. */
  currentFingerprint: string;
  /** Fingerprint last persisted successfully (manual or background). */
  lastSavedFingerprint: string;
}

/**
 * Build a stable JSON fingerprint for Puck layout equality checks.
 *
 * @param data - Live Puck document.
 * @returns Serialized fingerprint string.
 */
export function fingerprintPuckDraftData(data: Data): string {
  return JSON.stringify(data);
}

/**
 * Decide whether the background autosave loop should POST a draft save now.
 *
 * @param input - Scheduling gate inputs.
 * @returns True when an autosave attempt should run.
 */
export function shouldAttemptPuckDraftAutosave(input: PuckDraftAutosaveGateInput): boolean {
  if (input.disabled) return false;
  if (input.saveInFlight) return false;
  if (input.currentFingerprint === input.lastSavedFingerprint) return false;
  if (input.now - input.lastEditAt < input.quietMs) return false;
  if (input.now - input.lastTickAt < input.intervalMs) return false;
  return true;
}

/**
 * Derive header status from dirty and in-flight flags.
 *
 * @param params - Dirty/saving flags.
 * @returns Draft save status for chrome.
 */
export function resolvePuckDraftSaveStatus(params: {
  dirty: boolean;
  saveInFlight: boolean;
}): PuckDraftSaveStatus {
  if (params.saveInFlight) return "saving";
  if (params.dirty) return "unsaved";
  return "saved";
}
