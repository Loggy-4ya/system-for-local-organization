/**
 * @fileoverview Back-compat re-exports — prefer carouselPagination and carouselEngine.
 *
 * @module src/components/puck/lib/carouselEmblaOptions
 */

export * from "./carouselPagination";
export * from "./carouselEngine";
export { scrollEngineToSnap as scrollEmblaToSnap } from "./carouselEngine";
export type { CarouselEngineApi as CarouselEmblaScrollApi } from "./carouselEngine";
