"use client";

/**
 * @fileoverview Task category picker — loads institutional categories from general rules.
 *
 * @module src/components/tasks/TaskCategorySelectField
 */

import React, { useEffect, useState } from "react";
import type { TaskCategoryDefinition } from "@shared/constants/taskCategoryDefaults";
import { FormField } from "@/components/ui/form-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** Props for {@link TaskCategorySelectField}. */
export interface TaskCategorySelectFieldProps {
  /** Selected category slug. */
  value: string | null;
  /** Called when selection changes. */
  onChange: (categoryId: string | null) => void;
  /** Disables the control. */
  disabled?: boolean;
}

/**
 * Select one institutional task category (scoring arrangement).
 *
 * @param props - Controlled category id.
 * @returns Category select field JSX.
 */
export function TaskCategorySelectField({
  value,
  onChange,
  disabled = false,
}: TaskCategorySelectFieldProps) {
  const [categories, setCategories] = useState<TaskCategoryDefinition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch("/api/tasks/categories");
      if (!res.ok) {
        setLoading(false);
        return;
      }
      const data = (await res.json()) as { categories?: TaskCategoryDefinition[] };
      if (!cancelled) {
        setCategories(data.categories ?? []);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <FormField
      label="Task category"
      hint="Sets the allowed base score (B) range when you score this assignment."
      required
    >
      <Select
        value={value ?? undefined}
        onValueChange={(next) => onChange(next)}
        disabled={disabled || loading || categories.length === 0}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={loading ? "Loading categories…" : "Select category"} />
        </SelectTrigger>
        <SelectContent>
          {categories.map((category) => (
            <SelectItem key={category.id} value={category.id} label={category.label}>
              {category.label} (B {category.baseScoreMin}–{category.baseScoreMax})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormField>
  );
}

export default TaskCategorySelectField;
