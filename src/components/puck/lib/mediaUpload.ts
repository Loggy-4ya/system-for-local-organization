/**
 * @fileoverview Re-export of the app-wide media upload client for Puck fields.
 *
 * Prefer importing from `@/lib/mediaUploadClient` in new code.
 *
 * @module src/components/puck/lib/mediaUpload
 */

export {
  importMediaImageFromUrl,
  isImportableRemoteMediaUrl,
  uploadMediaFile,
  type MediaAccept,
  type UploadMediaFileOptions,
} from "@/lib/mediaUploadClient";
