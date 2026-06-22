"use client";

/**
 * @fileoverview Searchable multi-select for delegated page edit access grants.
 *
 * In the Publication chapter, renders inside the Publisher row: primary author badge,
 * optional extra publisher badges, and a **+** control that reveals the search field.
 *
 * @module src/components/puck/fields/PageAccessEditorsField
 */

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Plus, X } from "lucide-react";
import {
  canAddPageAccessEditor,
  filterPageAccessEditorCandidates,
  MAX_PAGE_ACCESS_EDITORS,
  type PageAccessEditorCandidate,
  type PageAccessEditorEntry,
} from "@shared/lib/pageAccessLogic";
import { buildUserMentionHref } from "@shared/lib/nexusMentionTypes";
import { searchPageAccessEditorCandidatesWithStatus } from "../lib/pageAccessClient";
import { usePageEditorMeta } from "../lib/pageEditorMetaContext";
import { PageMetaBadge } from "./PageMetaBadge";

/** Props for {@link PageAccessEditorsField}. */
export interface PageAccessEditorsFieldProps {
  /** Granted editor rows on the page. */
  value: PageAccessEditorEntry[];
  /** Called when grants are added or removed. */
  onChange: (next: PageAccessEditorEntry[]) => void;
  /**
   * When true, the search input stays hidden until the user clicks **+**.
   * Used for the Publisher roster in the Publication chapter.
   */
  collapsibleSearch?: boolean;
}

/**
 * Searchable user picker for per-page delegated edit access.
 *
 * @param props - See {@link PageAccessEditorsFieldProps}.
 * @returns Page access / publisher roster UI.
 */
export function PageAccessEditorsField({
  value,
  onChange,
  collapsibleSearch = false,
}: PageAccessEditorsFieldProps) {
  const meta = usePageEditorMeta();
  const selected = value ?? [];
  const inputId = useId();
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const blurCloseRef = useRef<number | null>(null);
  const searchSeqRef = useRef(0);

  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState<PageAccessEditorCandidate[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [searchVisible, setSearchVisible] = useState(!collapsibleSearch);

  const hasAuthor = Boolean(meta.authorUserId && meta.authorDisplayName);
  const atLimit = selected.length >= MAX_PAGE_ACCESS_EDITORS;
  const canAdd = meta.canManagePageAccess && !atLimit;

  const suggestions = useMemo(
    () =>
      filterPageAccessEditorCandidates(query, candidates, selected, meta.authorUserId),
    [query, candidates, selected, meta.authorUserId],
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [suggestions.length, query]);

  useEffect(() => {
    if (searchVisible) {
      inputRef.current?.focus();
    }
  }, [searchVisible]);

  const runSearch = useCallback(async (nextQuery: string) => {
    const seq = ++searchSeqRef.current;
    setLoading(true);
    try {
      const { users, error } = await searchPageAccessEditorCandidatesWithStatus(nextQuery);
      if (seq === searchSeqRef.current) {
        setCandidates(users);
        setSearchError(error);
      }
    } finally {
      if (seq === searchSeqRef.current) {
        setLoading(false);
      }
    }
  }, []);

  const closeSearch = () => {
    setSearchVisible(false);
    setPanelOpen(false);
    setQuery("");
    setSearchError(null);
  };

  const addEditor = (candidate: PageAccessEditorEntry) => {
    if (!meta.canManagePageAccess) return;
    if (!canAddPageAccessEditor(selected, candidate.userId, meta.authorUserId)) return;
    onChange([...selected, candidate]);
    setQuery("");
    setPanelOpen(false);
    if (collapsibleSearch) {
      setSearchVisible(false);
    } else {
      inputRef.current?.focus();
    }
  };

  const removeEditor = (index: number) => {
    if (!meta.canManagePageAccess) return;
    onChange(selected.filter((_, i) => i !== index));
  };

  const scheduleBlurClose = () => {
    blurCloseRef.current = window.setTimeout(() => {
      setPanelOpen(false);
      if (collapsibleSearch && !query.trim()) {
        setSearchVisible(false);
      }
    }, 120);
  };

  const cancelBlurClose = () => {
    if (blurCloseRef.current != null) {
      window.clearTimeout(blurCloseRef.current);
      blurCloseRef.current = null;
    }
  };

  const handleInputFocus = () => {
    cancelBlurClose();
    setPanelOpen(true);
    void runSearch(query);
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      if (collapsibleSearch) {
        closeSearch();
      } else {
        setPanelOpen(false);
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!panelOpen) setPanelOpen(true);
      void runSearch(query);
      setActiveIndex((index) => Math.min(index + 1, Math.max(suggestions.length - 1, 0)));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const row = suggestions[activeIndex];
      if (row) {
        addEditor({ userId: row.userId, displayName: row.displayName });
      }
    }
  };

  const openSearch = () => {
    setSearchVisible(true);
    setPanelOpen(true);
    void runSearch("");
  };

  return (
    <div
      className={`nexus-page-category-field nexus-page-access-field${
        collapsibleSearch ? " nexus-page-publisher-field" : ""
      }`}
    >
      <div
        className="nexus-page-category-tags nexus-page-publisher-tags"
        role="list"
        aria-label="Publishers"
      >
        {collapsibleSearch ? (
          hasAuthor ? (
            <span className="nexus-page-category-badge" role="listitem">
              <Link
                href={buildUserMentionHref(meta.authorUserId!)}
                className="nexus-page-category-badge__label nexus-page-access-badge__link"
              >
                {meta.authorDisplayName}
              </Link>
            </span>
          ) : (
            <PageMetaBadge muted>Added after first publish</PageMetaBadge>
          )
        ) : null}

        {selected.map((entry, index) => (
          <span key={entry.userId} className="nexus-page-category-badge" role="listitem">
            <Link
              href={buildUserMentionHref(entry.userId)}
              className="nexus-page-category-badge__label nexus-page-access-badge__link"
            >
              {entry.displayName}
            </Link>
            {meta.canManagePageAccess ? (
              <button
                type="button"
                className="nexus-page-category-badge__remove"
                aria-label={`Remove publisher ${entry.displayName}`}
                onClick={() => removeEditor(index)}
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            ) : null}
          </span>
        ))}

        {collapsibleSearch && canAdd && !searchVisible ? (
          <button
            type="button"
            className="nexus-page-publisher-add-btn"
            aria-label="Add publisher"
            onClick={openSearch}
          >
            <Plus className="size-3.5" aria-hidden="true" />
          </button>
        ) : null}

        {!collapsibleSearch && selected.length === 0 ? (
          <p className="nexus-page-category-empty">No additional editors yet.</p>
        ) : null}
      </div>

      {searchVisible ? (
        <div className="nexus-page-category-combobox">
          <input
            ref={inputRef}
            id={inputId}
            type="text"
            className="nexus-puck-input"
            value={query}
            disabled={!canAdd}
            placeholder={atLimit ? "Publisher limit reached" : "Search users by name or login…"}
            autoComplete="off"
            spellCheck={false}
            role="combobox"
            aria-expanded={panelOpen}
            aria-controls={listboxId}
            aria-autocomplete="list"
            onChange={(event) => {
              const next = event.target.value;
              setQuery(next);
              setPanelOpen(true);
              void runSearch(next);
            }}
            onFocus={handleInputFocus}
            onBlur={scheduleBlurClose}
            onKeyDown={handleInputKeyDown}
          />

          {panelOpen && canAdd ? (
            <div
              id={listboxId}
              className="nexus-page-category-suggestions"
              role="listbox"
              aria-label="User suggestions"
              onMouseDown={(event) => {
                event.preventDefault();
                cancelBlurClose();
              }}
            >
              {loading ? (
                <p className="nexus-page-category-suggestions__empty">Searching users…</p>
              ) : searchError ? (
                <p className="nexus-page-category-suggestions__empty" role="alert">
                  {searchError}
                </p>
              ) : suggestions.length === 0 ? (
                <p className="nexus-page-category-suggestions__empty">No matching users.</p>
              ) : (
                suggestions.map((row, index) => (
                  <button
                    key={row.userId}
                    type="button"
                    role="option"
                    aria-selected={index === activeIndex}
                    className={`nexus-page-category-suggestions__item nexus-page-access-suggestions__item${
                      index === activeIndex ? " nexus-page-category-suggestions__item--active" : ""
                    }`}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() =>
                      addEditor({ userId: row.userId, displayName: row.displayName })
                    }
                  >
                    <span className="nexus-page-access-suggestions__primary">{row.displayName}</span>
                    {row.subtitle ? (
                      <span className="nexus-page-access-suggestions__subtitle">{row.subtitle}</span>
                    ) : null}
                  </button>
                ))
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default PageAccessEditorsField;
