/**
 * @fileoverview Admin/cron API to scan `public/uploads/` against MongoDB references.
 *
 * Supports both GET and POST requests. Compatible with Vercel Cron (which triggers GET requests).
 *
 * @module src/app/api/admin/jobs/media-orphan-cleanup/route
 */

import { NextRequest, NextResponse } from "next/server";
import connectDB from "@shared/lib/db";
import { MediaDomain } from "@shared/domains/MediaDomain";
import { isMediaOrphanCleanupAuthorised } from "@/lib/mediaOrphanCleanupAuth";

/** Optional JSON body for cleanup job triggers. */
interface CleanupJobBody {
  dryRun?: boolean;
}

/**
 * Execute the media orphan cleanup workflow.
 *
 * Auth: Admin session, unified CRON_SECRET/NEXUS_CRON_SECRET, or legacy bearer token.
 *
 * Query parameter (optional): `?dryRun=true` or `?dryRun=1` to preview without deleting.
 * JSON body (POST only, optional): `{ "dryRun": true }`.
 *
 * @param req - Incoming request.
 * @returns Summary JSON.
 */
async function runMediaOrphanCleanupJob(req: NextRequest): Promise<NextResponse> {
  if (!(await isMediaOrphanCleanupAuthorised(req))) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  }

  const queryDryRun = req.nextUrl.searchParams.get("dryRun");
  let dryRun = queryDryRun === "1" || queryDryRun === "true";

  if (req.method === "POST") {
    const contentType = req.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      try {
        const body = (await req.json()) as CleanupJobBody;
        if (body?.dryRun === true) {
          dryRun = true;
        }
      } catch {
        return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
      }
    }
  }

  try {
    await connectDB();
    const summary = await MediaDomain.cleanupOrphanUploads({ dryRun });
    return NextResponse.json(summary);
  } catch (err) {
    console.error("[API /api/admin/jobs/media-orphan-cleanup]", err);
    return NextResponse.json(
      { error: MediaDomain.messageForError(err) },
      { status: MediaDomain.httpStatusForError(err) },
    );
  }
}

/**
 * Scan uploads and delete orphaned files (triggered via GET).
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  return runMediaOrphanCleanupJob(req);
}

/**
 * Scan uploads and delete orphaned files (triggered via POST).
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  return runMediaOrphanCleanupJob(req);
}
