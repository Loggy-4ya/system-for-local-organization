/**
 * @fileoverview Toggle page-author heart on a comment (YouTube-style creator love).
 *
 * @module src/app/api/pages/comments/author-heart/route
 */

import { NextRequest, NextResponse } from "next/server";
import { CommentDomain, CommentDomainError } from "@shared/domains/CommentDomain";
import { getOptionalSession } from "@/lib/authGuards";

/**
 * Toggle whether the page author has hearted a comment.
 *
 * @param req - JSON body `{ commentId }`.
 * @returns `{ authorHearted }` after toggle.
 */
export async function POST(req: NextRequest) {
  const session = await getOptionalSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in to heart comments." }, { status: 401 });
  }

  let body: { commentId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const commentId = body.commentId?.trim();
  if (!commentId) {
    return NextResponse.json({ error: "A valid `commentId` is required." }, { status: 400 });
  }

  try {
    const result = await CommentDomain.toggleAuthorHeart(commentId, session.user.id);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof CommentDomainError) {
      return NextResponse.json({ error: err.message }, { status: err.httpStatus });
    }
    console.error("[API /api/pages/comments/author-heart POST]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
