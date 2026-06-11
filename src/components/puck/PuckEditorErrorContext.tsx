"use client";

/**
 * @fileoverview Publish error context for Puck header chrome without unstable overrides.
 *
 * @module src/components/puck/PuckEditorErrorContext
 */

import { createContext, useContext, type ReactNode } from "react";

const PuckEditorErrorContext = createContext<string | null>(null);

/** Props for {@link PuckEditorErrorProvider}. */
export interface PuckEditorErrorProviderProps {
  /** Current publish validation or API error message. */
  error: string | null;
  children: ReactNode;
}

/**
 * Supplies publish error text to stable Puck header override components.
 *
 * @param props - Error message and children.
 * @returns Context provider.
 */
export function PuckEditorErrorProvider({ error, children }: PuckEditorErrorProviderProps) {
  return (
    <PuckEditorErrorContext.Provider value={error}>{children}</PuckEditorErrorContext.Provider>
  );
}

/**
 * Read the current publish error for header chrome.
 *
 * @returns Error message or null.
 */
export function usePuckEditorError(): string | null {
  return useContext(PuckEditorErrorContext);
}
