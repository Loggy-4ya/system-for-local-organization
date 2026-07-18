/**
 * @fileoverview Toast copy helpers for manual Puck editor save/publish actions.
 *
 * @module src/components/puck/lib/puckEditorActionToasts
 */

import type { PagePublicationValue } from "@/components/puck/fields/PagePublicationFieldGroup";
import { formatLocaleMessage } from "@/lib/puckEditorToastCopy";
import type { AppLocale } from "@/i18n/routing";
import { normalizePublishAt } from "@shared/lib/pagePublicationLogic";
import { showSiteClientToast } from "@/lib/siteClientToast";

/**
 * Show a success toast after the user manually saves a draft.
 *
 * @param params - Save context and active locale.
 */
export function showPuckDraftSavedToast(params: {
  previousPath: string;
  savedPath: string;
  locale?: AppLocale;
}): void {
  const locale = params.locale ?? "en";
  const pathChanged = params.savedPath !== params.previousPath;
  showSiteClientToast({
    title: formatLocaleMessage(locale, "puck", "draftSaved"),
    body: pathChanged
      ? formatLocaleMessage(locale, "puck", "draftSavedPathChanged", {
          path: params.savedPath,
        })
      : formatLocaleMessage(locale, "puck", "draftSavedNoPublish"),
    variant: "success",
  });
}

/**
 * Show a success toast after the user manually publishes from the editor header.
 *
 * @param publication - Resolved publication fields from the saved document.
 * @param locale - Active UI locale.
 */
export function showPuckPublishedToast(
  publication: PagePublicationValue,
  locale: AppLocale = "en",
): void {
  const publishAt = normalizePublishAt(publication.publishAt);
  const now = new Date();

  if (publishAt && publishAt.getTime() > now.getTime()) {
    showSiteClientToast({
      title: formatLocaleMessage(locale, "puck", "publishScheduled"),
      body: formatLocaleMessage(locale, "puck", "publishScheduledBody", {
        date: publishAt.toLocaleString(),
      }),
      variant: "success",
    });
    return;
  }

  showSiteClientToast({
    title: formatLocaleMessage(locale, "puck", "pagePublished"),
    body: formatLocaleMessage(locale, "puck", "pagePublishedBody"),
    variant: "success",
  });
}
