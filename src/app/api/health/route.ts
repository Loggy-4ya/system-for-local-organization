/**
 * @fileoverview Minimal unauthenticated liveness endpoint for deployment checks.
 *
 * The endpoint intentionally performs no database query so a transient Atlas
 * outage cannot cause Docker to restart an otherwise healthy application
 * process. Hosting configuration and required production storage are validated
 * during server bootstrap.
 *
 * @module src/app/api/health/route
 */

import { NextResponse } from "next/server";

/** Ensure every request observes the currently running process. */
export const dynamic = "force-dynamic";

/**
 * Report that the Next.js process can accept HTTP requests.
 *
 * @returns Non-cacheable liveness response.
 */
export function GET(): NextResponse {
  return NextResponse.json(
    { status: "ok" },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
