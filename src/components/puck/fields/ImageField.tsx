"use client";

/**
 * @fileoverview Custom Puck Field for selecting or uploading an image.
 *
 * Renders a text input for direct URL entry, an upload button that POSTs
 * to `/api/upload`, and a thumbnail preview of the selected image.
 *
 * @module src/components/puck/fields/ImageField
 */

import { useState, useRef } from "react";
import { FieldLabel } from "@measured/puck";

// ── Types ────────────────────────────────────────────────────────────────────

interface ImageFieldProps {
  field: {
    label?: string;
  };
  value: string;
  onChange: (value: string) => void;
}

// ── Component ────────────────────────────────────────────────────────────────

/**
 * Custom Image Field with URL input, upload trigger, and preview.
 *
 * @param props - Custom field props from Puck.
 * @returns React element.
 */
export function ImageField({ field, value, onChange }: ImageFieldProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Handle file upload to /api/upload.
   */
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errText = await res.text();
        let errMsg = "Upload failed.";
        try {
          const parsed = JSON.parse(errText);
          errMsg = parsed.error || errMsg;
        } catch {
          errMsg = errText || errMsg;
        }
        throw new Error(errMsg);
      }

      const data = await res.json();
      if (data.url) {
        onChange(data.url);
      } else {
        throw new Error("No URL returned from server.");
      }
    } catch (err: unknown) {
      console.error("[ImageField upload]", err);
      setError((err as Error)?.message || "Upload failed.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  return (
    <FieldLabel label={field.label || "Image"}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          marginTop: 4,
        }}
      >
        {/* URL Input + Upload Trigger Row */}
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="text"
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Image URL (e.g. /brand/logo.svg)"
            style={{
              flex: 1,
              padding: "8px 12px",
              background: "var(--color-bg-cell)",
              border: "1px solid var(--color-border-default)",
              color: "var(--color-text-primary)",
              borderRadius: "var(--radius-md)",
              fontSize: "13px",
              outline: "none",
              minWidth: 0,
            }}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            style={{
              padding: "8px 14px",
              background: "var(--color-bg-elevated)",
              border: "1px solid var(--color-border-default)",
              color: "var(--color-text-primary)",
              borderRadius: "var(--radius-md)",
              fontSize: "13px",
              fontWeight: 500,
              cursor: "pointer",
              whiteSpace: "nowrap",
              opacity: uploading ? 0.6 : 1,
            }}
          >
            {uploading ? "Uploading..." : "Upload"}
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            style={{ display: "none" }}
          />
        </div>

        {/* Error Message */}
        {error && (
          <p style={{ color: "var(--color-danger)", fontSize: "11px", margin: 0 }}>
            {error}
          </p>
        )}

        {/* Image Preview */}
        {value && (
          <div
            style={{
              position: "relative",
              width: "100%",
              height: 120,
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border-default)",
              background: "var(--color-bg-cell)",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt="Preview"
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                objectFit: "contain",
              }}
            />
          </div>
        )}
      </div>
    </FieldLabel>
  );
}
