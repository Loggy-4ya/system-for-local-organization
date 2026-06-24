/**
 * @fileoverview Toast copy helpers for manual Puck editor save/publish actions.
 *
 * @module src/components/puck/lib/puckEditorActionToasts
 */

import type { PagePublicationValue } from "@/components/puck/fields/PagePublicationFieldGroup";
import { normalizePublishAt } from "@shared/lib/pagePublicationLogic";
import { showSiteClientToast } from "@/lib/siteClientToast";

/**
 * Show a success toast after the user manually saves a draft.
 *
 * @param params - Save context.
 */
export function showPuckDraftSavedToast(params: {
  previousPath: string;
  savedPath: string;
}): void {
  const pathChanged = params.savedPath !== params.previousPath;
  showSiteClientToast({
    title: "Draft saved",
    body: pathChanged
      ? `Saved as ${params.savedPath}. The editor URL was updated.`
      : "Your changes were saved without publishing.",
    variant: "success",
  });
}

/**
 * Show a success toast after the user manually publishes from the editor header.
 *
 * @param publication - Resolved publication fields from the saved document.
 */
export function showPuckPublishedToast(publication: PagePublicationValue): void {
  const publishAt = normalizePublishAt(publication.publishAt);
  const now = new Date();

  if (publishAt && publishAt.getTime() > now.getTime()) {
    showSiteClientToast({
      title: "Publish scheduled",
      body: `This page will go live on ${publishAt.toLocaleString()}.`,
      variant: "success",
    });
    return;
  }

  showSiteClientToast({
    title: "Page published",
    body: "Your page is now live for viewers.",
    variant: "success",
  });
}
