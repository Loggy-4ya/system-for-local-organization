/**
 * @fileoverview API route listing Puck page paths and link catalog entries.
 *
 * @module src/app/api/pages/paths/route
 */

import { NextRequest, NextResponse } from "next/server";
import { PageDomain } from "@shared/domains/PageDomain";

/**
 * Return page paths for slug validation and optional link catalog rows.
 *
 * Query `catalog=1` returns `{ catalog: PagePathCatalogEntry[] }`.
 * Default response remains `{ paths: string[] }` for legacy slug validation.
 *
 * @param req - Next.js request with optional `q` and `catalog` query params.
 * @returns JSON paths or catalog payload.
 */
export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q") ?? "";
  const catalogMode = req.nextUrl.searchParams.get("catalog") === "1";
  const domainsMode = req.nextUrl.searchParams.get("domains") === "1";

  try {
    if (domainsMode) {
      const includeRaw = req.nextUrl.searchParams.get("include")?.trim() ?? "";
      const alwaysInclude = includeRaw
        ? includeRaw.split(",").map((entry) => entry.trim()).filter(Boolean)
        : [];
      const domains = await PageDomain.listPagePathDomains({ alwaysInclude });
      return NextResponse.json({ domains });
    }

    if (catalogMode) {
      const catalog = await PageDomain.listPagePathCatalog(query);
      return NextResponse.json({ catalog });
    }

    const paths = await PageDomain.listReservedPagePaths();
    return NextResponse.json({ paths });
  } catch (err) {
    console.error("[API /api/pages/paths GET]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
