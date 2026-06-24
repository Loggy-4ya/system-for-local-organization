"use client";

/**
 * @fileoverview Unified Puck field for image/video upload with drag-and-drop.
 *
 * @module src/components/puck/fields/MediaUploadField
 */

import { FieldLabel } from "@puckeditor/core";
import { useCallback, useRef, useState } from "react";
import { SettingsMediaPreview } from "@/components/media/SettingsMediaPreview";
import { cn } from "@/lib/utils";
import { uploadMediaFileWithCrop, isRecroppableUploadedImageUrl, recropUploadedMediaImage, type MediaAccept } from "../lib/mediaUpload";
import type { MediaPurpose } from "@shared/constants/mediaStorage";

/** Props for the media upload field renderer. */
interface MediaUploadFieldProps {
  field: {
    label?: string;
    accept?: MediaAccept;
    /** Upload category forwarded to `/api/upload`. */
    purpose?: MediaPurpose;
  };
  value: string;
  onChange: (value: string) => void;
  /** When true, use taller contain preview readable in sidebar settings. */
  showReadablePreview?: boolean;
  /** Alt text shown below readable preview when provided. */
  altText?: string;
  /** Called when alt text changes (optional). */
  onAltTextChange?: (value: string) => void;
  /** Skip Puck {@link FieldLabel} when the parent chapter already shows a label. */
  hideFieldLabel?: boolean;
  /** When false, omit the drop zone (preview/recrop only). Defaults to true. */
  showDropZone?: boolean;
  /** Clickable empty frame label when {@link showDropZone} is false and no media is set. */
  emptyPickerLabel?: string;
  /** Override copy on the empty-state drop strip. */
  dropZoneLabel?: string;
}

/**
 * Drag-and-drop media upload field with optional preview.
 *
 * @param props - Puck custom field props.
 * @returns Preview (when set), optional alt text, and a single drop zone at the bottom.
 */
export function MediaUploadField({
  field,
  value,
  onChange,
  showReadablePreview = true,
  altText,
  onAltTextChange,
  hideFieldLabel = false,
  showDropZone = true,
  emptyPickerLabel = "Select image",
  dropZoneLabel = "Drop or click to select media",
}: MediaUploadFieldProps) {
  const accept = field.accept ?? "both";
  const purpose = field.purpose ?? "puck-block";
  const acceptAttr =
    accept === "image" ? "image/*" : accept === "video" ? "video/*" : "image/*,video/*";

  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isVideo =
    value?.match(/\.(mp4|webm|ogg|mov)(\?|$)/i) || value?.includes("video");

  const canRecropImage =
    (accept === "image" || accept === "both") && isRecroppableUploadedImageUrl(value);

  /**
   * Process a selected or dropped file through the upload API.
   *
   * @param file - File to upload.
   */
  const handleFile = useCallback(
    async (file: File) => {
      setUploading(true);
      setError(null);
      try {
        const url = await uploadMediaFileWithCrop(file, { accept, purpose });
        if (!url) return;
        onChange(url);
      } catch (err: unknown) {
        console.error("[MediaUploadField]", err);
        setError((err as Error)?.message || "Upload failed.");
      } finally {
        setUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [accept, purpose, onChange],
  );

  /**
   * Re-open the crop editor for the current uploaded image and replace the field value.
   */
  const handleRecrop = useCallback(async () => {
    if (!value || uploading || !canRecropImage) return;

    setUploading(true);
    setError(null);
    try {
      const nextUrl = await recropUploadedMediaImage(value, { purpose });
      if (!nextUrl) return;
      onChange(nextUrl);
    } catch (err: unknown) {
      console.error("[MediaUploadField recrop]", err);
      setError((err as Error)?.message || "Recrop failed.");
    } finally {
      setUploading(false);
    }
  }, [canRecropImage, onChange, purpose, uploading, value]);

  const showEmptyPicker = !value?.trim() && !showDropZone;
  const showDropStrip = showDropZone && !value?.trim();
  const needsFileInput = showEmptyPicker || showDropStrip;

  const openFilePicker = useCallback(() => {
    if (!uploading) {
      fileInputRef.current?.click();
    }
  }, [uploading]);

  const body = (
    <div className="nexus-media-upload-field">
      {showEmptyPicker ? (
        <div
          role="button"
          tabIndex={0}
          className={cn(
            "nexus-media-upload-field__empty-picker",
            uploading && "nexus-media-upload-field__empty-picker--busy",
          )}
          title={emptyPickerLabel}
          aria-label={emptyPickerLabel}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              openFilePicker();
            }
          }}
          onClick={openFilePicker}
        >
          {uploading ? "Uploading…" : emptyPickerLabel}
        </div>
      ) : null}

      {value && showReadablePreview ? (
        <SettingsMediaPreview
          src={value}
          alt={altText || field.label || "Preview"}
          onRecropClick={canRecropImage ? () => void handleRecrop() : undefined}
          recropDisabled={uploading}
        />
      ) : null}

      {value && !showReadablePreview ? (
        <div
          className={cn(
            "nexus-media-upload-field__preview-compact",
            canRecropImage && "nexus-media-upload-field__preview-compact--recrop",
          )}
          {...(canRecropImage
            ? {
                role: "button",
                tabIndex: uploading ? -1 : 0,
                title: "Click to recrop",
                "aria-label": "Preview — click to recrop",
                onClick: () => !uploading && void handleRecrop(),
                onKeyDown: (event) => {
                  if ((event.key === "Enter" || event.key === " ") && !uploading) {
                    event.preventDefault();
                    void handleRecrop();
                  }
                },
              }
            : {})}
        >
          {isVideo ? (
            <video src={value} className="nexus-media-upload-field__preview-media" controls muted />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={value}
              alt="Preview"
              className="nexus-media-upload-field__preview-media"
            />
          )}
        </div>
      ) : null}

      {onAltTextChange ? (
        <div className="nexus-media-upload-field__alt">
          <span className="nexus-field-category__label">Alt Text</span>
          <input
            type="text"
            className="nexus-puck-input"
            value={altText ?? ""}
            onChange={(e) => onAltTextChange(e.target.value)}
            placeholder="Describe the image for accessibility"
          />
        </div>
      ) : null}

      {error ? <p className="nexus-media-upload-field__error">{error}</p> : null}

      {showDropStrip ? (
        <div
          role="button"
          tabIndex={0}
          className={cn(
            "nexus-media-upload-field__dropzone",
            dragOver && "nexus-media-upload-field__dropzone--active",
            uploading && "nexus-media-upload-field__dropzone--busy",
          )}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") openFilePicker();
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file) void handleFile(file);
          }}
          onClick={openFilePicker}
        >
          {uploading ? "Uploading…" : dropZoneLabel}
        </div>
      ) : null}

      {needsFileInput ? (
        <input
          type="file"
          ref={fileInputRef}
          accept={acceptAttr}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
          className="nexus-media-upload-field__file-input"
        />
      ) : null}
    </div>
  );

  if (hideFieldLabel) {
    return body;
  }

  return <FieldLabel label={field.label || "Media"}>{body}</FieldLabel>;
}

export default MediaUploadField;
