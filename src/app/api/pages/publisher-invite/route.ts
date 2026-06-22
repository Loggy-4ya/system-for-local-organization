/**
 * @fileoverview Create or rotate a publisher invite link for a Puck page.
 *
 * POST `/api/pages/publisher-invite` — returns a one-time plain token and public URL.
 *
 * @module src/app/api/pages/publisher-invite/route
 */

import { NextRequest, NextResponse } from "next/server";
import { PageDomain, PageDomainError } from "@shared/domains/PageDomain";
import { buildPagePublisherInviteUrl } from "@shared/lib/pagePublisherInviteLogic";
import { getOptionalSession } from "@/lib/authGuards";
import { resolvePublicOrigin } from "@/lib/publicOrigin";

/**
 * Create a publisher invite link for a persisted page.
 *
 * @param req - JSON body `{ pagePath: string }`.
 * @returns `{ url, expiresAt, pagePath }` on success.
 */
export async function POST(req: NextRequest) {
  const session = await getOptionalSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  }

  let body: { pagePath?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const pagePath = body.pagePath?.trim();
  if (!pagePath) {
    return NextResponse.json({ error: "`pagePath` is required." }, { status: 400 });
  }

  try {
    const { token, expiresAt, pagePath: normalizedPath } =
      await PageDomain.createPublisherInviteLink(pagePath, session.user.id);
    const origin = resolvePublicOrigin(req);
    const url = buildPagePublisherInviteUrl(origin, token);

    return NextResponse.json({
      url,
      expiresAt: expiresAt.toISOString(),
      pagePath: normalizedPath,
    });
  } catch (err) {
    if (err instanceof PageDomainError) {
      return NextResponse.json({ error: err.message }, { status: err.httpStatus });
    }
    console.error("[publisher-invite] Failed to create invite:", err);
    return NextResponse.json({ error: "Failed to create invite link." }, { status: 500 });
  }
}
