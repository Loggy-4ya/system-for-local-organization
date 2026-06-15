/**
 * @fileoverview Live draft store for page title and slug shown in the Puck header.
 *
 * Sidebar fields update this store on every keystroke so {@link PageHeaderLabel}
 * can render without committing Puck document mutations (which would rerender the
 * canvas). Commits to `root.props.pageSettings` happen on blur only.
 *
 * @module src/components/puck/lib/editorPageMetadataStore
 */

/** Draft page metadata mirrored in the editor header label. */
export interface PageMetadataDraft {
  /** Human-readable page title. */
  title: string;
  /** URL slug without leading slash (empty for homepage). */
  slug: string;
  /** When true, slug is fixed at `/`. */
  slugLocked: boolean;
}

const DEFAULT_DRAFT: PageMetadataDraft = {
  title: "Untitled Page",
  slug: "",
  slugLocked: false,
};

let snapshot: PageMetadataDraft = { ...DEFAULT_DRAFT };
const listeners = new Set<() => void>();

/**
 * Notify all `useSyncExternalStore` subscribers of a draft change.
 */
function notifyListeners(): void {
  listeners.forEach((listener) => listener());
}

/**
 * Normalize and assign the metadata draft snapshot without notifying subscribers.
 *
 * Use during render (e.g. `useState` lazy init) so `getPageMetadataDraft` is correct
 * on the first paint without triggering cross-component updates mid-render.
 *
 * @param draft - Full draft values to store.
 */
export function setPageMetadataSnapshot(draft: PageMetadataDraft): void {
  snapshot = {
    title: draft.title?.trim() || "Untitled Page",
    slug: draft.slug ?? "",
    slugLocked: draft.slugLocked ?? false,
  };
}

/**
 * Replace the metadata draft snapshot (e.g. on editor init or route change).
 *
 * @param draft - Full draft values to store.
 */
export function initPageMetadataDraft(draft: PageMetadataDraft): void {
  setPageMetadataSnapshot(draft);
  notifyListeners();
}

/**
 * Patch the metadata draft without touching the Puck document.
 *
 * @param patch - Partial title/slug/slugLocked update.
 */
export function setPageMetadataDraft(patch: Partial<PageMetadataDraft>): void {
  snapshot = { ...snapshot, ...patch };
  notifyListeners();
}

/**
 * Read the current metadata draft snapshot.
 *
 * @returns Current draft values.
 */
export function getPageMetadataDraft(): PageMetadataDraft {
  return snapshot;
}

/**
 * Subscribe to metadata draft changes for `useSyncExternalStore`.
 *
 * @param onStoreChange - Invalidation callback.
 * @returns Unsubscribe function.
 */
export function subscribePageMetadataDraft(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}
