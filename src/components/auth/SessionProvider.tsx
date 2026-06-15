/**
 * @fileoverview SessionProvider wrapper for client components needing next-auth/react.
 *
 * @module src/components/auth/SessionProvider
 */

"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import type { ReactNode } from "react";

/** Props for {@link SessionProvider}. */
export interface SessionProviderProps {
  children: ReactNode;
}

/**
 * Thin wrapper around next-auth SessionProvider.
 *
 * @param props - Child tree.
 * @returns Provider-wrapped children.
 */
export function SessionProvider({ children }: SessionProviderProps) {
  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>;
}

export default SessionProvider;
