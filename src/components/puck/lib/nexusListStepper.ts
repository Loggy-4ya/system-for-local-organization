/**
 * @fileoverview Stable step id helpers for the Nexus List stepper flat index.
 *
 * @module src/components/puck/lib/nexusListStepper
 */

/** Step id prefix for flattened list indices. */
export const NEXUS_LIST_STEP_ID_PREFIX = "step-" as const;

/**
 * Build the step id for a zero-based flat index.
 *
 * @param flatIndex - Zero-based visible step index.
 * @returns Step id such as `step-0`.
 */
export function nexusListStepId(flatIndex: number): string {
  return `${NEXUS_LIST_STEP_ID_PREFIX}${flatIndex}`;
}

/**
 * Parse a step id back to a flat index.
 *
 * @param stepId - Step id from sidebar or editor state.
 * @returns Zero-based index, or `null` when not a list step id.
 */
export function nexusListStepIndex(stepId: string): number | null {
  if (!stepId.startsWith(NEXUS_LIST_STEP_ID_PREFIX)) return null;
  const parsed = parseInt(stepId.slice(NEXUS_LIST_STEP_ID_PREFIX.length), 10);
  return Number.isFinite(parsed) ? parsed : null;
}
