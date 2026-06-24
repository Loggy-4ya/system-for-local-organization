"use client";

/**
 * @fileoverview Confirmation dialog for cross-domain page moves in Page Manager.
 *
 * @module src/components/pages/CrossDomainMoveDialog
 */

import type { PageManagerCrossDomainMove } from "@shared/lib/pageManagerCatalogLogic";
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

/** Props for {@link CrossDomainMoveDialog}. */
export interface CrossDomainMoveDialogProps {
  /** Pending move metadata, or null when closed. */
  pending: PageManagerCrossDomainMove | null;
  /** Whether the server request is in flight. */
  isSubmitting?: boolean;
  /** Close without applying the move. */
  onCancel: () => void;
  /** Apply the cross-domain move after confirmation. */
  onConfirm: () => void;
}

/**
 * Ask the publisher to confirm a URL domain change before moving a page card.
 *
 * @param props - Dialog state and handlers.
 * @returns Modal confirmation UI.
 */
export function CrossDomainMoveDialog({
  pending,
  isSubmitting = false,
  onCancel,
  onConfirm,
}: CrossDomainMoveDialogProps) {
  const open = pending != null;

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onCancel()}>
      <DialogContent showCloseButton={!isSubmitting}>
        <DialogHeader>
          <DialogTitle>Move page to another domain?</DialogTitle>
          <DialogDescription>
            {pending ? (
              <>
                This will move <strong>{pending.pagePath}</strong> from{" "}
                <strong>{formatPageDomainLabel(pending.fromDomain)}</strong> to{" "}
                <strong>{formatPageDomainLabel(pending.toDomain)}</strong>. The page URL will change to{" "}
                <strong>{pending.newPath}</strong>. Existing links to the old URL will stop working.
              </>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button type="button" variant="outline" disabled={isSubmitting} onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" disabled={isSubmitting} onClick={onConfirm}>
            {isSubmitting ? "Moving…" : "Yes, move page"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CrossDomainMoveDialog;
