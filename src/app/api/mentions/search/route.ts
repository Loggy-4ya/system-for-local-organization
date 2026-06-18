/**
 * @fileoverview REST API for `@` mention autocomplete (users + published pages).
 *
 * GET /api/mentions/search?q=...
 *
 * @module src/app/api/mentions/search/route
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { MentionDomain } from "@shared/domains/MentionDomain";

/**
 * Search mention targets for the Nexus rich text editor.
 *
 * Requires an authenticated session — mentions are an internal collaboration feature.
 *
 * @param req - Query string `q` (optional).
 * @returns Grouped users and pages.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const query = req.nextUrl.searchParams.get("q") ?? "";
  const limitRaw = req.nextUrl.searchParams.get("limit");
  const limit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;

  try {
    const result = await MentionDomain.search(
      query,
      Number.isFinite(limit) ? limit : undefined,
    );
    return NextResponse.json(result);
  } catch (error) {
    console.error("[mentions/search]", error);
    return NextResponse.json({ error: "Search failed." }, { status: 500 });
  }
}
