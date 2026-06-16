/**
 * @fileoverview SessionProvider wrapper for client components needing next-auth/react.
 *
 * @module src/components/auth/SessionProvider
 */

"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import type { Session } from "next-auth";
import type { ReactNode } from "react";

/** Props for {@link SessionProvider}. */
export interface SessionProviderProps {
  children: ReactNode;
  /** Server-hydrated session — avoids a blank client period on mobile. */
  session?: Session | null;
}

/**
 * Thin wrapper around next-auth SessionProvider.
 *
 * @param props - Child tree and optional server session.
 * @returns Provider-wrapped children.
 */
export function SessionProvider({ children, session }: SessionProviderProps) {
  return (
    <NextAuthSessionProvider session={session ?? undefined}>
      {children}
    </NextAuthSessionProvider>
  );
}

export default SessionProvider;
