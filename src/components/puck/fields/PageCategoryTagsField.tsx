"use client";

/**
 * @fileoverview Obsidian-style searchable multi-select for Puck page categories.
 *
 * Uses the same {@link nexus-puck-input} row as Page Title / slug fields.
 * Selected labels render as accent badge chips. The category catalog loads
 * once per editor session ({@link getPageCategoryCatalog}); search filters
 * locally without additional API calls on focus or keystroke.
 *
 * @module src/components/puck/fields/PageCategoryTagsField
 */

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import {
  canAddPageCategory,
  filterPageCategorySuggestions,
  MAX_PAGE_CATEGORIES,
  normalizePageCategoryLabel,
  pageCategoryEditorBadgeClassName,
  shouldOfferCreatePageCategory,
} from "@shared/lib/pageCategoryLogic";
import {
  appendPageCategoryToCache,
  getPageCategoryCatalog,
  peekPageCategoryCatalog,
} from "../lib/pageCategoryClient";

/** Props for {@link PageCategoryTagsField}. */
export interface PageCategoryTagsFieldProps {
  /** Selected category labels on the page. */
  value: string[];
  /** Called when the user adds or removes categories. */
  onChange: (next: string[]) => void;
}

/**
 * Searchable multi-select tag field for page categories in the Puck sidebar.
 *
 * @param props - See {@link PageCategoryTagsFieldProps}.
 * @returns Category tag editor UI.
 */
export function PageCategoryTagsField({ value, onChange }: PageCategoryTagsFieldProps) {
  const selected = value ?? [];
  const inputId = useId();
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const blurCloseRef = useRef<number | null>(null);
  const catalogLoadedRef = useRef(peekPageCategoryCatalog() !== null);

  const [query, setQuery] = useState("");
  const [catalog, setCatalog] = useState<string[]>(() => peekPageCategoryCatalog() ?? []);
  const [loading, setLoading] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const ensureCatalogLoaded = useCallback(async () => {
    if (catalogLoadedRef.current) return;

    setLoading(true);
    try {
      const labels = await getPageCategoryCatalog();
      catalogLoadedRef.current = true;
      setCatalog(labels);
    } finally {
      setLoading(false);
    }
  }, []);

  const suggestions = useMemo(
    () => filterPageCategorySuggestions(query, catalog, selected),
    [query, catalog, selected],
  );

  const showCreate = shouldOfferCreatePageCategory(query, catalog, selected);
  const atLimit = selected.length >= MAX_PAGE_CATEGORIES;

  const panelRows = useMemo(() => {
    const rows: Array<{ key: string; label: string; kind: "existing" | "create" }> =
      suggestions.map((label) => ({ key: label, label, kind: "existing" as const }));

    if (showCreate) {
      const createLabel = normalizePageCategoryLabel(query);
      if (createLabel) {
        rows.push({ key: `__create__${createLabel}`, label: createLabel, kind: "create" });
      }
    }

    return rows;
  }, [query, showCreate, suggestions]);

  useEffect(() => {
    setActiveIndex(0);
  }, [panelRows.length, query]);

  const addCategory = (raw: string) => {
    const label = normalizePageCategoryLabel(raw);
    if (!label || !canAddPageCategory(selected, label)) return;
    appendPageCategoryToCache(label);
    setCatalog((prev) => {
      const key = label.toLowerCase();
      if (prev.some((entry) => entry.toLowerCase() === key)) return prev;
      return [...prev, label].sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: "base" }),
      );
    });
    catalogLoadedRef.current = true;
    onChange([...selected, label]);
    setQuery("");
    setPanelOpen(false);
    inputRef.current?.focus();
  };

  const removeCategory = (index: number) => {
    onChange(selected.filter((_, i) => i !== index));
  };

  const scheduleBlurClose = () => {
    blurCloseRef.current = window.setTimeout(() => setPanelOpen(false), 120);
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
    void ensureCatalogLoaded();
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setPanelOpen(false);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!panelOpen) setPanelOpen(true);
      void ensureCatalogLoaded();
      setActiveIndex((index) => Math.min(index + 1, Math.max(panelRows.length - 1, 0)));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const row = panelRows[activeIndex];
      if (row) {
        addCategory(row.label);
        return;
      }
      if (query.trim()) {
        addCategory(query);
      }
    }
  };

  return (
    <div className="nexus-page-category-field">
      <div className="nexus-page-category-tags" role="list" aria-label="Page categories">
        {selected.length === 0 ? (
          <p className="nexus-page-category-empty">No categories yet.</p>
        ) : (
          selected.map((label, index) => (
            <span
              key={`${label}-${index}`}
              className={pageCategoryEditorBadgeClassName(label)}
              role="listitem"
            >
              <span className="nexus-page-category-badge__label">{label}</span>
              <button
                type="button"
                className="nexus-page-category-badge__remove"
                aria-label={`Remove category ${label}`}
                onClick={() => removeCategory(index)}
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </span>
          ))
        )}
      </div>

      <div className="nexus-page-category-combobox">
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          className="nexus-puck-input"
          value={query}
          disabled={atLimit}
          placeholder={atLimit ? "Category limit reached" : "Search or add category…"}
          autoComplete="off"
          spellCheck={false}
          role="combobox"
          aria-expanded={panelOpen}
          aria-controls={listboxId}
          aria-autocomplete="list"
          onChange={(event) => {
            setQuery(event.target.value);
            setPanelOpen(true);
          }}
          onFocus={handleInputFocus}
          onBlur={scheduleBlurClose}
          onKeyDown={handleInputKeyDown}
        />

        {panelOpen && !atLimit ? (
          <div
            id={listboxId}
            className="nexus-page-category-suggestions"
            role="listbox"
            aria-label="Category suggestions"
            onMouseDown={(event) => {
              event.preventDefault();
              cancelBlurClose();
            }}
          >
            {loading ? (
              <p className="nexus-page-category-suggestions__empty">Loading categories…</p>
            ) : panelRows.length === 0 ? (
              <p className="nexus-page-category-suggestions__empty">No matching categories.</p>
            ) : (
              panelRows.map((row, index) => (
                <button
                  key={row.key}
                  type="button"
                  role="option"
                  aria-selected={index === activeIndex}
                  className={`nexus-page-category-suggestions__item${
                    index === activeIndex ? " nexus-page-category-suggestions__item--active" : ""
                  }`}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => addCategory(row.label)}
                >
                  {row.kind === "create" ? (
                    <>
                      <Plus className="size-3.5 shrink-0 opacity-70" aria-hidden="true" />
                      <span>
                        Add &ldquo;{row.label}&rdquo;
                      </span>
                    </>
                  ) : (
                    row.label
                  )}
                </button>
              ))
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default PageCategoryTagsField;
