"use client";

/**
 * @fileoverview Applies island insert defaults when Puck adds new canvas blocks.
 *
 * Tracks pending insert ids so margin seeding survives Puck's async resolveData → replace.
 *
 * @module src/components/puck/IslandInsertDefaultsSync
 */

import type { Data } from "@measured/puck";
import { useEffect, useRef } from "react";
import { applyIslandDefaultsOnInsert } from "./lib/applyIslandDefaultsOnInsert";
import { resolveEffectiveIslandComponents } from "./lib/editorIslandSettings";
import { useNexusPuck } from "./lib/useNexusPuck";

/**
 * Headless sync — mounts inside Puck header actions (has store context).
 *
 * @returns null
 */
export function IslandInsertDefaultsSync() {
  const data = useNexusPuck((state) => state.appState.data);
  const dispatch = useNexusPuck((state) => state.dispatch);
  const prevDataRef = useRef<Data>(data);

  useEffect(() => {
    const prev = prevDataRef.current;
    const patched = applyIslandDefaultsOnInsert(prev, data, {
      islandDefaultComponents: resolveEffectiveIslandComponents(),
    });

    prevDataRef.current = patched;

    if (patched !== data) {
      dispatch({ type: "setData", data: patched });
    }
  }, [data, dispatch]);

  return null;
}

export default IslandInsertDefaultsSync;
