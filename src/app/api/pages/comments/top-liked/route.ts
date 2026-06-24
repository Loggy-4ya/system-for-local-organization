/**
 * @fileoverview API route — top liked comments for preview strip.
 *
 * @module src/app/api/pages/comments/top-liked/route
 */

import { NextRequest, NextResponse } from "next/server";
import { CommentDomain, CommentDomainError } from "@shared/domains/CommentDomain";
import { getOptionalSession } from "@/lib/authGuards";

/**
 * List top-level comments sorted by like count for the preview carousel.
 *
 * @param req - Query `path`, optional `limit` (1–10).
 * @returns `{ comments: PageCommentDto[] }`.
 */
export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get("path")?.trim();
  if (!path || !path.startsWith("/")) {
    return NextResponse.json({ error: "A valid `path` query param is required." }, { status: 400 });
  }

  const limit = Number(req.nextUrl.searchParams.get("limit") ?? "5");
  const session = await getOptionalSession();

  try {
    const comments = await CommentDomain.listTopLikedComments(
      path,
      session?.user?.id ?? null,
      Number.isFinite(limit) ? limit : 5,
    );
    return NextResponse.json({ comments });
  } catch (err) {
    if (err instanceof CommentDomainError) {
      return NextResponse.json({ error: err.message }, { status: err.httpStatus });
    }
    console.error("[API /api/pages/comments/top-liked GET]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
