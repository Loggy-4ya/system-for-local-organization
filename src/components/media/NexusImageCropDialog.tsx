"use client";

/**
 * @fileoverview App-wide image crop and rotate dialog.
 *
 * Built on `react-easy-crop` with Nexus glass-panel styling, rotation controls,
 * free-form crop, resizable crop frame, and contextual preview masks.
 *
 * @module src/components/media/NexusImageCropDialog
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Cropper, { type Area, type Point } from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";
import "./nexus-image-crop.css";
import { RotateCcw, RotateCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DEFAULT_MEDIA_PURPOSE } from "@shared/constants/mediaStorage";
import {
  IMAGE_CROP_CONTEXTS,
  type CropAspectMode,
  type ImageCropContext,
} from "@shared/constants/imageCropContexts";
import {
  computeCropFrameSize,
  resolveAspectRatioFromMode,
  resolveImageCropSession,
} from "@shared/lib/imageCropLogic";
import { getCroppedImageDataUrl, getCroppedImageFile } from "@/lib/imageCropCanvas";
import { NexusImageCropPreviewStrip } from "./NexusImageCropPreviewStrip";
import { NexusCropSlider } from "./NexusCropSlider";
import type { ImageCropHostRequest } from "./imageCropHostState";
import { completeImageCropRequest } from "./imageCropHostState";

/** Props for {@link NexusImageCropDialog}. */
export interface NexusImageCropDialogProps {
  /** Active crop request from the host, or null when closed. */
  request: ImageCropHostRequest | null;
}

/** Props for the keyed inner editor body. */
interface NexusImageCropEditorProps {
  /** Active crop request. */
  request: ImageCropHostRequest;
  /** Preview masks for this upload purpose. */
  contexts: ImageCropContext[];
  /** Initial aspect lock mode. */
  initialAspectMode: CropAspectMode;
}

const ZOOM_MIN = 1;
const ZOOM_MAX = 3;
const ROTATION_MIN = -180;
const ROTATION_MAX = 180;
const FRAME_SCALE_MIN = 0.45;
const FRAME_SCALE_MAX = 1;

/**
 * Stateful crop editor — remounted per file via `key` on the parent dialog.
 *
 * @param props - See {@link NexusImageCropEditorProps}.
 * @returns Crop controls and preview strip.
 */
function NexusImageCropEditor({
  request,
  contexts,
  initialAspectMode,
}: NexusImageCropEditorProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [frameScale, setFrameScale] = useState(0.88);
  const [aspectMode, setAspectMode] = useState<CropAspectMode>(initialAspectMode);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lockedAspect = useMemo(
    () => resolveAspectRatioFromMode(aspectMode),
    [aspectMode],
  );

  const cropShape = useMemo((): "rect" | "round" => {
    if (aspectMode !== "free" && IMAGE_CROP_CONTEXTS[aspectMode]?.shape === "circle") {
      return "round";
    }
    return "rect";
  }, [aspectMode]);

  const cropSize = useMemo(() => {
    if (containerSize.width <= 0 || containerSize.height <= 0) {
      return undefined;
    }
    return computeCropFrameSize(
      containerSize.width,
      containerSize.height,
      frameScale,
      lockedAspect,
      cropShape === "round",
    );
  }, [containerSize, frameScale, lockedAspect, cropShape]);

  useLayoutEffect(() => {
    const node = viewportRef.current;
    if (!node) return undefined;

    const update = () => {
      const rect = node.getBoundingClientRect();
      setContainerSize({ width: rect.width, height: rect.height });
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  /** Debounced live preview for mask thumbnails. */
  useEffect(() => {
    if (!croppedAreaPixels) return;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void getCroppedImageDataUrl(
        request.imageUrl,
        croppedAreaPixels,
        { rotation, maxDimension: 512, quality: 0.85 },
        request.file.type,
      )
        .then((url) => {
          if (!cancelled) setPreviewUrl(url);
        })
        .catch((err: unknown) => {
          if (!cancelled) {
            setPreviewUrl(null);
            console.error("[NexusImageCropDialog preview]", err);
          }
        });
    }, 100);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [request.imageUrl, request.file.type, croppedAreaPixels, rotation]);

  const handleCropAreaChange = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  const handleCancel = useCallback(() => {
    completeImageCropRequest(request, null);
  }, [request]);

  const handleUseOriginal = useCallback(() => {
    completeImageCropRequest(request, request.file);
  }, [request]);

  const handleConfirm = useCallback(async () => {
    if (!croppedAreaPixels) {
      setError("Adjust the crop area before continuing.");
      return;
    }

    setExporting(true);
    setError(null);
    try {
      const croppedFile = await getCroppedImageFile(
        request.imageUrl,
        croppedAreaPixels,
        request.file,
        { rotation, maxDimension: 2048, quality: 0.92 },
      );
      completeImageCropRequest(request, croppedFile);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to export cropped image.");
    } finally {
      setExporting(false);
    }
  }, [request, croppedAreaPixels, rotation]);

  const nudgeRotation = useCallback((delta: number) => {
    setRotation((value) => {
      const next = value + delta;
      if (next > ROTATION_MAX) return ROTATION_MAX;
      if (next < ROTATION_MIN) return ROTATION_MIN;
      return next;
    });
  }, []);

  return (
    <>
      <div
        ref={viewportRef}
        className="nexus-image-crop__viewport relative h-[min(52vw,340px)] min-h-[240px] overflow-hidden rounded-xl bg-[#0a0a0f] shadow-inner"
      >
        <Cropper
          image={request.imageUrl}
          crop={crop}
          zoom={zoom}
          rotation={rotation}
          aspect={lockedAspect}
          cropShape={cropShape}
          cropSize={cropSize}
          showGrid
          zoomWithScroll
          objectFit="contain"
          keyboardStep={1}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onRotationChange={setRotation}
          onCropAreaChange={handleCropAreaChange}
          onCropComplete={handleCropAreaChange}
        />
      </div>

      <div className="nexus-image-crop__controls glass-panel flex flex-col gap-4 rounded-xl bg-(--color-bg-elevated) p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => nudgeRotation(-90)}
            disabled={exporting}
          >
            <RotateCcw />
            −90°
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => nudgeRotation(90)}
            disabled={exporting}
          >
            <RotateCw />
            +90°
          </Button>
          <span className="text-[11px] text-(--color-text-secondary)">
            Scroll to zoom · drag to pan · pinch to rotate on touch devices
          </span>
        </div>

        <NexusCropSlider
          label="Zoom"
          min={ZOOM_MIN}
          max={ZOOM_MAX}
          step={0.05}
          value={zoom}
          formatValue={(value) => `${value.toFixed(1)}×`}
          onChange={setZoom}
          disabled={exporting}
        />

        <NexusCropSlider
          label="Rotation"
          min={ROTATION_MIN}
          max={ROTATION_MAX}
          step={1}
          value={rotation}
          formatValue={(value) => `${value}°`}
          onChange={setRotation}
          disabled={exporting}
        />

        <NexusCropSlider
          label="Crop frame size"
          min={FRAME_SCALE_MIN}
          max={FRAME_SCALE_MAX}
          step={0.01}
          value={frameScale}
          formatValue={(value) => `${Math.round(value * 100)}%`}
          onChange={setFrameScale}
          disabled={exporting}
        />
      </div>

      <NexusImageCropPreviewStrip
        contexts={contexts}
        previewUrl={previewUrl}
        aspectMode={aspectMode}
        onSelectAspectMode={setAspectMode}
      />

      {error && (
        <p className="text-sm text-(--color-danger)" role="alert">
          {error}
        </p>
      )}

      <DialogFooter className="gap-2 sm:justify-end">
        <Button type="button" variant="outline" onClick={handleCancel} disabled={exporting}>
          Cancel
        </Button>
        <Button type="button" variant="secondary" onClick={handleUseOriginal} disabled={exporting}>
          Use original
        </Button>
        <Button
          type="button"
          variant="default"
          onClick={() => void handleConfirm()}
          disabled={exporting}
        >
          {exporting ? "Saving…" : "Use cropped"}
        </Button>
      </DialogFooter>
    </>
  );
}

/**
 * Full-screen-friendly crop dialog with rotate, zoom, and preview masks.
 *
 * @param props - See {@link NexusImageCropDialogProps}.
 * @returns Modal crop UI or null when idle.
 */
export function NexusImageCropDialog({ request }: NexusImageCropDialogProps) {
  const open = request !== null;
  const purpose = request?.options.purpose ?? DEFAULT_MEDIA_PURPOSE;
  const { contexts, defaultAspectMode } = useMemo(
    () => resolveImageCropSession(purpose),
    [purpose],
  );

  const initialAspectMode =
    request?.options.initialContextId ?? defaultAspectMode;

  const handleCancel = useCallback(() => {
    if (!request) return;
    completeImageCropRequest(request, null);
  }, [request]);

  if (!request) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleCancel()}>
      <DialogContent
        showCloseButton
        className="glass-panel max-h-[min(92dvh,920px)] overflow-y-auto border-0 bg-(--color-bg-panel) p-0 sm:max-w-2xl"
      >
        <div className="flex flex-col gap-5 p-6">
          <DialogHeader>
            <DialogTitle className="text-lg text-(--color-text-primary)">
              {request.options.title ?? "Edit photo"}
            </DialogTitle>
            <DialogDescription className="text-(--color-text-secondary)">
              Drag to reposition, adjust the crop frame, and preview masks below — or upload the
              original file without cropping.
            </DialogDescription>
          </DialogHeader>

          <NexusImageCropEditor
            key={request.imageUrl}
            request={request}
            contexts={contexts}
            initialAspectMode={initialAspectMode}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default NexusImageCropDialog;
