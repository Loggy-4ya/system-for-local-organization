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

/** True when descendants render inside `.nexus-carousel__slide` (Puck slot content). */
const CarouselSlideMediaContext = createContext(false);

/** Props for {@link CarouselSlideMediaProvider}. */
export interface CarouselSlideMediaProviderProps {
  /** Slide slot subtree (Puck drop zone + nested blocks). */
  children: React.ReactNode;
}

/**
 * Wrap carousel slide slot content so image/video blocks detect carousel placement
 * synchronously during render.
 *
 * @param props - See {@link CarouselSlideMediaProviderProps}.
 * @returns Provider wrapping slide children.
 */
export function CarouselSlideMediaProvider({ children }: CarouselSlideMediaProviderProps) {
  return (
    <CarouselSlideMediaContext.Provider value={true}>{children}</CarouselSlideMediaContext.Provider>
  );
}

/**
 * Whether the current tree renders inside a carousel slide slot.
 *
 * @returns True inside {@link CarouselSlideMediaProvider}.
 */
export function useCarouselSlideMedia(): boolean {
  return useContext(CarouselSlideMediaContext);
}

export default CarouselSlideMediaProvider;
