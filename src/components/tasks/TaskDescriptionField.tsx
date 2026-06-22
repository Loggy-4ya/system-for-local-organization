"use client";

/**
 * @fileoverview Task and task-group description editor — site-wide {@link NexusRichTextEditor}.
 *
 * @module src/components/tasks/TaskDescriptionField
 */

import React from "react";
import { NexusRichTextEditor } from "@/components/editor/NexusRichTextEditor";

/** Props for {@link TaskDescriptionField}. */
export interface TaskDescriptionFieldProps {
  /** Controlled HTML body. */
  value: string;
  /** Called when sanitized HTML changes. */
  onChange: (html: string) => void;
  /** Placeholder when empty. */
  placeholder?: string;
  /** Disable editing. */
  disabled?: boolean;
  /** Surfaces blocked-language state to the parent form. */
  onContentPolicyViolation?: (message: string | null) => void;
}

/**
 * Rich description editor for task compose surfaces.
 *
 * @param props - Controlled HTML and optional policy callback.
 * @returns Rich text editor JSX.
 */
export function TaskDescriptionField({
  value,
  onChange,
  placeholder = "Explain the work, expectations, and any acceptance criteria. Type @ to mention, / for commands.",
  disabled = false,
  onContentPolicyViolation,
}: TaskDescriptionFieldProps) {
  return (
    <NexusRichTextEditor
      value={value}
      onChange={onChange}
      variant="full"
      minHeight={160}
      placeholder={placeholder}
      disabled={disabled}
      className="nexus-rich-text-editor--task-form w-full"
      onContentPolicyViolation={onContentPolicyViolation}
    />
  );
}

export default TaskDescriptionField;
