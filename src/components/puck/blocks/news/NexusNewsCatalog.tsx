"use client";

/**
 * @fileoverview Puck block that renders the admin-configured news catalog hub.
 *
 * Loads curated page sections from `/api/page-categories/hub` and renders category
 * tabs with configurable preview card layouts.
 *
 * @module src/components/puck/blocks/news/NexusNewsCatalog
 */

import { useEffect, useMemo, useState } from "react";
import type { NewsCatalogHubPayload } from "@shared/constants/pageCategoriesHub";
import { NexusNewsCatalogRender } from "./NexusNewsCatalogRender";

/** Puck block export for the news catalog hub. */
export const NexusNewsCatalog = {
  label: "News Catalog",
  fields: {
    emptyStateMessage: {
      type: "textarea" as const,
      label: "Empty State Message",
    },
  },
  defaultProps: {
    emptyStateMessage: "Nothing published yet.",
  },
  render({
    emptyStateMessage,
  }: {
    emptyStateMessage?: string;
  }) {
    const [payload, setPayload] = useState<NewsCatalogHubPayload>({ sections: [] });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      let cancelled = false;

      void (async () => {
        try {
          const res = await fetch("/api/page-categories/hub");
          if (!res.ok) return;
          const data = (await res.json()) as NewsCatalogHubPayload;
          if (!cancelled) {
            setPayload(data);
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();

      return () => {
        cancelled = true;
      };
    }, []);

    const sections = useMemo(() => payload.sections, [payload.sections]);

    if (loading) {
      return (
        <div className="nexus-news-catalog nexus-news-catalog--empty glass-panel">
          <p className="nexus-news-catalog__empty-message">Loading news catalog…</p>
        </div>
      );
    }

    return (
      <NexusNewsCatalogRender
        sections={sections}
        emptyMessage={emptyStateMessage}
      />
    );
  },
};

export default NexusNewsCatalog;
