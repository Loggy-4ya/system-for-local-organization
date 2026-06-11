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
import { fetchReservedPagePaths, isReservedSlugPath, validatePageSlug } from "@/components/puck/lib/pageSlugValidation";
import { normalizePagePath } from "@/components/puck/PagePathEditor";

// ── Component ────────────────────────────────────────────────────────────────

/**
 * Inline form that navigates to the Puck editor for a new page slug.
 *
 * @returns A slug input with a submit button.
 */
export function NewPageForm() {
  const router = useRouter();
  const [slug, setSlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  /**
   * Normalise the slug value and navigate to the Puck editor URL.
   *
   * @param e - Form submit event.
   */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const clean = slug.trim().replace(/^\/+/, "").replace(/\/+$/, "");
    if (!clean) {
      setError("Enter a URL slug for the new page.");
      return;
    }

    const normalizedPath = normalizePagePath(clean);
    if (isReservedSlugPath(normalizedPath)) {
      router.push("/pages?error=reserved-slug");
      return;
    }

    setSubmitting(true);

    try {
      const reservedPaths = await fetchReservedPagePaths();
      const validation = validatePageSlug(clean, {
        slugLocked: false,
        currentPath: "",
        reservedPaths,
      });

      if (!validation.valid) {
        setError(validation.error ?? "Invalid slug.");
        return;
      }

      router.push(`${validation.normalizedPath}/edit`.replace("//", "/"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", gap: 8 }}>
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
          onChange={(e) => {
            setError(null);
            setSlug(e.target.value);
          }}
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
          disabled={submitting}
          style={{
            padding: "10px 18px",
            background: "var(--color-accent-user)",
            color: "#fff",
            fontWeight: 500,
            fontSize: "0.875rem",
            border: "none",
            borderRadius: "0 var(--radius-md) var(--radius-md) 0",
            cursor: submitting ? "wait" : "pointer",
            whiteSpace: "nowrap",
            opacity: submitting ? 0.7 : 1,
          }}
        >
          Open Editor →
        </button>
      </div>
      {error ? (
        <p style={{ color: "#ef4444", fontSize: "0.8125rem", margin: 0 }} role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
