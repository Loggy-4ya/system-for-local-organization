/**
 * @fileoverview Authenticated viewer bootstrap API.
 *
 * GET /api/me — returns the signed-in user's basic profile for site chrome
 * (header avatar/name, admin nav visibility) on page entry.
 *
 * @module src/app/api/me/route
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { AuthDomain } from "@shared/domains/AuthDomain";
import { toBasicSiteProfile } from "@shared/lib/siteProfileBasic";

/**
 * Return the authenticated viewer's basic profile snapshot.
 *
 * @returns `{ user: BasicSiteProfile }` or 401 when unauthenticated.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const user = await AuthDomain.getUserById(session.user.id);
  if (!user) {
    return NextResponse.json({ error: "Session expired." }, { status: 401 });
  }

  return NextResponse.json({
    user: toBasicSiteProfile(AuthDomain.toPublicUser(user)),
  });
}
