/**
 * @fileoverview Human-readable labels for Puck viewport zoom select values.
 *
 * Tests: `tests/puck/lib/formatViewportZoomLabel.test.ts` — `npm run test:viewport-zoom-label`
 *
 * @module src/components/puck/lib/formatViewportZoomLabel
 */

/** Single zoom option from Puck's native `<select>`. */
export interface ViewportZoomOption {
  label: string;
  value: string;
}

/**
 * Whether the current zoom select value is Puck's auto-fit target.
 *
 * Puck labels shrink-to-fit values as `NN% (Auto)`. When auto-fit resolves to 100%,
 * Puck reuses the preset `100%` option without the Auto suffix.
 *
 * @param value - Current select value string.
 * @param options - Available option list from the native select.
 * @returns True when the value tracks auto-fit zoom.
 */
export function isViewportZoomAutoSelection(
  value: string,
  options: ViewportZoomOption[],
): boolean {
  const storedValue = String(value ?? "");
  const matched = options.find((opt) => opt.value === storedValue);

  if (matched && /\(Auto\)$/i.test(matched.label)) {
    return true;
  }

  const hasExplicitAutoOption = options.some((opt) => /\(Auto\)$/i.test(opt.label));
  return storedValue === "1" && !hasExplicitAutoOption && matched?.label === "100%";
}

/**
 * Resolve a display label for the viewport zoom trigger.
 *
 * Falls back to a rounded percentage when Puck's select value does not exactly
 * match any option (common after auto-zoom recalculation).
 *
 * @param value - Current select value string.
 * @param options - Available option list from the native select.
 * @param compact - When true, show `Auto` instead of a percentage for auto-fit values.
 * @returns Formatted label for the trigger.
 */
export function formatViewportZoomLabel(
  value: string,
  options: ViewportZoomOption[],
  compact = true,
): string {
  const storedValue = String(value ?? "");
  const matched = options.find((opt) => opt.value === storedValue);

  if (isViewportZoomAutoSelection(storedValue, options)) {
    if (compact) {
      return "Auto";
    }

    const baseLabel = matched?.label.replace(/\s*\(Auto\)$/i, "") ?? "100%";
    return `${baseLabel} (Auto)`;
  }

  let label = matched?.label ?? storedValue;

  if (!matched) {
    const parsed = Number.parseFloat(storedValue);
    if (Number.isFinite(parsed) && parsed > 0 && parsed <= 3) {
      label = `${Math.round(parsed * 100)}%`;
    }
  }

  if (compact) {
    label = label.replace(/\s*\(Auto\)$/i, "");
  }

  return label;
}
