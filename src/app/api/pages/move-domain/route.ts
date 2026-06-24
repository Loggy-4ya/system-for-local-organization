/**
 * @fileoverview API route — move a page to another path domain (rename URL prefix).
 *
 * @module src/app/api/pages/move-domain/route
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { AuthDomain } from "@shared/domains/AuthDomain";
import { AccessControlDomain } from "@shared/domains/AccessControlDomain";
import { PageDomain, PageDomainError } from "@shared/domains/PageDomain";
import { canUserCreatePages } from "@shared/lib/pageEditAccessLogic";
import { inferAccessLevelIndex } from "@shared/lib/accessControlLogic";
import { computePagePathForDomainMove } from "@shared/lib/pageManagerCatalogLogic";
import { normalizePagePath } from "@shared/lib/pagePathLogic";
import { PageCategoriesDomain } from "@shared/domains/PageCategoriesDomain";
import { z } from "zod";

const moveDomainSchema = z.object({
  pagePath: z.string().min(1),
  targetDomain: z.string().min(1),
});

/**
 * POST `/api/pages/move-domain` — rename a page into another path domain.
 *
 * @param request - JSON body with `pagePath` and `targetDomain`.
 * @returns Updated path or error payload.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const user = await AuthDomain.getUserById(session.user.id);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const permissions = await AccessControlDomain.resolvePermissionsForUser(user);
  const actor = {
    userId: String(user._id),
    role: user.role,
    accessLevelIndex: inferAccessLevelIndex({
      role: user.role,
      accessLevelIndex: user.accessLevelIndex,
    }),
    permissions,
  };

  if (!canUserCreatePages(actor) && user.role !== "Admin" && user.role !== "StudentCouncil") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = moveDomainSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const pagePath = normalizePagePath(parsed.data.pagePath);
  const availableDomains = await PageDomain.listPagePathDomains();
  const newPath = computePagePathForDomainMove(
    pagePath,
    parsed.data.targetDomain,
    availableDomains,
  );

  if (!newPath) {
    return NextResponse.json({ error: "Unable to compute destination path." }, { status: 400 });
  }

  try {
    const renamedPath = await PageDomain.renamePagePath({ fromPath: pagePath, toPath: newPath });

    const doc = await PageCategoriesDomain.loadOrSeed();
    const config = PageCategoriesDomain.toPublicConfig(doc);
    const nextSections = config.sections.map((section) => ({
      ...section,
      pagePaths: section.pagePaths.map((entry) =>
        normalizePagePath(entry) === pagePath ? renamedPath : entry,
      ),
    }));

    await PageCategoriesDomain.update({ sections: nextSections });

    return NextResponse.json({ ok: true, path: renamedPath, config: { sections: nextSections } });
  } catch (err) {
    if (err instanceof PageDomainError) {
      return NextResponse.json({ error: err.message }, { status: err.httpStatus });
    }
    console.error("[pages/move-domain]", err);
    return NextResponse.json({ error: "Failed to move page." }, { status: 500 });
  }
}
