/**
 * @fileoverview Nexus Page Manager.
 *
 * Server component. Lists all `Page` documents stored in MongoDB and provides
 * a form to open the Puck editor for a new page slug. No authentication is
 * required in Phase 1.
 *
 * @module src/app/pages/page
 */

import connectDB from "@shared/lib/db";
import Page from "@shared/models/Page";
import { auth } from "@/auth";
import { canSessionManagePageCategoriesHub } from "@/lib/pageCategoriesHubAccess";
import { PageManagerShell, type PageManagerNotice, type PageManagerRow } from "./PageManagerShell";

/**
 * Page Manager — lists all Puck-managed pages and lets you open the editor
 * for any existing page or create a new one by slug.
 *
 * @param props - Next.js search params for redirect notices.
 * @returns The page manager JSX.
 */
export default async function PagesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  let pages: PageManagerRow[] = [];

  try {
    await connectDB();
    const docs = await Page.find({}, { path: 1, title: 1, published: 1, updatedAt: 1 })
      .sort({ updatedAt: -1 })
      .lean();

    pages = docs
      .filter((d) => d.path !== "/")
      .map((d) => ({
      path: d.path,
      title: d.title,
      published: d.published,
      updatedAt: new Date(d.updatedAt).toISOString(),
    }));
  } catch (err) {
    console.error("[PagesPage] DB error:", err);
  }

  const session = await auth();
  const showAdminSettings = session?.user?.role === "Admin";
  const showCatalogSettings = await canSessionManagePageCategoriesHub(session);

  const notice: PageManagerNotice | undefined =
    error === "reserved-slug" || error === "homepage-code-only" ? error : undefined;

  return (
    <PageManagerShell
      pages={pages}
      notice={notice}
      showAdminSettings={showAdminSettings}
      showCatalogSettings={showCatalogSettings}
    />
  );
}
