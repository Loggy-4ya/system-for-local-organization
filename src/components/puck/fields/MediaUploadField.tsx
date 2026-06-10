"use client";

/**
 * @fileoverview Unified Puck field for image/video upload with drag-and-drop.
 *
 * @module src/components/puck/fields/MediaUploadField
 */

import { FieldLabel } from "@measured/puck";
import { useCallback, useRef, useState } from "react";
import { uploadMediaFile, type MediaAccept } from "../lib/mediaUpload";

/** Props for the media upload field renderer. */
interface MediaUploadFieldProps {
  field: {
    label?: string;
    accept?: MediaAccept;
  };
  value: string;
  onChange: (value: string) => void;
}

/**
 * Drag-and-drop media upload field with URL fallback and preview.
 *
 * @param props - Puck custom field props.
 * @returns Upload zone, URL input, and optional preview.
 */
export function MediaUploadField({ field, value, onChange }: MediaUploadFieldProps) {
  const accept = field.accept ?? "both";
  const acceptAttr =
    accept === "image" ? "image/*" : accept === "video" ? "video/*" : "image/*,video/*";

  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isVideo =
    value?.match(/\.(mp4|webm|ogg|mov)(\?|$)/i) ||
    value?.includes("video");

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
        const url = await uploadMediaFile(file, accept);
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
    [accept, onChange],
  );

  return (
    <FieldLabel label={field.label || "Media"}>
      <div className="nexus-puck-field" style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
        <input
          type="text"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Media URL (e.g. /uploads/file.png)"
        />

        <div
          role="button"
          tabIndex={0}
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
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `1px dashed ${dragOver ? "var(--color-accent-user)" : "var(--puck-color-grey-09)"}`,
            borderRadius: 4,
            padding: "16px 12px",
            textAlign: "center",
            cursor: uploading ? "not-allowed" : "pointer",
            background: dragOver ? "var(--puck-color-grey-11)" : "var(--puck-color-white)",
            fontSize: 13,
            color: "var(--puck-color-black)",
          }}
        >
          {uploading ? "Uploading…" : "Drop file here or click to upload"}
        </div>

        <button
          type="button"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          style={{ width: "100%" }}
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
          style={{ display: "none" }}
        />

        {error && (
          <p style={{ color: "var(--color-danger)", fontSize: 11, margin: 0 }}>{error}</p>
        )}

        {value && (
          <div
            style={{
              width: "100%",
              height: 120,
              borderRadius: 4,
              border: "1px solid var(--puck-color-grey-09)",
              background: "var(--puck-color-white)",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {isVideo ? (
              <video src={value} style={{ maxWidth: "100%", maxHeight: "100%" }} controls muted />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={value} alt="Preview" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
            )}
          </div>
        )}
      </div>
    </FieldLabel>
  );
}

export default MediaUploadField;
