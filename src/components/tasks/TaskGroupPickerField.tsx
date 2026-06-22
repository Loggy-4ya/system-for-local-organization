"use client";

/**
 * @fileoverview Optional task group picker for attaching a task to a multi-part project.
 *
 * @module src/components/tasks/TaskGroupPickerField
 */

import React, { useEffect, useState } from "react";
import { Layers } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { taskFormSelectTriggerClass } from "@/components/tasks/taskFormTokens";

/** One selectable group from GET /api/task-groups/picker. */
interface TaskGroupPickerOption {
  id: string;
  title: string;
  status: string;
}

/** Props for {@link TaskGroupPickerField}. */
export interface TaskGroupPickerFieldProps {
  /** Selected group id or null for standalone task. */
  value: string | null;
  /** Called when selection changes. */
  onChange: (groupId: string | null) => void;
}

/**
 * Select an existing project group when creating a child task.
 *
 * @param props - Controlled group id.
 * @returns Group picker JSX.
 */
export function TaskGroupPickerField({ value, onChange }: TaskGroupPickerFieldProps) {
  const [options, setOptions] = useState<TaskGroupPickerOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const res = await fetch("/api/task-groups/picker");
      if (res.ok) {
        const data = (await res.json()) as { groups?: TaskGroupPickerOption[] };
        if (!cancelled) setOptions(data.groups ?? []);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex items-start gap-3">
      <span className="mt-2 flex size-8 shrink-0 items-center justify-center rounded-md bg-[color-mix(in_srgb,var(--color-accent-user)_14%,transparent)] text-[var(--color-accent-user)]">
        <Layers className="size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <Select
          value={value ?? "__none__"}
          onValueChange={(next) => onChange(next === "__none__" ? null : next)}
          disabled={loading}
        >
          <SelectTrigger className={taskFormSelectTriggerClass}>
            <SelectValue placeholder={loading ? "Loading projects…" : "No project group"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__" label="No project group">
              No project group (standalone task)
            </SelectItem>
            {options.map((group) => (
              <SelectItem key={group.id} value={group.id} label={group.title}>
                {group.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
          Link this task as one part of a larger project. Project-level reminders are configured on
          the group.
        </p>
      </div>
    </div>
  );
}

export default TaskGroupPickerField;
