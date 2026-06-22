/**
 * @fileoverview Public read-only effective general rules for client validation.
 *
 * Returns blocked-word terms and user-facing messages — safe for unauthenticated
 * signup/profile forms (no admin-only metadata).
 *
 * @module src/app/api/general-rules/effective/route
 */

import { NextResponse } from "next/server";
import { GeneralRulesDomain } from "@shared/domains/GeneralRulesDomain";

/**
 * GET /api/general-rules/effective — effective blocklist for live client checks.
 */
export async function GET() {
  try {
    await GeneralRulesDomain.ensureLoaded();
    const doc = await GeneralRulesDomain.loadOrSeed();
    const config = GeneralRulesDomain.toPublicConfig(doc);

    return NextResponse.json({
      blockedWords: config.blockedWords.map((entry) => entry.term),
      blockedWordMessage: config.blockedWordMessage,
    });
  } catch (err) {
    console.error("[API /api/general-rules/effective GET]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
