/**
 * @fileoverview Distinct Puck page category labels for editor autocomplete.
 *
 * `GET /api/pages/categories?q=` returns sorted unique category tags derived from
 * all Page documents in MongoDB (Obsidian-style emergent catalog).
 *
 * @module src/app/api/pages/categories/route
 */

import { NextRequest, NextResponse } from "next/server";
import { PageDomain } from "@shared/domains/PageDomain";
import { isApiAuthorised } from "@/lib/authGuards";

/**
 * List distinct page category labels, optionally filtered by search query.
 *
 * @param req - Next.js request with optional `q` query parameter.
 * @returns JSON `{ categories: string[] }`.
 */
export async function GET(req: NextRequest) {
  if (!(await isApiAuthorised(req))) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  }

  const query = req.nextUrl.searchParams.get("q") ?? "";

  try {
    const categories = await PageDomain.listDistinctCategories(query);
    return NextResponse.json({ categories });
  } catch (err) {
    console.error("[API /api/pages/categories GET]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
