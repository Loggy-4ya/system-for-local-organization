"use client";

/**
 * @fileoverview Styled native range control for the image crop dialog.
 *
 * Avoids Base UI slider edge-alignment bugs with negative min values (rotation −180…180).
 *
 * @module src/components/media/NexusCropSlider
 */

import { cn } from "@/lib/utils";

/** Props for {@link NexusCropSlider}. */
export interface NexusCropSliderProps {
  /** Accessible label. */
  label: string;
  /** Current numeric value. */
  value: number;
  /** Minimum value. */
  min: number;
  /** Maximum value. */
  max: number;
  /** Step increment. */
  step: number;
  /** Display formatter for the value readout. */
  formatValue?: (value: number) => string;
  /** Change handler. */
  onChange: (value: number) => void;
  /** Disable interaction. */
  disabled?: boolean;
  className?: string;
}

/**
 * Horizontal range slider with Nexus tokens and smooth thumb transitions.
 *
 * @param props - See {@link NexusCropSliderProps}.
 * @returns Labelled range input row.
 */
export function NexusCropSlider({
  label,
  value,
  min,
  max,
  step,
  formatValue,
  onChange,
  disabled = false,
  className,
}: NexusCropSliderProps) {
  const readout = formatValue ? formatValue(value) : String(value);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between text-xs text-(--color-text-secondary)">
        <span>{label}</span>
        <span className="tabular-nums">{readout}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        className="nexus-crop-slider h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-(--color-accent-user) disabled:cursor-not-allowed disabled:opacity-50"
      />
    </div>
  );
}

export default NexusCropSlider;
