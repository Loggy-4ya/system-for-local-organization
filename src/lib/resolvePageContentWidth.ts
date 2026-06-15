/**
 * @fileoverview Server-side helper to read a Puck page's stored layout width (body only).
 *
 * Global header/footer use {@link GLOBAL_LAYOUT_CONTENT_WIDTH} — not this helper.
 *
 * @module src/lib/resolvePageContentWidth
 */

import connectDB from "@shared/lib/db";
import Page from "@shared/models/Page";
import {
  clampPageContentWidth,
  DEFAULT_CONTENT_WIDTH,
  type ContentWidthToken,
} from "@/components/puck/lib/contentWidthTokens";

/**
 * Resolve clamped page-body content width for a published Puck route.
 *
 * @param pathname - Normalized request pathname (e.g. `/news/my-post`).
 * @returns Clamped content width token for PageRoot-style containers.
 */
export async function resolvePuckPageContentWidth(
  pathname: string | null,
): Promise<ContentWidthToken> {
  if (!pathname) return DEFAULT_CONTENT_WIDTH;

  let cleanPath = pathname.trim();
  if (cleanPath !== "/" && cleanPath.endsWith("/")) {
    cleanPath = cleanPath.slice(0, -1);
  }

  if (cleanPath.startsWith("/api")) {
    return DEFAULT_CONTENT_WIDTH;
  }

  try {
    await connectDB();
    const doc = await Page.findOne({ path: cleanPath }).lean();
    if (doc && doc.puckData) {
      const rootProps = (doc.puckData as { root?: { props?: Record<string, unknown> } }).root
        ?.props;
      const raw =
        (rootProps?.pageLayout as { contentWidth?: string } | undefined)?.contentWidth ??
        (rootProps?.appearance as { contentWidth?: string } | undefined)?.contentWidth;
      return clampPageContentWidth(raw);
    }
  } catch (err) {
    console.error("[resolvePuckPageContentWidth] Error fetching page:", err);
  }

  return DEFAULT_CONTENT_WIDTH;
}

/**
 * @deprecated Use {@link resolvePuckPageContentWidth} for page body or
 * {@link GLOBAL_LAYOUT_CONTENT_WIDTH} for header/footer.
 */
export async function resolvePageContentWidth(
  pathname: string | null,
): Promise<ContentWidthToken> {
  return resolvePuckPageContentWidth(pathname);
}
