/**
 * @fileoverview Puck page data API route for Project Nexus.
 *
 * Provides two operations:
 *  - `GET /api/puck?path=<path>`    — load the Puck layout data for a given page path.
 *  - `POST /api/puck`               — save (upsert) Puck layout data for a page path.
 *  - `DELETE /api/puck?path=<path>` — remove a Puck-managed page from MongoDB.
 *
 * Both endpoints connect to MongoDB via the shared `connectDB` helper and use
 * the `Page` Mongoose model. Saving requires a valid session or legacy bearer token.
 *
 * @module src/app/api/puck/route
 */

import { NextRequest, NextResponse } from "next/server";
import connectDB from "@shared/lib/db";
import Page, { type PuckData } from "@shared/models/Page";
import { PageDomain, PageDomainError } from "@shared/domains/PageDomain";
import { sanitizePuckDataForStorage } from "@shared/lib/puckContentSanitize";
import { readMediaStorageEnvConfig } from "@shared/lib/mediaStorage/resolveMediaStorageProvider";
import { mediaReferenceContextFromConfig } from "@shared/lib/mediaStorage/uploadReferenceUtils";
import { isReservedSlugPath } from "@/components/puck/lib/pageSlugValidation";
import { getOptionalSession, isApiAuthorised } from "@/lib/authGuards";
import { canEditPages } from "@/lib/pageEditAccess";

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
  if (!(await isApiAuthorised(req))) {
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

  if (normalizedPath === "/") {
    return NextResponse.json(
      { error: "The homepage (/) is not managed by the page editor. Edit src/app/page.tsx in code." },
      { status: 400 },
    );
  }

  if (isReservedSlugPath(normalizedPath)) {
    return NextResponse.json(
      {
        error: `The path "${normalizedPath}" is reserved. Create pages from Page Manager with a different slug.`,
      },
      { status: 400 },
    );
  }

  const effectivePreviousPath = previousPath || normalizedPath;

  const mediaContext = mediaReferenceContextFromConfig(readMediaStorageEnvConfig());
  const sanitizedPuckData = sanitizePuckDataForStorage(
    puckData,
    mediaContext,
  ) as PuckData;

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
            puckData: sanitizedPuckData,
            ...(title !== undefined && { title }),
            ...(published !== undefined && { published }),
          },
        },
        { returnDocument: "after" }
      );

      if (!updated) {
        return NextResponse.json(
          { error: `No page found at "${effectivePreviousPath}" to rename.` },
          { status: 404 }
        );
      }
    } else {
      const existing = await Page.findOne({ path: normalizedPath }).lean();
      if (existing && effectivePreviousPath !== normalizedPath) {
        return NextResponse.json(
          { error: `The path "${normalizedPath}" is already taken.` },
          { status: 409 }
        );
      }

      // Normal upsert
      await Page.findOneAndUpdate(
        { path: normalizedPath },
        {
          $set: {
            puckData: sanitizedPuckData,
            ...(title !== undefined && { title }),
            ...(published !== undefined && { published }),
          },
        },
        { upsert: true, returnDocument: "after" }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[API /api/puck POST]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

// ── DELETE ────────────────────────────────────────────────────────────────────

/**
 * Delete a Puck-managed page document by path.
 *
 * @param req - Next.js request containing `?path=` query parameter.
 * @returns `{ ok: true }` on success, or an error payload.
 */
export async function DELETE(req: NextRequest) {
  if (!(await isApiAuthorised(req))) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  }

  const session = await getOptionalSession();
  if (session && !canEditPages(session.user.role)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const path = req.nextUrl.searchParams.get("path");
  if (!path) {
    return NextResponse.json(
      { error: "Query parameter `path` is required." },
      { status: 400 },
    );
  }

  if (isReservedSlugPath(path.trim())) {
    return NextResponse.json(
      { error: `The path "${path.trim()}" is reserved and cannot be deleted as a page.` },
      { status: 400 },
    );
  }

  try {
    await PageDomain.deleteByPath(path);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof PageDomainError) {
      return NextResponse.json({ error: err.message }, { status: err.httpStatus });
    }
    console.error("[API /api/puck DELETE]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
