/**
 * @fileoverview Placeholder tasks panel for profile dashboard until Phase 5 Task engine.
 *
 * @module src/components/profile/ProfileTasksPanel
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Placeholder task row descriptor. */
interface PlaceholderTask {
  title: string;
  meta: string;
  badge?: { label: string; variant: "warning" | "success" };
  action: string;
  actionVariant?: "secondary" | "ghost";
}

const TABS = ["Current", "Sport", "Announcements"] as const;

const PLACEHOLDER_TASKS: PlaceholderTask[] = [
  {
    title: "Lab Report #3",
    meta: "Due Friday · Delivered, Unacknowledged",
    badge: { label: "Warn 2/3", variant: "warning" },
    action: "Confirm",
    actionVariant: "secondary",
  },
  {
    title: "Team Presentation",
    meta: "Completed · +12 coins",
    badge: { label: "Done", variant: "success" },
    action: "Done",
    actionVariant: "secondary",
  },
  {
    title: "Council Budget Review",
    meta: "Assigned · Due Monday",
    action: "Open",
    actionVariant: "ghost",
  },
  {
    title: "Spring Event Proposal",
    meta: "Submitted · Awaiting vote",
    action: "View",
    actionVariant: "ghost",
  },
];

/**
 * Tabbed task list with Figma placeholder content.
 *
 * @returns Tasks panel JSX.
 */
export function ProfileTasksPanel() {
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("Current");

  return (
    <div className="flex flex-1 flex-col gap-2">
      <div
        className="inline-flex w-fit gap-1 rounded-[var(--radius-lg)] border border-[var(--color-border-default)] p-1"
        role="tablist"
      >
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "rounded-[6px] px-4 py-2 text-xs font-medium transition-colors",
              activeTab === tab
                ? "bg-[var(--color-accent-user)] text-[#0f172a]"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        {activeTab === "Current" ? (
          PLACEHOLDER_TASKS.map((task) => (
            <div
              key={task.title}
              className="glass-panel flex items-center gap-3 rounded-[var(--radius-md)] px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                  {task.title}
                </p>
                <p className="text-xs text-[var(--color-text-secondary)]">{task.meta}</p>
              </div>
              {task.badge && (
                <span
                  className={`badge ${task.badge.variant === "warning" ? "badge-warning" : "badge-success"}`}
                >
                  {task.badge.label}
                </span>
              )}
              <Button
                variant={task.actionVariant === "ghost" ? "ghost" : "outline"}
                size="sm"
                type="button"
                disabled
              >
                {task.action}
              </Button>
            </div>
          ))
        ) : (
          <p className="py-8 text-center text-sm text-[var(--color-text-secondary)]">
            No {activeTab.toLowerCase()} tasks yet.
          </p>
        )}
      </div>
    </div>
  );
}

export default ProfileTasksPanel;
