/**
 * @fileoverview Hook for Puck custom fields that defer parent `onChange` until commit.
 *
 * Prevents full canvas re-renders on every color drag or slider tick.
 *
 * Tests: `npm run test:deferred-field-commit`
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
 * Resolve whether a deferred field commit should call Puck `onChange`.
 *
 * Uses the latest draft ref value so blur in the same event turn as the final
 * keystroke does not commit a stale render snapshot.
 *
 * @param draftRefValue - Current draft held in a ref (updated synchronously on input).
 * @param externalValue - Committed value from Puck props.
 * @param explicitNext - Optional override passed to {@link commit}.
 * @returns Resolved draft and whether it differs from the external value.
 */
export function resolveDeferredFieldCommit(
  draftRefValue: string,
  externalValue: string,
  explicitNext?: string,
): { resolved: string; shouldCommit: boolean } {
  const resolved = explicitNext ?? draftRefValue;
  return { resolved, shouldCommit: resolved !== externalValue };
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
  const draftRef = useRef(value || "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFocusedRef = useRef(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    if (isFocusedRef.current) return;
    draftRef.current = value || "";
    setDraft(value || "");
  }, [value]);

  const commit = useCallback(
    (next?: string) => {
      const { resolved, shouldCommit } = resolveDeferredFieldCommit(
        draftRef.current,
        value,
        next,
      );
      if (shouldCommit) {
        onChangeRef.current(resolved);
      }
    },
    [value],
  );

  const onDraftChange = useCallback((next: string) => {
    draftRef.current = next;
    setDraft(next);
  }, []);

  const onTextChange = useCallback(
    (next: string) => {
      draftRef.current = next;
      setDraft(next);
      if (textDebounceMs <= 0) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onChangeRef.current(next);
      }, textDebounceMs);
    },
    [textDebounceMs],
  );

  const onTextFocus = useCallback(() => {
    isFocusedRef.current = true;
  }, []);

  const onTextBlur = useCallback(() => {
    isFocusedRef.current = false;
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
    onTextFocus,
    onTextBlur,
    onPointerUpCommit,
  };
}
