"use client";

/**
 * @fileoverview Client component for creating a new Puck-managed page.
 *
 * Publishers pick a path domain, enter a title, and confirm the URL slug before
 * opening the Puck editor.
 *
 * @module src/app/pages/NewPageForm
 */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { PagePathDomainCatalogEntry } from "@shared/constants/pageCategoriesHub";
import { PAGE_CATALOG_UNCATEGORIZED_DOMAIN } from "@shared/constants/pageCategoriesHub";
import {
  composeNewPageAddressSlug,
  formatPageDomainLabel,
  normalizePageSlugSegment,
  slugifyPageTitleToSlugSegment,
} from "@shared/lib/pagePathLogic";
import { fetchReservedPagePaths, isReservedSlugPath, validatePageSlug } from "@/components/puck/lib/pageSlugValidation";
import { PageCatalogSelect } from "@/components/pages/PageCatalogSelect";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

/** Props for {@link NewPageForm}. */
export interface NewPageFormProps {
  /** Visible path domains for the domain picker. */
  availableDomains: readonly PagePathDomainCatalogEntry[];
  /** Called with the validated editor path (e.g. `/news/about/edit?title=About`). */
  onNavigate?: (editorPath: string) => void;
}

/**
 * Build domain select options including flat "Other pages".
 *
 * @param availableDomains - Domain catalog rows from the server.
 * @returns Select options for {@link PageCatalogSelect}.
 */
function buildNewPageDomainOptions(
  availableDomains: readonly PagePathDomainCatalogEntry[],
): Array<{ value: string; label: string }> {
  const options = availableDomains.map((entry) => ({
    value: entry.domain,
    label: entry.title
      ? `${entry.title} (${formatPageDomainLabel(entry.domain)})`
      : formatPageDomainLabel(entry.domain),
  }));

  options.push({
    value: PAGE_CATALOG_UNCATEGORIZED_DOMAIN,
    label: "Other pages (flat URL)",
  });

  return options;
}

/**
 * Map the form domain select value to a path domain segment.
 *
 * @param domain - Selected domain or {@link PAGE_CATALOG_UNCATEGORIZED_DOMAIN}.
 * @returns Domain segment, or empty string for flat URLs.
 */
function resolveNewPageDomainSegment(domain: string): string {
  return domain === PAGE_CATALOG_UNCATEGORIZED_DOMAIN ? "" : domain;
}

/**
 * Form for creating a page — domain, title, slug, then open Puck editor.
 *
 * @param props - Domain catalog and navigation callback.
 * @returns New page creation form.
 */
export function NewPageForm({ availableDomains, onNavigate }: NewPageFormProps) {
  const router = useRouter();
  const domainOptions = useMemo(
    () => buildNewPageDomainOptions(availableDomains),
    [availableDomains],
  );

  const [domain, setDomain] = useState(
    () => availableDomains[0]?.domain ?? PAGE_CATALOG_UNCATEGORIZED_DOMAIN,
  );
  const [title, setTitle] = useState("");
  const [slugSegment, setSlugSegment] = useState("");
  const [slugEditedManually, setSlugEditedManually] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (domainOptions.some((option) => option.value === domain)) return;
    setDomain(domainOptions[0]?.value ?? PAGE_CATALOG_UNCATEGORIZED_DOMAIN);
  }, [domain, domainOptions]);

  const previewPath = useMemo(() => {
    const pageSlug =
      normalizePageSlugSegment(slugSegment) || slugifyPageTitleToSlugSegment(title);
    if (!pageSlug) return "/…";
    const addressSlug = composeNewPageAddressSlug(resolveNewPageDomainSegment(domain), pageSlug);
    return `/${addressSlug}`;
  }, [domain, slugSegment, title]);

  /**
   * Validate inputs and navigate to the Puck editor.
   *
   * @param e - Form submit event.
   */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Enter a page title.");
      return;
    }

    const pageSlug =
      normalizePageSlugSegment(slugSegment) || slugifyPageTitleToSlugSegment(trimmedTitle);
    if (!pageSlug) {
      setError("Enter a valid URL slug (letters, numbers, and hyphens).");
      return;
    }

    const addressSlug = composeNewPageAddressSlug(resolveNewPageDomainSegment(domain), pageSlug);
    const normalizedPath = `/${addressSlug}`.replace(/\/+/g, "/");
    if (isReservedSlugPath(normalizedPath)) {
      setError("That URL is reserved. Choose a different slug.");
      return;
    }

    setSubmitting(true);

    try {
      const reservedPaths = await fetchReservedPagePaths();
      const validation = validatePageSlug(addressSlug, {
        slugLocked: false,
        currentPath: "",
        reservedPaths,
      });

      if (!validation.valid) {
        setError(validation.error ?? "Invalid slug.");
        return;
      }

      const params = new URLSearchParams({ title: trimmedTitle });
      const editorPath = `${validation.normalizedPath}/edit?${params.toString()}`.replace("//", "/");
      if (onNavigate) {
        onNavigate(editorPath);
      } else {
        router.push(editorPath);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="page-manager-fab__form" onSubmit={(event) => void handleSubmit(event)}>
      <div className="page-manager-fab__field">
        <Label htmlFor="new-page-domain" className="page-manager-fab__field-label">
          Domain
        </Label>
        <PageCatalogSelect
          aria-label="Page domain"
          value={domain}
          options={domainOptions}
          triggerClassName="page-manager-fab__domain-select"
          onValueChange={setDomain}
        />
      </div>

      <div className="page-manager-fab__field">
        <Label htmlFor="new-page-title" className="page-manager-fab__field-label">
          Title
        </Label>
        <Input
          id="new-page-title"
          value={title}
          onChange={(event) => {
            setError(null);
            const nextTitle = event.target.value;
            setTitle(nextTitle);
            if (!slugEditedManually) {
              setSlugSegment(slugifyPageTitleToSlugSegment(nextTitle));
            }
          }}
          placeholder="Spring fair announcement"
          className="page-manager-fab__title-input"
          required
        />
      </div>

      <div className="page-manager-fab__field">
        <Label htmlFor="new-page-slug" className="page-manager-fab__field-label">
          URL slug
        </Label>
        <div className="page-manager-fab__slug-row">
          <span className="page-manager-fab__slug-prefix" aria-hidden="true">
            /
          </span>
          <Input
            id="new-page-slug"
            value={slugSegment}
            onChange={(event) => {
              setError(null);
              setSlugEditedManually(true);
              setSlugSegment(normalizePageSlugSegment(event.target.value));
            }}
            placeholder="spring-fair"
            className="page-manager-fab__slug-input"
            aria-describedby="new-page-path-preview"
            required
          />
        </div>
        <p id="new-page-path-preview" className="page-manager-fab__path-preview">
          Opens at <code>{previewPath}</code>
        </p>
      </div>

      {error ? (
        <p className="page-manager-fab__alert" role="alert">
          {error}
        </p>
      ) : null}

      <Button type="submit" className="page-manager-fab__submit" disabled={submitting}>
        {submitting ? "Opening…" : "Open editor"}
      </Button>
    </form>
  );
}

export default NewPageForm;
