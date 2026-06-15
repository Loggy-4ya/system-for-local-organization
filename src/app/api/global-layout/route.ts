/**
 * @fileoverview REST API for global layout (header and footer settings).
 *
 * @module src/app/api/global-layout/route
 */

import { NextRequest, NextResponse } from "next/server";
import { GlobalLayoutDomain } from "@shared/domains/GlobalLayoutDomain";
import { requireAdminRole } from "@/lib/authGuards";

/**
 * GET /api/global-layout — return public global layout configuration.
 *
 * @returns JSON `{ header, footer }`.
 */
export async function GET() {
  try {
    const doc = await GlobalLayoutDomain.loadOrSeed();
    const config = GlobalLayoutDomain.toPublicConfig(doc);
    return NextResponse.json(config);
  } catch (err) {
    console.error("[API /api/global-layout GET]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

/**
 * POST /api/global-layout — update global layout configuration (Admin only).
 *
 * Expected body: Partial<GlobalLayoutConfig>
 *
 * @param req - JSON request body.
 * @returns JSON `{ ok: true, config }`.
 */
export async function POST(req: NextRequest) {
  try {
    await requireAdminRole();
  } catch (err: any) {
    const status = err.message === "Forbidden." ? 403 : 401;
    return NextResponse.json({ error: err.message || "Unauthorized." }, { status });
  }

  try {
    const body = await req.json();
    const updated = await GlobalLayoutDomain.update(body);
    const config = GlobalLayoutDomain.toPublicConfig(updated);
    return NextResponse.json({ ok: true, config });
  } catch (err: any) {
    console.error("[API /api/global-layout POST]", err);
    return NextResponse.json({ error: err.message || "Internal server error." }, { status: 400 });
  }
}
