"use client";

/**
 * @fileoverview Marks React subtrees that render inside the Puck editor canvas.
 *
 * Interactive preview uses Puck's `<Render>` path with `puck.isEditing === false`,
 * so PageRoot cannot rely on `isEditing` alone to show editor chrome (InfiniteGrid,
 * header preview). Published `<Render>` views stay outside this provider.
 *
 * @module src/components/puck/NexusEditorCanvasContext
 */

import { createContext, useContext } from "react";

/** True when descendants render inside `<Puck>` (edit or interactive preview). */
const NexusEditorCanvasContext = createContext(false);

/** Props for {@link NexusEditorCanvasProvider}. */
export interface NexusEditorCanvasProviderProps {
  /** Puck editor subtree. */
  children: React.ReactNode;
}

/**
 * Wrap the Puck editor so canvas blocks can distinguish interactive preview from
 * published `<Render>` output.
 *
 * @param props - See {@link NexusEditorCanvasProviderProps}.
 * @returns Provider wrapping editor children.
 */
export function NexusEditorCanvasProvider({ children }: NexusEditorCanvasProviderProps) {
  return (
    <NexusEditorCanvasContext.Provider value={true}>{children}</NexusEditorCanvasContext.Provider>
  );
}

/**
 * Whether the current tree renders inside the Puck editor canvas.
 *
 * @returns True inside `<Puck>` (including interactive preview iframe content).
 */
export function useNexusEditorCanvas(): boolean {
  return useContext(NexusEditorCanvasContext);
}

export default NexusEditorCanvasProvider;
