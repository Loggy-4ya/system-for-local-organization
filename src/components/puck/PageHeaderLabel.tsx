"use client";

/**
 * @fileoverview Live page title + slug label portaled into the Puck header title slot.
 *
 * Subscribes to {@link editorPageMetadataStore} via `useSyncExternalStore` so
 * sidebar typing updates the header without Puck document mutations.
 *
 * @module src/components/puck/PageHeaderLabel
 */

import { useLayoutEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { editorPagePathRef } from "./lib/editorPagePathRef";
import {
  getPageMetadataDraft,
  subscribePageMetadataDraft,
} from "./lib/editorPageMetadataStore";

/**
 * Format the slug segment for header display.
 *
 * @param slug - Slug without leading slash.
 * @returns Display path including leading slash.
 */
function formatSlugPath(slug: string): string {
  const trimmed = slug.trim().replace(/^\/+/, "");
  return trimmed ? `/${trimmed}` : "/page-path";
}

/**
 * Portaled header label showing live page title and URL slug.
 *
 * @returns Portal-mounted label or null until the Puck title host exists.
 */
export function PageHeaderLabel() {
  const pagePath = editorPagePathRef.currentPath;
  const metadata = useSyncExternalStore(subscribePageMetadataDraft, getPageMetadataDraft);
  const [host, setHost] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    const el = document.querySelector('[class*="PuckHeader-title"]') as HTMLElement | null;
    if (!el) return;

    el.querySelector("h2, [class*='Heading']")?.remove();
    setHost(el);
  }, []);

  if (!host) return null;

  const showSlug = !metadata.slugLocked;
  const slugPath = formatSlugPath(metadata.slug);

  return createPortal(
    <div
      key={pagePath}
      className="nexus-page-header-label"
      title={`${metadata.title}${showSlug ? ` ${slugPath}` : ""}`}
    >
      {showSlug ? (
        <code className="nexus-page-header-label__slug">{slugPath}</code>
      ) : null}
      <span className="nexus-page-header-label__title">{metadata.title || "Untitled Page"}</span>
    </div>,
    host,
  );
}

export default PageHeaderLabel;
