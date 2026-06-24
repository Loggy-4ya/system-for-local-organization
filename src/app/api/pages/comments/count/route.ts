/**
 * @fileoverview Comment count badge for page comment launchers.
 *
 * @module src/app/api/pages/comments/count/route
 */

import { NextRequest, NextResponse } from "next/server";
import { CommentDomain, CommentDomainError } from "@shared/domains/CommentDomain";

/**
 * Return the top-level comment count for a page path.
 *
 * @param req - Query `path`.
 * @returns `{ count: number }`.
 */
export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get("path")?.trim();
  if (!path || !path.startsWith("/")) {
    return NextResponse.json({ error: "A valid `path` query param is required." }, { status: 400 });
  }

  try {
    await CommentDomain.assertCommentsAvailable(path);
    const count = await CommentDomain.countTopLevelComments(path);
    return NextResponse.json(
      { count },
      {
        headers: {
          "Cache-Control": "public, s-maxage=15, stale-while-revalidate=60",
        },
      },
    );
  } catch (err) {
    if (err instanceof CommentDomainError) {
      return NextResponse.json({ error: err.message }, { status: err.httpStatus });
    }
    console.error("[API /api/pages/comments/count GET]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
