"use client";

/**
 * @fileoverview Share control for publisher invite links in the Puck sidebar.
 *
 * @module src/components/puck/fields/PagePublisherInviteShare
 */

import { useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { Link2 } from "lucide-react";
import { NexusFieldHint } from "@/components/ui/NexusFieldHint";
import { editorPagePathRef } from "../lib/editorPagePathRef";
import {
  getEditorPagePersisted,
  subscribeEditorPagePersisted,
} from "../lib/editorPagePersistedRef";
import { createPagePublisherInviteLink } from "../lib/pagePublisherInviteClient";
import { usePageEditorMeta } from "../lib/pageEditorMetaContext";

/**
 * Copy-to-clipboard publisher invite link control.
 *
 * @returns Invite share UI or null when the actor cannot manage access.
 */
export function PagePublisherInviteShare() {
  const t = useTranslations("puck.pagePublisherInvite");
  const meta = usePageEditorMeta();
  const isPersisted = useSyncExternalStore(
    subscribeEditorPagePersisted,
    getEditorPagePersisted,
    () => false,
  );

  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!meta.canManagePageAccess) return null;

  const handleShare = async () => {
    setError(null);
    setCopied(false);

    if (!isPersisted) {
      setError(t("publishOnceError"));
      return;
    }

    setLoading(true);
    try {
      let url = inviteUrl;
      if (!url) {
        const response = await createPagePublisherInviteLink(editorPagePathRef.currentPath);
        url = response.url;
        setInviteUrl(url);
      }

      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2400);
    } catch (err) {
      const fallback = t("copyError");
      setError(err instanceof Error && err.message ? err.message : fallback);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="nexus-page-publisher-subsection">
      <div className="nexus-page-publisher-subsection__head">
        <span className="nexus-page-publisher-subsection__label">{t("inviteLink")}</span>
        <NexusFieldHint text={t("inviteLinkHint")} label={t("inviteLinkHintAria")} size="sm" />
      </div>

      <button
        type="button"
        className="nexus-page-publisher-invite__btn"
        disabled={loading || !isPersisted}
        onClick={() => {
          void handleShare();
        }}
      >
        <Link2 className="size-3.5 shrink-0" aria-hidden="true" />
        <span className="nexus-page-publisher-invite__btn-label">
          {loading
            ? t("creatingLink")
            : copied
              ? t("linkCopied")
              : inviteUrl
                ? t("copyInviteLink")
                : t("createInviteLink")}
        </span>
      </button>

      {!isPersisted ? (
        <p className="nexus-page-publisher-subsection__hint">{t("saveOnceHint")}</p>
      ) : null}

      {error ? (
        <p className="nexus-page-publisher-subsection__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export default PagePublisherInviteShare;
