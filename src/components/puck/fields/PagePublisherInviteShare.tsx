"use client";

/**
 * @fileoverview Share control for publisher invite links in the Puck sidebar.
 *
 * @module src/components/puck/fields/PagePublisherInviteShare
 */

import { useState, useSyncExternalStore } from "react";
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
      setError("Publish the page once before sharing an invite link.");
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
      setError(err instanceof Error ? err.message : "Failed to copy invite link.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="nexus-page-publisher-subsection">
      <div className="nexus-page-publisher-subsection__head">
        <span className="nexus-page-publisher-subsection__label">Invite link</span>
        <NexusFieldHint
          text="Share this link so another signed-in user can join as a publisher. Links expire after 7 days; creating a new link replaces the previous one."
          label="About invite links"
          size="sm"
        />
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
            ? "Creating link…"
            : copied
              ? "Link copied"
              : inviteUrl
                ? "Copy invite link"
                : "Create invite link"}
        </span>
      </button>

      {!isPersisted ? (
        <p className="nexus-page-publisher-subsection__hint">Save the page once to enable invite links.</p>
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
