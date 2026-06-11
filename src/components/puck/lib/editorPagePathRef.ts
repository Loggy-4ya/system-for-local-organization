/**
 * @fileoverview Mutable ref for the MongoDB page path key in the Puck editor.
 *
 * @module src/components/puck/lib/editorPagePathRef
 */

/** Current editor page path (e.g. `/news`) for slug validation. */
export const editorPagePathRef = {
  currentPath: "/",
};

/**
 * Update the editor page path ref when the route changes.
 *
 * @param path - Absolute MongoDB page path key.
 */
export function setEditorPagePath(path: string): void {
  editorPagePathRef.currentPath = path || "/";
}
