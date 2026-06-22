/**
 * @fileoverview Self-government membership application status API.
 *
 * @module src/app/api/membership-application/route
 */

import { NextResponse } from "next/server";
import { MembershipApplicationDomain } from "@shared/domains/MembershipApplicationDomain";
import { authGuardErrorStatus, requireAuthenticatedActor } from "@/lib/authGuards";

/**
 * GET /api/membership-application — current user's application status.
 */
export async function GET() {
  try {
    const { actor } = await requireAuthenticatedActor();
    const status = MembershipApplicationDomain.getStatusForUser(actor);
    return NextResponse.json(status);
  } catch (err) {
    const status = authGuardErrorStatus(err);
    if (status === 401) {
      return NextResponse.json({ error: "Unauthorized." }, { status });
    }
    console.error("[API /api/membership-application GET]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

/**
 * POST /api/membership-application — submit application when profile is complete.
 */
export async function POST() {
  try {
    const { actor } = await requireAuthenticatedActor();
    const status = await MembershipApplicationDomain.submitApplication(actor);
    return NextResponse.json(status);
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    const status = authGuardErrorStatus(err);
    if (status === 401) {
      return NextResponse.json({ error: "Unauthorized." }, { status });
    }
    if (message === "ALREADY_MEMBER") {
      return NextResponse.json({ error: "You are already a self-government member." }, { status: 409 });
    }
    if (message === "PROFILE_INCOMPLETE") {
      return NextResponse.json(
        { error: "Complete all required profile fields before applying." },
        { status: 400 },
      );
    }
    console.error("[API /api/membership-application POST]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

/**
 * DELETE /api/membership-application — withdraw an active application.
 */
export async function DELETE() {
  try {
    const { actor } = await requireAuthenticatedActor();
    const status = await MembershipApplicationDomain.withdrawApplication(actor);
    return NextResponse.json(status);
  } catch (err) {
    const status = authGuardErrorStatus(err);
    if (status === 401) {
      return NextResponse.json({ error: "Unauthorized." }, { status });
    }
    console.error("[API /api/membership-application DELETE]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
