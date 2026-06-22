/**
 * @fileoverview REST API for page categories hub settings (Page Manager).
 *
 * @module src/app/api/page-categories/settings/route
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { PageCategoriesDomain } from "@shared/domains/PageCategoriesDomain";
import { AuthDomain } from "@shared/domains/AuthDomain";
import { AccessControlDomain } from "@shared/domains/AccessControlDomain";
import { canUserCreatePages } from "@shared/lib/pageEditAccessLogic";
import { inferAccessLevelIndex } from "@shared/lib/accessControlLogic";

/**
 * Ensure the caller may manage news catalog hub settings.
 *
 * @returns User id or error response.
 */
async function requireHubEditor() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Unauthorised." }, { status: 401 }) };
  }

  const user = await AuthDomain.getUserById(session.user.id);
  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorised." }, { status: 401 }) };
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
    return { error: NextResponse.json({ error: "Forbidden." }, { status: 403 }) };
  }

  return { userId: String(user._id) };
}

/**
 * GET /api/page-categories/settings — load hub config and available path domains.
 */
export async function GET() {
  const gate = await requireHubEditor();
  if ("error" in gate) return gate.error;

  try {
    const [doc, availableDomains] = await Promise.all([
      PageCategoriesDomain.loadOrSeed(),
      PageCategoriesDomain.listHubDomainCatalog(),
    ]);

    return NextResponse.json({
      config: PageCategoriesDomain.toPublicConfig(doc),
      availableDomains,
    });
  } catch (err) {
    console.error("[API /api/page-categories/settings GET]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

/**
 * POST /api/page-categories/settings — persist hub section updates.
 *
 * @param req - JSON body with `sections`.
 */
export async function POST(req: NextRequest) {
  const gate = await requireHubEditor();
  if ("error" in gate) return gate.error;

  try {
    const body = await req.json();
    const doc = await PageCategoriesDomain.update({
      sections: Array.isArray(body?.sections) ? body.sections : [],
    });
    const availableDomains = await PageCategoriesDomain.listHubDomainCatalog();

    return NextResponse.json({
      ok: true,
      config: PageCategoriesDomain.toPublicConfig(doc),
      availableDomains,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error.";
    console.error("[API /api/page-categories/settings POST]", err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
