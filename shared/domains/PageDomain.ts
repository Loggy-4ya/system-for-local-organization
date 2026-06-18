/**
 * @fileoverview Consolidated Page domain engine for Project Nexus.
 *
 * Single entry point for Puck-managed page persistence mutations shared across
 * API routes and workers.
 *
 * @module shared/domains/PageDomain
 *
 * Tests: `npm run test:page-domain`
 * Registry: `.ai/docs/testing.md`
 */

import connectDB from "@shared/lib/db";
import Page from "@shared/models/Page";

/**
 * Domain-level error with an HTTP status hint for API routes.
 */
export class PageDomainError extends Error {
  /** Suggested HTTP status for API responses. */
  readonly httpStatus: number;

  /**
   * @param message - User-facing error message.
   * @param httpStatus - Suggested HTTP status code.
   */
  constructor(message: string, httpStatus: number) {
    super(message);
    this.name = "PageDomainError";
    this.httpStatus = httpStatus;
  }
}

/**
 * Page Domain Engine.
 *
 * Owns MongoDB mutations for Puck-managed CMS pages.
 */
export class PageDomain {
  /**
   * Validate that a page path may be deleted.
   *
   * @param path - Absolute MongoDB page path key.
   * @returns Trimmed path when deletable.
   * @throws {@link PageDomainError} When the path is missing, homepage, or malformed.
   */
  public static assertDeletablePath(path: string): string {
    const trimmed = path?.trim();
    if (!trimmed) {
      throw new PageDomainError("Page path is required.", 400);
    }
    if (trimmed === "/") {
      throw new PageDomainError(
        "The homepage cannot be deleted. Edit src/app/page.tsx in code.",
        400,
      );
    }
    if (!trimmed.startsWith("/")) {
      throw new PageDomainError("Path must start with a slash (/).", 400);
    }
    return trimmed;
  }

  /**
   * Delete a Puck-managed page document by path.
   *
   * @param path - Absolute MongoDB page path key.
   * @throws {@link PageDomainError} When the path is invalid or no document exists.
   */
  public static async deleteByPath(path: string): Promise<void> {
    const normalizedPath = PageDomain.assertDeletablePath(path);

    await connectDB();
    const result = await Page.deleteOne({ path: normalizedPath });

    if (result.deletedCount === 0) {
      throw new PageDomainError(`No page found at "${normalizedPath}".`, 404);
    }
  }
}
