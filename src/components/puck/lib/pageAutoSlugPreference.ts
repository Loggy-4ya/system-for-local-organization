/**
 * @fileoverview Browser preference for auto-slugifying page titles in the Puck editor.
 *
 * @module src/components/puck/lib/pageAutoSlugPreference
 */

const STORAGE_KEY = "nexus-editor-auto-slug-from-title";

let preferenceListeners: Array<() => void> = [];

/**
 * Subscribe to auto-slug preference changes in this tab.
 *
 * @param listener - Callback invoked when the preference changes.
 * @returns Unsubscribe function.
 */
export function subscribePageAutoSlugFromTitlePreference(listener: () => void): () => void {
  preferenceListeners.push(listener);
  return () => {
    preferenceListeners = preferenceListeners.filter((entry) => entry !== listener);
  };
}

/**
 * Read whether the editor should derive URL slugs from the page title.
 *
 * @returns True by default when unset.
 */
export function getPageAutoSlugFromTitlePreference(): boolean {
  if (typeof window === "undefined") return true;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === null) return true;
  return raw !== "0";
}

/**
 * Persist the auto-slug editor preference for future page edits.
 *
 * @param enabled - Whether title changes should update the slug.
 */
export function setPageAutoSlugFromTitlePreference(enabled: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
  preferenceListeners.forEach((listener) => listener());
}
