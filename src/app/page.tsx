/**
 * @fileoverview Nexus root homepage.
 *
 * Server component — no auth required at this phase. Provides quick-access
 * actions to enter the visual page editor and navigate to the page manager.
 *
 * Imbued with beautiful, modern glassmorphic UI/UX styling, fully integrated with
 * the project's design tokens and complying with the "No Plain Text on Background" rule.
 *
 * @module src/app/page
 */

import Link from "next/link";
import { StaticPageShell } from "@/components/ui/StaticPageShell";
import { STATIC_ROUTE_CONTENT_WIDTH } from "@/components/puck/lib/contentWidthTokens";

// ── Component ────────────────────────────────────────────────────────────────

/**
 * Root homepage for Project Nexus.
 *
 * @returns Quick-access landing page linking to the editor and page manager.
 */
export default function HomePage() {
  return (
    <StaticPageShell
      contentWidth={STATIC_ROUTE_CONTENT_WIDTH["/"]}
      className="items-center justify-center py-20 px-4"
      innerClassName="items-center"
    >
      {/* Entire homepage content wrapped in a beautiful, centered glass-panel */}
      <div className="glass-panel w-full max-w-md p-8 flex flex-col items-center gap-8 shadow-md border border-zinc-700/20 dark:border-zinc-300/10">
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
        <div className="flex flex-col gap-4 w-full">
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
            href="/pages"
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
            <span>Create &amp; Manage Pages</span>
            <span aria-hidden="true" style={{ opacity: 0.8 }}>→</span>
          </Link>
        </div>

        {/* ── Status pill ──────────────────────────────────────────────────── */}
        <p style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", textAlign: "center", margin: 0 }}>
          The landing page at <code>/</code> is defined in code. Use Page Manager for CMS pages.
        </p>
      </div>
    </StaticPageShell>
  );
}
