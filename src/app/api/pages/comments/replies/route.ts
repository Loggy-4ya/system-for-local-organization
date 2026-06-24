/**
 * @fileoverview Lazy-loaded reply thread for a page comment.
 *
 * @module src/app/api/pages/comments/replies/route
 */

import { NextRequest, NextResponse } from "next/server";
import { CommentDomain, CommentDomainError } from "@shared/domains/CommentDomain";
import { getOptionalSession } from "@/lib/authGuards";

/**
 * List replies for a top-level comment thread.
 *
 * @param req - Query `parentCommentId`.
 * @returns Ordered reply rows.
 */
export async function GET(req: NextRequest) {
  const parentCommentId = req.nextUrl.searchParams.get("parentCommentId")?.trim();
  if (!parentCommentId) {
    return NextResponse.json({ error: "A valid `parentCommentId` query param is required." }, { status: 400 });
  }

  const session = await getOptionalSession();

  try {
    const replies = await CommentDomain.listCommentReplies(
      parentCommentId,
      session?.user?.id ?? null,
    );
    return NextResponse.json({ replies });
  } catch (err) {
    if (err instanceof CommentDomainError) {
      return NextResponse.json({ error: err.message }, { status: err.httpStatus });
    }
    console.error("[API /api/pages/comments/replies GET]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
