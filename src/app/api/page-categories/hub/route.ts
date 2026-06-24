/**
 * @fileoverview Public API for resolved news catalog hub payload.
 *
 * @module src/app/api/page-categories/hub/route
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { AuthDomain } from "@shared/domains/AuthDomain";
import { PageCategoriesDomain } from "@shared/domains/PageCategoriesDomain";
import { inferAccessLevelIndex } from "@shared/lib/accessControlLogic";

/**
 * GET /api/page-categories/hub — resolved sections with page cards for the catalog block.
 */
export async function GET() {
  try {
    const session = await auth();
    let viewerAccessLevelIndex: ReturnType<typeof inferAccessLevelIndex> | null = null;

    if (session?.user?.id) {
      const user = await AuthDomain.getUserById(session.user.id);
      if (user) {
        viewerAccessLevelIndex = inferAccessLevelIndex({
          role: user.role,
          accessLevelIndex: user.accessLevelIndex,
        });
      }
    }

    const payload = await PageCategoriesDomain.resolveHubPayload({ viewerAccessLevelIndex });
    return NextResponse.json(payload);
  } catch (err) {
    console.error("[API /api/page-categories/hub GET]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
