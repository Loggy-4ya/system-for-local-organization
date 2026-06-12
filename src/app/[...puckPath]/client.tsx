"use client";

/**
 * @fileoverview Puck editor + viewer Client Component for Project Nexus.
 *
 * @module src/app/[...puckPath]/client
 */

import puckConfig from "@/components/puck/config";
import type { PageSettingsValue } from "@/components/puck/fields/PageSettingsFieldGroup";
import { ensureIslandOnEligibleBlocks, applyIslandDefaultsOnInsert } from "@/components/puck/lib/applyIslandDefaultsOnInsert";
import { withDefaultEditorContent } from "@/components/puck/lib/defaultEditorContent";
import { normalizeCarouselSlides } from "@/components/puck/lib/puckDataTree";
import { setEditorPagePath } from "@/components/puck/lib/editorPagePathRef";
import {
  editorIslandSettingsRef,
  resolveEffectiveIslandComponents,
  setEditorIslandDefaultComponents,
} from "@/components/puck/lib/editorIslandSettings";
import { Render } from "@measured/puck";
import { installSafePointerCapture } from "@/lib/safePointerCapture";
import type { Data } from "@measured/puck";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

installSafePointerCapture();

/** Puck editor loaded only on the client to avoid hydration mismatches. */
const PuckEditorShell = dynamic(
  () => import("./PuckEditorShell").then((m) => m.PuckEditorShell),
  {
    ssr: false,
    loading: () => <PuckEditorLoading />,
  },
);

/** Props accepted by the Puck client component. */
interface PuckClientProps {
  /** Absolute page path (e.g. `"/news"`) used as the MongoDB document key. */
  path: string;
  /** Serialised Puck layout data loaded from MongoDB, or `null` for new pages. */
  data: Data | null;
  /** Human-readable page title from MongoDB. */
  pageTitle: string;
  /** When true, renders the full Puck editor. Otherwise renders `<Render>`. */
  isEditing: boolean;
}

/**
 * Minimal placeholder shown while the client-only Puck bundle loads.
 *
 * @returns Loading skeleton for the editor chrome.
 */
function PuckEditorLoading() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        color: "var(--color-text-secondary)",
        fontSize: 14,
      }}
      aria-busy="true"
      aria-label="Loading page editor"
    >
      Loading editor…
    </div>
  );
}

/**
 * Convert a MongoDB page path to a slug stored in root page settings.
 *
 * @param pagePath - Absolute path such as `/news` or `/`.
 * @returns Slug without leading slash (empty for homepage).
 */
function pathToSlug(pagePath: string): string {
  return pagePath === "/" ? "" : pagePath.replace(/^\//, "");
}

/**
 * Merge server metadata into Puck root props once at editor init.
 *
 * @param data - Loaded Puck payload.
 * @param title - MongoDB page title fallback.
 * @param pagePath - MongoDB page path key.
 * @returns Initial editor data object.
 */
function buildEditorData(data: Data | null, title: string, pagePath: string): Data {
  const withContent = withDefaultEditorContent(data);
  const withCarousel = normalizeCarouselSlides(withContent);
  const withIsland = ensureIslandOnEligibleBlocks(withCarousel, {
    islandDefaultComponents: resolveEffectiveIslandComponents(),
  });
  const existingProps =
    (withIsland.root as { props?: Record<string, unknown> })?.props ?? {};
  const existingPageSettings = existingProps.pageSettings as PageSettingsValue | undefined;

  const pageSettings: PageSettingsValue = {
    title:
      existingPageSettings?.title ??
      (existingProps.title as string | undefined) ??
      title ??
      "Untitled Page",
    slug: existingPageSettings?.slug?.trim()
      ? existingPageSettings.slug
      : pathToSlug(pagePath),
    slugLocked: pagePath === "/",
  };

  return {
    ...withIsland,
    root: {
      ...(withIsland.root ?? {}),
      props: {
        ...existingProps,
        pageSettings,
      } as Record<string, unknown>,
    },
  };
}

/**
 * Normalize viewer payload with island defaults for static render.
 *
 * @param payload - MongoDB Puck document.
 * @returns Viewer-ready data or null.
 */
function buildViewData(payload: Data | null): Data | null {
  if (!payload) return null;
  return ensureIslandOnEligibleBlocks(normalizeCarouselSlides(payload), {
    islandDefaultComponents: resolveEffectiveIslandComponents(),
  });
}

/**
 * Puck Client Component — renders either the editor or the static viewer.
 *
 * @param props - See {@link PuckClientProps}.
 * @returns JSX for the Puck editor or the Puck render view.
 */
export function PuckClient({ path, data, pageTitle, isEditing }: PuckClientProps) {
  const router = useRouter();
  setEditorPagePath(path);
  const [initialEditorData, setInitialEditorData] = useState<Data>(() =>
    buildEditorData(data, pageTitle, path),
  );
  const [puckMountKey, setPuckMountKey] = useState(0);
  const latestDataRef = useRef(initialEditorData);
  const skipServerSyncRef = useRef(true);

  useEffect(() => {
    if (!isEditing) return;

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/editor-settings");
        if (!res.ok) return;
        const payload = (await res.json()) as { islandDefaultComponents?: string[] };
        if (!cancelled && payload.islandDefaultComponents) {
          setEditorIslandDefaultComponents(payload.islandDefaultComponents);
        }
      } catch {
        /* keep seed defaults */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isEditing]);

  useEffect(() => {
    if (!isEditing) return;
    if (skipServerSyncRef.current) {
      skipServerSyncRef.current = false;
      return;
    }

    const next = buildEditorData(data, pageTitle, path);
    latestDataRef.current = next;
    setInitialEditorData(next);
    setPuckMountKey((key) => key + 1);
  }, [data, pageTitle, path, isEditing]);

  const handleEditorDataChange = useCallback((nextData: Data) => {
    const prev = latestDataRef.current;
    const patched = applyIslandDefaultsOnInsert(prev, nextData, {
      islandDefaultComponents: resolveEffectiveIslandComponents(),
    });
    latestDataRef.current = patched;
  }, []);

  const handlePublished = useCallback(
    (nextPath: string) => {
      if (nextPath !== path) {
        router.replace(`${nextPath}/edit`);
        return;
      }
      router.refresh();
    },
    [path, router],
  );

  if (isEditing) {
    return (
      <PuckEditorShell
        path={path}
        pageTitle={pageTitle}
        initialEditorData={initialEditorData}
        puckMountKey={puckMountKey}
        getLatestData={() => latestDataRef.current}
        onEditorDataChange={handleEditorDataChange}
        onPublished={handlePublished}
      />
    );
  }

  const viewData = buildViewData(data);

  if (!data || !viewData) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 200,
          color: "var(--color-text-secondary)",
          fontSize: 14,
        }}
      >
        This page has no content yet.
      </div>
    );
  }

  return <Render config={puckConfig} data={viewData} />;
}

export default PuckClient;
