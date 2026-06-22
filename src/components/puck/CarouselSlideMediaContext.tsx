"use client";

/**
 * @fileoverview Marks Puck slot subtrees rendered inside a carousel slide card.
 *
 * Media blocks read this to enable fill-slide layout on the first paint (no ref /
 * layout-effect delay). Avoids `:has(.nexus-carousel__slide-media-fill)` chicken-and-egg
 * where CSS waits for a class that React applied one frame late.
 *
 * @module src/components/puck/CarouselSlideMediaContext
 */

import { createContext, useContext } from "react";

/** Carousel slide slot context — placement + composite layout flag. */
export interface CarouselSlideMediaContextValue {
  /** True when descendants render inside `.nexus-carousel__slide`. */
  inCarouselSlide: boolean;
  /** True when the slide stacks multiple blocks or hosts a nested grid. */
  compositeSlide: boolean;
}

const defaultCarouselSlideMediaContext: CarouselSlideMediaContextValue = {
  inCarouselSlide: false,
  compositeSlide: false,
};

const CarouselSlideMediaContext = createContext(defaultCarouselSlideMediaContext);

/** Props for {@link CarouselSlideMediaProvider}. */
export interface CarouselSlideMediaProviderProps {
  /** Slide slot subtree (Puck drop zone + nested blocks). */
  children: React.ReactNode;
  /** When true, suppress fill-slide auto mode for stacked / grid slide layouts. */
  compositeSlide?: boolean;
}

/**
 * Wrap carousel slide slot content so image/video blocks detect carousel placement
 * synchronously during render.
 *
 * @param props - See {@link CarouselSlideMediaProviderProps}.
 * @returns Provider wrapping slide children.
 */
export function CarouselSlideMediaProvider({
  children,
  compositeSlide = false,
}: CarouselSlideMediaProviderProps) {
  return (
    <CarouselSlideMediaContext.Provider
      value={{ inCarouselSlide: true, compositeSlide }}
    >
      {children}
    </CarouselSlideMediaContext.Provider>
  );
}

/**
 * Whether the current tree renders inside a carousel slide slot.
 *
 * @returns True inside {@link CarouselSlideMediaProvider}.
 */
export function useCarouselSlideMedia(): boolean {
  return useContext(CarouselSlideMediaContext).inCarouselSlide;
}

/**
 * Whether the current slide is a composite layout (multi-block or nested grid).
 *
 * @returns True when fill-slide auto mode must stay off on first paint.
 */
export function useCarouselSlideComposite(): boolean {
  return useContext(CarouselSlideMediaContext).compositeSlide;
}

export default CarouselSlideMediaProvider;
