"use client";

/**
 * @fileoverview Flexible task reminder editor — interval, deadline-relative, clock anchors.
 *
 * @module src/components/tasks/TaskReminderSettingsField
 */

import React, { useMemo } from "react";
import { BellRing } from "lucide-react";
import type { ITaskReminderSettings } from "@shared/models/Task";
import {
  DEFAULT_TASK_GROUP_REMINDER_SETTINGS,
  DEFAULT_TASK_REMINDER_SETTINGS,
  DEFAULT_TASK_REMINDER_WEEKDAYS,
  TASK_REMINDER_MODE_LABELS,
  TASK_REMINDER_MODES,
  TASK_REMINDER_UNIT_LABELS,
  TASK_REMINDER_UNITS,
  TASK_REMINDER_UNIT_LIMITS,
  type TaskReminderMode,
  type TaskReminderUnit,
} from "@shared/constants/taskSettings";
import { clampTaskReminderValue, formatTaskReminderSchedule } from "@shared/lib/taskReminderLogic";
import { TaskChannelToggleGroup } from "@/components/tasks/TaskChannelToggleGroup";
import { TaskWeekdayToggleGroup } from "@/components/tasks/TaskWeekdayToggleGroup";
import { TaskFormCheckbox } from "@/components/tasks/TaskFormCheckbox";
import { NexusDateListField } from "@/components/ui/NexusDateListField";
import {
  taskFormControlClass,
  taskFormInsetPanelClass,
  taskFormSelectTriggerClass,
} from "@/components/tasks/taskFormTokens";
import { FormField } from "@/components/ui/form-field";
import { FormAlert } from "@/components/ui/form-alert";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

/** Props for {@link TaskReminderSettingsField}. */
export interface TaskReminderSettingsFieldProps {
  /** Current reminder settings. */
  value: ITaskReminderSettings;
  /** Called when settings change. */
  onChange: (next: ITaskReminderSettings) => void;
  /** Task due date — required for deadline-relative mode validation hint. */
  dueAt?: string | null;
  /** When `group`, copy targets multi-part project reminders. */
  variant?: "task" | "group";
}

/**
 * Flexible reminder schedule editor for task create/update forms.
 *
 * @param props - Controlled reminder settings and optional due date.
 * @returns Reminder settings field JSX.
 */
export function TaskReminderSettingsField({
  value,
  onChange,
  dueAt,
  variant = "task",
}: TaskReminderSettingsFieldProps) {
  const limits = TASK_REMINDER_UNIT_LIMITS[value.unit];
  const needsDueDate = value.enabled && value.mode === "before_due" && !dueAt;
  const isOnDates = value.enabled && value.mode === "on_dates";

  const summary = useMemo(
    () => formatTaskReminderSchedule(value, dueAt ?? null),
    [dueAt, value],
  );

  /** Patch reminder settings immutably. */
  function patch(partial: Partial<ITaskReminderSettings>) {
    onChange({ ...value, ...partial });
  }

  /** Update numeric amount clamped to the active unit. */
  function setAmount(raw: number) {
    patch({ value: clampTaskReminderValue(raw, value.unit) });
  }

  /** Switch unit and clamp the current amount to new limits. */
  function setUnit(unit: TaskReminderUnit) {
    const weekdays =
      unit === "weeks"
        ? value.weekdays?.length
          ? value.weekdays
          : [...DEFAULT_TASK_REMINDER_WEEKDAYS]
        : value.weekdays;
    patch({
      unit,
      value: clampTaskReminderValue(value.value, unit),
      atTime: unit === "days" || unit === "weeks" ? value.atTime ?? "09:00" : null,
      weekdays,
    });
  }

  const weekDays = value.unit === "weeks"
    ? value.weekdays?.length
      ? value.weekdays
      : [...DEFAULT_TASK_REMINDER_WEEKDAYS]
    : [];

  return (
    <div className={cn(taskFormInsetPanelClass, "flex flex-col gap-4")}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-[color-mix(in_srgb,var(--color-accent-user)_14%,transparent)] text-[var(--color-accent-user)]">
          <BellRing className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <TaskFormCheckbox
            label="Enable reminders"
            description={
              variant === "group"
                ? "Notify performers about their open parts on a schedule until the project is done."
                : "Notify performers on a schedule until the task is completed or cancelled."
            }
            checked={value.enabled}
            onChange={(enabled) => patch({ enabled })}
          />
        </div>
      </div>

      {value.enabled ? (
        <div className="flex flex-col gap-4 border-t border-[var(--color-border-default)] pt-4">
          <FormField label="Schedule type">
            <Select
              value={value.mode}
              onValueChange={(next) => patch({ mode: next as TaskReminderMode })}
            >
              <SelectTrigger className={taskFormSelectTriggerClass}>
                <SelectValue placeholder="Choose schedule type" />
              </SelectTrigger>
              <SelectContent>
                {TASK_REMINDER_MODES.map((mode) => (
                  <SelectItem key={mode} value={mode} label={TASK_REMINDER_MODE_LABELS[mode]}>
                    {TASK_REMINDER_MODE_LABELS[mode]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          {isOnDates ? (
            <>
              <FormField label="Reminder dates" hint="Pick one or more calendar dates and times.">
                <NexusDateListField
                  value={value.scheduledDates ?? []}
                  onChange={(scheduledDates) => patch({ scheduledDates })}
                  triggerClassName={taskFormSelectTriggerClass}
                />
              </FormField>
              <TaskFormCheckbox
                label="Repeat these dates every year"
                description="After all dates fire, the same month/day schedule repeats indefinitely."
                checked={Boolean(value.repeatYearlyOnDates)}
                onChange={(repeatYearlyOnDates) => patch({ repeatYearlyOnDates })}
              />
            </>
          ) : (
            <>
              <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_9rem] sm:items-end sm:gap-x-3 sm:gap-y-0">
                <FormField
                  className="min-w-0"
                  label={
                    value.mode === "before_due"
                      ? "Lead time before deadline"
                      : value.mode === "ongoing"
                        ? "Remind every"
                        : "Repeat every"
                  }
                  hint={`Allowed range: ${limits.min}–${limits.max} ${value.unit}`}
                >
                  <Input
                    type="number"
                    min={limits.min}
                    max={limits.max}
                    className={taskFormControlClass}
                    value={value.value}
                    disabled={needsDueDate}
                    onChange={(e) => setAmount(Number(e.target.value))}
                  />
                </FormField>

                <FormField className="min-w-0" label="Unit">
                  <Select
                    value={value.unit}
                    disabled={needsDueDate}
                    onValueChange={(next) => setUnit(next as TaskReminderUnit)}
                  >
                    <SelectTrigger className={taskFormSelectTriggerClass}>
                      <SelectValue placeholder="Unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {TASK_REMINDER_UNITS.map((unit) => (
                        <SelectItem key={unit} value={unit} label={TASK_REMINDER_UNIT_LABELS[unit]}>
                          {TASK_REMINDER_UNIT_LABELS[unit]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              </div>

              {value.mode === "before_due" ? (
                <TaskFormCheckbox
                  label={`Then repeat every ${value.value} ${TASK_REMINDER_UNIT_LABELS[value.unit].toLowerCase()} until deadline`}
                  checked={Boolean(value.repeatUntilDue)}
                  disabled={needsDueDate}
                  onChange={(repeatUntilDue) => patch({ repeatUntilDue })}
                />
              ) : null}

              {(value.unit === "days" || value.unit === "weeks") && (
                <FormField label="At time" hint="Local clock time for day or week cadence.">
                  <Input
                    type="time"
                    className={taskFormControlClass}
                    value={value.atTime ?? "09:00"}
                    disabled={needsDueDate}
                    onChange={(e) => patch({ atTime: e.target.value || null })}
                  />
                </FormField>
              )}

              {value.unit === "weeks" ? (
                <FormField
                  label="Days of the week"
                  hint="Reminders fire on each selected day at the time above."
                >
                  <TaskWeekdayToggleGroup
                    value={weekDays}
                    disabled={needsDueDate}
                    onChange={(weekdays) => patch({ weekdays })}
                  />
                </FormField>
              ) : null}

              {needsDueDate ? (
                <FormAlert variant="info" title="Due date required">
                  Choose a due date above to use deadline-relative reminders.
                </FormAlert>
              ) : null}
            </>
          )}

          <FormField label="Delivery channels">
            <TaskChannelToggleGroup
              value={value.channels}
              onChange={(channels) => patch({ channels })}
              disabled={needsDueDate}
            />
          </FormField>

          {!needsDueDate ? (
            <FormAlert variant="info" title="Schedule preview">
              {summary}
            </FormAlert>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** Default reminder settings for new task forms. */
export function createDefaultTaskReminderSettings(): ITaskReminderSettings {
  return {
    ...DEFAULT_TASK_REMINDER_SETTINGS,
    channels: [...DEFAULT_TASK_REMINDER_SETTINGS.channels],
  };
}

/** Default long-run reminder settings for new task group forms. */
export function createDefaultTaskGroupReminderSettings(): ITaskReminderSettings {
  return {
    ...DEFAULT_TASK_GROUP_REMINDER_SETTINGS,
    channels: [...DEFAULT_TASK_GROUP_REMINDER_SETTINGS.channels],
    weekdays: [...DEFAULT_TASK_GROUP_REMINDER_SETTINGS.weekdays],
  };
}

export default TaskReminderSettingsField;
