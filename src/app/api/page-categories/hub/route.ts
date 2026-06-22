/**
 * @fileoverview Public API for resolved news catalog hub payload.
 *
 * @module src/app/api/page-categories/hub/route
 */

import { NextResponse } from "next/server";
import { PageCategoriesDomain } from "@shared/domains/PageCategoriesDomain";

/**
 * GET /api/page-categories/hub — resolved sections with page cards for the catalog block.
 */
export async function GET() {
  try {
    const payload = await PageCategoriesDomain.resolveHubPayload();
    return NextResponse.json(payload);
  } catch (err) {
    console.error("[API /api/page-categories/hub GET]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
