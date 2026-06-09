/**
 * @fileoverview Puck page data API route for Project Nexus.
 *
 * Provides two operations:
 *  - `GET /api/puck?path=<path>` — load the Puck layout data for a given page path.
 *  - `POST /api/puck`            — save (upsert) Puck layout data for a page path.
 *
 * Both endpoints connect to MongoDB via the shared `connectDB` helper and use
 * the `Page` Mongoose model. Saving is only permitted when the request
 * includes a valid NEXTAUTH_SECRET bearer token (Phase 2 will replace this with
 * full NextAuth session validation).
 *
 * @module src/app/api/puck/route
 */

import { NextRequest, NextResponse } from "next/server";
import connectDB from "@shared/lib/db";
import Page, { type PuckData } from "@shared/models/Page";

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Verify a basic bearer token guard.
 *
 * Dev bypass: when `NEXTAUTH_SECRET` is not configured, all saves are
 * permitted so the editor works out of the box without auth setup.
 * Phase 2 will replace this with a full NextAuth session check.
 *
 * @param req - Incoming Next.js request.
 * @returns `true` if the request is authorised.
 */
function isAuthorised(req: NextRequest): boolean {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return true;
  const auth = req.headers.get("Authorization") ?? "";
  return auth === `Bearer ${secret}`;
}

// ── GET ───────────────────────────────────────────────────────────────────────

/**
 * Load Puck page data for a given path.
 *
 * @param req - Next.js request containing `?path=` query parameter.
 * @returns JSON `{ puckData, title, published }` on success, or an error payload.
 */
export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get("path");

  if (!path) {
    return NextResponse.json(
      { error: "Query parameter `path` is required." },
      { status: 400 }
    );
  }

  try {
    await connectDB();
    const doc = await Page.findOne({ path }).lean();

    if (!doc) {
      return NextResponse.json(
        { error: `No page found for path "${path}".` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      puckData:  doc.puckData,
      title:     doc.title,
      published: doc.published,
    });
  } catch (err) {
    console.error("[API /api/puck GET]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

// ── POST ──────────────────────────────────────────────────────────────────────

/**
 * Upsert Puck page data for a given path.
 *
 * Expected JSON body:
 * ```json
 * {
 *   "path":      "/news",
 *   "puckData":  { "content": [], "zones": {} },
 *   "title":     "News Hub",
 *   "published": false
 * }
 * ```
 *
 * @param req - Next.js request with JSON body.
 * @returns `{ ok: true }` on success, or an error payload.
 */
export async function POST(req: NextRequest) {
  if (!isAuthorised(req)) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  }

  let body: {
    path: string;
    puckData: PuckData;
    title?: string;
    published?: boolean;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { path, puckData, title, published } = body;

  if (!path || !puckData) {
    return NextResponse.json(
      { error: "`path` and `puckData` are required." },
      { status: 400 }
    );
  }

  try {
    await connectDB();

    await Page.findOneAndUpdate(
      { path },
      {
        $set: {
          puckData,
          ...(title     !== undefined && { title }),
          ...(published !== undefined && { published }),
        },
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[API /api/puck POST]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
