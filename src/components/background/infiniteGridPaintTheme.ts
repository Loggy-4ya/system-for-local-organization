/**
 * @fileoverview Theme resolution for {@link InfiniteGrid} canvas paint.
 *
 * next-themes may expose `resolvedTheme: "system"` while `document.documentElement`
 * already carries the resolved `data-theme` attribute. Paint must follow the DOM
 * attribute so toggles stay in sync with the editor chrome.
 *
 * @module src/components/background/infiniteGridPaintTheme
 */

/**
 * Resolve whether the grid engine should paint the light palette.
 *
 * Prefers live `data-theme` on the document element when set; falls back to
 * next-themes `resolvedTheme` during SSR or before the attribute is applied.
 *
 * @param resolvedTheme - Value from `useTheme().resolvedTheme`.
 * @param domTheme - Optional override for tests (`document.documentElement` attribute).
 * @returns True when the light surface + tint palette should be used.
 */
export function resolveInfiniteGridPaintIsLight(
  resolvedTheme: string | undefined,
  domTheme: string | null =
    typeof document !== "undefined"
      ? document.documentElement.getAttribute("data-theme")
      : null,
): boolean {
  if (domTheme === "light") {
    return true;
  }
  if (domTheme === "dark") {
    return false;
  }
  return resolvedTheme === "light";
}
