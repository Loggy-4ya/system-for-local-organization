/**
 * @fileoverview Eased transitions for {@link InfiniteGrid} dynamic ↔ static grid motion.
 *
 * Keeps tile offsets continuous while scroll speed ramps down/up instead of snapping.
 *
 * Tests: `tests/components/background/infiniteGridMotionEase.test.ts` — `npm run test:infinite-grid-motion-ease`
 *
 * @module src/components/background/infiniteGridMotionEase
 */

/** Exponential ease time constant — ~95% settled in ~3× this many ms. */
export const GRID_MOTION_EASE_TAU_MS = 320;

/**
 * Advance motion scale toward a target using frame-rate-independent exponential easing.
 *
 * @param current - Current scroll speed multiplier in `[0, 1]`.
 * @param target - Desired multiplier (`0` = static, `1` = full dynamic speed).
 * @param deltaMs - Elapsed time since the previous animation frame.
 * @returns Updated multiplier clamped toward `target`.
 */
export function stepGridMotionScale(
  current: number,
  target: number,
  deltaMs: number,
): number {
  if (deltaMs <= 0) return current;
  if (current === target) return target;

  const alpha = 1 - Math.exp(-deltaMs / GRID_MOTION_EASE_TAU_MS);
  const next = current + (target - current) * alpha;

  if (Math.abs(next - target) < 0.01) return target;
  return next;
}

/**
 * Whether scroll speed has finished easing to the requested static/dynamic target.
 *
 * @param motionScale - Current scroll speed multiplier.
 * @param isStaticTarget - True when the grid should end fully static.
 * @returns True when further RAF frames are not required for motion settling.
 */
export function isGridMotionScaleSettled(
  motionScale: number,
  isStaticTarget: boolean,
): boolean {
  if (isStaticTarget) return motionScale <= 0.01;
  return motionScale >= 0.99;
}

/**
 * Whether the grid RAF loop may stop — only when static target is reached.
 *
 * Dynamic mode must keep looping even after motion scale settles at `1`.
 *
 * @param motionScale - Current scroll speed multiplier.
 * @param isStaticTarget - True when the grid should end fully static.
 * @returns True when continuous animation frames are no longer required.
 */
export function shouldStopGridMotionLoop(
  motionScale: number,
  isStaticTarget: boolean,
): boolean {
  return isStaticTarget && isGridMotionScaleSettled(motionScale, true);
}
