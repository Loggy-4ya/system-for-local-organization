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
import { useTranslations } from "next-intl";
import { Loader2, RotateCcw, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Invoke an editor action handler and absorb async rejections so click handlers
 * never surface as unhandled promise rejections in Next.js devtools.
 *
 * @param action - Sync or async handler from the toolbar.
 */
function invokeEditorAction(action: () => void | Promise<void>): void {
  try {
    const result = action();
    if (result instanceof Promise) {
      void result.catch((error: unknown) => {
        console.error(error);
      });
    }
  } catch (error: unknown) {
    console.error(error);
  }
}

/** Props for {@link AdminEditorActionToolbar}. */
export interface AdminEditorActionToolbarProps {
  /** Called when Reset is pressed. */
  onReset: () => void;
  /** Called when Save is pressed. */
  onSave: () => void | Promise<void>;
  /** Called when Delete is pressed; when omitted, Delete is hidden. */
  onDelete?: () => void | Promise<void>;
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
  const t = useTranslations("admin.editorToolbar");
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
        aria-label={t("resetAria")}
      >
        <RotateCcw className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="hidden sm:inline">{t("reset")}</span>
      </Button>

      <Button
        type="button"
        onClick={() => invokeEditorAction(onSave)}
        disabled={saveDisabled || isSaving || isDeleting}
        className={cn(buttonClass, useEditorButtonStyle && "shadow-md")}
        aria-label={t("saveAria")}
      >
        {isSaving ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
        ) : (
          <Save className="h-4 w-4 shrink-0" aria-hidden="true" />
        )}
        <span className="hidden sm:inline">{isSaving ? t("saving") : t("save")}</span>
      </Button>

      {onDelete ? (
        <Button
          type="button"
          variant="destructive"
          onClick={() => invokeEditorAction(onDelete)}
          disabled={deleteDisabled || isSaving || isDeleting}
          className={buttonClass}
          aria-label={t("deleteAccountAria")}
        >
          {isDeleting ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
          ) : (
            <Trash2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          )}
          <span className="hidden sm:inline">{t("deleteAccount")}</span>
        </Button>
      ) : null}
    </div>
  );
}
