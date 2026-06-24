"use client";

/**
 * @fileoverview Page title and URL slug controls for Puck PageRoot sidebar.
 *
 * Title and slug drafts update {@link editorPageMetadataStore} on every keystroke
 * for the live header label; Puck `onChange` commits happen on blur only.
 *
 * @module src/components/puck/fields/PageSettingsFieldGroup
 */

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { NexusFieldHint } from "@/components/ui/NexusFieldHint";
import { derivePageSlugFromTitle } from "@shared/lib/pagePathLogic";
import { FieldChapter, SettingsIcon } from "./FieldChapter";
import { FieldLabelRow } from "./FieldLabelRow";
import { editorPagePathRef } from "../lib/editorPagePathRef";
import {
  getEditorPagePersisted,
  subscribeEditorPagePersisted,
} from "../lib/editorPagePersistedRef";
import { setPageMetadataDraft } from "../lib/editorPageMetadataStore";
import { usePageEditorMeta } from "../lib/pageEditorMetaContext";
import { deletePersistedPage } from "../lib/pageDeleteClient";
import {
  fetchReservedPagePaths,
} from "../lib/pageSlugValidation";
import { useDeferredFieldCommit } from "../lib/useDeferredFieldCommit";
import { PageCategoryTagsField } from "./PageCategoryTagsField";
import { PagePathDomainSlugField } from "./PagePathDomainSlugField";
import { MAX_PAGE_CATEGORIES, normalizePageCategoryList } from "@shared/lib/pageCategoryLogic";
import { fetchPagePathDomains } from "../lib/pagePathDomainClient";
import {
  getPageAutoSlugFromTitlePreference,
  setPageAutoSlugFromTitlePreference,
  subscribePageAutoSlugFromTitlePreference,
} from "../lib/pageAutoSlugPreference";

/** Page metadata stored under root `pageSettings`. */
export interface PageSettingsValue {
  /** Human-readable page title. */
  title: string;
  /** URL slug without leading slash (empty string for homepage). */
  slug: string;
  /** When true, slug cannot be edited (homepage). */
  slugLocked?: boolean;
  /** Obsidian-style category tags (separate from the URL slug). */
  categories?: string[];
  /**
   * @deprecated Legacy storage — migrated into `pagePublication.delegatedEditors` on read.
   */
  delegatedEditors?: import("@shared/lib/pageAccessLogic").PageAccessEditorEntry[];
}

/** Puck custom field props for page settings. */
interface PageSettingsFieldGroupProps {
  value: PageSettingsValue;
  onChange: (value: PageSettingsValue) => void;
}

/**
 * Full-width page title and slug editor grouped under Page Settings.
 *
 * @param props - Puck custom field props.
 * @returns Page settings chapter UI.
 */
export function PageSettingsFieldGroup({ value, onChange }: PageSettingsFieldGroupProps) {
  const router = useRouter();
  const meta = usePageEditorMeta();
  const settings: PageSettingsValue = {
    title: value?.title ?? "Untitled Page",
    slug: value?.slug ?? "",
    slugLocked: value?.slugLocked ?? false,
    categories: normalizePageCategoryList(value?.categories),
  };

  const [reservedPaths, setReservedPaths] = useState<string[]>([]);
  const [pathDomains, setPathDomains] = useState<string[]>([]);
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const onChangeRef = useRef(onChange);
  const settingsRef = useRef(settings);
  const titleFieldFocusedRef = useRef(false);
  const slugFieldFocusedRef = useRef(false);
  onChangeRef.current = onChange;
  settingsRef.current = settings;

  const {
    draft: titleDraft,
    onTextChange: onTitleDraftChange,
    onTextFocus: onTitleFocus,
    onTextBlur: onTitleBlur,
  } = useDeferredFieldCommit({
    value: settings.title,
    onChange: (next) => {
      mergePageSettingsCommit({ title: next });
      setPageMetadataDraft({ title: next.trim() || "Untitled Page" });
    },
    textDebounceMs: 0,
  });

  const {
    draft: slugDraft,
    onTextChange: onSlugDraftChange,
    onTextFocus: onSlugFocus,
    onTextBlur: onSlugBlur,
  } = useDeferredFieldCommit({
    value: settings.slug,
    onChange: (next) => {
      mergePageSettingsCommit({ slug: next });
      setPageMetadataDraft({ slug: next });
    },
    textDebounceMs: 0,
  });

  const titleDraftRef = useRef(titleDraft);
  const slugDraftRef = useRef(slugDraft);
  titleDraftRef.current = titleDraft;
  slugDraftRef.current = slugDraft;

  /** Commit page settings without clobbering uncommitted title/slug drafts. */
  function mergePageSettingsCommit(partial: Partial<PageSettingsValue>) {
    onChangeRef.current({
      ...settingsRef.current,
      title: titleDraftRef.current,
      slug: slugDraftRef.current,
      ...partial,
    });
  }

  const isHomepageSlug =
    settings.slugLocked || meta.path === "/" || editorPagePathRef.currentPath === "/";

  const autoSlugFromTitle = useSyncExternalStore(
    subscribePageAutoSlugFromTitlePreference,
    getPageAutoSlugFromTitlePreference,
    () => true,
  );

  const applyAutoSlugFromTitle = (title: string, currentSlug: string) => {
    const knownDomains = pathDomains.length > 0 ? pathDomains : undefined;
    return derivePageSlugFromTitle(title, currentSlug, knownDomains);
  };

  const syncSlugFromTitle = (title: string, currentSlug: string) => {
    const nextSlug = applyAutoSlugFromTitle(title, currentSlug);
    onSlugDraftChange(nextSlug);
    setPageMetadataDraft({ slug: nextSlug });
  };

  useEffect(() => {
    if (titleFieldFocusedRef.current || slugFieldFocusedRef.current) return;
    setPageMetadataDraft({
      title: settings.title.trim() || "Untitled Page",
      slug: settings.slug,
      slugLocked: isHomepageSlug,
    });
  }, [settings.title, settings.slug, isHomepageSlug]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const paths = await fetchReservedPagePaths();
      const domains = await fetchPagePathDomains();
      if (!cancelled) {
        setReservedPaths(paths);
        setPathDomains(domains);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const isPersistedFromClient = useSyncExternalStore(
    subscribeEditorPagePersisted,
    getEditorPagePersisted,
    () => false,
  );
  const isPersistedPage = meta.isPersisted || isPersistedFromClient;
  const canDeletePage =
    !isHomepageSlug &&
    isPersistedPage &&
    meta.canManagePageAccess &&
    Boolean(meta.path && meta.path !== "/");

  const handleDeletePage = async () => {
    const pagePath = meta.path || editorPagePathRef.currentPath;
    const pageTitle = settings.title.trim() || "Untitled Page";
    const confirmed = window.confirm(
      `Delete "${pageTitle}" (${pagePath})?\n\nThis permanently removes the page from the database. This cannot be undone.`,
    );
    if (!confirmed) return;

    setDeleteError(null);
    setDeleting(true);

    try {
      await deletePersistedPage(pagePath);
      router.push("/pages");
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete page.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <FieldChapter title="Page Details" icon={<SettingsIcon />}>
      <div className="nexus-field-category">
        <FieldLabelRow label="Page Title" />
        <input
          type="text"
          className="nexus-puck-input"
          value={titleDraft}
          onChange={(e) => {
            const next = e.target.value;
            onTitleDraftChange(next);
            setPageMetadataDraft({ title: next.trim() || "Untitled Page" });
            if (autoSlugFromTitle && !isHomepageSlug) {
              syncSlugFromTitle(next, slugDraft);
            }
          }}
          onFocus={() => {
            titleFieldFocusedRef.current = true;
            onTitleFocus();
          }}
          onBlur={() => {
            titleFieldFocusedRef.current = false;
            onTitleBlur();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              (e.target as HTMLInputElement).blur();
            }
          }}
          placeholder="Untitled Page"
        />
      </div>

      <div className="nexus-field-category">
        <FieldLabelRow
          label="URL Slug"
          hint={
            isHomepageSlug
              ? "The homepage URL cannot be renamed. Create other pages from All Pages to set custom slugs."
              : "Choose a domain label, then set the page slug — public path is /domain/page_slug."
          }
        />
        {isHomepageSlug ? (
          <>
            <div className="nexus-page-slug-row nexus-page-slug-row--locked">
              <span className="nexus-page-slug-row__prefix">/</span>
              <span
                className="nexus-puck-input nexus-page-slug-row__input nexus-page-slug-row__locked-value"
                aria-readonly="true"
              >
                (homepage — fixed at /)
              </span>
            </div>
          </>
        ) : (
          <>
            <div className="nexus-page-auto-slug-row nexus-switch-field">
              <span className="nexus-page-auto-slug-row__label">
                <span className="nexus-page-auto-slug-row__text">Auto slug from title</span>
                <NexusFieldHint
                  text="When enabled, the page slug updates as you type the title. Turn off to set a custom URL manually."
                  label="About auto slug from title"
                  size="sm"
                />
              </span>
              <Switch
                checked={autoSlugFromTitle}
                aria-label="Auto slug from title"
                onCheckedChange={(checked) => {
                  setPageAutoSlugFromTitlePreference(checked);
                  if (checked && !isHomepageSlug) {
                    syncSlugFromTitle(titleDraft, slugDraft);
                    mergePageSettingsCommit({
                      slug: applyAutoSlugFromTitle(titleDraft, slugDraft),
                    });
                  }
                }}
              />
            </div>
            <PagePathDomainSlugField
            slug={slugDraft}
            reservedPaths={reservedPaths}
            pasteError={pasteError}
            onClearPasteError={() => setPasteError(null)}
            onPasteError={setPasteError}
            onSlugFocus={() => {
              slugFieldFocusedRef.current = true;
              onSlugFocus();
            }}
            onSlugBlur={() => {
              slugFieldFocusedRef.current = false;
              onSlugBlur();
            }}
            onSlugChange={(next) => {
              onSlugDraftChange(next);
              setPageMetadataDraft({ slug: next });
            }}
          />
          </>
        )}
      </div>

      <div className="nexus-field-category">
        <FieldLabelRow
          label="Categories"
          hint={`News-style tags for cards and filters — separate from the URL slug (max ${MAX_PAGE_CATEGORIES}). Search existing labels or create new ones. Press Enter to add.`}
        />
        <PageCategoryTagsField
          value={settings.categories ?? []}
          onChange={(categories) => {
            mergePageSettingsCommit({ categories });
          }}
        />
      </div>

      {canDeletePage ? (
        <div className="nexus-field-category nexus-field-category--danger">
          <FieldLabelRow
            label="Delete"
            hint="Permanently remove this page and its layout from the database."
          />
          <Button
            type="button"
            variant="destructive"
            className="nexus-page-delete-btn"
            disabled={deleting}
            onClick={() => {
              void handleDeletePage();
            }}
          >
            <Trash2 size={14} aria-hidden="true" />
            {deleting ? "Deleting…" : "Delete Page"}
          </Button>
          {deleteError ? (
            <p className="nexus-page-slug-error" role="alert">
              {deleteError}
            </p>
          ) : null}
        </div>
      ) : null}
    </FieldChapter>
  );
}

export default PageSettingsFieldGroup;
