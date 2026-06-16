"use client";

/**
 * @fileoverview Pointer flick navigation for carousel edit — complements Embla without blocking Puck drag.
 *
 * @module src/components/puck/lib/useCarouselEditSwipe
 */

import { useEffect, useRef, type RefObject } from "react";
import {
  resolveCarouselEditSwipeDirection,
  shouldAllowCarouselEditPointerFlick,
} from "@/components/puck/lib/carouselEditSwipeLogic";

/** Options for {@link useCarouselEditSwipe}. */
export interface UseCarouselEditSwipeOptions {
  /** When false, listeners are not attached. */
  enabled: boolean;
  /** Carousel root — `.nexus-carousel` element. */
  rootRef: RefObject<HTMLElement | null>;
  /** Navigate to the previous slide/page. */
  onSwipePrev: () => void;
  /** Navigate to the next slide/page. */
  onSwipeNext: () => void;
  /** True while Puck canvas block drag is active. */
  isCanvasDragActive: () => boolean;
  /** Current Embla snap index — used to skip flick when Embla already scrolled. */
  getSnapIndex?: () => number | undefined;
}

/** Passive capture listeners — observe gestures without blocking Puck pointerdown. */
const CAPTURE_LISTENER_OPTIONS: AddEventListenerOptions = { capture: true, passive: true };

/** Active pointer session for one-finger horizontal swipe. */
interface CarouselEditSwipeSession {
  pointerId: number;
  startX: number;
  startY: number;
  startSnap: number | undefined;
  rejected: boolean;
  pointerDownTarget: EventTarget | null;
}

/**
 * Attach pointer flick listeners for carousel edit layouts (phone + mouse).
 *
 * @param options - Swipe wiring and navigation callbacks.
 */
export function useCarouselEditSwipe({
  enabled,
  rootRef,
  onSwipePrev,
  onSwipeNext,
  isCanvasDragActive,
  getSnapIndex,
}: UseCarouselEditSwipeOptions): void {
  const onSwipePrevRef = useRef(onSwipePrev);
  const onSwipeNextRef = useRef(onSwipeNext);
  const isCanvasDragActiveRef = useRef(isCanvasDragActive);
  const getSnapIndexRef = useRef(getSnapIndex);

  onSwipePrevRef.current = onSwipePrev;
  onSwipeNextRef.current = onSwipeNext;
  isCanvasDragActiveRef.current = isCanvasDragActive;
  getSnapIndexRef.current = getSnapIndex;

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const root = rootRef.current;
    if (!root) {
      return undefined;
    }

    const sessionRef: { current: CarouselEditSwipeSession | null } = { current: null };

    const clearSession = () => {
      sessionRef.current = null;
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse" && event.button !== 0) {
        return;
      }

      if (isCanvasDragActiveRef.current()) {
        return;
      }

      if (
        !shouldAllowCarouselEditPointerFlick(
          event.target,
          root,
          isCanvasDragActiveRef.current(),
        )
      ) {
        return;
      }

      sessionRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startSnap: getSnapIndexRef.current?.(),
        rejected: false,
        pointerDownTarget: event.target,
      };
    };

    const handlePointerMove = (event: PointerEvent) => {
      const session = sessionRef.current;
      if (!session || event.pointerId !== session.pointerId || session.rejected) {
        return;
      }

      const deltaX = event.clientX - session.startX;
      const deltaY = event.clientY - session.startY;

      if (Math.abs(deltaY) > Math.abs(deltaX) * 1.1 && Math.abs(deltaY) > 12) {
        session.rejected = true;
      }
    };

    const handlePointerUp = (event: PointerEvent) => {
      const session = sessionRef.current;
      if (!session || event.pointerId !== session.pointerId) {
        return;
      }

      clearSession();

      if (session.rejected || isCanvasDragActiveRef.current()) {
        return;
      }

      if (
        !shouldAllowCarouselEditPointerFlick(
          session.pointerDownTarget,
          root,
          isCanvasDragActiveRef.current(),
        )
      ) {
        return;
      }

      const endSnap = getSnapIndexRef.current?.();
      if (
        session.startSnap !== undefined &&
        endSnap !== undefined &&
        session.startSnap !== endSnap
      ) {
        return;
      }

      const deltaX = event.clientX - session.startX;
      const deltaY = event.clientY - session.startY;
      const direction = resolveCarouselEditSwipeDirection(deltaX, deltaY);

      if (!direction) {
        return;
      }

      if (direction === "next") {
        onSwipeNextRef.current();
      } else {
        onSwipePrevRef.current();
      }
    };

    const handlePointerCancel = (event: PointerEvent) => {
      const session = sessionRef.current;
      if (!session || event.pointerId !== session.pointerId) {
        return;
      }

      clearSession();
    };

    root.addEventListener("pointerdown", handlePointerDown, CAPTURE_LISTENER_OPTIONS);
    root.addEventListener("pointermove", handlePointerMove, CAPTURE_LISTENER_OPTIONS);
    root.addEventListener("pointerup", handlePointerUp, CAPTURE_LISTENER_OPTIONS);
    root.addEventListener("pointercancel", handlePointerCancel, CAPTURE_LISTENER_OPTIONS);

    return () => {
      root.removeEventListener("pointerdown", handlePointerDown, CAPTURE_LISTENER_OPTIONS);
      root.removeEventListener("pointermove", handlePointerMove, CAPTURE_LISTENER_OPTIONS);
      root.removeEventListener("pointerup", handlePointerUp, CAPTURE_LISTENER_OPTIONS);
      root.removeEventListener("pointercancel", handlePointerCancel, CAPTURE_LISTENER_OPTIONS);
    };
  }, [enabled, rootRef]);
}
