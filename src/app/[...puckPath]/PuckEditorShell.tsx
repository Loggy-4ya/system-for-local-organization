"use client";

/**
 * @fileoverview Client-only Puck editor shell — avoids SSR/hydration mismatches.
 *
 * @module src/app/[...puckPath]/PuckEditorShell
 */

import "@/lib/safePointerCaptureInstall";
import { Puck, fieldsPlugin } from "@puckeditor/core";
import puckConfig from "@/components/puck/config";
import type { PageSettingsValue } from "@/components/puck/fields/PageSettingsFieldGroup";
import { normalizePagePath } from "@/components/puck/PagePathEditor";
import {
  fetchReservedPagePaths,
  validatePageSlug,
} from "@/components/puck/lib/pageSlugValidation";
import { NEXUS_EDITOR_VIEWPORTS } from "@/components/puck/lib/resolveAutoViewport";
import { nexusBlocksPlugin } from "@/components/puck/nexusBlocksPlugin";
import { nexusOutlinePlugin } from "@/components/puck/nexusOutlinePlugin";
import { usePuckMobileEditorChrome } from "@/components/puck/usePuckMobileEditorChrome";
import { NexusEditorCanvasProvider } from "@/components/puck/NexusEditorCanvasContext";
import { PuckEditorErrorProvider } from "@/components/puck/PuckEditorErrorContext";
import { PUCK_EDITOR_OVERRIDES } from "@/components/puck/puckEditorOverrides";
import { handleNexusGridItemPlacementAction } from "@/components/puck/NexusGridItemPlacementGuard";
import type { Data } from "@puckeditor/core";
import { useCallback, useState } from "react";

/** Props for the client-only Puck editor shell. */
export interface PuckEditorShellProps {
  /** Current MongoDB page path key. */
  path: string;
  /** Fallback title from MongoDB when root props omit one. */
  pageTitle: string;
  /** Initial Puck document passed to `<Puck data={…}>` (Puck owns live edits). */
  initialEditorData: Data;
  /** Bumps when server data arrives so Puck remounts with fresh `data`. */
  puckMountKey: number;
  /** Read the latest in-memory document for publish (ref-backed in parent). */
  getLatestData: () => Data;
  /** Ref-only sync from Puck `onChange` — does not lift React state. */
  onEditorDataChange: (data: Data) => void;
  /** Called after a successful publish (path may have changed). */
  onPublished: (nextPath: string) => void;
}

/**
 * Read page title and slug from root props (grouped or legacy flat shape).
 *
 * @param data - Puck document at publish time.
 * @param fallbackTitle - MongoDB title when root props omit one.
 * @param currentPath - Current MongoDB path key.
 * @returns Resolved title and normalized absolute path.
 */
function resolvePageMetadata(
  data: Data,
  fallbackTitle: string,
  currentPath: string,
): { title: string; cleanPath: string } {
  const rootProps = (data.root as { props?: Record<string, unknown> })?.props ?? {};
  const pageSettings = rootProps.pageSettings as PageSettingsValue | undefined;

  const title =
    pageSettings?.title ??
    (rootProps.title as string | undefined) ??
    fallbackTitle ??
    "Untitled Page";

  const slugLocked = pageSettings?.slugLocked ?? currentPath === "/";
  const cleanPath = slugLocked
    ? "/"
    : normalizePagePath(pageSettings?.slug ?? currentPath.replace(/^\//, ""));

  return { title, cleanPath };
}

/**
 * Full Puck editor with Nexus header overrides.
 *
 * @param props - See {@link PuckEditorShellProps}.
 * @returns Puck editor JSX.
 */
export function PuckEditorShell({
  path,
  pageTitle,
  initialEditorData,
  puckMountKey,
  getLatestData,
  onEditorDataChange,
  onPublished,
}: PuckEditorShellProps) {
  const [error, setError] = useState<string | null>(null);
  const isCompactEditor = usePuckMobileEditorChrome();

  const handlePublish = useCallback(
    async (nextData: Data) => {
      setError(null);
      const secret = process.env.NEXT_PUBLIC_PUCK_SECRET;
      const publishData = nextData ?? getLatestData();
      const { title, cleanPath } = resolvePageMetadata(publishData, pageTitle, path);
      const rootProps = (publishData.root as { props?: Record<string, unknown> })?.props ?? {};
      const pageSettings = rootProps.pageSettings as PageSettingsValue | undefined;
      const slugLocked = pageSettings?.slugLocked ?? path === "/";

      if (!cleanPath || !cleanPath.startsWith("/")) {
        setError("Path must start with a slash (/)");
        return;
      }

      if (cleanPath === "/" || path === "/") {
        setError("The homepage cannot be saved from the editor. Edit src/app/page.tsx in code.");
        return;
      }

      const reservedPaths = await fetchReservedPagePaths();
      const slugCheck = validatePageSlug(pageSettings?.slug ?? path.replace(/^\//, ""), {
        slugLocked,
        currentPath: path,
        reservedPaths,
      });

      if (!slugCheck.valid) {
        setError(slugCheck.error ?? "Invalid page URL slug.");
        return;
      }

      const res = await fetch("/api/puck", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
        },
        body: JSON.stringify({
          previousPath: path,
          path: cleanPath,
          puckData: publishData,
          title,
          published: true,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        let errMsg = "Failed to save page.";
        try {
          const parsed = JSON.parse(errText);
          errMsg = parsed.error || errMsg;
        } catch {
          /* use default */
        }
        setError(errMsg);
        console.error("[PuckEditorShell] Failed to save page:", errText);
        return;
      }

      onPublished(cleanPath);
    },
    [getLatestData, onPublished, pageTitle, path],
  );

  const handlePuckAction = useCallback(
    (
      action: Parameters<typeof handleNexusGridItemPlacementAction>[0],
      appState: Parameters<typeof handleNexusGridItemPlacementAction>[1],
      prevAppState: Parameters<typeof handleNexusGridItemPlacementAction>[2],
    ) => {
      handleNexusGridItemPlacementAction(action, appState, prevAppState);
    },
    [],
  );

  return (
    <PuckEditorErrorProvider error={error} onPublish={handlePublish}>
      <NexusEditorCanvasProvider>
        <Puck
          key={`${path}-${puckMountKey}-${isCompactEditor ? "compact" : "desktop"}`}
          config={puckConfig}
          data={initialEditorData}
          onChange={onEditorDataChange}
          onPublish={handlePublish}
          onAction={handlePuckAction}
          overrides={PUCK_EDITOR_OVERRIDES}
          plugins={[nexusBlocksPlugin(), nexusOutlinePlugin(), fieldsPlugin()]}
          viewports={NEXUS_EDITOR_VIEWPORTS}
          _experimentalFullScreenCanvas={isCompactEditor}
          ui={
            isCompactEditor
              ? {
                  leftSideBarVisible: false,
                  rightSideBarVisible: false,
                  rightSideBarWidth: 0,
                }
              : undefined
          }
        />
      </NexusEditorCanvasProvider>
    </PuckEditorErrorProvider>
  );
}

export default PuckEditorShell;
