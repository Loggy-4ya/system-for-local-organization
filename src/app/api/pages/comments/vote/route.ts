/**
 * @fileoverview Toggle like/dislike on a page comment.
 *
 * @module src/app/api/pages/comments/vote/route
 */

import { NextRequest, NextResponse } from "next/server";
import { CommentDomain, CommentDomainError } from "@shared/domains/CommentDomain";
import type { CommentVotePolarity } from "@shared/models/CommentVote";
import { getOptionalSession } from "@/lib/authGuards";

/**
 * Set or toggle the authenticated user's vote on a comment.
 *
 * @param req - JSON body `{ commentId, vote: "like" | "dislike" }`.
 * @returns Updated counts and active vote.
 */
export async function POST(req: NextRequest) {
  const session = await getOptionalSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in to react to comments." }, { status: 401 });
  }

  let body: { commentId?: string; vote?: CommentVotePolarity };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const commentId = body.commentId?.trim();
  if (!commentId) {
    return NextResponse.json({ error: "A valid `commentId` is required." }, { status: 400 });
  }

  if (body.vote !== "like" && body.vote !== "dislike") {
    return NextResponse.json({ error: "`vote` must be `like` or `dislike`." }, { status: 400 });
  }

  try {
    const result = await CommentDomain.setCommentVote(commentId, session.user.id, body.vote);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof CommentDomainError) {
      return NextResponse.json({ error: err.message }, { status: err.httpStatus });
    }
    console.error("[API /api/pages/comments/vote POST]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
