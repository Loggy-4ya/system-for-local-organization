/**
 * @fileoverview Nexus root homepage.
 *
 * Server component — no auth required at this phase. Provides quick-access
 * actions to enter the visual page editor and navigate to the page manager.
 *
 * @module src/app/page
 */

import Link from "next/link";

// ── Component ────────────────────────────────────────────────────────────────

/**
 * Root homepage for Project Nexus.
 *
 * @returns Quick-access landing page linking to the editor and page manager.
 */
export default function HomePage() {
  return (
    <div className="page-shell flex flex-1 flex-col items-center justify-center gap-8 py-20">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-3 text-center">
        <h1
          style={{
            fontSize: "2rem",
            fontWeight: 700,
            color: "var(--color-text-primary)",
            lineHeight: 1.2,
            letterSpacing: "-0.02em",
          }}
        >
          Welcome to Nexus
        </h1>
        <p
          style={{
            fontSize: "0.9375rem",
            color: "var(--color-text-secondary)",
            maxWidth: 480,
          }}
        >
          Institutional management platform for student councils, task tracking,
          and community collaboration.
        </p>
      </div>

      {/* ── Quick actions ────────────────────────────────────────────────── */}
      <div className="glass-panel flex flex-col gap-4 p-6 w-full max-w-md">
        <p
          style={{
            fontSize: "0.75rem",
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "var(--color-text-secondary)",
            marginBottom: 4,
          }}
        >
          Quick actions
        </p>

        <Link
          href="/edit"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 16px",
            borderRadius: "var(--radius-md)",
            background: "var(--color-accent-user)",
            color: "#fff",
            fontWeight: 500,
            fontSize: "0.875rem",
            textDecoration: "none",
          }}
        >
          <span>Edit Homepage</span>
          <span aria-hidden="true" style={{ opacity: 0.8 }}>→</span>
        </Link>

        <Link
          href="/pages"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 16px",
            borderRadius: "var(--radius-md)",
            background: "var(--color-bg-elevated)",
            border: "1px solid var(--color-border-default)",
            color: "var(--color-text-primary)",
            fontWeight: 500,
            fontSize: "0.875rem",
            textDecoration: "none",
          }}
        >
          <span>Manage Pages</span>
          <span aria-hidden="true" style={{ color: "var(--color-text-secondary)" }}>→</span>
        </Link>
      </div>

      {/* ── Status pill ──────────────────────────────────────────────────── */}
      <p style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
        Phase 1 · Auth not required · Editor open to all
      </p>

    </div>
  );
}
