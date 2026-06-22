"use client";

/**
 * @fileoverview Shadcn-style calendar built on react-day-picker v9.
 * Base styles load from `globals.css` so Puck AutoFrame does not clone a missing stylesheet.
 *
 * @module src/components/ui/calendar
 */

import * as React from "react";
import { DayPicker, type DayPickerProps } from "react-day-picker";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

/** Calendar props — extends react-day-picker with Nexus styling. */
export type CalendarProps = DayPickerProps;

/**
 * Single-month calendar for date picking in admin and Puck settings.
 *
 * @param props - react-day-picker configuration.
 * @returns Styled calendar.
 */
function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("nexus-calendar p-2", className)}
      classNames={{
        months: "flex flex-col gap-2",
        month: "flex flex-col gap-2",
        month_caption: "flex justify-center pt-1 relative items-center w-full",
        caption_label: "text-sm font-medium text-(--color-text-primary)",
        nav: "flex items-center gap-1",
        button_previous: cn(
          buttonVariants({ variant: "outline", size: "icon-sm" }),
          "absolute left-1 size-7 bg-transparent p-0 opacity-80 hover:opacity-100",
        ),
        button_next: cn(
          buttonVariants({ variant: "outline", size: "icon-sm" }),
          "absolute right-1 size-7 bg-transparent p-0 opacity-80 hover:opacity-100",
        ),
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "text-(--color-text-secondary) rounded-md w-8 font-normal text-[0.7rem]",
        week: "flex w-full mt-1",
        day: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20",
        day_button: cn(
          buttonVariants({ variant: "ghost", size: "icon-sm" }),
          "size-8 p-0 font-normal aria-selected:opacity-100",
        ),
        selected:
          "bg-(--color-accent-user) text-(--color-text-on-accent) hover:bg-(--color-accent-user) hover:text-(--color-text-on-accent) focus:bg-(--color-accent-user) focus:text-(--color-text-on-accent)",
        today: "bg-(--color-bg-muted) text-(--color-text-primary)",
        outside: "text-(--color-text-secondary) opacity-50",
        disabled: "text-(--color-text-secondary) opacity-40",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === "left" ? (
            <ChevronLeft className="size-4" aria-hidden="true" />
          ) : (
            <ChevronRight className="size-4" aria-hidden="true" />
          ),
      }}
      {...props}
    />
  );
}

export { Calendar };
