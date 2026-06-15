/**
 * @fileoverview Human-readable labels for Puck viewport zoom select values.
 *
 * @module src/components/puck/lib/formatViewportZoomLabel
 */

/** Single zoom option from Puck's native `<select>`. */
export interface ViewportZoomOption {
  label: string;
  value: string;
}

/**
 * Resolve a display label for the viewport zoom trigger.
 *
 * Falls back to a rounded percentage when Puck's select value does not exactly
 * match any option (common after auto-zoom recalculation).
 *
 * @param value - Current select value string.
 * @param options - Available option list from the native select.
 * @param compact - When true, strip the ` (Auto)` suffix for narrow triggers.
 * @returns Formatted label for the trigger.
 */
export function formatViewportZoomLabel(
  value: string,
  options: ViewportZoomOption[],
  compact = true,
): string {
  const storedValue = String(value ?? "");
  const matched = options.find((opt) => opt.value === storedValue);

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
