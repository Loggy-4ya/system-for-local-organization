"use client";

/**
 * @fileoverview Tabbed shell for the Page Manager (`/pages`).
 *
 * @module src/app/pages/PageManagerShell
 */

import Link from "next/link";
import { useState } from "react";
import { EditorDefaultsPanel } from "./EditorDefaultsPanel";
import { NewPageForm } from "./NewPageForm";

/** Minimal page row passed from the server page list. */
export interface PageManagerRow {
  path: string;
  title: string;
  published: boolean;
  updatedAt: Date;
}

/** Props for the tabbed page manager shell. */
interface PageManagerShellProps {
  pages: PageManagerRow[];
}

type ManagerTab = "pages" | "defaults";

/**
 * Client tab shell — Pages list and Editor Defaults settings.
 *
 * @param props - See {@link PageManagerShellProps}.
 * @returns Tabbed page manager UI.
 */
export function PageManagerShell({ pages }: PageManagerShellProps) {
  const [tab, setTab] = useState<ManagerTab>("pages");

  return (
    <div className="page-shell flex flex-1 flex-col gap-8 py-12">
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
          Create and edit Puck-managed pages. Configure editor defaults for island mode.
        </p>
      </div>

      <div className="page-manager-tabs" role="tablist" aria-label="Page manager sections">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "pages"}
          className={`page-manager-tabs__tab${tab === "pages" ? " page-manager-tabs__tab--active" : ""}`}
          onClick={() => setTab("pages")}
        >
          Pages
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "defaults"}
          className={`page-manager-tabs__tab${tab === "defaults" ? " page-manager-tabs__tab--active" : ""}`}
          onClick={() => setTab("defaults")}
        >
          Editor Defaults
        </button>
      </div>

      {tab === "pages" ? (
        <>
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
        </>
      ) : (
        <EditorDefaultsPanel />
      )}
    </div>
  );
}

export default PageManagerShell;
