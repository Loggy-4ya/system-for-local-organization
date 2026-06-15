"use client";

/**
 * @fileoverview Publish error and handler context for Puck header chrome.
 *
 * @module src/components/puck/PuckEditorErrorContext
 */

import type { Data } from "@puckeditor/core";
import { createContext, useContext, type ReactNode } from "react";

/** Publish handler wired from {@link PuckEditorShell}. */
export type PuckEditorPublishHandler = (data: Data) => void | Promise<void>;

/** Shared editor-shell context for header chrome. */
interface PuckEditorShellContextValue {
  /** Current publish validation or API error message. */
  error: string | null;
  /** Publish handler from the mounted `<Puck onPublish={…}>` shell. */
  onPublish: PuckEditorPublishHandler | null;
}

const PuckEditorShellContext = createContext<PuckEditorShellContextValue>({
  error: null,
  onPublish: null,
});

/** Props for {@link PuckEditorErrorProvider}. */
export interface PuckEditorErrorProviderProps {
  /** Current publish validation or API error message. */
  error: string | null;
  /** Publish handler invoked by {@link NexusPublishButton}. */
  onPublish: PuckEditorPublishHandler;
  children: ReactNode;
}

/**
 * Supplies publish error text and handler to stable Puck header overrides.
 *
 * @param props - Error message, publish handler, and children.
 * @returns Context provider.
 */
export function PuckEditorErrorProvider({
  error,
  onPublish,
  children,
}: PuckEditorErrorProviderProps) {
  return (
    <PuckEditorShellContext.Provider value={{ error, onPublish }}>
      {children}
    </PuckEditorShellContext.Provider>
  );
}

/**
 * Read the current publish error for header chrome.
 *
 * @returns Error message or null.
 */
export function usePuckEditorError(): string | null {
  return useContext(PuckEditorShellContext).error;
}

/**
 * Read the shell publish handler for the custom header publish button.
 *
 * @returns Publish handler or null before the shell mounts.
 */
export function usePuckEditorPublish(): PuckEditorPublishHandler | null {
  return useContext(PuckEditorShellContext).onPublish;
}
