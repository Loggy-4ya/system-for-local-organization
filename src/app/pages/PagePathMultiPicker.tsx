"use client";

/**
 * @fileoverview Searchable multi-select for curating existing Puck pages in Page Manager.
 *
 * @module src/app/pages/PagePathMultiPicker
 */

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import type { PagePathCatalogEntry } from "@shared/lib/pagePathLogic";
import { formatPageDomainLabel, pagePathBelongsToDomain } from "@shared/lib/pagePathLogic";
import { searchPagePathCatalog } from "./pagePathCatalogClient";
import { PageMetaBadge } from "@/components/puck/fields/PageMetaBadge";

/** Props for {@link PagePathMultiPicker}. */
export interface PagePathMultiPickerProps {
  /** Selected page paths in display order. */
  value: string[];
  /** Called when the curated path list changes. */
  onChange: (next: string[]) => void;
  /** Optional input placeholder. */
  placeholder?: string;
  /** When set, only pages under this path domain appear in search results. */
  domainFilter?: string;
  /** Omit the domain root page (`/news`) from suggestions when filtering by domain. */
  excludeDomainRoot?: boolean;
}

/**
 * Searchable page path picker — adds existing pages only.
 *
 * @param props - See {@link PagePathMultiPickerProps}.
 * @returns Multi-select picker UI.
 */
export function PagePathMultiPicker({
  value,
  onChange,
  placeholder = "Search pages by title or path…",
  domainFilter,
  excludeDomainRoot = false,
}: PagePathMultiPickerProps) {
  const selected = value ?? [];
  const inputId = useId();
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const blurCloseRef = useRef<number | null>(null);
  const searchSeqRef = useRef(0);

  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState<PagePathCatalogEntry[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const normalizedDomain = domainFilter?.trim() ?? "";
  const domainRootPath = normalizedDomain ? formatPageDomainLabel(normalizedDomain) : "";

  const suggestions = useMemo(() => {
    return candidates.filter((entry) => {
      if (selectedSet.has(entry.path)) return false;
      if (!normalizedDomain) return true;
      if (!pagePathBelongsToDomain(entry.path, normalizedDomain)) return false;
      if (excludeDomainRoot && domainRootPath && entry.path === domainRootPath) return false;
      return true;
    });
  }, [candidates, selectedSet, normalizedDomain, excludeDomainRoot, domainRootPath]);

  useEffect(() => {
    setActiveIndex(0);
  }, [suggestions.length, query]);

  const runSearch = useCallback(async (nextQuery: string) => {
    const seq = ++searchSeqRef.current;
    setLoading(true);
    try {
      const rows = await searchPagePathCatalog(nextQuery);
      if (seq === searchSeqRef.current) {
        setCandidates(rows);
      }
    } finally {
      if (seq === searchSeqRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!panelOpen) return undefined;
    const timer = window.setTimeout(() => {
      void runSearch(query);
    }, 180);
    return () => window.clearTimeout(timer);
  }, [panelOpen, query, runSearch]);

  const addPath = (entry: PagePathCatalogEntry) => {
    if (selectedSet.has(entry.path)) return;
    onChange([...selected, entry.path]);
    setQuery("");
    setPanelOpen(false);
    inputRef.current?.focus();
  };

  const removePath = (path: string) => {
    onChange(selected.filter((entry) => entry !== path));
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setPanelOpen(true);
      setActiveIndex((prev) => Math.min(prev + 1, Math.max(suggestions.length - 1, 0)));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
      return;
    }
    if (event.key === "Enter" && panelOpen && suggestions[activeIndex]) {
      event.preventDefault();
      addPath(suggestions[activeIndex]);
      return;
    }
    if (event.key === "Escape") {
      setPanelOpen(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selected.map((path) => (
            <PageMetaBadge key={path} className="inline-flex items-center gap-1">
              {path}
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-sm p-0.5 text-muted-foreground hover:text-foreground"
                onClick={() => removePath(path)}
                aria-label={`Remove ${path}`}
              >
                <X size={12} aria-hidden="true" />
              </button>
            </PageMetaBadge>
          ))}
        </div>
      ) : null}

      <div className="relative">
        <input
          id={inputId}
          ref={inputRef}
          type="search"
          className="nexus-puck-input w-full"
          value={query}
          placeholder={placeholder}
          role="combobox"
          aria-expanded={panelOpen}
          aria-controls={listboxId}
          aria-autocomplete="list"
          onChange={(event) => {
            setQuery(event.target.value);
            setPanelOpen(true);
          }}
          onFocus={() => {
            if (blurCloseRef.current) {
              window.clearTimeout(blurCloseRef.current);
              blurCloseRef.current = null;
            }
            setPanelOpen(true);
          }}
          onBlur={() => {
            blurCloseRef.current = window.setTimeout(() => setPanelOpen(false), 150);
          }}
          onKeyDown={handleKeyDown}
        />

        {panelOpen ? (
          <ul
            id={listboxId}
            role="listbox"
            className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-md"
          >
            {loading ? (
              <li className="px-3 py-2 text-xs text-muted-foreground">Searching…</li>
            ) : suggestions.length === 0 ? (
              <li className="px-3 py-2 text-xs text-muted-foreground">No matching pages.</li>
            ) : (
              suggestions.map((entry, index) => (
                <li key={entry.path}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={index === activeIndex}
                    className="flex w-full flex-col items-start gap-0.5 rounded-sm px-3 py-2 text-left hover:bg-accent"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => addPath(entry)}
                  >
                    <span className="text-sm font-medium text-foreground">{entry.title}</span>
                    <span className="text-xs text-muted-foreground">{entry.label}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

export default PagePathMultiPicker;
