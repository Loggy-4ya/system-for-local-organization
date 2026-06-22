/**
 * @fileoverview Puck page data API route for Project Nexus.
 *
 * Provides two operations:
 *  - `GET /api/puck?path=<path>`    — load the Puck layout data for a given page path.
 *  - `POST /api/puck`               — save (upsert) Puck layout data for a page path.
 *  - `DELETE /api/puck?path=<path>` — remove a Puck-managed page from MongoDB.
 *
 * @module src/app/api/puck/route
 */

import { NextRequest, NextResponse } from "next/server";
import connectDB from "@shared/lib/db";
import Page, { type PuckData } from "@shared/models/Page";
import { PageDomain, PageDomainError } from "@shared/domains/PageDomain";
import { sanitizePuckDataForStorageWithReport } from "@shared/lib/puckContentSanitize";
import {
  assertPageTitleContentPolicy,
  getFirstPuckContentPolicyViolation,
} from "@shared/lib/puckContentPolicy";
import { readMediaStorageEnvConfig } from "@shared/lib/mediaStorage/resolveMediaStorageProvider";
import { mediaReferenceContextFromConfig } from "@shared/lib/mediaStorage/uploadReferenceUtils";
import { recordPuckSanitizeAudit } from "@shared/lib/securitySanitizeAuditLog";
import { normalizePagePath } from "@shared/lib/pagePathLogic";
import type { PagePublicationValue } from "@/components/puck/fields/PagePublicationFieldGroup";
import { isReservedSlugPath } from "@/components/puck/lib/pageSlugValidation";
import { getOptionalSession, isApiAuthorised } from "@/lib/authGuards";
import { GeneralRulesDomain } from "@shared/domains/GeneralRulesDomain";
import { AccessControlDomain } from "@shared/domains/AccessControlDomain";
import { AuthDomain } from "@shared/domains/AuthDomain";
import type { PageAccessEditorEntry } from "@shared/lib/pageAccessLogic";
import { resolvePagePublicationProps, resolvePageSettingsCategories } from "@/components/puck/lib/pageRootFieldProps";

// ── GET ───────────────────────────────────────────────────────────────────────

/**
 * Load Puck page data for a given path.
 *
 * @param req - Next.js request containing `?path=` query parameter.
 * @returns JSON page payload on success, or an error payload.
 */
export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get("path");

  if (!path) {
    return NextResponse.json(
      { error: "Query parameter `path` is required." },
      { status: 400 },
    );
  }

  try {
    await connectDB();
    const doc = await Page.findOne({ path }).lean();

    if (!doc) {
      return NextResponse.json(
        { error: `No page found for path "${path}".` },
        { status: 404 },
      );
    }

    const authorDisplayName = await PageDomain.resolveAuthorDisplayName(
      doc.authorUserId ? String(doc.authorUserId) : null,
    );
    const metadata = PageDomain.toMetadataDto(doc, authorDisplayName);

    return NextResponse.json({
      puckData: doc.puckData,
      title: doc.title,
      published: doc.published,
      categories: doc.categories ?? [],
      metadata,
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
 * Extract publication props from Puck root data.
 *
 * @param puckData - Puck document.
 * @returns Publication input for PageDomain.
 */
function extractPublicationFromPuckData(puckData: PuckData): PagePublicationValue {
  const rootProps = (puckData as { root?: { props?: Record<string, unknown> } }).root?.props ?? {};
  const publication = rootProps.pagePublication as PagePublicationValue | undefined;
  return publication ?? {};
}

/**
 * Upsert or rename Puck page data for a given path.
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
    categories?: string[];
    publication?: PagePublicationValue;
    delegatedEditors?: PageAccessEditorEntry[];
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { previousPath, path, puckData, title, published, categories, publication, delegatedEditors } =
    body;

  if (!path || !puckData) {
    return NextResponse.json(
      { error: "`path` and `puckData` are required." },
      { status: 400 },
    );
  }

  const normalizedPath = validateAndNormalizePath(path);
  if (!normalizedPath) {
    return NextResponse.json({ error: "Invalid path format." }, { status: 400 });
  }

  if (normalizedPath === "/") {
    return NextResponse.json(
      {
        error:
          "The homepage (/) is not managed by the page editor. Edit src/app/page.tsx in code.",
      },
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
  const rootProps =
    (puckData as { root?: { props?: Record<string, unknown> } }).root?.props ?? {};
  const resolvedPublication = resolvePagePublicationProps(
    rootProps as Parameters<typeof resolvePagePublicationProps>[0],
    publication,
  );
  const effectiveCategories =
    categories ??
    resolvePageSettingsCategories(rootProps as Parameters<typeof resolvePageSettingsCategories>[0]);
  const effectiveDelegatedEditors =
    delegatedEditors ?? resolvedPublication.delegatedEditors ?? [];
  const normalizedCategories = PageDomain.normalizeCategoriesForStorage(effectiveCategories);

  await GeneralRulesDomain.ensureLoaded();

  try {
    assertPageTitleContentPolicy(title);
    for (const category of normalizedCategories) {
      assertPageTitleContentPolicy(category);
    }
    const pub = publication ?? extractPublicationFromPuckData(puckData);
    assertPageTitleContentPolicy(pub.description);
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Page title contains disallowed language.",
      },
      { status: 400 },
    );
  }

  const puckPolicyViolation = getFirstPuckContentPolicyViolation(puckData);
  if (puckPolicyViolation) {
    return NextResponse.json({ error: puckPolicyViolation.message }, { status: 400 });
  }

  const mediaContext = mediaReferenceContextFromConfig(readMediaStorageEnvConfig());
  const { data: sanitizedPuckData, report } = sanitizePuckDataForStorageWithReport(
    puckData,
    mediaContext,
  );

  try {
    await connectDB();

    const session = await getOptionalSession();
    const actorUserId = session?.user?.id;
    if (!actorUserId) {
      return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
    }

    await recordPuckSanitizeAudit({
      pagePath: normalizedPath,
      actorUserId,
      report,
    });

    const pub = publication ?? extractPublicationFromPuckData(sanitizedPuckData as PuckData);
    const sanitizedRootProps =
      (sanitizedPuckData as { root?: { props?: Record<string, unknown> } }).root?.props ?? {};
    const resolvedFromSanitized = resolvePagePublicationProps(
      sanitizedRootProps as Parameters<typeof resolvePagePublicationProps>[0],
      pub,
    );
    const saveDelegatedEditors =
      delegatedEditors ?? resolvedFromSanitized.delegatedEditors ?? [];

    const actorUser = await AuthDomain.getUserById(actorUserId);
    if (!actorUser) {
      return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
    }
    const actorPermissions = await AccessControlDomain.resolvePermissionsForUser(actorUser);

    await PageDomain.upsertFromEditorSave({
      previousPath: effectivePreviousPath,
      path: normalizedPath,
      puckData: sanitizedPuckData as PuckData,
      title,
      categories: normalizedCategories,
      publication: {
        description: pub.description,
        coverImage: pub.coverImage,
        galleryImages: pub.galleryImages,
        publishAt: pub.publishAt,
        commentsEnabled: pub.commentsEnabled,
      },
      delegatedEditors: saveDelegatedEditors,
      actorUserId,
      actorPermissions,
      requestPublish: published !== false,
    });

    return NextResponse.json({ ok: true, path: normalizedPath });
  } catch (err) {
    if (err instanceof PageDomainError) {
      return NextResponse.json({ error: err.message }, { status: err.httpStatus });
    }
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
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  }

  const path = req.nextUrl.searchParams.get("path");
  if (!path) {
    return NextResponse.json(
      { error: "Query parameter `path` is required." },
      { status: 400 },
    );
  }

  const rawPath = path.trim();
  const normalizedPath = rawPath.startsWith("/")
    ? normalizePagePath(rawPath.slice(1))
    : normalizePagePath(rawPath);

  if (normalizedPath === "/") {
    return NextResponse.json(
      { error: "The homepage cannot be deleted from the page editor." },
      { status: 400 },
    );
  }

  try {
    await connectDB();
    const existing = await Page.findOne({ path: normalizedPath }).lean();

    if (!existing && isReservedSlugPath(normalizedPath)) {
      return NextResponse.json(
        { error: `The path "${normalizedPath}" is reserved and cannot be deleted as a page.` },
        { status: 400 },
      );
    }

    if (!existing) {
      return NextResponse.json(
        { error: `No page found at "${normalizedPath}".` },
        { status: 404 },
      );
    }

    await PageDomain.assertUserCanEdit(session.user.id, existing);
    await PageDomain.deleteByPath(normalizedPath);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof PageDomainError) {
      return NextResponse.json({ error: err.message }, { status: err.httpStatus });
    }
    console.error("[API /api/puck DELETE]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
