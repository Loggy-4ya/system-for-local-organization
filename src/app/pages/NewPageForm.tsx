"use client";

/**
 * @fileoverview Client component for creating a new Puck-managed page.
 *
 * Accepts a slug input and navigates to `/<slug>/edit` on submit so the user
 * lands directly in the Puck editor for the new page.
 *
 * @module src/app/pages/NewPageForm
 */

import { useRouter } from "next/navigation";
import { useState } from "react";

// ── Component ────────────────────────────────────────────────────────────────

/**
 * Inline form that navigates to the Puck editor for a new page slug.
 *
 * @returns A slug input with a submit button.
 */
export function NewPageForm() {
  const router = useRouter();
  const [slug, setSlug] = useState("");

  /**
   * Normalise the slug value and navigate to the Puck editor URL.
   *
   * @param e - Form submit event.
   */
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const clean = slug.trim().replace(/^\/+/, "").replace(/\/+$/, "");
    if (!clean) return;
    router.push(`/${clean}/edit`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: "flex",
        gap: 8,
      }}
    >
      <span
        style={{
          display: "flex",
          alignItems: "center",
          padding: "0 10px",
          borderRadius: "var(--radius-md) 0 0 var(--radius-md)",
          background: "var(--color-bg-elevated)",
          border: "1px solid var(--color-border-default)",
          borderRight: "none",
          color: "var(--color-text-secondary)",
          fontSize: "0.875rem",
          userSelect: "none",
        }}
        aria-hidden="true"
      >
        /
      </span>
      <input
        type="text"
        value={slug}
        onChange={(e) => setSlug(e.target.value)}
        placeholder="page-slug"
        aria-label="New page slug"
        required
        style={{
          flex: 1,
          padding: "10px 12px",
          background: "var(--color-bg-cell)",
          border: "1px solid var(--color-border-default)",
          color: "var(--color-text-primary)",
          fontSize: "0.875rem",
          borderRadius: 0,
          outline: "none",
          minWidth: 0,
        }}
      />
      <button
        type="submit"
        style={{
          padding: "10px 18px",
          background: "var(--color-accent-user)",
          color: "#fff",
          fontWeight: 500,
          fontSize: "0.875rem",
          border: "none",
          borderRadius: "0 var(--radius-md) var(--radius-md) 0",
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        Open Editor →
      </button>
    </form>
  );
}
