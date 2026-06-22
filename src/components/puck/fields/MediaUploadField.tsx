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
import {
  uploadMediaFileWithCrop,
  importMediaImageFromUrl,
  isImportableRemoteMediaUrl,
  type MediaAccept,
} from "../lib/mediaUpload";
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
}

/**
 * Drag-and-drop media upload field with URL fallback and preview.
 *
 * @param props - Puck custom field props.
 * @returns Upload zone, URL input, and optional preview.
 */
export function MediaUploadField({
  field,
  value,
  onChange,
  showReadablePreview = true,
  altText,
  onAltTextChange,
  hideFieldLabel = false,
}: MediaUploadFieldProps) {
  const accept = field.accept ?? "both";
  const purpose = field.purpose ?? "puck-block";
  const acceptAttr =
    accept === "image" ? "image/*" : accept === "video" ? "video/*" : "image/*,video/*";

  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isVideo =
    value?.match(/\.(mp4|webm|ogg|mov)(\?|$)/i) || value?.includes("video");

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

  const canImportRemoteImage = accept === "image" || accept === "both";
  const showImportLink =
    canImportRemoteImage && isImportableRemoteMediaUrl(value) && !uploading && !importing;

  /**
   * Download a remote image URL and replace the field value with a local path.
   */
  const handleImportFromUrl = useCallback(async () => {
    if (!value?.trim() || !canImportRemoteImage) return;

    setImporting(true);
    setError(null);
    try {
      const localUrl = await importMediaImageFromUrl(value, { purpose });
      onChange(localUrl);
    } catch (err: unknown) {
      console.error("[MediaUploadField import]", err);
      setError((err as Error)?.message || "Image import failed.");
    } finally {
      setImporting(false);
    }
  }, [canImportRemoteImage, onChange, purpose, value]);

  const busy = uploading || importing;

  const body = (
    <div className="nexus-media-upload-field">
      <input
        type="text"
        className="nexus-puck-input nexus-media-upload-field__url"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Media URL (e.g. /uploads/file.png)"
      />

      {showImportLink ? (
        <button
          type="button"
          className="nexus-media-upload-field__import"
          disabled={busy}
          onClick={() => void handleImportFromUrl()}
        >
          {importing ? "Importing…" : "Import image from link"}
        </button>
      ) : null}

      <div
        role="button"
        tabIndex={0}
        className={cn(
          "nexus-media-upload-field__dropzone",
          dragOver && "nexus-media-upload-field__dropzone--active",
          busy && "nexus-media-upload-field__dropzone--busy",
        )}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
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
        onClick={() => !busy && fileInputRef.current?.click()}
      >
        {uploading ? "Uploading…" : importing ? "Importing…" : "Drop file here or click to upload"}
      </div>

      <button
        type="button"
        className="nexus-media-upload-field__choose"
        disabled={busy}
        onClick={() => fileInputRef.current?.click()}
      >
        {uploading ? "Uploading…" : "Choose file"}
      </button>

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

      {error ? <p className="nexus-media-upload-field__error">{error}</p> : null}

      {value && showReadablePreview ? (
        <SettingsMediaPreview src={value} alt={altText || field.label || "Preview"} />
      ) : null}

      {value && !showReadablePreview ? (
        <div className="nexus-media-upload-field__preview-compact">
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
    </div>
  );

  if (hideFieldLabel) {
    return body;
  }

  return <FieldLabel label={field.label || "Media"}>{body}</FieldLabel>;
}

export default MediaUploadField;
