"use client";

/**
 * @fileoverview Preview mask thumbnails for the image crop dialog.
 *
 * Renders each {@link ImageCropContext} as a framed thumbnail with optional
 * circular or rounded clipping to mirror real Nexus surfaces.
 *
 * @module src/components/media/NexusImageCropPreviewStrip
 */

import { cn } from "@/lib/utils";
import type { ImageCropContext, CropAspectMode } from "@shared/constants/imageCropContexts";

/** Props for {@link NexusImageCropPreviewStrip}. */
export interface NexusImageCropPreviewStripProps {
  /** Mask definitions to render. */
  contexts: ImageCropContext[];
  /** Live preview data URL from the current crop (null while generating). */
  previewUrl: string | null;
  /** Active aspect lock mode. */
  aspectMode: CropAspectMode;
  /** Called when the user selects free crop or a preset mask ratio. */
  onSelectAspectMode: (mode: CropAspectMode) => void;
}

/**
 * Resolve border radius for a preview mask shape.
 *
 * @param shape - Mask clip shape.
 * @returns CSS border-radius value.
 */
function maskBorderRadius(shape: ImageCropContext["shape"]): string {
  if (shape === "circle") return "50%";
  if (shape === "rounded") return "var(--radius-lg)";
  return "var(--radius-sm)";
}

/**
 * Shared preview thumbnail body for mask chips.
 *
 * @param props - Preview URL and context styling.
 * @returns Mask frame with image or skeleton.
 */
function MaskPreviewFrame({
  context,
  previewUrl,
  compact = false,
}: {
  context?: ImageCropContext;
  previewUrl: string | null;
  compact?: boolean;
}) {
  const width = compact ? 52 : (context?.previewWidth ?? 72);
  const height = compact ? 52 : (context?.previewHeight ?? 72);
  const shape = context?.shape ?? "rounded";

  return (
    <div
      className="nexus-image-crop__mask-preview relative overflow-hidden border-2 border-(--color-accent-user) bg-(--color-bg-elevated)"
      style={{
        width,
        height,
        borderRadius: maskBorderRadius(shape),
      }}
    >
      {previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt=""
          className="h-full w-full"
          style={{ objectFit: context?.fit ?? "cover" }}
        />
      ) : (
        <div className="h-full w-full animate-pulse bg-muted" />
      )}
    </div>
  );
}

/**
 * Horizontal strip of contextual preview masks plus a free-form crop chip.
 *
 * @param props - See {@link NexusImageCropPreviewStripProps}.
 * @returns Preview mask row.
 */
export function NexusImageCropPreviewStrip({
  contexts,
  previewUrl,
  aspectMode,
  onSelectAspectMode,
}: NexusImageCropPreviewStripProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium tracking-wide text-(--color-text-secondary) uppercase">
          Crop shape
        </span>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onSelectAspectMode("free")}
            className={cn(
              "nexus-image-crop__mask-chip rounded-full px-3 py-1.5 text-xs font-medium",
              aspectMode === "free"
                ? "nexus-image-crop__mask-chip--active bg-(--color-accent-user) text-[#0f1729]"
                : "bg-(--color-bg-elevated) text-(--color-text-secondary) ring-1 ring-border hover:text-(--color-text-primary)",
            )}
          >
            Free
          </button>
          {contexts.map((context) => (
            <button
              key={context.id}
              type="button"
              onClick={() => onSelectAspectMode(context.id)}
              className={cn(
                "nexus-image-crop__mask-chip rounded-full px-3 py-1.5 text-xs font-medium",
                aspectMode === context.id
                  ? "nexus-image-crop__mask-chip--active bg-(--color-accent-user) text-[#0f1729]"
                  : "bg-(--color-bg-elevated) text-(--color-text-secondary) ring-1 ring-border hover:text-(--color-text-primary)",
              )}
            >
              {context.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium tracking-wide text-(--color-text-secondary) uppercase">
          Preview masks
        </span>
        <div className="flex flex-wrap gap-3">
          {contexts.map((context) => (
            <div
              key={context.id}
              className="flex flex-col items-center gap-1.5 rounded-lg p-1.5"
            >
              <MaskPreviewFrame context={context} previewUrl={previewUrl} />
              <span className="max-w-[5.5rem] truncate text-[10px] font-medium text-(--color-text-secondary)">
                {context.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default NexusImageCropPreviewStrip;
