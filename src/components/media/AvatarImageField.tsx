"use client";

/**
 * @fileoverview Profile avatar upload field — crop dialog, photo preview, Lucide fallback.
 *
 * Replaces raw URL text inputs for member profile photos. Uses {@link uploadMediaFileWithCrop}
 * with the `avatar` purpose so contextual circle masks apply before persistence.
 *
 * Supports {@link AvatarImageFieldProps.deferUpload} for signup (crop locally, upload after auth).
 *
 * @module src/components/media/AvatarImageField
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cropImageFile } from "@/lib/imageCropClient";
import { uploadMediaFileWithCrop } from "@/lib/mediaUploadClient";
import { UserAvatarImage } from "./UserAvatarImage";

/** Props for {@link AvatarImageField}. */
export interface AvatarImageFieldProps {
  /** Current avatar URL stored on the user profile (or blob preview when deferred). */
  value: string;
  /** Called when the avatar URL changes (upload, import, or clear). */
  onChange: (value: string) => void;
  /** Forwarded to `/api/upload` for namespaced avatar storage. */
  ownerKey?: string;
  /** When true, crop locally and defer upload until the account session exists (signup). */
  deferUpload?: boolean;
  /** Cropped file waiting for post-auth upload when {@link deferUpload} is true. */
  pendingFile?: File | null;
  /** Called when the deferred cropped file changes. */
  onPendingFileChange?: (file: File | null) => void;
  /** Disables upload and remove actions. */
  disabled?: boolean;
  /** Stable id for the hidden file input (FormField association). */
  id?: string;
}

/**
 * Insert or replace a profile avatar image with crop support and User icon fallback.
 *
 * @param props - Controlled value, change handler, and optional owner key.
 * @returns Avatar picker row for profile settings or signup.
 */
export function AvatarImageField({
  value,
  onChange,
  ownerKey,
  deferUpload = false,
  pendingFile = null,
  onPendingFileChange,
  disabled = false,
  id = "profile-avatar-file",
}: AvatarImageFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Revoke a deferred blob preview URL when replacing or clearing the avatar.
   */
  const revokePreviewUrl = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  }, []);

  useEffect(() => () => revokePreviewUrl(), [revokePreviewUrl]);

  /**
   * Upload a picked or dropped image through the avatar crop flow.
   *
   * @param file - Browser file from input or drop zone.
   */
  const handleFile = useCallback(
    async (file: File) => {
      if (disabled) return;

      setUploading(true);
      setError(null);
      try {
        if (deferUpload) {
          const cropped = await cropImageFile(file, { purpose: "avatar" });
          if (!cropped) return;

          revokePreviewUrl();
          const previewUrl = URL.createObjectURL(cropped);
          previewUrlRef.current = previewUrl;
          onPendingFileChange?.(cropped);
          onChange(previewUrl);
          return;
        }

        const url = await uploadMediaFileWithCrop(file, {
          accept: "image",
          purpose: "avatar",
          ownerKey,
        });
        if (!url) return;
        onChange(url);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Avatar upload failed.");
      } finally {
        setUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [deferUpload, disabled, onChange, onPendingFileChange, ownerKey, revokePreviewUrl],
  );

  const hasAvatar = Boolean(value?.trim() || pendingFile);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <UserAvatarImage src={value} size={64} />

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={disabled || uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? "Uploading…" : hasAvatar ? "Change photo" : "Choose photo"}
          </Button>

          {hasAvatar ? (
            <Button
              type="button"
              variant="ghost"
              disabled={disabled || uploading}
              onClick={() => {
                revokePreviewUrl();
                onPendingFileChange?.(null);
                onChange("");
              }}
            >
              Remove
            </Button>
          ) : null}
        </div>
      </div>

      <input
        id={id}
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        disabled={disabled || uploading}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />

      {error ? (
        <p className="text-sm text-[var(--color-destructive)]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export default AvatarImageField;
