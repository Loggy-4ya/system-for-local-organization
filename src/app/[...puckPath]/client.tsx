"use client";

/**
 * @fileoverview Puck editor + viewer Client Component for Project Nexus.
 *
 * @module src/app/[...puckPath]/client
 */

import "@/lib/safePointerCaptureInstall";
import "@puckeditor/core/puck.css";
import "@/app/puck-editor.css";
import puckConfig from "@/components/puck/config";
import type { PageSettingsValue } from "@/components/puck/fields/PageSettingsFieldGroup";
import { normalizePageCategoryList } from "@shared/lib/pageCategoryLogic";
import { ensurePageRootChapterProps, resolvePagePublicationProps } from "@/components/puck/lib/pageRootFieldProps";
import {
  PageEditorMetaProvider,
  EMPTY_PAGE_EDITOR_META,
} from "@/components/puck/lib/pageEditorMetaContext";
import type { PageMetadataDto } from "@shared/domains/PageDomain";
import {
  resetPageBackgroundGrid,
  syncPageBackgroundGridFromPuckData,
} from "@/components/background/pageBackgroundGridStore";
import { ensureIslandOnEligibleBlocks } from "@/components/puck/lib/applyIslandDefaultsOnInsert";
import { withDefaultEditorContent } from "@/components/puck/lib/defaultEditorContent";
import { normalizeCarouselSlides, migrateLegacyNexusGridItems } from "@/components/puck/lib/puckDataTree";
import { setEditorPagePath } from "@/components/puck/lib/editorPagePathRef";
import { setEditorPagePersisted } from "@/components/puck/lib/editorPagePersistedRef";
import {
  initPageMetadataDraft,
  setPageMetadataSnapshot,
  type PageMetadataDraft,
} from "@/components/puck/lib/editorPageMetadataStore";
import {
  editorIslandSettingsRef,
  resolveEffectiveIslandComponents,
  setEditorIslandDefaultComponents,
} from "@/components/puck/lib/editorIslandSettings";
import { Render } from "@puckeditor/core";
import type { Data } from "@puckeditor/core";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { PageEditFab } from "@/components/puck/PageEditFab";
import { PageLikeButton } from "@/components/puck/PageLikeButton";
import { recordPageView } from "@/lib/pageEngagementClient";
import { SiteLoader } from "@/components/ui/SiteLoader";
import { StaticPageShell } from "@/components/ui/StaticPageShell";
import { DEFAULT_CONTENT_WIDTH } from "@/components/puck/lib/contentWidthTokens";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
  /** Category tags from MongoDB when puckData lacks `pageSettings.categories`. */
  pageCategories?: string[];
  /** Server-hydrated page metadata for publication sidebar fields. */
  pageMetadata?: PageMetadataDto;
  /** When true, renders the full Puck editor. Otherwise renders `<Render>`. */
  isEditing: boolean;
  /** When true, show the floating edit control on published Puck pages. */
  showPageEditFab?: boolean;
  /** Whether the session user already liked this page. */
  initialLiked?: boolean;
  /** Whether the viewer may toggle likes. */
  canLike?: boolean;
  /** True when the page is publicly visible (for view counting). */
  isPublicView?: boolean;
}

/**
 * Placeholder shown while the client-only Puck bundle loads.
 *
 * @returns Centered site loader for the editor chrome.
 */
function PuckEditorLoading() {
  return <SiteLoader label="Loading editor…" className="min-h-screen" />;
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
 * @returns Initial editor data and header metadata draft.
 */
function buildEditorData(
  data: Data | null,
  title: string,
  pagePath: string,
  pageCategories: string[] = [],
  pageMetadata: PageMetadataDto = EMPTY_PAGE_EDITOR_META,
): { editorData: Data; metadata: PageMetadataDraft } {
  const withContent = withDefaultEditorContent(data);
  const withCarousel = normalizeCarouselSlides(withContent);
  const withGrid = migrateLegacyNexusGridItems(withCarousel);
  const withIsland = ensureIslandOnEligibleBlocks(withGrid, {
    islandDefaultComponents: resolveEffectiveIslandComponents(),
  });
  const existingProps =
    (withIsland.root as { props?: Record<string, unknown> })?.props ?? {};
  const existingPageSettings = existingProps.pageSettings as PageSettingsValue | undefined;
  const existingPublication = existingProps.pagePublication as
    | import("@/components/puck/fields/PagePublicationFieldGroup").PagePublicationValue
    | undefined;

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
    categories: normalizePageCategoryList(
      existingPageSettings?.categories?.length
        ? existingPageSettings.categories
        : existingPublication?.categories?.length
          ? existingPublication.categories
          : pageCategories,
    ),
  };

  const publicationDefaults = resolvePagePublicationProps(
    existingProps as Parameters<typeof resolvePagePublicationProps>[0],
    {
      description: pageMetadata.description,
      coverImage: pageMetadata.coverImage,
      galleryImages: pageMetadata.galleryImages,
      publishAt: pageMetadata.publishAt,
      commentsEnabled: pageMetadata.commentsEnabled,
      delegatedEditors:
        existingPublication?.delegatedEditors?.length
          ? existingPublication.delegatedEditors
          : existingPageSettings?.delegatedEditors?.length
            ? existingPageSettings.delegatedEditors
            : pageMetadata.delegatedEditors,
    },
  );

  return {
    editorData: {
      ...withIsland,
      root: {
        ...(withIsland.root ?? {}),
        props: ensurePageRootChapterProps(
          {
            ...existingProps,
            pageSettings,
          },
          { ...publicationDefaults, categories: pageSettings.categories },
        ) as Record<string, unknown>,
      },
    },
    metadata: {
      title: pageSettings.title,
      slug: pageSettings.slug,
      slugLocked: pageSettings.slugLocked ?? false,
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
  return ensureIslandOnEligibleBlocks(migrateLegacyNexusGridItems(normalizeCarouselSlides(payload)), {
    islandDefaultComponents: resolveEffectiveIslandComponents(),
  });
}

/**
 * Puck Client Component — renders either the editor or the static viewer.
 *
 * @param props - See {@link PuckClientProps}.
 * @returns JSX for the Puck editor or the Puck render view.
 */
export function PuckClient({
  path,
  data,
  pageTitle,
  pageCategories = [],
  pageMetadata = EMPTY_PAGE_EDITOR_META,
  isEditing,
  showPageEditFab = false,
  initialLiked = false,
  canLike = false,
  isPublicView = false,
}: PuckClientProps) {
  const router = useRouter();
  setEditorPagePath(path);
  setEditorPagePersisted(data !== null);
  const [initialEditorData, setInitialEditorData] = useState<Data>(() => {
    const { editorData, metadata } = buildEditorData(
      data,
      pageTitle,
      path,
      pageCategories,
      pageMetadata,
    );
    setPageMetadataSnapshot(metadata);
    return editorData;
  });
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

    const { editorData: next, metadata } = buildEditorData(
      data,
      pageTitle,
      path,
      pageCategories,
      pageMetadata,
    );
    latestDataRef.current = next;
    setInitialEditorData(next);
    initPageMetadataDraft(metadata);
    setEditorPagePersisted(data !== null);
    setPuckMountKey((key) => key + 1);
  }, [data, pageTitle, pageCategories, pageMetadata, path, isEditing]);

  useEffect(() => {
    if (isEditing || !isPublicView || !path) return;
    void recordPageView(path).catch((err) => {
      console.error("[PuckClient] view count", err);
    });
  }, [isEditing, isPublicView, path]);

  const handleEditorDataChange = useCallback((nextData: Data) => {
    latestDataRef.current = nextData;
    syncPageBackgroundGridFromPuckData(nextData);
  }, []);

  const viewData = useMemo(
    () => (isEditing ? null : buildViewData(data)),
    [data, isEditing],
  );

  useEffect(() => {
    if (isEditing) {
      syncPageBackgroundGridFromPuckData(initialEditorData);
    } else {
      syncPageBackgroundGridFromPuckData(viewData);
    }
    return () => resetPageBackgroundGrid();
  }, [initialEditorData, isEditing, viewData]);

  const handlePublished = useCallback(
    (nextPath: string) => {
      setEditorPagePersisted(true);
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
      <PageEditorMetaProvider value={pageMetadata}>
        <PuckEditorShell
          path={path}
          pageTitle={pageTitle}
          initialEditorData={initialEditorData}
          puckMountKey={puckMountKey}
          getLatestData={() => latestDataRef.current}
          onEditorDataChange={handleEditorDataChange}
          onPublished={handlePublished}
        />
      </PageEditorMetaProvider>
    );
  }

  if (!data || !viewData) {
    return (
      <StaticPageShell
        contentWidth={DEFAULT_CONTENT_WIDTH}
        className="items-center justify-center py-16"
      >
        <p className="m-0 text-sm text-(--color-text-secondary)">
          This page has no content yet.
        </p>
      </StaticPageShell>
    );
  }

  return (
    <>
      <PageEditorMetaProvider value={pageMetadata}>
        <Render config={puckConfig} data={viewData} />
      </PageEditorMetaProvider>
      <PageLikeButton
        pagePath={path}
        initialLikeCount={pageMetadata.likeCount}
        initialLiked={initialLiked}
        canLike={canLike}
      />
      <PageEditFab pagePath={path} serverVisible={showPageEditFab} />
    </>
  );
}

export default PuckClient;
