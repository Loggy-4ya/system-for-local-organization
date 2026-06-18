/**
 * @fileoverview Browser helper for deleting a Puck page from the editor.
 *
 * @module src/components/puck/lib/pageDeleteClient
 */

/**
 * Delete a persisted Puck page via the API.
 *
 * @param path - Absolute MongoDB page path key.
 * @returns Resolves when the page document was removed.
 * @throws Error When the API rejects the request.
 */
export async function deletePersistedPage(path: string): Promise<void> {
  const secret = process.env.NEXT_PUBLIC_PUCK_SECRET;
  const params = new URLSearchParams({ path });

  const res = await fetch(`/api/puck?${params.toString()}`, {
    method: "DELETE",
    headers: {
      ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
    },
  });

  if (!res.ok) {
    let message = "Failed to delete page.";
    try {
      const payload = (await res.json()) as { error?: string };
      message = payload.error ?? message;
    } catch {
      /* use default */
    }
    throw new Error(message);
  }
}
