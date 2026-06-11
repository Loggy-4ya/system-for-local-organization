"use client";

/**
 * @fileoverview Page title and URL slug controls for Puck PageRoot sidebar.
 *
 * @module src/components/puck/fields/PageSettingsFieldGroup
 */

import { useEffect, useMemo, useRef, useState, type ClipboardEvent } from "react";
import { FieldChapter, SettingsIcon } from "./FieldChapter";
import { editorPagePathRef } from "../lib/editorPagePathRef";
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
  const settings: PageSettingsValue = {
    title: value?.title ?? "Untitled Page",
    slug: value?.slug ?? "",
    slugLocked: value?.slugLocked ?? false,
  };

  const [reservedPaths, setReservedPaths] = useState<string[]>([]);
  const [pasteError, setPasteError] = useState<string | null>(null);
  const onChangeRef = useRef(onChange);
  const settingsRef = useRef(settings);
  onChangeRef.current = onChange;
  settingsRef.current = settings;

  const isHomepageSlug = settings.slugLocked || editorPagePathRef.currentPath === "/";

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

  const set = (patch: Partial<PageSettingsValue>) => {
    onChange({ ...settings, ...patch });
  };

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

  return (
    <FieldChapter title="Page Settings" icon={<SettingsIcon />}>
      <div className="nexus-field-category">
        <span className="nexus-field-category__label">Page Title</span>
        <input
          type="text"
          className="nexus-puck-input"
          value={settings.title}
          onChange={(e) => set({ title: e.target.value })}
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
                  onSlugDraftChange(e.target.value);
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
    </FieldChapter>
  );
}

export default PageSettingsFieldGroup;
