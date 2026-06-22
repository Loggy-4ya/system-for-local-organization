/**
 * @fileoverview API route for delegated page editor candidate search.
 *
 * `GET /api/pages/editor-candidates?q=&pagePath=` returns users matching the query
 * when the caller may manage page access on the target page.
 *
 * The Puck sidebar picker prefers `/api/mentions/search` client-side; this route
 * remains for programmatic callers that need the page-access permission gate.
 *
 * @module src/app/api/pages/editor-candidates/route
 */

import { NextRequest, NextResponse } from "next/server";
import connectDB from "@shared/lib/db";
import Page from "@shared/models/Page";
import { auth } from "@/auth";
import { MentionDomain } from "@shared/domains/MentionDomain";
import { PageDomain } from "@shared/domains/PageDomain";
import { AccessControlDomain } from "@shared/domains/AccessControlDomain";
import { AuthDomain } from "@shared/domains/AuthDomain";
import { canManagePageAccess } from "@shared/lib/pageAccessLogic";
import type { PageAccessEditorCandidate } from "@shared/lib/pageAccessLogic";

/**
 * Search users for the page access picker.
 *
 * @param req - Next.js request with optional `q` and `pagePath` query params.
 * @returns JSON `{ users: PageAccessEditorCandidate[] }`.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  }

  const query = req.nextUrl.searchParams.get("q") ?? "";
  const pagePath = req.nextUrl.searchParams.get("pagePath")?.trim() ?? "";

  try {
    await connectDB();
    const user = await AuthDomain.getUserById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
    }

    const permissions = await AccessControlDomain.resolvePermissionsForUser(user);
    const actor = PageDomain.buildEditActor(user, permissions);
    const doc = pagePath ? await Page.findOne({ path: pagePath }).lean() : null;
    const ownership = doc ? PageDomain.toOwnershipSlice(doc) : null;

    if (!canManagePageAccess(actor, ownership)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const result = await MentionDomain.search(query, 12);
    const users: PageAccessEditorCandidate[] = result.users.map((row) => ({
      userId: row.id,
      displayName: row.label,
      subtitle: row.subtitle ?? null,
      avatar: row.avatar ?? null,
    }));

    return NextResponse.json({ users });
  } catch (err) {
    console.error("[API /api/pages/editor-candidates GET]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
