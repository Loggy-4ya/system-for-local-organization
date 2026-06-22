"use client";

/**
 * @fileoverview Grouped section shell for task create/edit forms.
 *
 * @module src/components/tasks/TaskFormSection
 */

import React from "react";
import { cn } from "@/lib/utils";

/** Props for {@link TaskFormSection}. */
export interface TaskFormSectionProps {
  /** Uppercase-style section heading. */
  title: string;
  /** Optional helper line under the heading. */
  description?: string;
  /** Section body — typically FormField rows. */
  children: React.ReactNode;
  /** Optional wrapper class. */
  className?: string;
}

/**
 * Visual chapter divider for long task compose forms.
 *
 * @param props - Section metadata and field group.
 * @returns Section JSX.
 */
export function TaskFormSection({ title, description, children, className }: TaskFormSectionProps) {
  return (
    <section className={cn("task-form-section flex flex-col gap-4", className)}>
      <header className="flex flex-col gap-1">
        <h2 className="text-xs font-semibold tracking-wide text-[var(--color-text-secondary)] uppercase">
          {title}
        </h2>
        {description ? (
          <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">{description}</p>
        ) : null}
      </header>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

export default TaskFormSection;
