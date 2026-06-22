/**
 * @fileoverview Record a page view for public Puck pages.
 *
 * @module src/app/api/pages/view/route
 */

import { NextRequest, NextResponse } from "next/server";
import { PageDomain, PageDomainError } from "@shared/domains/PageDomain";
import {
  buildPageViewCookieName,
  PAGE_VIEW_DEDUPE_TTL_SECONDS,
} from "@shared/lib/pageViewDedupeLogic";

/**
 * Increment the view counter for a published page (anonymous allowed).
 *
 * @param req - JSON body `{ path: string }`.
 * @returns Updated view count.
 */
export async function POST(req: NextRequest) {
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
    const cookieName = buildPageViewCookieName(path);
    const existingCookie = req.cookies.get(cookieName)?.value;
    const result = await PageDomain.recordView(path, existingCookie);

    const response = NextResponse.json(result);
    if (result.counted) {
      response.cookies.set(cookieName, "1", {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: PAGE_VIEW_DEDUPE_TTL_SECONDS,
      });
    }
    return response;
  } catch (err) {
    if (err instanceof PageDomainError) {
      return NextResponse.json({ error: err.message }, { status: err.httpStatus });
    }
    console.error("[API /api/pages/view POST]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
