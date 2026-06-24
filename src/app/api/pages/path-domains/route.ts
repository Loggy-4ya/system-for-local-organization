/**
 * @fileoverview API route for page path domain picker labels.
 *
 * - `POST /api/pages/path-domains` — add a custom domain segment.
 * - `DELETE /api/pages/path-domains?domain=news` — hide a domain from the picker.
 *
 * @module src/app/api/pages/path-domains/route
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { AuthDomain } from "@shared/domains/AuthDomain";
import { PageCategoriesDomain } from "@shared/domains/PageCategoriesDomain";
import { PageDomain, PageDomainError } from "@shared/domains/PageDomain";
import { normalizePageDomainSegment } from "@shared/lib/pagePathLogic";

/**
 * Add a custom domain segment to the page editor picker.
 *
 * @param req - Next.js request with JSON body `{ domain: string }`.
 * @returns Updated visible domain list.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  }

  let body: { domain?: string } = {};
  try {
    body = (await req.json()) as { domain?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const domain = body.domain?.trim() ?? "";
  if (!domain) {
    return NextResponse.json({ error: "Enter a domain label." }, { status: 400 });
  }

  try {
    const domains = await PageDomain.addPagePathDomain(domain, session.user.id);
    return NextResponse.json({ domains });
  } catch (err) {
    if (err instanceof PageDomainError) {
      return NextResponse.json({ error: err.message }, { status: err.httpStatus });
    }
    console.error("[API /api/pages/path-domains POST]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

/**
 * Hide a domain segment from the page editor domain picker.
 *
 * @param req - Next.js request with required `domain` query param.
 * @returns Updated visible domain list.
 */
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  }

  const domain = req.nextUrl.searchParams.get("domain")?.trim() ?? "";
  const normalized = normalizePageDomainSegment(domain);
  if (!normalized) {
    return NextResponse.json({ error: "Enter a valid domain label." }, { status: 400 });
  }

  try {
    const scope = req.nextUrl.searchParams.get("scope")?.trim() ?? "";

    if (scope === "catalog") {
      const user = await AuthDomain.getUserById(session.user.id);
      if (!user || user.role !== "Admin") {
        return NextResponse.json(
          { error: "Only administrators may remove catalog domains." },
          { status: 403 },
        );
      }

      const result = await PageCategoriesDomain.removeCatalogDomain(normalized, session.user.id);
      return NextResponse.json({
        domains: result.domains,
        movedCount: result.movedCount,
        config: result.config,
      });
    }

    const pageCount = await PageDomain.countPagesUnderDomain(normalized);
    const domains = await PageDomain.hidePagePathDomain(normalized, session.user.id);
    return NextResponse.json({ domains, pageCount });
  } catch (err) {
    if (err instanceof PageDomainError) {
      return NextResponse.json({ error: err.message }, { status: err.httpStatus });
    }
    console.error("[API /api/pages/path-domains DELETE]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
