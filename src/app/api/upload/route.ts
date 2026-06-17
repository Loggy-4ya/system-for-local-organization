/**
 * @fileoverview Media upload API route for Project Nexus.
 *
 * Accepts multipart uploads and delegates validation + persistence to
 * {@link MediaDomain}. Storage backend is controlled by `MEDIA_STORAGE_DRIVER`.
 *
 * @module src/app/api/upload/route
 */

import { NextRequest, NextResponse } from "next/server";
import { MediaDomain } from "@shared/domains/MediaDomain";
import { parseMediaPurpose } from "@shared/lib/mediaStorage/mediaStorageRules";
import { isApiAuthorised } from "@/lib/authGuards";

/**
 * Handle image and video uploads.
 *
 * Form fields:
 * - `file` (required) — binary payload
 * - `purpose` (optional) — `avatar` | `page-cover` | `puck-block` | `task-report` | `general`
 * - `ownerKey` (optional) — namespace hint for future lifecycle hooks
 *
 * @param req - Next.js request containing multipart form data.
 * @returns JSON `{ url, purpose, storageKey }` on success, or an error payload.
 */
export async function POST(req: NextRequest) {
  if (!(await isApiAuthorised(req))) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }

    const purpose = parseMediaPurpose(formData.get("purpose"));
    const ownerKeyRaw = formData.get("ownerKey");
    const ownerKey =
      typeof ownerKeyRaw === "string" && ownerKeyRaw.trim()
        ? ownerKeyRaw.trim()
        : undefined;

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const result = await MediaDomain.upload({
      buffer,
      originalName: file.name || "upload",
      mimeType: file.type || "application/octet-stream",
      purpose,
      ownerKey,
    });

    return NextResponse.json({
      url: result.url,
      purpose: result.purpose,
      storageKey: result.storageKey,
    });
  } catch (err) {
    console.error("[API /api/upload POST]", err);
    return NextResponse.json(
      { error: MediaDomain.messageForError(err) },
      { status: MediaDomain.httpStatusForError(err) },
    );
  }
}
