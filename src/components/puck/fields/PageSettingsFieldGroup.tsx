"use client";

/**
 * @fileoverview Page title and URL slug controls for Puck PageRoot sidebar.
 *
 * Title and slug drafts update {@link editorPageMetadataStore} on every keystroke
 * for the live header label; Puck `onChange` commits happen on blur only.
 *
 * @module src/components/puck/fields/PageSettingsFieldGroup
 */

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ClipboardEvent } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldChapter, SettingsIcon } from "./FieldChapter";
import { editorPagePathRef } from "../lib/editorPagePathRef";
import {
  getEditorPagePersisted,
  subscribeEditorPagePersisted,
} from "../lib/editorPagePersistedRef";
import { setPageMetadataDraft } from "../lib/editorPageMetadataStore";
import { deletePersistedPage } from "../lib/pageDeleteClient";
import {
  fetchReservedPagePaths,
  validatePageSlug,
} from "../lib/pageSlugValidation";
import { useDeferredFieldCommit } from "../lib/useDeferredFieldCommit";

/** Page metadata stored under root `pageSettings`. */
export interface PageSettingsValue {
  /** Human-readable page title. */
  title: string;
  /** URL slug without leading slash (empty string for homepage). */
  slug: string;
  /** When true, slug cannot be edited (homepage). */
  slugLocked?: boolean;
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
  const settings: PageSettingsValue = {
    title: value?.title ?? "Untitled Page",
    slug: value?.slug ?? "",
    slugLocked: value?.slugLocked ?? false,
  };

  const [reservedPaths, setReservedPaths] = useState<string[]>([]);
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const onChangeRef = useRef(onChange);
  const settingsRef = useRef(settings);
  onChangeRef.current = onChange;
  settingsRef.current = settings;

  const isHomepageSlug = settings.slugLocked || editorPagePathRef.currentPath === "/";

  const {
    draft: titleDraft,
    onTextChange: onTitleDraftChange,
    onTextFocus: onTitleFocus,
    onTextBlur: onTitleBlur,
    commit: commitTitle,
  } = useDeferredFieldCommit({
    value: settings.title,
    onChange: (next) => {
      onChangeRef.current({ ...settingsRef.current, title: next });
    },
    textDebounceMs: 0,
  });

  const {
    draft: slugDraft,
    onTextChange: onSlugDraftChange,
    onTextFocus: onSlugFocus,
    onTextBlur: onSlugBlur,
    commit: commitSlug,
  } = useDeferredFieldCommit({
    value: settings.slug,
    onChange: (next) => {
      onChangeRef.current({ ...settingsRef.current, slug: next });
    },
    textDebounceMs: 0,
  });

  useEffect(() => {
    setPageMetadataDraft({
      title: settings.title,
      slug: settings.slug,
      slugLocked: isHomepageSlug,
    });
  }, [settings.title, settings.slug, isHomepageSlug]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const paths = await fetchReservedPagePaths();
      if (!cancelled) setReservedPaths(paths);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const slugValidation = useMemo(
    () =>
      validatePageSlug(slugDraft, {
        slugLocked: isHomepageSlug,
        currentPath: editorPagePathRef.currentPath,
        reservedPaths,
      }),
    [slugDraft, isHomepageSlug, reservedPaths],
  );

  const previewSlug = isHomepageSlug
    ? ""
    : slugValidation.slugSegment || "(homepage)";

  const handleSlugPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData("text").trim();
    if (!pasted) return;

    const pastedValidation = validatePageSlug(pasted.replace(/^\//, ""), {
      slugLocked: false,
      currentPath: editorPagePathRef.currentPath,
      reservedPaths,
    });

    if (!pastedValidation.valid && pastedValidation.error?.includes("already used")) {
      event.preventDefault();
      setPasteError(pastedValidation.error);
      return;
    }

    setPasteError(null);
  };

  const slugError = pasteError ?? (isHomepageSlug ? null : slugValidation.error);
  const isPersistedPage = useSyncExternalStore(
    subscribeEditorPagePersisted,
    getEditorPagePersisted,
    () => false,
  );
  const canDeletePage =
    !isHomepageSlug && isPersistedPage && editorPagePathRef.currentPath !== "/";

  const handleDeletePage = async () => {
    const pagePath = editorPagePathRef.currentPath;
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
    <FieldChapter title="Page Settings" icon={<SettingsIcon />}>
      <div className="nexus-field-category">
        <span className="nexus-field-category__label">Page Title</span>
        <input
          type="text"
          className="nexus-puck-input"
          value={titleDraft}
          onChange={(e) => {
            const next = e.target.value;
            onTitleDraftChange(next);
            setPageMetadataDraft({ title: next.trim() || "Untitled Page" });
          }}
          onFocus={onTitleFocus}
          onBlur={() => {
            onTitleBlur();
            commitTitle();
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
        <span className="nexus-field-category__label">URL Slug</span>
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
            <p className="nexus-page-slug-hint">
              The homepage URL cannot be renamed. Create other pages from{" "}
              <strong>All Pages</strong> to set custom slugs.
            </p>
          </>
        ) : (
          <>
            <div className="nexus-page-slug-row">
              <span className="nexus-page-slug-row__prefix">/</span>
              <input
                type="text"
                className="nexus-puck-input nexus-page-slug-row__input"
                value={slugDraft}
                onChange={(e) => {
                  setPasteError(null);
                  const next = e.target.value;
                  onSlugDraftChange(next);
                  setPageMetadataDraft({ slug: next });
                }}
                onFocus={onSlugFocus}
                onBlur={() => {
                  onSlugBlur();
                  commitSlug();
                }}
                onPaste={handleSlugPaste}
                placeholder="page-path"
                title="Edit page URL path"
                aria-invalid={Boolean(slugError)}
              />
            </div>
            {slugError ? (
              <p className="nexus-page-slug-error" role="alert">
                {slugError}
              </p>
            ) : null}
          </>
        )}
        <p className="nexus-page-slug-preview">
          Preview: <code>yoursite.com/{previewSlug}</code>
        </p>
      </div>

      {canDeletePage ? (
        <div className="nexus-field-category">
          <span className="nexus-field-category__label">Danger Zone</span>
          <p className="nexus-page-delete-hint">
            Permanently remove this page and its layout from the database.
          </p>
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
