/**
 * @fileoverview REST API for redacted public user profiles.
 *
 * GET /api/users/[userId] — member-to-member profile snapshot (id or login).
 *
 * @module src/app/api/users/[userId]/route
 */

import { NextRequest, NextResponse } from "next/server";
import { AuthDomain } from "@shared/domains/AuthDomain";
import { authGuardErrorStatus, requireAuthenticatedActor } from "@/lib/authGuards";

/**
 * GET /api/users/[userId] — redacted profile for authenticated members (id or login).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const { actor } = await requireAuthenticatedActor();
    const { userId } = await params;
    const profile = await AuthDomain.getPublicProfileForViewer(actor, userId);
    return NextResponse.json(profile);
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    const guardStatus = authGuardErrorStatus(err);
    if (guardStatus === 401 || guardStatus === 403) {
      return NextResponse.json({ error: message || "Forbidden." }, { status: guardStatus });
    }
    if (message === "USER_NOT_FOUND") {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }
    console.error("[API /api/users/[userId] GET]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
