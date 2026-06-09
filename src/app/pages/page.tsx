/**
 * @fileoverview Nexus Page Manager.
 *
 * Server component. Lists all `Page` documents stored in MongoDB and provides
 * a form to open the Puck editor for a new page slug. No authentication is
 * required in Phase 1.
 *
 * @module src/app/pages/page
 */

import Link from "next/link";
import connectDB from "@shared/lib/db";
import Page from "@shared/models/Page";
import { NewPageForm } from "./NewPageForm";

// ── Types ─────────────────────────────────────────────────────────────────────

/** Minimal page data needed for the manager list. */
interface PageRow {
  path: string;
  title: string;
  published: boolean;
  updatedAt: Date;
}

// ── Component ────────────────────────────────────────────────────────────────

/**
 * Page Manager — lists all Puck-managed pages and lets you open the editor
 * for any existing page or create a new one by slug.
 *
 * @returns The page manager JSX.
 */
export default async function PagesPage() {
  let pages: PageRow[] = [];

  try {
    await connectDB();
    const docs = await Page.find({}, { path: 1, title: 1, published: 1, updatedAt: 1 })
      .sort({ updatedAt: -1 })
      .lean();

    pages = docs.map((d) => ({
      path:      d.path,
      title:     d.title,
      published: d.published,
      updatedAt: d.updatedAt,
    }));
  } catch (err) {
    console.error("[PagesPage] DB error:", err);
  }

  return (
    <div className="page-shell flex flex-1 flex-col gap-8 py-12">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1">
        <h1
          style={{
            fontSize: "1.5rem",
            fontWeight: 700,
            color: "var(--color-text-primary)",
            letterSpacing: "-0.02em",
          }}
        >
          Page Manager
        </h1>
        <p style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>
          Create and edit Puck-managed pages. All pages are saved to MongoDB.
        </p>
      </div>

      {/* ── Create new page ─────────────────────────────────────────────── */}
      <div className="glass-panel flex flex-col gap-4 p-6">
        <p
          style={{
            fontSize: "0.75rem",
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "var(--color-text-secondary)",
          }}
        >
          New page
        </p>
        <NewPageForm />
        <p style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
          Enter a slug like <code style={{ color: "var(--color-accent-user)" }}>news</code> or{" "}
          <code style={{ color: "var(--color-accent-user)" }}>council/about</code>. You will be
          taken directly to the editor.
        </p>
      </div>

      {/* ── Existing pages ──────────────────────────────────────────────── */}
      <div className="glass-panel flex flex-col gap-0 overflow-hidden">
        <div
          style={{
            padding: "12px 20px",
            borderBottom: "1px solid var(--color-border-default)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <p
            style={{
              fontSize: "0.75rem",
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--color-text-secondary)",
              flex: 1,
            }}
          >
            Existing pages ({pages.length})
          </p>
        </div>

        {pages.length === 0 ? (
          <div
            style={{
              padding: "32px 20px",
              textAlign: "center",
              color: "var(--color-text-secondary)",
              fontSize: "0.875rem",
            }}
          >
            No pages yet. Create your first one above.
          </div>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {pages.map((page) => (
              <li
                key={page.path}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "14px 20px",
                  borderBottom: "1px solid var(--color-border-default)",
                }}
              >
                {/* Published indicator */}
                <span
                  title={page.published ? "Published" : "Draft"}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    flexShrink: 0,
                    background: page.published
                      ? "var(--color-success)"
                      : "var(--color-text-secondary)",
                  }}
                />

                {/* Path + title */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.875rem",
                      fontWeight: 500,
                      color: "var(--color-text-primary)",
                    }}
                  >
                    {page.path}
                  </p>
                  {page.title && page.title !== "Untitled Page" && (
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.75rem",
                        color: "var(--color-text-secondary)",
                      }}
                    >
                      {page.title}
                    </p>
                  )}
                </div>

                {/* Updated date */}
                <span
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--color-text-secondary)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {new Date(page.updatedAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>

                {/* Actions */}
                <div style={{ display: "flex", gap: 8 }}>
                  <Link
                    href={`${page.path}/edit`}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "var(--radius-sm)",
                      background: "var(--color-accent-user)",
                      color: "#fff",
                      fontSize: "0.75rem",
                      fontWeight: 500,
                      textDecoration: "none",
                    }}
                  >
                    Edit
                  </Link>
                  <Link
                    href={page.path}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "var(--radius-sm)",
                      background: "var(--color-bg-elevated)",
                      border: "1px solid var(--color-border-default)",
                      color: "var(--color-text-secondary)",
                      fontSize: "0.75rem",
                      fontWeight: 500,
                      textDecoration: "none",
                    }}
                  >
                    View
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

    </div>
  );
}
