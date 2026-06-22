/**
 * @fileoverview Shared Tailwind class tokens for `/tasks` compose and detail forms.
 *
 * Keeps inputs, selects, and textareas visually aligned with the unified Input component.
 *
 * @module src/components/tasks/taskFormTokens
 */

/** Standard single-line control — matches `@/components/ui/input`. */
export const taskFormControlClass =
  "h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-2.5 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30";

/** Multi-line task description control. */
export const taskFormTextareaClass =
  "min-h-[7.5rem] w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm leading-relaxed shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

/** Full-width select trigger aligned with {@link taskFormControlClass}. */
export const taskFormSelectTriggerClass = `${taskFormControlClass} flex w-full items-center justify-between gap-2`;

/** Dashed empty-state panel for optional fields. */
export const taskFormEmptyStateClass =
  "rounded-md border border-dashed border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-3 py-2.5 text-xs text-[var(--color-text-secondary)]";

/** Inner subsection surface (avoid nested glass-panel). */
export const taskFormInsetPanelClass =
  "rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-4";
