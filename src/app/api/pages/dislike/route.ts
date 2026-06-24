/**
 * @fileoverview Toggle dislike state for a published Puck page.
 *
 * @module src/app/api/pages/dislike/route
 */

import { NextRequest, NextResponse } from "next/server";
import { PageDomain, PageDomainError } from "@shared/domains/PageDomain";
import { getOptionalSession } from "@/lib/authGuards";

/**
 * Toggle the authenticated user's dislike on a page.
 *
 * @param req - JSON body `{ path: string }`.
 * @returns Updated dislike state and count.
 */
export async function POST(req: NextRequest) {
  const session = await getOptionalSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in to dislike pages." }, { status: 401 });
  }

  let body: { path?: string };
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
    const result = await PageDomain.toggleDislike(path, session.user.id);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof PageDomainError) {
      return NextResponse.json({ error: err.message }, { status: err.httpStatus });
    }
    console.error("[API /api/pages/dislike POST]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
