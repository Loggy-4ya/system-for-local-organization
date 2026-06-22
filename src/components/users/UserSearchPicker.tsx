"use client";

/**
 * @fileoverview Searchable user picker — name, login, group, email (when permitted).
 *
 * Institution-wide member lookup via `GET /api/users/search`. Shows member avatars
 * in the suggestion list and on selected performer rows.
 *
 * @module src/components/users/UserSearchPicker
 */

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";
import type { UserSearchCandidate } from "@shared/lib/userSearchLogic";
import { filterUserSearchCandidates } from "@shared/lib/userSearchLogic";
import { fetchUserSearchWithStatus } from "@/lib/userSearchClient";
import { UserAvatarImage } from "@/components/media/UserAvatarImage";
import { taskFormControlClass, taskFormEmptyStateClass, taskFormInsetPanelClass } from "@/components/tasks/taskFormTokens";
import { cn } from "@/lib/utils";

/** Props for {@link UserSearchPicker}. */
export interface UserSearchPickerProps {
  /** Called when the user selects one row (single-select mode). */
  onSelect: (candidate: UserSearchCandidate) => void;
  /** Placeholder for the search input. */
  placeholder?: string;
  /** User ids to hide from suggestions (already assigned). */
  excludedUserIds?: string[];
  /** Disable interaction. */
  disabled?: boolean;
  className?: string;
  /** Optional class for the search input (defaults to task-form control styling). */
  inputClassName?: string;
}

/**
 * One autocomplete row with avatar, name, and subtitle.
 *
 * @param props - Row data and interaction handlers.
 * @returns Suggestion button JSX.
 */
function UserSearchSuggestionRow({
  row,
  active,
  onPick,
  onHover,
}: {
  row: UserSearchCandidate;
  active: boolean;
  onPick: () => void;
  onHover: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        role="option"
        aria-selected={active}
        className={cn(
          "flex w-full items-center gap-3 px-3 py-2 text-left transition-colors",
          active
            ? "bg-[color-mix(in_srgb,var(--color-accent-user)_12%,transparent)]"
            : "hover:bg-[color-mix(in_srgb,var(--color-accent-user)_8%,transparent)]",
        )}
        onMouseEnter={onHover}
        onClick={onPick}
      >
        <UserAvatarImage src={row.avatar} alt="" size={32} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-[var(--color-text-primary)]">
            {row.displayName}
          </span>
          {row.subtitle ? (
            <span className="block truncate text-xs text-[var(--color-text-secondary)]">
              {row.subtitle}
            </span>
          ) : null}
        </span>
      </button>
    </li>
  );
}

/**
 * Single-select user search combobox for task delegation and similar flows.
 *
 * @param props - See {@link UserSearchPickerProps}.
 * @returns User search picker JSX.
 */
export function UserSearchPicker({
  onSelect,
  placeholder = "Search by name, login, group, or email…",
  excludedUserIds = [],
  disabled = false,
  className,
  inputClassName = taskFormControlClass,
}: UserSearchPickerProps) {
  const inputId = useId();
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const blurCloseRef = useRef<number | null>(null);
  const searchSeqRef = useRef(0);

  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState<UserSearchCandidate[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const suggestions = filterUserSearchCandidates(candidates, excludedUserIds);

  useEffect(() => {
    setActiveIndex(0);
  }, [suggestions.length, query]);

  const runSearch = useCallback(async (nextQuery: string) => {
    const seq = ++searchSeqRef.current;
    setLoading(true);
    try {
      const { users, error } = await fetchUserSearchWithStatus(nextQuery);
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

  const scheduleBlurClose = () => {
    blurCloseRef.current = window.setTimeout(() => setPanelOpen(false), 120);
  };

  const cancelBlurClose = () => {
    if (blurCloseRef.current != null) {
      window.clearTimeout(blurCloseRef.current);
      blurCloseRef.current = null;
    }
  };

  const pickRow = (row: UserSearchCandidate) => {
    onSelect(row);
    setQuery("");
    setPanelOpen(false);
    inputRef.current?.blur();
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
      if (row) pickRow(row);
    }
  };

  return (
    <div className={cn("relative flex flex-col gap-1", className)}>
      <input
        ref={inputRef}
        id={inputId}
        type="search"
        className={cn(inputClassName, "text-[var(--color-text-primary)]")}
        role="combobox"
        aria-expanded={panelOpen}
        aria-controls={listboxId}
        aria-autocomplete="list"
        placeholder={placeholder}
        value={query}
        disabled={disabled}
        autoComplete="off"
        spellCheck={false}
        onChange={(event) => {
          setQuery(event.target.value);
          setPanelOpen(true);
          void runSearch(event.target.value);
        }}
        onFocus={() => {
          cancelBlurClose();
          setPanelOpen(true);
          void runSearch(query);
        }}
        onBlur={scheduleBlurClose}
        onKeyDown={handleInputKeyDown}
      />

      {panelOpen ? (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="User suggestions"
          className="glass-panel absolute top-full z-40 mt-1 max-h-60 w-full list-none overflow-y-auto rounded-[var(--radius-md)] p-0 shadow-lg"
          onMouseDown={(event) => {
            event.preventDefault();
            cancelBlurClose();
          }}
        >
          {loading ? (
            <li className="px-3 py-2 text-xs text-[var(--color-text-secondary)]">Searching…</li>
          ) : searchError ? (
            <li className="px-3 py-2 text-xs text-[var(--color-text-secondary)]" role="alert">
              {searchError}
            </li>
          ) : suggestions.length === 0 ? (
            <li className="px-3 py-2 text-xs text-[var(--color-text-secondary)]">
              {query.trim() ? "No users found." : "Type a name, login, or email…"}
            </li>
          ) : (
            suggestions.map((row, index) => (
              <UserSearchSuggestionRow
                key={row.userId}
                row={row}
                active={index === activeIndex}
                onPick={() => pickRow(row)}
                onHover={() => setActiveIndex(index)}
              />
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}

/** One selected performer with optional role label and avatar. */
export interface TaskPerformerEntry {
  userId: string;
  displayName: string;
  /** Profile photo URL when available. */
  avatar: string | null;
  roleLabel: string;
}

/** Props for {@link TaskPerformerPicker}. */
export interface TaskPerformerPickerProps {
  /** Current performer rows. */
  value: TaskPerformerEntry[];
  /** Called when performers are added or removed. */
  onChange: (next: TaskPerformerEntry[]) => void;
  disabled?: boolean;
}

/**
 * Multi-select performer field with searchable user picker and optional role labels.
 *
 * @param props - See {@link TaskPerformerPickerProps}.
 * @returns Performer picker JSX.
 */
export function TaskPerformerPicker({ value, onChange, disabled = false }: TaskPerformerPickerProps) {
  const addPerformer = (candidate: UserSearchCandidate) => {
    if (value.some((row) => row.userId === candidate.userId)) return;
    onChange([
      ...value,
      {
        userId: candidate.userId,
        displayName: candidate.displayName,
        avatar: candidate.avatar ?? null,
        roleLabel: "",
      },
    ]);
  };

  const removePerformer = (userId: string) => {
    onChange(value.filter((row) => row.userId !== userId));
  };

  const updateRole = (userId: string, roleLabel: string) => {
    onChange(value.map((row) => (row.userId === userId ? { ...row, roleLabel } : row)));
  };

  return (
    <div className="flex flex-col gap-3">
      <UserSearchPicker
        onSelect={addPerformer}
        excludedUserIds={value.map((row) => row.userId)}
        disabled={disabled}
        placeholder="Search by name, @login, group, or email…"
      />

      {value.length > 0 ? (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {value.map((row) => (
            <li
              key={row.userId}
              className={cn(taskFormInsetPanelClass, "flex flex-wrap items-center gap-3 py-2.5")}
            >
              <UserAvatarImage src={row.avatar} alt={row.displayName} size={36} />
              <span className="min-w-[120px] flex-1 text-sm font-medium text-[var(--color-text-primary)]">
                {row.displayName}
              </span>
              <input
                type="text"
                value={row.roleLabel}
                disabled={disabled}
                onChange={(e) => updateRole(row.userId, e.target.value)}
                placeholder="Role (optional)"
                className={cn(taskFormControlClass, "min-w-[120px] flex-1")}
              />
              <button
                type="button"
                disabled={disabled}
                className="inline-flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-text-primary)]"
                aria-label={`Remove ${row.displayName}`}
                onClick={() => removePerformer(row.userId)}
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className={taskFormEmptyStateClass}>Search and select at least one performer.</p>
      )}
    </div>
  );
}

export default UserSearchPicker;
