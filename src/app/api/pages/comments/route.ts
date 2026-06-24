/**
 * @fileoverview List and create comments on published Puck pages.
 *
 * @module src/app/api/pages/comments/route
 */

import { NextRequest, NextResponse } from "next/server";
import { CommentDomain, CommentDomainError } from "@shared/domains/CommentDomain";
import { getOptionalSession } from "@/lib/authGuards";

/**
 * List top-level comments (with replies) for a page.
 *
 * @param req - Query `path`, optional `page`, `limit`.
 * @returns Paginated comment tree.
 */
export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get("path")?.trim();
  if (!path || !path.startsWith("/")) {
    return NextResponse.json({ error: "A valid `path` query param is required." }, { status: 400 });
  }

  const page = Number(req.nextUrl.searchParams.get("page") ?? "1");
  const limit = Number(req.nextUrl.searchParams.get("limit") ?? "10");
  const includeReplies = req.nextUrl.searchParams.get("includeReplies") === "true";

  const session = await getOptionalSession();

  try {
    const result = await CommentDomain.listPageComments(
      path,
      session?.user?.id ?? null,
      Number.isFinite(page) ? page : 1,
      Number.isFinite(limit) ? limit : 10,
      { includeReplies },
    );
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof CommentDomainError) {
      return NextResponse.json({ error: err.message }, { status: err.httpStatus });
    }
    console.error("[API /api/pages/comments GET]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

/**
 * Post a new comment or reply on a page.
 *
 * @param req - JSON body `{ path, body, parentCommentId? }`.
 * @returns Created comment row.
 */
export async function POST(req: NextRequest) {
  const session = await getOptionalSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in to comment." }, { status: 401 });
  }

  let body: { path?: string; body?: string; parentCommentId?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const path = body.path?.trim();
  if (!path || !path.startsWith("/")) {
    return NextResponse.json({ error: "A valid `path` is required." }, { status: 400 });
  }

  try {
    const comment = await CommentDomain.createPageComment(
      path,
      session.user.id,
      body.body ?? "",
      body.parentCommentId,
    );
    return NextResponse.json({ comment });
  } catch (err) {
    if (err instanceof CommentDomainError) {
      return NextResponse.json({ error: err.message }, { status: err.httpStatus });
    }
    console.error("[API /api/pages/comments POST]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
