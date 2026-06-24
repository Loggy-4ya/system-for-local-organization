"use client";

/**
 * @fileoverview Rich comment body editor — site-wide {@link NexusRichTextEditor}.
 *
 * @module src/components/comments/PageCommentBodyField
 */

import { NexusRichTextEditor } from "@/components/editor/NexusRichTextEditor";

/** Props for {@link PageCommentBodyField}. */
export interface PageCommentBodyFieldProps {
  /** Controlled HTML body. */
  value: string;
  /** Called when sanitized HTML changes. */
  onChange: (html: string) => void;
  /** Placeholder when empty. */
  placeholder?: string;
  /** Disable editing. */
  disabled?: boolean;
  /** Compact height for inline reply forms. */
  compact?: boolean;
  /** Surfaces blocked-language state to the parent form. */
  onContentPolicyViolation?: (message: string | null) => void;
}

/**
 * Rich text editor for page comment compose surfaces.
 *
 * @param props - Controlled HTML and optional policy callback.
 * @returns Rich text editor JSX.
 */
export function PageCommentBodyField({
  value,
  onChange,
  placeholder = "Add a comment… Type @ to mention, / for commands.",
  disabled = false,
  compact = false,
  onContentPolicyViolation,
}: PageCommentBodyFieldProps) {
  return (
    <NexusRichTextEditor
      value={value}
      onChange={onChange}
      variant="default"
      minHeight={compact ? 72 : 96}
      placeholder={placeholder}
      disabled={disabled}
      className="nexus-rich-text-editor--page-comment w-full"
      onContentPolicyViolation={onContentPolicyViolation}
    />
  );
}

export default PageCommentBodyField;
