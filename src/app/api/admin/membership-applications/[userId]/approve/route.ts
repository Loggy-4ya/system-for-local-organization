/**
 * @fileoverview Approve a pending self-government membership application.
 *
 * @module src/app/api/admin/membership-applications/[userId]/approve/route
 */

import { NextResponse } from "next/server";
import { MembershipApplicationDomain } from "@shared/domains/MembershipApplicationDomain";
import { AuthDomain } from "@shared/domains/AuthDomain";
import { authGuardErrorStatus, requireSociumRoleAssigner } from "@/lib/authGuards";

/**
 * POST /api/admin/membership-applications/[userId]/approve
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const { userId } = await params;
    const session = await requireSociumRoleAssigner();
    const actor = await AuthDomain.getUserById(session.user!.id!);
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const application = await MembershipApplicationDomain.approveApplication(actor, userId);
    return NextResponse.json({ application });
  } catch (err) {
    return mapMembershipReviewError(err);
  }
}

/**
 * @param err - Thrown domain or guard error.
 * @returns JSON error response.
 */
function mapMembershipReviewError(err: unknown): NextResponse {
  const message = err instanceof Error ? err.message : "";
  const status = authGuardErrorStatus(err);

  if (status === 401 || status === 403 || message === "FORBIDDEN") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  if (message === "USER_NOT_FOUND") {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }
  if (message === "NOT_PENDING") {
    return NextResponse.json({ error: "No pending application for this user." }, { status: 409 });
  }
  if (message === "PROFILE_INCOMPLETE") {
    return NextResponse.json(
      { error: "Applicant profile is incomplete — cannot approve yet." },
      { status: 400 },
    );
  }
  if (message === "SELF_MODIFICATION_FORBIDDEN") {
    return NextResponse.json({ error: "You cannot review your own application." }, { status: 400 });
  }

  console.error("[API /api/admin/membership-applications/approve]", err);
  return NextResponse.json({ error: "Internal server error." }, { status: 500 });
}
