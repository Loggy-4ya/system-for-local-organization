"use client";

/**
 * @fileoverview Blocks plugin — FieldChapter drawer categories (Outline/Fields parity).
 *
 * @module src/components/puck/nexusBlocksPlugin
 */

import { blocksPlugin, type Plugin } from "@puckeditor/core";
import { NexusBlocksDrawer } from "@/components/puck/NexusBlocksDrawer";

/**
 * Puck blocks plugin with Nexus FieldChapter category accordions.
 *
 * @returns Plugin config for the Blocks rail tab.
 */
export function nexusBlocksPlugin(): Plugin {
  const base = blocksPlugin();

  return {
    ...base,
    render: () => (
      <div className="nexus-blocks-plugin">
        <NexusBlocksDrawer />
      </div>
    ),
  };
}

export default nexusBlocksPlugin;
