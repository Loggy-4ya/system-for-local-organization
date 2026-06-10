/**
 * @fileoverview Puck catch-all Server Component page for Project Nexus.
 *
 * This page handles two URL patterns via the `[...puckPath]` catch-all segment:
 *
 *  - `/edit`              → Renders the Puck visual editor (protected in Phase 2).
 *  - `/[anything-else]`   → Renders the public-facing `<Render>` viewer, loading
 *                            content from MongoDB using the `Page` model.
 *
 * The Server Component loads data from MongoDB so the initial HTML can be
 * rendered on the server (ISR-compatible). The Client Component
 * (`./client.tsx`) receives the serialised data as props.
 *
 * @module src/app/[...puckPath]/page
 */

import { notFound } from "next/navigation";
import connectDB    from "@shared/lib/db";
import Page         from "@shared/models/Page";
import type { Data } from "@measured/puck";
import { PuckClient } from "./client";

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Derive the canonical page path and editing flag from the catch-all segment.
 *
 * @param segments - Array of URL path segments from the catch-all param.
 * @returns Object containing the normalised path string and `isEditing` flag.
 */
function resolvePath(segments: string[]): { path: string; isEditing: boolean } {
  // `/edit` triggers editor mode and targets the root `/` canvas
  if (segments.length === 1 && segments[0] === "edit") {
    return { path: "/", isEditing: true };
  }

  // `/foo/edit` triggers editor mode for `/foo`
  if (segments.at(-1) === "edit") {
    return {
      path:      "/" + segments.slice(0, -1).join("/"),
      isEditing: true,
    };
  }

  return { path: "/" + segments.join("/"), isEditing: false };
}

// ── Page ──────────────────────────────────────────────────────────────────────

/** Next.js App Router page params shape. */
interface PageParams {
  puckPath: string[];
}

/**
 * Puck catch-all page — loads page data from MongoDB and delegates rendering
 * to the `PuckClient` Client Component.
 *
 * @param props - Next.js route params.
 * @returns The rendered Puck editor or viewer.
 */
export default async function PuckPage({ params }: { params: Promise<PageParams> }) {
  const { puckPath } = await params;
  const { path, isEditing } = resolvePath(puckPath);

  let data: Data | null = null;
  let pageTitle: string = "Untitled Page";

  try {
    await connectDB();
    const doc = await Page.findOne({ path }).lean();
    if (doc) {
      data = doc.puckData as Data;
      pageTitle = doc.title || "Untitled Page";
    }
  } catch (err) {
    console.error("[PuckPage] DB error:", err);
  }

  // 404 for viewer mode when the page is not found or not published
  if (!isEditing && !data) {
    notFound();
  }

  return <PuckClient path={path} data={data} pageTitle={pageTitle} isEditing={isEditing} />;
}
