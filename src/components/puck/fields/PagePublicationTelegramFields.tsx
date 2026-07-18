"use client";

/**
 * @fileoverview Page-level Telegram notification controls in the Publication chapter.
 *
 * @module src/components/puck/fields/PagePublicationTelegramFields
 */

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ExternalLink } from "lucide-react";
import {
  buildPagePublishActionHref,
  buildPagePublishTelegramPreview,
} from "@shared/lib/pagePublishNotificationLogic";
import { FieldLabelRow } from "./FieldLabelRow";
import { PuckSwitchField } from "./PuckSwitchField";
import { usePageEditorMeta } from "../lib/pageEditorMetaContext";
import {
  getPageMetadataDraft,
  subscribePageMetadataDraft,
} from "../lib/editorPageMetadataStore";

/** Page publication slice required for Telegram notification UI. */
export interface PagePublicationTelegramSlice {
  /** Master go-live notification switch. */
  notifyOnPublish?: boolean;
  /** Web inbox fan-out when master switch is on. */
  notifyWebOnPublish?: boolean;
  /** Telegram DM fan-out when master switch is on. */
  notifyTelegramOnPublish?: boolean;
  /** Page title used in preview copy. */
  title?: string;
  /** Page summary used in preview copy. */
  description?: string;
}

/** Props for {@link PagePublicationTelegramFields}. */
export interface PagePublicationTelegramFieldsProps {
  /** Current publication values. */
  value: PagePublicationTelegramSlice;
  /** Partial publication patch. */
  onChange: (patch: Partial<PagePublicationTelegramSlice>) => void;
}

/**
 * Telegram notification toggles and live DM preview for page publishers.
 *
 * @param props - Publication slice and updater.
 * @returns Telegram subsection UI.
 */
export function PagePublicationTelegramFields({
  value,
  onChange,
}: PagePublicationTelegramFieldsProps) {
  const t = useTranslations("puck.pagePublicationTelegram");
  const tSettings = useTranslations("puck.pageSettings");
  const meta = usePageEditorMeta();
  const draft = useSyncExternalStore(subscribePageMetadataDraft, getPageMetadataDraft, () => null);

  const masterEnabled = value.notifyOnPublish ?? meta.notifyOnPublish ?? true;
  const notifyWeb = value.notifyWebOnPublish ?? meta.notifyWebOnPublish ?? true;
  const notifyTelegram = value.notifyTelegramOnPublish ?? meta.notifyTelegramOnPublish ?? true;

  const previewTitle =
    draft?.title?.trim() || meta.title || tSettings("untitledPlaceholder");
  const previewDescription = value.description?.trim() || meta.description || "";
  const previewPath = meta.path || "/news/example";
  const previewUrl =
    typeof window !== "undefined"
      ? buildPagePublishActionHref(window.location.origin, previewPath)
      : buildPagePublishActionHref("", previewPath);

  const template =
    meta.telegramPagePublishedTemplate?.trim() || "📰 {title}\n\n{body}\n\nOpen: {url}";
  const previewText =
    masterEnabled && notifyTelegram
      ? buildPagePublishTelegramPreview(template, previewTitle, previewDescription, previewUrl)
      : "";

  return (
    <div className="nexus-field-category">
      <FieldLabelRow label={t("memberNotifications")} hint={t("memberNotificationsHint")} />
      <PuckSwitchField
        label={t("notifyMembers")}
        description={t("notifyMembersDescription")}
        value={masterEnabled ? "yes" : "no"}
        onChange={(next) => {
          const enabled = next === "yes";
          onChange({
            notifyOnPublish: enabled,
            ...(enabled
              ? {}
              : { notifyWebOnPublish: false, notifyTelegramOnPublish: false }),
          });
        }}
        trueValue="yes"
        falseValue="no"
      />

      {masterEnabled ? (
        <>
          <PuckSwitchField
            label={t("webInbox")}
            description={t("webInboxDescription")}
            value={notifyWeb ? "yes" : "no"}
            onChange={(next) => onChange({ notifyWebOnPublish: next === "yes" })}
            trueValue="yes"
            falseValue="no"
          />
          <PuckSwitchField
            label={t("telegramDm")}
            description={t("telegramDmDescription")}
            value={notifyTelegram ? "yes" : "no"}
            onChange={(next) => onChange({ notifyTelegramOnPublish: next === "yes" })}
            trueValue="yes"
            falseValue="no"
          />

          {notifyTelegram ? (
            <div className="nexus-page-telegram-preview">
              <FieldLabelRow label={t("telegramPreview")} hint={t("telegramPreviewHint")} />
              <pre className="nexus-page-telegram-preview__body" aria-readonly="true">
                {previewText}
              </pre>
              {meta.canManageTelegramTemplates ? (
                <Link
                  href="/admin/telegram-bot"
                  className="nexus-page-telegram-preview__admin-link"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t("editBotMessages")}
                  <ExternalLink size={12} aria-hidden="true" />
                </Link>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

export default PagePublicationTelegramFields;
