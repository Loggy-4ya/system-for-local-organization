"use client";

/**
 * @fileoverview IntersectionObserver hook for deferring work until an element is visible.
 *
 * @module src/lib/useLazyVisible
 */

import { useEffect, useRef, useState } from "react";

/** Options for {@link useLazyVisible}. */
export interface UseLazyVisibleOptions {
  /** Intersection ratio threshold (0–1). */
  threshold?: number;
  /** Root margin passed to IntersectionObserver. */
  rootMargin?: string;
  /** When false, the observer is not attached. */
  enabled?: boolean;
}

/**
 * Track whether a target element is visible in the viewport.
 *
 * @param options - Observer tuning and enable flag.
 * @returns Ref to attach and visibility flag.
 */
export function useLazyVisible(options: UseLazyVisibleOptions = {}) {
  const { threshold = 0, rootMargin = "120px", enabled = true } = options;
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!enabled || visible) return;
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled, rootMargin, threshold, visible]);

  return { ref, visible };
}

export default useLazyVisible;
