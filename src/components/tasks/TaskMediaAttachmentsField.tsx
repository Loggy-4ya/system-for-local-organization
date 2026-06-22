"use client";

/**
 * @fileoverview Task media attachment picker — images and videos via `task-report` uploads.
 *
 * @module src/components/tasks/TaskMediaAttachmentsField
 */

import React, { useId, useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import type { ITaskMediaRef } from "@shared/models/Task";
import { buildTaskMediaRefFromUpload } from "@shared/lib/taskMediaLogic";
import { uploadMediaFile } from "@/lib/mediaUploadClient";
import { Button } from "@/components/ui/button";
import { taskFormEmptyStateClass, taskFormInsetPanelClass } from "@/components/tasks/taskFormTokens";
import { cn } from "@/lib/utils";

/** Props for {@link TaskMediaAttachmentsField}. */
export interface TaskMediaAttachmentsFieldProps {
  /** Current attachment list. */
  value: ITaskMediaRef[];
  /** Called when attachments change. */
  onChange: (next: ITaskMediaRef[]) => void;
  /** Maximum number of files (default 12). */
  maxItems?: number;
}

/**
 * Multi-file media picker for task explanation and report proof attachments.
 *
 * @param props - Controlled attachment list.
 * @returns Media picker JSX.
 */
export function TaskMediaAttachmentsField({
  value,
  onChange,
  maxItems = 12,
}: TaskMediaAttachmentsFieldProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const atLimit = value.length >= maxItems;

  /** Upload selected files and append refs. */
  async function handleFilesSelected(files: FileList | null) {
    if (!files?.length || atLimit) return;

    setUploading(true);
    setError(null);

    try {
      const next = [...value];
      for (const file of Array.from(files)) {
        if (next.length >= maxItems) break;
        const url = await uploadMediaFile(file, { accept: "both", purpose: "task-report" });
        next.push(buildTaskMediaRefFromUpload(url, file));
      }
      onChange(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  /** Remove one attachment by index. */
  function removeAt(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-3">
      {value.length > 0 ? (
        <ul className="grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3">
          {value.map((item, index) => (
            <li
              key={`${item.url}-${index}`}
              className={cn(taskFormInsetPanelClass, "relative overflow-hidden p-0")}
            >
              {item.kind === "video" ? (
                <video
                  src={item.url}
                  className="aspect-video w-full object-cover"
                  controls
                  preload="metadata"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.url} alt="" className="aspect-video w-full object-cover" />
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute top-1 right-1 size-8 bg-black/40 text-white hover:bg-black/60"
                aria-label="Remove attachment"
                onClick={() => removeAt(index)}
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className={taskFormEmptyStateClass}>No media attached yet.</p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="image/*,video/*"
          multiple
          className="sr-only"
          disabled={atLimit || uploading}
          onChange={(event) => void handleFilesSelected(event.target.files)}
        />
        <Button
          type="button"
          variant="outline"
          className="w-full sm:w-auto"
          disabled={atLimit || uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <ImagePlus className="size-4" aria-hidden="true" />
          )}
          {uploading ? "Uploading…" : "Add photo or video"}
        </Button>
        {atLimit ? (
          <span className="text-xs text-[var(--color-text-secondary)]">Maximum {maxItems} files.</span>
        ) : null}
      </div>

      {error ? <p className="text-xs text-red-500">{error}</p> : null}
    </div>
  );
}

export default TaskMediaAttachmentsField;
