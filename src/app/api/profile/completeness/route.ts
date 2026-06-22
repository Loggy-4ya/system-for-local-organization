/**
 * @fileoverview Profile membership readiness API.
 *
 * GET /api/profile/completeness — returns gaps before self-government application.
 *
 * @module src/app/api/profile/completeness/route
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { AuthDomain } from "@shared/domains/AuthDomain";
import { buildProfileCompletenessSummary } from "@shared/lib/userProfileCompleteness";

/**
 * Return profile completeness summary for the authenticated user.
 *
 * @returns JSON summary with missing fields for membership application.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const user = await AuthDomain.getUserById(session.user.id);
  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const summary = buildProfileCompletenessSummary({
    name: user.name,
    surname: user.surname,
    phone: user.phone,
    specialty: user.specialty,
    group: user.group,
    avatar: user.avatar,
    sociumRoles: user.sociumRoles ?? [],
    selfGovernmentApplicationIntent: user.selfGovernmentApplicationIntent,
    telegramId: user.telegramId,
  });

  return NextResponse.json({ completeness: summary });
}
