"use client";

/**
 * @fileoverview Client-only Puck editor shell — avoids SSR/hydration mismatches.
 *
 * @module src/app/[...puckPath]/PuckEditorShell
 */

import "@/lib/safePointerCaptureInstall";
import "@/lib/puckAutoFrameStylesheetRejectionInstall";
import { useLocale } from "next-intl";
import { Puck, fieldsPlugin } from "@puckeditor/core";
import type { AppLocale } from "@/i18n/routing";
import { useLocalizedPuckConfig } from "@/components/puck/lib/useLocalizedPuckConfig";
import type { PagePublicationValue } from "@/components/puck/fields/PagePublicationFieldGroup";
import type { PageSettingsValue } from "@/components/puck/fields/PageSettingsFieldGroup";
import type { PageAccessEditorEntry } from "@shared/lib/pageAccessLogic";
import { normalizePagePath } from "@/components/puck/PagePathEditor";
import { resolvePagePublicationProps, resolvePageSettingsCategories } from "@/components/puck/lib/pageRootFieldProps";
import {
  showPuckDraftSavedToast,
  showPuckPublishedToast,
} from "@/components/puck/lib/puckEditorActionToasts";
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
import {
  usePuckBackgroundDraftSave,
  PUCK_RESERVED_PATHS_CACHE_MS,
} from "@/components/puck/lib/usePuckBackgroundDraftSave";
import { setPuckDraftSaveStatus } from "@/components/puck/lib/puckDraftSaveStatusStore";
import { resolvePuckDraftSaveStatus } from "@shared/lib/puckDraftAutosaveLogic";

/** Result of a draft persist attempt from {@link PuckEditorShell}. */
export type PuckDraftPersistResult =
  | { ok: true; path: string }
  | { ok: false; error?: string };

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
  /** Called after a successful draft save (path may have changed). */
  onSaved?: (nextPath: string) => void;
  /** Called after a successful background autosave (no full route refresh). */
  onAutoSaved?: (nextPath: string) => void;
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
): {
  title: string;
  cleanPath: string;
  categories: string[];
  publication: PagePublicationValue;
  delegatedEditors: PageAccessEditorEntry[];
} {
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

  const publication = resolvePagePublicationProps(
    rootProps as Parameters<typeof resolvePagePublicationProps>[0],
  );
  const categories = resolvePageSettingsCategories(
    rootProps as Parameters<typeof resolvePageSettingsCategories>[0],
  );
  const delegatedEditors = publication.delegatedEditors ?? [];

  return { title, cleanPath, categories, publication, delegatedEditors };
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
  onSaved,
  onAutoSaved,
}: PuckEditorShellProps) {
  const locale = useLocale() as AppLocale;
  const puckConfig = useLocalizedPuckConfig();
  const [error, setError] = useState<string | null>(null);
  const isCompactEditor = usePuckMobileEditorChrome();
  const autosaveDisabled = path === "/";

  const persistPage = useCallback(
    async (
      nextData: Data,
      requestPublish: boolean,
      options?: { silent?: boolean; cacheReservedPaths?: boolean },
    ): Promise<PuckDraftPersistResult> => {
      const silent = options?.silent === true;
      if (!silent) {
        setError(null);
      }
      const secret = process.env.NEXT_PUBLIC_PUCK_SECRET;
      const publishData = nextData ?? getLatestData();
      const { title, cleanPath, categories, publication, delegatedEditors } = resolvePageMetadata(
        publishData,
        pageTitle,
        path,
      );
      const rootProps = (publishData.root as { props?: Record<string, unknown> })?.props ?? {};
      const pageSettings = rootProps.pageSettings as PageSettingsValue | undefined;
      const slugLocked = pageSettings?.slugLocked ?? path === "/";

      if (!cleanPath || !cleanPath.startsWith("/")) {
        const message = "Path must start with a slash (/)";
        if (!silent) setError(message);
        return { ok: false, error: message };
      }

      if (cleanPath === "/" || path === "/") {
        const message = "The homepage cannot be saved from the editor. Edit src/app/page.tsx in code.";
        if (!silent) setError(message);
        return { ok: false, error: message };
      }

      const reservedPaths = await fetchReservedPagePaths(
        options?.cacheReservedPaths
          ? { maxAgeMs: PUCK_RESERVED_PATHS_CACHE_MS }
          : undefined,
      );
      const slugCheck = validatePageSlug(pageSettings?.slug ?? path.replace(/^\//, ""), {
        slugLocked,
        currentPath: path,
        reservedPaths,
      });

      if (!slugCheck.valid) {
        if (!silent) {
          setError(slugCheck.error ?? "Invalid page URL slug.");
        }
        return { ok: false, error: slugCheck.error ?? "Invalid page URL slug." };
      }

      if (!silent) {
        setPuckDraftSaveStatus("saving");
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
          categories,
          publication,
          delegatedEditors,
          published: requestPublish,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        let errMsg = requestPublish ? "Failed to publish page." : "Failed to save draft.";
        try {
          const parsed = JSON.parse(errText);
          errMsg = parsed.error || errMsg;
        } catch {
          /* use default */
        }
        if (!silent) {
          setError(errMsg);
        }
        console.error("[PuckEditorShell] Failed to persist page:", errText);
        return { ok: false, error: errMsg };
      }

      if (requestPublish) {
        onPublished(cleanPath);
      } else if (silent) {
        onAutoSaved?.(cleanPath);
      } else {
        onSaved?.(cleanPath);
        if (!onSaved) {
          onPublished(cleanPath);
        }
      }

      return { ok: true, path: cleanPath };
    },
    [getLatestData, onAutoSaved, onPublished, onSaved, pageTitle, path],
  );

  const saveDraftBackground = useCallback(
    async (data: Data) => persistPage(data, false, { silent: true, cacheReservedPaths: true }),
    [persistPage],
  );

  const { notifyDocumentEdited, markDocumentSaved } = usePuckBackgroundDraftSave({
    disabled: autosaveDisabled,
    getLatestData,
    saveDraft: saveDraftBackground,
    onAutoSaved,
    initialData: initialEditorData,
  });

  const handleSave = useCallback(
    async (nextData: Data) => {
      const result = await persistPage(nextData, false);
      if (result.ok) {
        markDocumentSaved(nextData);
        showPuckDraftSavedToast({ previousPath: path, savedPath: result.path, locale });
        return;
      }
      setPuckDraftSaveStatus(
        resolvePuckDraftSaveStatus({ dirty: true, saveInFlight: false }),
      );
    },
    [locale, markDocumentSaved, path, persistPage],
  );

  const handlePublish = useCallback(
    async (nextData: Data) => {
      const result = await persistPage(nextData, true);
      if (result.ok) {
        markDocumentSaved(nextData);
        const rootProps = (nextData.root as { props?: Record<string, unknown> })?.props ?? {};
        const publication = resolvePagePublicationProps(
          rootProps as Parameters<typeof resolvePagePublicationProps>[0],
        );
        showPuckPublishedToast(publication, locale);
      }
    },
    [locale, markDocumentSaved, persistPage],
  );

  const handleEditorDataChange = useCallback(
    (data: Data) => {
      onEditorDataChange(data);
      notifyDocumentEdited();
    },
    [notifyDocumentEdited, onEditorDataChange],
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
    <PuckEditorErrorProvider error={error} onPublish={handlePublish} onSave={handleSave}>
      <NexusEditorCanvasProvider>
        <Puck
          key={`${path}-${puckMountKey}-${isCompactEditor ? "compact" : "desktop"}`}
          config={puckConfig}
          data={initialEditorData}
          onChange={handleEditorDataChange}
          onPublish={handlePublish}
          onAction={handlePuckAction}
          overrides={PUCK_EDITOR_OVERRIDES}
          plugins={[nexusBlocksPlugin(), nexusOutlinePlugin(), fieldsPlugin()]}
          viewports={NEXUS_EDITOR_VIEWPORTS}
          iframe={{ enabled: false }}
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
