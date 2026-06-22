"use client";

/**
 * @fileoverview Read-only gallery for task explanation or report media attachments.
 *
 * @module src/components/tasks/TaskMediaGallery
 */

import React from "react";
import type { ITaskMediaRef } from "@shared/models/Task";

/** Props for {@link TaskMediaGallery}. */
export interface TaskMediaGalleryProps {
  /** Media refs to render. */
  items: ITaskMediaRef[];
  /** Accessible label for the gallery region. */
  label?: string;
}

/**
 * Grid gallery for task media attachments on detail surfaces.
 *
 * @param props - Media items and optional label.
 * @returns Gallery JSX or null when empty.
 */
export function TaskMediaGallery({ items, label = "Attachments" }: TaskMediaGalleryProps) {
  if (!items.length) return null;

  return (
    <section aria-label={label}>
      <h3 className="mb-2 text-xs font-semibold tracking-wide text-[var(--color-text-secondary)] uppercase">
        {label}
      </h3>
      <ul className="grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3">
        {items.map((item, index) => (
          <li
            key={`${item.url}-${index}`}
            className="glass-panel overflow-hidden rounded-[var(--radius-md)]"
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
          </li>
        ))}
      </ul>
    </section>
  );
}

export default TaskMediaGallery;
