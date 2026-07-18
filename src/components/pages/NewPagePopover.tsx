"use client";

/**
 * @fileoverview Bottom-right popover for creating a new Puck page.
 *
 * @module src/components/pages/NewPagePopover
 */

import { useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import type { PagePathDomainCatalogEntry } from "@shared/constants/pageCategoriesHub";
import { NewPageForm } from "@/app/[locale]/pages/NewPageForm";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Props for {@link NewPagePopover}. */
export interface NewPagePopoverProps {
  /** Visible path domains for the new-page form. */
  availableDomains: readonly PagePathDomainCatalogEntry[];
  /** Optional redirect notice from `?error=` query param. */
  notice?: "reserved-slug" | "homepage-code-only";
}

/**
 * Fixed bottom-right launcher that reveals the new-page creation form.
 *
 * @param props - Domain catalog and optional validation notice.
 * @returns FAB + anchored popover UI.
 */
export function NewPagePopover({ availableDomains, notice }: NewPagePopoverProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const openOnMount = notice === "reserved-slug" || notice === "homepage-code-only";
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (openOnMount) setOpen(true);
  }, [openOnMount]);

  useEffect(() => {
    if (!open) return undefined;
    const timer = window.setTimeout(() => {
      panelRef.current?.querySelector<HTMLInputElement>("#new-page-title")?.focus();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  /**
   * Navigate to the Puck editor for a validated page path.
   *
   * @param editorPath - Absolute editor path such as `/news/about/edit?title=About`.
   */
  function navigateToEditor(editorPath: string) {
    setOpen(false);
    router.push(editorPath);
  }

  return (
    <>
      {open ? (
        <button
          type="button"
          className="page-manager-fab__backdrop"
          aria-label="Close new page panel"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <div className={cn("page-manager-fab", open && "page-manager-fab--open")}>
        {open ? (
          <div
            ref={panelRef}
            className="page-manager-fab__panel glass-panel"
            role="dialog"
            aria-label="Create new page"
          >
            <div className="page-manager-fab__panel-header">
              <p className="page-manager-fab__panel-title">New page</p>
              <p className="page-manager-fab__panel-hint">
                Choose a domain, set the page title, and confirm the URL before opening the editor.
              </p>
            </div>

            {notice === "homepage-code-only" ? (
              <p className="page-manager-fab__alert" role="alert">
                The homepage at <code>/</code> is built in code, not Puck. Use a custom slug below.
              </p>
            ) : null}
            {notice === "reserved-slug" ? (
              <p className="page-manager-fab__alert" role="alert">
                That URL slug is reserved. Choose a different domain or slug.
              </p>
            ) : null}

            <NewPageForm
              availableDomains={availableDomains}
              canAddDomains
              onNavigate={navigateToEditor}
            />
          </div>
        ) : null}

        <Button
          type="button"
          size="icon-lg"
          className="page-manager-fab__launcher shadow-md"
          aria-expanded={open}
          aria-label={open ? "Close new page panel" : "Create new page"}
          onClick={() => setOpen((value) => !value)}
        >
          <Plus size={22} strokeWidth={2.25} aria-hidden="true" />
        </Button>
      </div>
    </>
  );
}

export default NewPagePopover;
