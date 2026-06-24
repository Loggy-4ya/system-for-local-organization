"use client";

/**
 * @fileoverview Compact comment composer for page discussions.
 *
 * @module src/components/comments/PageCommentComposer
 */

import { useCallback, useState } from "react";
import {
  getPageCommentValidationError,
  isNonEmptyPageCommentBody,
} from "@shared/lib/pageCommentLogic";
import { Button } from "@/components/ui/button";
import { useEffectiveContentPolicy } from "@/lib/useEffectiveContentPolicy";
import { postPageComment } from "@/lib/pageCommentsClient";
import { PageCommentBodyField } from "./PageCommentBodyField";

/** Props for {@link PageCommentComposer}. */
export interface PageCommentComposerProps {
  /** MongoDB page path key. */
  pagePath: string;
  /** Optional parent comment id for replies. */
  parentCommentId?: string | null;
  /** Input placeholder. */
  placeholder?: string;
  /** Called after a successful post. */
  onPosted?: () => void;
  /** Optional cancel handler for inline reply forms. */
  onCancel?: () => void;
}

/**
 * Rich text editor + submit control for posting page comments.
 *
 * @param props - Page path and callbacks.
 * @returns Composer JSX.
 */
export function PageCommentComposer({
  pagePath,
  parentCommentId = null,
  placeholder = "Add a comment…",
  onPosted,
  onCancel,
}: PageCommentComposerProps) {
  const contentPolicy = useEffectiveContentPolicy();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [policyError, setPolicyError] = useState<string | null>(null);

  const validateBody = useCallback(
    (value: string) =>
      getPageCommentValidationError(value, contentPolicy ?? undefined),
    [contentPolicy],
  );

  const handleBodyChange = useCallback(
    (value: string) => {
      setBody(value);
      if (!error) return;
      const nextError = validateBody(value);
      setError(nextError);
    },
    [error, validateBody],
  );

  const handleSubmit = useCallback(async () => {
    if (busy) return;

    const validationError = validateBody(body) ?? policyError;
    if (validationError) {
      setError(validationError);
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await postPageComment(pagePath, body, parentCommentId);
      setBody("");
      setPolicyError(null);
      onPosted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post comment.");
    } finally {
      setBusy(false);
    }
  }, [body, busy, onPosted, pagePath, parentCommentId, policyError, validateBody]);

  const canSubmit = isNonEmptyPageCommentBody(body) && !policyError;

  return (
    <div className="nexus-page-comment-composer glass-panel">
      <PageCommentBodyField
        value={body}
        onChange={handleBodyChange}
        placeholder={placeholder}
        disabled={busy}
        compact={Boolean(parentCommentId)}
        onContentPolicyViolation={setPolicyError}
      />
      {error ? (
        <p className="nexus-page-comment-composer__error" role="alert">
          {error}
        </p>
      ) : policyError ? (
        <p className="nexus-page-comment-composer__error" role="alert">
          {policyError}
        </p>
      ) : (
        <p className="nexus-page-comment-composer__policy-hint">
          Comments are checked against institutional language rules.
        </p>
      )}
      <div className="nexus-page-comment-composer__actions">
        {onCancel ? (
          <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          disabled={busy || !canSubmit}
          onClick={() => void handleSubmit()}
        >
          {parentCommentId ? "Reply" : "Comment"}
        </Button>
      </div>
    </div>
  );
}

export default PageCommentComposer;
