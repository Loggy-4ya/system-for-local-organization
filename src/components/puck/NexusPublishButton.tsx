"use client";

/**
 * @fileoverview Nexus publish control for the Puck editor header.
 *
 * Replaces Puck's default publish `Button` so the Globe icon stays visible on
 * narrow headers without relying on CSS text-hiding hacks.
 *
 * @module src/components/puck/NexusPublishButton
 */

import { useGetPuck } from "@puckeditor/core";
import { Globe } from "lucide-react";
import { siteChromeLucideProps } from "@/components/global-layout/resolveLucideIcon";
import { useCallback, useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import { usePuckEditorPublish } from "@/components/puck/PuckEditorErrorContext";
import { useIconOnlyEditorHeader } from "@/components/puck/usePuckMobileEditorChrome";

/** Props for {@link NexusPublishButton}. */
export interface NexusPublishButtonProps {
  /** Optional extra CSS class names. */
  className?: string;
}

/**
 * Publish the current Puck document via the shell's `onPublish` handler.
 *
 * @param props - See {@link NexusPublishButtonProps}.
 * @returns Publish button JSX.
 */
export function NexusPublishButton({
  className = "nexus-mode-toggle nexus-editor-header-btn nexus-publish-btn",
}: NexusPublishButtonProps) {
  const getPuck = useGetPuck();
  const onPublish = usePuckEditorPublish();
  const iconOnly = useIconOnlyEditorHeader();
  const [loading, setLoading] = useState(false);

  const handlePublish = useCallback(async () => {
    if (!onPublish || loading) return;

    setLoading(true);
    try {
      const { appState } = getPuck();
      await onPublish(appState.data);
    } finally {
      setLoading(false);
    }
  }, [getPuck, loading, onPublish]);

  return (
    <button
      type="button"
      className={
        iconOnly
          ? `${className} nexus-publish-btn--icon-only`
          : className
      }
      onClick={() => void handlePublish()}
      disabled={!onPublish || loading}
      aria-label="Publish"
      title="Publish"
    >
      {loading ? (
        <Spinner className="nexus-publish-btn__icon size-3.5" aria-hidden />
      ) : (
        <Globe className="nexus-publish-btn__icon site-chrome-icon" {...siteChromeLucideProps()} aria-hidden />
      )}
      {iconOnly ? null : <span className="nexus-publish-btn__label">Publish</span>}
    </button>
  );
}

export default NexusPublishButton;
