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
 * Validate and normalize a path.
 *
 * @param rawPath - The raw path string.
 * @returns The normalized path string, or null if invalid.
 */
function validateAndNormalizePath(rawPath: string): string | null {
  const trimmed = rawPath.trim();
  if (!trimmed) return null;
  if (trimmed === "/") return "/";

  const parts = trimmed
    .toLowerCase()
    .split("/")
    .map((p) => p.trim().replace(/[^a-z0-9\-_]/g, "-"))
    .filter(Boolean);

  if (parts.length === 0) return null;
  return "/" + parts.join("/");
}

/**
 * Upsert or rename Puck page data for a given path.
 *
 * Expected JSON body:
 * ```json
 * {
 *   "previousPath": "/old-path", // optional
 *   "path":         "/news",
 *   "puckData":     { "content": [], "zones": {} },
 *   "title":        "News Hub",
 *   "published":    false
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
    previousPath?: string;
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

  const { previousPath, path, puckData, title, published } = body;

  if (!path || !puckData) {
    return NextResponse.json(
      { error: "`path` and `puckData` are required." },
      { status: 400 }
    );
  }

  const normalizedPath = validateAndNormalizePath(path);
  if (!normalizedPath) {
    return NextResponse.json({ error: "Invalid path format." }, { status: 400 });
  }

  const effectivePreviousPath = previousPath || normalizedPath;

  try {
    await connectDB();

    if (effectivePreviousPath !== normalizedPath) {
      // Check if the new path is already taken
      const existing = await Page.findOne({ path: normalizedPath }).lean();
      if (existing) {
        return NextResponse.json(
          { error: `The path "${normalizedPath}" is already taken.` },
          { status: 409 }
        );
      }

      // Perform rename (update existing document)
      const updated = await Page.findOneAndUpdate(
        { path: effectivePreviousPath },
        {
          $set: {
            path: normalizedPath,
            puckData,
            ...(title !== undefined && { title }),
            ...(published !== undefined && { published }),
          },
        },
        { new: true }
      );

      if (!updated) {
        return NextResponse.json(
          { error: `No page found at "${effectivePreviousPath}" to rename.` },
          { status: 404 }
        );
      }
    } else {
      // Normal upsert
      await Page.findOneAndUpdate(
        { path: normalizedPath },
        {
          $set: {
            puckData,
            ...(title !== undefined && { title }),
            ...(published !== undefined && { published }),
          },
        },
        { upsert: true, new: true }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[API /api/puck POST]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
