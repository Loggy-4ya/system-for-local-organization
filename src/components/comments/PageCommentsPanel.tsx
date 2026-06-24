"use client";

/**
 * @fileoverview YouTube-style bottom drawer for page comments.
 *
 * @module src/components/comments/PageCommentsPanel
 */

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronRight, Maximize2, MessageSquareText, Minimize2, X } from "lucide-react";
import { useSession } from "next-auth/react";
import type { PageCommentDto, PageCommentListResult } from "@shared/domains/CommentDomain";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  contentWidthContainerStyle,
  resolveContentWidth,
} from "@/components/puck/lib/contentWidthTokens";
import { usePageContentWidth } from "@/components/puck/lib/PageContentWidthContext";
import { usePageEditorMeta } from "@/components/puck/lib/pageEditorMetaContext";
import { useLazyVisible } from "@/lib/useLazyVisible";
import {
  fetchPageCommentCount,
  fetchPageComments,
  fetchTopLikedPageComments,
  PAGE_COMMENTS_BATCH_SIZE,
} from "@/lib/pageCommentsClient";
import {
  pageCommentsCacheKeys,
  readPageCommentsCache,
  runWhenBrowserIdle,
} from "@/lib/pageCommentsClientCache";
import { prefetchPageCommentsRegion } from "@/lib/prefetchPageComments";
import { PageCommentComposer } from "./PageCommentComposer";
import { PageCommentRow } from "./PageCommentRow";
import { PageCommentsTopLikedStrip } from "./PageCommentsTopLikedStrip";
import {
  clampCommentsPreviewIntervalSeconds,
  normalizeCommentsLayoutAlign,
  normalizeCommentsLayoutWidth,
  normalizeCommentsViewMode,
  resolveCommentsBandStyle,
  type CommentsLayoutAlign,
  type CommentsLayoutWidth,
  type CommentsViewMode,
} from "@shared/lib/pageCommentsLayoutLogic";

/** Drawer height preset. */
type CommentsDrawerSize = "comfortable" | "expanded";

/** Props for {@link PageCommentsPanel}. */
export interface PageCommentsPanelProps {
  /** MongoDB page path key. */
  pagePath: string;
  /** Whether comments are enabled on this page. */
  commentsEnabled: boolean;
  /** Puck editor / iframe preview — static chrome only, no drawer or network. */
  preview?: boolean;
  /** Optional label override for the launcher chip. */
  launcherLabel?: string;
  /** Surface style — compact launcher or top-liked preview strip. */
  viewMode?: CommentsViewMode;
  /** Band width inside the page container. */
  layoutWidth?: CommentsLayoutWidth;
  /** Horizontal placement when the band is narrower than the container. */
  layoutAlign?: CommentsLayoutAlign;
  /** Seconds between top-liked preview rotations. */
  previewIntervalSeconds?: number;
}

/**
 * Merge comment pages without duplicate ids.
 *
 * @param existing - Already rendered rows.
 * @param incoming - Next batch.
 * @returns Combined list.
 */
function mergeCommentPages(
  existing: PageCommentDto[],
  incoming: PageCommentDto[],
): PageCommentDto[] {
  const seen = new Set(existing.map((row) => row.id));
  const next = [...existing];
  for (const row of incoming) {
    if (!seen.has(row.id)) {
      seen.add(row.id);
      next.push(row);
    }
  }
  return next;
}

/**
 * Compact comments launcher + slide-up discussion drawer.
 *
 * @param props - Page path and feature flags.
 * @returns Launcher chip and drawer UI.
 */
export function PageCommentsPanel({
  pagePath,
  commentsEnabled,
  preview = false,
  launcherLabel = "Comments",
  viewMode: rawViewMode = "launcher",
  layoutWidth: rawLayoutWidth = "full",
  layoutAlign: rawLayoutAlign = "center",
  previewIntervalSeconds = 6,
}: PageCommentsPanelProps) {
  const viewMode = normalizeCommentsViewMode(rawViewMode);
  const layoutWidth = normalizeCommentsLayoutWidth(rawLayoutWidth);
  const layoutAlign = normalizeCommentsLayoutAlign(rawLayoutAlign);
  const rotationSeconds = clampCommentsPreviewIntervalSeconds(previewIntervalSeconds);
  const bandStyle = resolveCommentsBandStyle(layoutWidth, layoutAlign);
  const session = useSession();
  const meta = usePageEditorMeta();
  const canInteract = !preview && session.status === "authenticated";
  const viewerUserId = session.data?.user?.id ?? null;
  const canAuthorHeart =
    canInteract &&
    Boolean(meta.authorUserId && viewerUserId && meta.authorUserId === viewerUserId);
  const pageAuthorDisplayName = meta.authorDisplayName;
  const pageContentWidth = usePageContentWidth();
  const pageContainerStyle = contentWidthContainerStyle(pageContentWidth);
  const drawerWidthStyle = {
    width: "100%",
    maxWidth: pageContainerStyle.maxWidth,
    marginLeft: "auto",
    marginRight: "auto",
    ["--nexus-page-comments-max-width" as string]: pageContainerStyle.maxWidth,
  } as const;

  const { ref: launcherRef, visible: launcherVisible } = useLazyVisible({
    enabled: !preview && commentsEnabled && Boolean(pagePath),
  });
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const listRef = useRef<HTMLDivElement | null>(null);
  const fetchingNextRef = useRef(false);

  const [open, setOpen] = useState(false);
  const [drawerMounted, setDrawerMounted] = useState(false);
  const [drawerSize, setDrawerSize] = useState<CommentsDrawerSize>("comfortable");
  const [count, setCount] = useState<number | null>(
    preview ? 0 : meta.commentCount ?? null,
  );
  const [comments, setComments] = useState<PageCommentDto[]>([]);
  const [listPage, setListPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [topLikedComments, setTopLikedComments] = useState<PageCommentDto[]>([]);

  const shellStyle = {
    ["--nexus-page-comments-max-width" as string]: resolveContentWidth(pageContentWidth),
  } as const;

  const renderBand = (content: ReactNode) => (
    <div className="nexus-page-comments-shell" style={shellStyle}>
      <div className="nexus-page-comments-band" style={bandStyle}>
        {content}
      </div>
    </div>
  );

  useEffect(() => {
    if (preview || meta.commentCount === null || meta.commentCount === undefined) return;
    setCount(meta.commentCount);
  }, [meta.commentCount, preview]);

  const prefetchRegion = useCallback(() => {
    if (preview || !commentsEnabled || !pagePath) return;
    prefetchPageCommentsRegion(pagePath, {
      viewMode,
      needsCount: count === null,
    });
  }, [commentsEnabled, count, pagePath, preview, viewMode]);

  useEffect(() => {
    if (!open) return;
    setDrawerMounted(true);
  }, [open]);

  useEffect(() => {
    if (preview || !commentsEnabled || !pagePath || !launcherVisible) return;
    if (count !== null) return;

    runWhenBrowserIdle(() => {
      void fetchPageCommentCount(pagePath)
        .then(setCount)
        .catch(() => setCount(0));
    });
  }, [commentsEnabled, count, launcherVisible, pagePath, preview]);

  useEffect(() => {
    if (preview || viewMode !== "topLiked" || !commentsEnabled || !pagePath || !launcherVisible) {
      return;
    }

    runWhenBrowserIdle(() => {
      void fetchTopLikedPageComments(pagePath, 5)
        .then(setTopLikedComments)
        .catch(() => setTopLikedComments([]));
    });
  }, [commentsEnabled, launcherVisible, pagePath, preview, viewMode]);

  const loadComments = useCallback(
    async (targetPage: number, mode: "replace" | "append", bypassCache = false) => {
      if (preview || !commentsEnabled || !pagePath) return;
      const isFirstPage = targetPage === 1;
      if (isFirstPage && mode === "replace") {
        setLoadingInitial(true);
      } else {
        setLoadingMore(true);
      }
      setLoadError(null);

      try {
        const result = await fetchPageComments(
          pagePath,
          {
            page: targetPage,
            limit: PAGE_COMMENTS_BATCH_SIZE,
            includeReplies: false,
            bypassCache,
          },
        );
        setComments((prev) =>
          mode === "append" ? mergeCommentPages(prev, result.comments) : result.comments,
        );
        setListPage(result.meta.page);
        setTotalPages(result.meta.totalPages);
        setCount(result.meta.totalCount);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "Failed to load comments.");
      } finally {
        setLoadingInitial(false);
        setLoadingMore(false);
      }
    },
    [commentsEnabled, pagePath, preview],
  );

  const hydrateCommentsFromCache = useCallback(() => {
    const cached = readPageCommentsCache<PageCommentListResult>(
      pageCommentsCacheKeys.list(pagePath, 1, PAGE_COMMENTS_BATCH_SIZE),
    );
    if (!cached) return false;
    setComments(cached.comments);
    setListPage(cached.meta.page);
    setTotalPages(cached.meta.totalPages);
    setCount(cached.meta.totalCount);
    return cached.comments.length > 0;
  }, [pagePath]);

  const openDrawer = useCallback(() => {
    prefetchRegion();
    if (!hydrateCommentsFromCache()) {
      setComments([]);
    }
    setOpen(true);
  }, [hydrateCommentsFromCache, prefetchRegion]);

  useEffect(() => {
    if (!open || preview) return;
    void loadComments(1, "replace", comments.length === 0);
  }, [comments.length, loadComments, open, preview]);

  useEffect(() => {
    if (!open || preview || loadingInitial || loadingMore) return;
    if (listPage >= totalPages) return;

    const root = listRef.current;
    const node = loadMoreRef.current;
    if (!root || !node || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        if (fetchingNextRef.current || listPage >= totalPages) return;
        fetchingNextRef.current = true;
        void loadComments(listPage + 1, "append").finally(() => {
          fetchingNextRef.current = false;
        });
      },
      { root, rootMargin: "120px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [listPage, loadComments, loadingInitial, loadingMore, open, preview, totalPages]);

  const refreshComments = useCallback(() => {
    void loadComments(1, "replace", true);
  }, [loadComments]);

  if (!commentsEnabled) {
    return renderBand(
      <div className="nexus-page-comments-launcher glass-panel nexus-page-comments-launcher--disabled">
        <MessageSquareText className="size-4" aria-hidden="true" />
        <span>Comments are turned off for this page.</span>
      </div>,
    );
  }

  const countLabel = count === null ? "…" : String(count);

  if (preview) {
    return renderBand(
      viewMode === "topLiked" ? (
        <PageCommentsTopLikedStrip
          launcherLabel={launcherLabel}
          countLabel="0"
          comments={[]}
          previewIntervalSeconds={rotationSeconds}
          preview
          onOpen={() => undefined}
        />
      ) : (
        <div className="nexus-page-comments-launcher glass-panel nexus-page-comments-launcher--preview">
          <MessageSquareText className="size-4 shrink-0" aria-hidden="true" />
          <span className="nexus-page-comments-launcher__label">{launcherLabel}</span>
          <span className="nexus-page-comments-launcher__count">0</span>
          <p className="nexus-page-comments-launcher__hint">
            Opens a discussion panel on the published page.
          </p>
        </div>
      ),
    );
  }

  return renderBand(
    <>
      {viewMode === "topLiked" ? (
        <div
          ref={(node) => {
            launcherRef.current = node;
          }}
        >
          <PageCommentsTopLikedStrip
            launcherLabel={launcherLabel}
            countLabel={countLabel}
            comments={topLikedComments}
            previewIntervalSeconds={rotationSeconds}
            onOpen={openDrawer}
          />
        </div>
      ) : (
        <button
          ref={(node) => {
            launcherRef.current = node;
          }}
          type="button"
          className="nexus-page-comments-launcher glass-panel"
          aria-expanded={open}
          aria-controls="nexus-page-comments-drawer"
          onPointerEnter={prefetchRegion}
          onFocus={prefetchRegion}
          onClick={openDrawer}
        >
          <MessageSquareText className="size-4 shrink-0" aria-hidden="true" />
          <span className="nexus-page-comments-launcher__label">{launcherLabel}</span>
          <span className="nexus-page-comments-launcher__count">{countLabel}</span>
          <ChevronRight className="nexus-page-comments-launcher__chevron size-4 shrink-0" aria-hidden="true" />
          <span className="nexus-page-comments-launcher__action">Open discussion</span>
        </button>
      )}

      {drawerMounted ? (
      <Drawer open={open} onOpenChange={setOpen} direction="bottom">
        <DrawerContent
          id="nexus-page-comments-drawer"
          overlayClassName="z-[210] bg-black/40"
          className={cn(
            "nexus-page-comments-drawer glass-panel z-[211] border-border bg-(--color-bg-panel) text-(--color-text-primary)",
            drawerSize === "expanded" && "nexus-page-comments-drawer--expanded",
          )}
          style={drawerWidthStyle}
        >
          <DrawerHeader className="nexus-page-comments-drawer__header">
            <DrawerTitle className="text-base font-semibold text-(--color-text-primary)">
              {launcherLabel}
              <span className="ml-2 text-sm font-normal text-(--color-text-secondary)">
                ({countLabel})
              </span>
            </DrawerTitle>
            <div className="nexus-page-comments-drawer__header-actions">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={drawerSize === "expanded" ? "Use standard panel height" : "Expand panel"}
                title={drawerSize === "expanded" ? "Standard size" : "Expand"}
                onClick={() =>
                  setDrawerSize((size) => (size === "expanded" ? "comfortable" : "expanded"))
                }
              >
                {drawerSize === "expanded" ? (
                  <Minimize2 className="size-4" aria-hidden="true" />
                ) : (
                  <Maximize2 className="size-4" aria-hidden="true" />
                )}
              </Button>
              <DrawerClose asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="nexus-page-comments-drawer__close"
                  aria-label="Close comments"
                >
                  <X className="size-4" aria-hidden="true" />
                </Button>
              </DrawerClose>
            </div>
          </DrawerHeader>

          <div className="nexus-page-comments-drawer__body">
            {canInteract ? (
              <div className="nexus-page-comments-drawer__composer-wrap">
                <PageCommentComposer
                  pagePath={pagePath}
                  onPosted={() => {
                    refreshComments();
                  }}
                />
              </div>
            ) : (
              <p className="nexus-page-comments-drawer__message">
                Sign in to join the discussion.
              </p>
            )}

            {loadError ? (
              <p className="nexus-page-comments-drawer__message nexus-page-comments-drawer__message--danger" role="alert">
                {loadError}
              </p>
            ) : null}

            <div ref={listRef} className="nexus-page-comments-drawer__list">
              {loadingInitial && comments.length === 0 ? (
                <p className="nexus-page-comments-drawer__message nexus-page-comments-drawer__message--empty">
                  Loading comments…
                </p>
              ) : null}
              {!loadingInitial && comments.length === 0 ? (
                <p className="nexus-page-comments-drawer__message nexus-page-comments-drawer__message--empty">
                  No comments yet. Be the first to share your thoughts.
                </p>
              ) : null}
              {comments.map((comment) => (
                <PageCommentRow
                  key={comment.id}
                  comment={comment}
                  canInteract={canInteract}
                  pagePath={pagePath}
                  canAuthorHeart={canAuthorHeart}
                  pageAuthorDisplayName={pageAuthorDisplayName}
                  onReplyPosted={refreshComments}
                />
              ))}
              {listPage < totalPages ? (
                <div
                  ref={loadMoreRef}
                  className="nexus-page-comments-drawer__load-more"
                  aria-hidden="true"
                >
                  {loadingMore ? "Loading more comments…" : ""}
                </div>
              ) : null}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
      ) : null}
    </>,
  );
}

export default PageCommentsPanel;
