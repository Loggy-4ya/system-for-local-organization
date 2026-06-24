"use client";

/**
 * @fileoverview Confirmation dialog when an admin removes a catalog domain section.
 *
 * @module src/components/pages/RemoveCatalogDomainDialog
 */

import { formatPageDomainLabel } from "@shared/lib/pagePathLogic";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/** Pending domain removal surfaced to the confirmation dialog. */
export interface PendingCatalogDomainRemoval {
  /** Hub section id being removed. */
  sectionId: string;
  /** Path domain segment (not `uncategorized`). */
  domain: string;
  /** Pages currently listed under the section. */
  pageCount: number;
}

/** Props for {@link RemoveCatalogDomainDialog}. */
export interface RemoveCatalogDomainDialogProps {
  /** Pending removal metadata, or null when closed. */
  pending: PendingCatalogDomainRemoval | null;
  /** Whether the server request is in flight. */
  isSubmitting?: boolean;
  /** Close without removing the domain. */
  onCancel: () => void;
  /** Delete the domain and move its pages to Other pages. */
  onConfirm: () => void;
}

/**
 * Ask an administrator to confirm deleting a path domain from the catalog.
 *
 * @param props - Dialog state and handlers.
 * @returns Modal confirmation UI.
 */
export function RemoveCatalogDomainDialog({
  pending,
  isSubmitting = false,
  onCancel,
  onConfirm,
}: RemoveCatalogDomainDialogProps) {
  const open = pending != null;

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && !isSubmitting && onCancel()}>
      <DialogContent showCloseButton={!isSubmitting}>
        <DialogHeader>
          <DialogTitle>Delete domain from catalog?</DialogTitle>
          <DialogDescription>
            {pending ? (
              <>
                This removes <strong>{formatPageDomainLabel(pending.domain)}</strong> from the
                domain registry and drops its catalog section.{" "}
                {pending.pageCount > 0 ? (
                  <>
                    <strong>{pending.pageCount}</strong> page
                    {pending.pageCount === 1 ? "" : "s"} will move to{" "}
                    <strong>Other pages</strong> with flat URLs (for example{" "}
                    <strong>{formatPageDomainLabel(pending.domain)}/article</strong> becomes{" "}
                    <strong>/article</strong>).
                  </>
                ) : (
                  <>No pages are currently listed under this domain.</>
                )}
              </>
            ) : null}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirm} disabled={isSubmitting}>
            {isSubmitting ? "Deleting…" : "Delete domain"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default RemoveCatalogDomainDialog;
