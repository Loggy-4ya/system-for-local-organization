/**
 * @fileoverview Admin/cron API to process pending due scheduled events from MongoDB.
 *
 * Supports both GET and POST requests. Compatible with Vercel Cron.
 *
 * @module src/app/api/admin/jobs/process-scheduled-events/route
 */

import { NextRequest, NextResponse } from "next/server";
import connectDB from "@shared/lib/db";
import { SchedulerDomain } from "@shared/domains/SchedulerDomain";
import { isCronJobAuthorised } from "@/lib/cronJobAuth";

/** Optional JSON body for process-scheduled-events triggers. */
interface ProcessEventsJobBody {
  limit?: number;
  dryRun?: boolean;
  eventTypes?: string[];
}

/**
 * Execute the scheduled events processing tick.
 *
 * Auth: Admin session, or bearer token matching CRON_SECRET or NEXUS_CRON_SECRET.
 *
 * Query parameters (optional):
 *  - `?limit=50`
 *  - `?dryRun=true`
 *  - `?eventTypes=publish_page,broadcast_send`
 *
 * JSON body (POST only, optional):
 * ```json
 * {
 *   "limit": 50,
 *   "dryRun": false,
 *   "eventTypes": ["publish_page"]
 * }
 * ```
 *
 * @param req - Incoming request.
 * @returns Processing results JSON.
 */
async function runProcessScheduledEventsJob(req: NextRequest): Promise<NextResponse> {
  if (!(await isCronJobAuthorised(req))) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  }

  const queryLimit = req.nextUrl.searchParams.get("limit");
  let limit = queryLimit ? Number.parseInt(queryLimit, 10) : undefined;
  if (limit !== undefined && (!Number.isInteger(limit) || limit <= 0)) {
    limit = undefined;
  }

  const queryDryRun = req.nextUrl.searchParams.get("dryRun");
  let dryRun = queryDryRun === "1" || queryDryRun === "true";

  const queryEventTypes = req.nextUrl.searchParams.get("eventTypes");
  let eventTypes = queryEventTypes
    ? queryEventTypes.split(",").map((s) => s.trim()).filter(Boolean)
    : undefined;

  if (req.method === "POST") {
    const contentType = req.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      try {
        const body = (await req.json()) as ProcessEventsJobBody;
        if (body?.dryRun === true) {
          dryRun = true;
        }
        if (typeof body?.limit === "number" && body.limit > 0) {
          limit = body.limit;
        }
        if (Array.isArray(body?.eventTypes)) {
          eventTypes = body.eventTypes.map((s) => String(s).trim()).filter(Boolean);
        }
      } catch {
        return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
      }
    }
  }

  try {
    await connectDB();
    const summary = await SchedulerDomain.processDueEvents({
      limit,
      dryRun,
      eventTypes,
    });
    return NextResponse.json(summary);
  } catch (err: any) {
    console.error("[API /api/admin/jobs/process-scheduled-events]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error." },
      { status: 500 },
    );
  }
}

/**
 * Trigger scheduled events processing via GET.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  return runProcessScheduledEventsJob(req);
}

/**
 * Trigger scheduled events processing via POST.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  return runProcessScheduledEventsJob(req);
}
