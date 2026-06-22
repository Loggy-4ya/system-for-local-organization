/**
 * @fileoverview Browser canvas helpers for rotated image crop export.
 *
 * Used by {@link NexusImageCropDialog} before upload.
 *
 * @module src/lib/imageCropCanvas
 */

import {
  buildCroppedFileName,
  getRadianAngle,
  resolveCropOutputMimeType,
  rotateSize,
  scaleCropDimensionsToMax,
  type ImageCropAreaPixels,
  type ImageCropExportOptions,
} from "@shared/lib/imageCropLogic";

/**
 * Load an image element from an object URL or remote path.
 *
 * Blob and data URLs must not set `crossOrigin` — doing so breaks loading and canvas export.
 *
 * @param src - Image URL (typically `URL.createObjectURL(file)`).
 * @returns Loaded HTML image element.
 */
export function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", () => reject(new Error("Failed to load image.")));
    if (!src.startsWith("blob:") && !src.startsWith("data:")) {
      image.crossOrigin = "anonymous";
    }
    image.src = src;
  });
}

/**
 * Render a rotated crop to an offscreen canvas.
 *
 * @param imageSrc - Object URL or public path of the source image.
 * @param pixelCrop - Crop rectangle from `react-easy-crop`.
 * @param options - Rotation, quality, and max dimension caps.
 * @param sourceMime - Original MIME for output type selection.
 * @returns Cropped canvas and resolved MIME type.
 */
async function renderCroppedCanvas(
  imageSrc: string,
  pixelCrop: ImageCropAreaPixels,
  options: ImageCropExportOptions,
  sourceMime: string,
): Promise<{ canvas: HTMLCanvasElement; mimeType: string; quality: number }> {
  const image = await loadImageElement(imageSrc);
  const rotation = options.rotation ?? 0;
  const quality = options.quality ?? 0.92;
  const maxDimension = options.maxDimension ?? 2048;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas is not available.");
  }

  const rotRad = getRadianAngle(rotation);
  const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
    image.width,
    image.height,
    rotation,
  );

  canvas.width = bBoxWidth;
  canvas.height = bBoxHeight;

  ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
  ctx.rotate(rotRad);
  ctx.translate(-image.width / 2, -image.height / 2);
  ctx.drawImage(image, 0, 0);

  const scaled = scaleCropDimensionsToMax(
    pixelCrop.width,
    pixelCrop.height,
    maxDimension,
  );

  const croppedCanvas = document.createElement("canvas");
  const croppedCtx = croppedCanvas.getContext("2d");
  if (!croppedCtx) {
    throw new Error("Canvas is not available.");
  }

  croppedCanvas.width = scaled.width;
  croppedCanvas.height = scaled.height;

  croppedCtx.drawImage(
    canvas,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    scaled.width,
    scaled.height,
  );

  return {
    canvas: croppedCanvas,
    mimeType: resolveCropOutputMimeType(sourceMime),
    quality,
  };
}

/**
 * Convert a canvas to a Blob via `toBlob` (avoids fragile `fetch(dataUrl)`).
 *
 * @param canvas - Source canvas.
 * @param mimeType - Output MIME type.
 * @param quality - Compression quality for lossy formats.
 * @returns Blob payload.
 */
function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }
        reject(new Error("Failed to export image."));
      },
      mimeType,
      quality,
    );
  });
}

/**
 * Draw a rotated crop and return a data URL for live previews.
 *
 * @param imageSrc - Object URL or public path of the source image.
 * @param pixelCrop - Crop rectangle from `react-easy-crop` (`croppedAreaPixels`).
 * @param options - Rotation, quality, and max dimension caps.
 * @param sourceMime - Original file MIME type.
 * @returns PNG/JPEG/WebP data URL of the cropped bitmap.
 */
export async function getCroppedImageDataUrl(
  imageSrc: string,
  pixelCrop: ImageCropAreaPixels,
  options: ImageCropExportOptions = {},
  sourceMime = "image/jpeg",
): Promise<string> {
  const { canvas, mimeType, quality } = await renderCroppedCanvas(
    imageSrc,
    pixelCrop,
    options,
    sourceMime,
  );
  return canvas.toDataURL(mimeType, quality);
}

/**
 * Export a cropped, optionally rotated image as a Blob.
 *
 * @param imageSrc - Object URL of the source image.
 * @param pixelCrop - Pixel crop area from the cropper.
 * @param options - Rotation and compression options.
 * @param sourceMime - Original file MIME type.
 * @returns Cropped image blob.
 */
export async function getCroppedImageBlob(
  imageSrc: string,
  pixelCrop: ImageCropAreaPixels,
  options: ImageCropExportOptions = {},
  sourceMime = "image/jpeg",
): Promise<Blob> {
  const { canvas, mimeType, quality } = await renderCroppedCanvas(
    imageSrc,
    pixelCrop,
    options,
    sourceMime,
  );
  return canvasToBlob(canvas, mimeType, quality);
}

/**
 * Export a cropped, optionally rotated image as a `File` for upload.
 *
 * @param imageSrc - Object URL of the source image.
 * @param pixelCrop - Pixel crop area from the cropper.
 * @param originalFile - Original picked file (name + MIME hints).
 * @param options - Rotation and compression options.
 * @returns Cropped file ready for {@link uploadMediaFile}.
 */
export async function getCroppedImageFile(
  imageSrc: string,
  pixelCrop: ImageCropAreaPixels,
  originalFile: File,
  options: ImageCropExportOptions = {},
): Promise<File> {
  const mimeType = resolveCropOutputMimeType(originalFile.type);
  const blob = await getCroppedImageBlob(
    imageSrc,
    pixelCrop,
    options,
    originalFile.type,
  );
  const fileName = buildCroppedFileName(originalFile.name, mimeType);
  return new File([blob], fileName, { type: mimeType, lastModified: Date.now() });
}
