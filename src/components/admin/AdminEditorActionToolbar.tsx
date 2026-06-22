"use client";

/**
 * @fileoverview Shared responsive action toolbar for admin editor surfaces.
 *
 * Renders Reset, Save, and optional Delete in a single aligned row. Below `sm`,
 * labels collapse to icon-only buttons with accessible `aria-label` text.
 *
 * @module src/components/admin/AdminEditorActionToolbar
 */

import React from "react";
import { Loader2, RotateCcw, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Props for {@link AdminEditorActionToolbar}. */
export interface AdminEditorActionToolbarProps {
  /** Called when Reset is pressed. */
  onReset: () => void;
  /** Called when Save is pressed. */
  onSave: () => void;
  /** Called when Delete is pressed; when omitted, Delete is hidden. */
  onDelete?: () => void;
  /** Disables Reset. */
  resetDisabled?: boolean;
  /** Disables Save. */
  saveDisabled?: boolean;
  /** Disables Delete. */
  deleteDisabled?: boolean;
  /** When true, Save shows a spinner. */
  isSaving?: boolean;
  /** When true, Delete shows a spinner. */
  isDeleting?: boolean;
  /** Optional extra classes on the toolbar container. */
  className?: string;
  /** Apply global-layout-editor button text sizing. */
  useEditorButtonStyle?: boolean;
}

/**
 * Aligned admin editor action toolbar — Reset, Save, optional Delete.
 *
 * @param props - See {@link AdminEditorActionToolbarProps}.
 * @returns Horizontal action button row.
 */
export function AdminEditorActionToolbar({
  onReset,
  onSave,
  onDelete,
  resetDisabled = false,
  saveDisabled = false,
  deleteDisabled = false,
  isSaving = false,
  isDeleting = false,
  className,
  useEditorButtonStyle = false,
}: AdminEditorActionToolbarProps) {
  const buttonClass = cn(
    "gap-2 px-3 sm:px-4",
    useEditorButtonStyle && "global-layout-editor__btn-text",
  );

  return (
    <div
      className={cn(
        "flex flex-row flex-wrap items-center justify-end gap-2",
        className,
      )}
    >
      <Button
        type="button"
        variant="outline"
        onClick={onReset}
        disabled={resetDisabled || isSaving || isDeleting}
        className={buttonClass}
        aria-label="Reset changes"
      >
        <RotateCcw className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="hidden sm:inline">Reset</span>
      </Button>

      <Button
        type="button"
        onClick={onSave}
        disabled={saveDisabled || isSaving || isDeleting}
        className={cn(buttonClass, useEditorButtonStyle && "shadow-md")}
        aria-label="Save changes"
      >
        {isSaving ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
        ) : (
          <Save className="h-4 w-4 shrink-0" aria-hidden="true" />
        )}
        <span className="hidden sm:inline">{isSaving ? "Saving…" : "Save Changes"}</span>
      </Button>

      {onDelete ? (
        <Button
          type="button"
          variant="destructive"
          onClick={onDelete}
          disabled={deleteDisabled || isSaving || isDeleting}
          className={buttonClass}
          aria-label="Delete account"
        >
          {isDeleting ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
          ) : (
            <Trash2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          )}
          <span className="hidden sm:inline">Delete Account</span>
        </Button>
      ) : null}
    </div>
  );
}
