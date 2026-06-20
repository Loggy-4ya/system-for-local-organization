/**
 * @fileoverview Remote image import API — downloads an HTTPS image and stores it locally.
 *
 * Delegates SSRF-safe fetch and persistence to {@link MediaDomain.uploadFromUrl}.
 *
 * @module src/app/api/upload/from-url/route
 */

import { NextRequest, NextResponse } from "next/server";
import { MediaDomain } from "@shared/domains/MediaDomain";
import { parseMediaPurpose } from "@shared/lib/mediaStorage/mediaStorageRules";
import { isApiAuthorised } from "@/lib/authGuards";

/** JSON body for remote image import. */
interface ImportFromUrlBody {
  url?: string;
  purpose?: string;
  ownerKey?: string;
}

/**
 * Download a remote HTTPS image and store it under `public/uploads/`.
 *
 * JSON fields:
 * - `url` (required) — public HTTPS image URL
 * - `purpose` (optional) — upload category (defaults to `puck-block`)
 * - `ownerKey` (optional) — namespace hint for future lifecycle hooks
 *
 * @param req - Next.js request with JSON body.
 * @returns JSON `{ url, purpose, storageKey }` on success, or an error payload.
 */
export async function POST(req: NextRequest) {
  if (!(await isApiAuthorised(req))) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  }

  try {
    const body = (await req.json()) as ImportFromUrlBody;
    const url = typeof body.url === "string" ? body.url.trim() : "";

    if (!url) {
      return NextResponse.json({ error: "Image URL is required." }, { status: 400 });
    }

    const purpose = parseMediaPurpose(body.purpose);
    const ownerKey =
      typeof body.ownerKey === "string" && body.ownerKey.trim()
        ? body.ownerKey.trim()
        : undefined;

    const result = await MediaDomain.uploadFromUrl({
      url,
      purpose,
      ownerKey,
    });

    return NextResponse.json({
      url: result.url,
      purpose: result.purpose,
      storageKey: result.storageKey,
    });
  } catch (err) {
    console.error("[API /api/upload/from-url POST]", err);
    return NextResponse.json(
      { error: MediaDomain.messageForError(err) },
      { status: MediaDomain.httpStatusForError(err) },
    );
  }
}
