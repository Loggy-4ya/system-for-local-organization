"use client";

/**
 * @fileoverview Outline plugin with draggable page structure tree.
 *
 * @module src/components/puck/nexusOutlinePlugin
 */

import { outlinePlugin, type Plugin } from "@puckeditor/core";
import { NexusDraggableOutline } from "@/components/puck/NexusDraggableOutline";

/**
 * Puck outline plugin with sibling drag-and-drop reordering in the tree.
 *
 * @returns Plugin config for the Outline rail tab.
 */
export function nexusOutlinePlugin(): Plugin {
  const base = outlinePlugin();

  return {
    ...base,
    render: () => (
      <div className="nexus-outline-plugin">
        <NexusDraggableOutline />
      </div>
    ),
  };
}

export default nexusOutlinePlugin;
