/**
 * @fileoverview Shared DOM selectors for Puck canvas shell, inner scrollport, and layout root.
 *
 * @module src/components/puck/lib/puckCanvasSelectors
 */

/** Outer bordered Puck canvas panel in the desktop editor column. */
export const PUCK_CANVAS_SHELL_SELECTOR =
  '.Puck [class*="PuckCanvas_"]:not([class*="PuckCanvas-controls"]):not([class*="PuckCanvas-inner"]):not([class*="PuckCanvas-root"]):not([class*="PuckCanvas-loader"]):not([class*="PuckCanvas--fullScreen"])';

/** Puck canvas inner scrollport (preview host). */
export const PUCK_CANVAS_INNER_SELECTOR = '.Puck [class*="PuckCanvas-inner"]';

/** Puck layout root carrying sidebar visibility modifier classes. */
export const PUCK_LAYOUT_ROOT_SELECTOR =
  '.Puck [class*="PuckLayout"]:not([class*="PuckLayout-inner"])';

/** Set on `.Puck` when the active viewport preset width is `100%`. */
export const NEXUS_VIEWPORT_FULL_WIDTH_ATTR = "data-nexus-viewport-full-width";
