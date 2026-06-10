/**
 * @fileoverview Hook for Puck custom fields that defer parent `onChange` until commit.
 *
 * Prevents full canvas re-renders on every color drag or slider tick.
 *
 * @module src/components/puck/lib/useDeferredFieldCommit
 */

import { useCallback, useEffect, useRef, useState } from "react";

/** Options for {@link useDeferredFieldCommit}. */
interface UseDeferredFieldCommitOptions {
  /** External value from Puck props. */
  value: string;
  /** Puck field onChange — triggers canvas update. */
  onChange: (value: string) => void;
  /** Debounce ms for text typing commits (0 = blur/Enter only). */
  textDebounceMs?: number;
}

/**
 * Manage local draft state and commit to Puck only on blur, Enter, or pointerup.
 *
 * @param options - Value sync and commit configuration.
 * @returns Draft state and event handlers for controlled inputs.
 */
export function useDeferredFieldCommit({
  value,
  onChange,
  textDebounceMs = 400,
}: UseDeferredFieldCommitOptions) {
  const [draft, setDraft] = useState(value || "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setDraft(value || "");
  }, [value]);

  const commit = useCallback(
    (next?: string) => {
      const resolved = next ?? draft;
      if (resolved !== value) {
        onChange(resolved);
      }
    },
    [draft, onChange, value],
  );

  const onDraftChange = useCallback((next: string) => {
    setDraft(next);
  }, []);

  const onTextChange = useCallback(
    (next: string) => {
      setDraft(next);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onChange(next);
      }, textDebounceMs);
    },
    [onChange, textDebounceMs],
  );

  const onTextBlur = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    commit();
  }, [commit]);

  const onPointerUpCommit = useCallback(() => {
    commit();
  }, [commit]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return {
    draft,
    setDraft: onDraftChange,
    commit,
    onTextChange,
    onTextBlur,
    onPointerUpCommit,
  };
}
