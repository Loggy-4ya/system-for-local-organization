"use client";

/**
 * @fileoverview Category tag picker for task forms — reuses page category catalog.
 *
 * @module src/components/tasks/TaskCategoryTagsField
 */

import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { MAX_PAGE_CATEGORIES, normalizePageCategoryList } from "@shared/lib/pageCategoryLogic";
import { getPageCategoryCatalog, appendPageCategoryToCache } from "@/components/puck/lib/pageCategoryClient";
import { Input } from "@/components/ui/input";
import { taskFormControlClass, taskFormEmptyStateClass } from "@/components/tasks/taskFormTokens";

/** Props for {@link TaskCategoryTagsField}. */
export interface TaskCategoryTagsFieldProps {
  /** Selected category labels. */
  value: string[];
  /** Called when selection changes. */
  onChange: (next: string[]) => void;
}

type PanelRow =
  | { kind: "existing"; key: string; label: string }
  | { kind: "create"; key: string; label: string };

/**
 * Autocomplete tag picker aligned with page categories for `/tasks` surfaces.
 *
 * @param props - Controlled tag list.
 * @returns Tag picker JSX.
 */
export function TaskCategoryTagsField({ value, onChange }: TaskCategoryTagsFieldProps) {
  const inputId = useId();
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const blurCloseRef = useRef<number | null>(null);

  const [query, setQuery] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [catalog, setCatalog] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const selected = useMemo(() => normalizePageCategoryList(value), [value]);
  const atLimit = selected.length >= MAX_PAGE_CATEGORIES;

  /** Load category catalog once when panel opens. */
  async function ensureCatalogLoaded() {
    if (catalog.length > 0 || loading) return;
    setLoading(true);
    try {
      setCatalog(await getPageCategoryCatalog());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void ensureCatalogLoaded();
  }, []);

  const panelRows = useMemo((): PanelRow[] => {
    const q = query.trim().toLowerCase();
    const selectedKeys = new Set(selected.map((label) => label.toLowerCase()));
    const rows: PanelRow[] = [];

    for (const label of catalog) {
      if (selectedKeys.has(label.toLowerCase())) continue;
      if (q && !label.toLowerCase().includes(q)) continue;
      rows.push({ kind: "existing", key: label, label });
    }

    const trimmedQuery = query.trim();
    if (
      trimmedQuery &&
      !selectedKeys.has(trimmedQuery.toLowerCase()) &&
      !catalog.some((entry) => entry.toLowerCase() === trimmedQuery.toLowerCase())
    ) {
      rows.unshift({ kind: "create", key: `create:${trimmedQuery}`, label: trimmedQuery });
    }

    return rows.slice(0, 20);
  }, [catalog, query, selected]);

  useEffect(() => {
    setActiveIndex(0);
  }, [panelRows.length, query]);

  /** Add a category label to the selection. */
  function addCategory(raw: string) {
    const label = raw.trim();
    if (!label || atLimit) return;
    const next = normalizePageCategoryList([...selected, label]);
    onChange(next);
    appendPageCategoryToCache(label);
    setQuery("");
    setPanelOpen(false);
    inputRef.current?.focus();
  }

  /** Remove a category by index. */
  function removeCategory(index: number) {
    onChange(selected.filter((_, i) => i !== index));
  }

  const scheduleBlurClose = () => {
    blurCloseRef.current = window.setTimeout(() => setPanelOpen(false), 120);
  };

  const cancelBlurClose = () => {
    if (blurCloseRef.current != null) {
      window.clearTimeout(blurCloseRef.current);
      blurCloseRef.current = null;
    }
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
      if (query.trim()) addCategory(query);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2" role="list" aria-label="Task tags">
        {selected.length === 0 ? (
          <p className={taskFormEmptyStateClass}>No tags yet — search or create below.</p>
        ) : (
          selected.map((label, index) => (
            <span key={`${label}-${index}`} className="badge badge-group inline-flex items-center gap-1" role="listitem">
              {label}
              <button
                type="button"
                className="rounded-sm p-0.5 opacity-70 hover:opacity-100"
                aria-label={`Remove tag ${label}`}
                onClick={() => removeCategory(index)}
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </span>
          ))
        )}
      </div>

      <div className="relative">
        <Input
          ref={inputRef}
          id={inputId}
          type="text"
          value={query}
          disabled={atLimit}
          placeholder={atLimit ? "Tag limit reached" : "Search or add category…"}
          autoComplete="off"
          spellCheck={false}
          role="combobox"
          aria-expanded={panelOpen}
          aria-controls={listboxId}
          aria-autocomplete="list"
          className={taskFormControlClass}
          onChange={(event) => {
            setQuery(event.target.value);
            setPanelOpen(true);
          }}
          onFocus={() => {
            cancelBlurClose();
            setPanelOpen(true);
            void ensureCatalogLoaded();
          }}
          onBlur={scheduleBlurClose}
          onKeyDown={handleInputKeyDown}
        />

        {panelOpen && !atLimit ? (
          <div
            id={listboxId}
            className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-panel)] py-1 shadow-lg"
            role="listbox"
            aria-label="Category suggestions"
            onMouseDown={(event) => {
              event.preventDefault();
              cancelBlurClose();
            }}
          >
            {loading ? (
              <p className="px-3 py-2 text-xs text-[var(--color-text-secondary)]">Loading categories…</p>
            ) : panelRows.length === 0 ? (
              <p className="px-3 py-2 text-xs text-[var(--color-text-secondary)]">No matching categories.</p>
            ) : (
              panelRows.map((row, index) => (
                <button
                  key={row.key}
                  type="button"
                  role="option"
                  aria-selected={index === activeIndex}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
                    index === activeIndex
                      ? "bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)]"
                      : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)]"
                  }`}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => addCategory(row.label)}
                >
                  {row.kind === "create" ? (
                    <>
                      <Plus className="size-3.5 shrink-0 opacity-70" aria-hidden="true" />
                      <span>Add &ldquo;{row.label}&rdquo;</span>
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

export default TaskCategoryTagsField;
