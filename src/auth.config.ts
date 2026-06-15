/**
 * @fileoverview Edge-compatible Auth.js config for middleware.
 *
 * Providers are registered in {@link ../auth.ts}; this file supplies only
 * session/pages settings so middleware does not import Node-only modules.
 *
 * @module src/auth.config
 */

import type { NextAuthConfig } from "next-auth";

/**
 * Shared Auth.js configuration safe for Edge middleware.
 */
export const authConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    /**
     * Pass JWT sub and role into the session object.
     *
     * @param params - Auth.js session callback parameters.
     * @returns Hydrated session.
     */
    async session({ session, token }) {
      if (token.sub && session.user) {
        session.user.id = token.sub;
        if (token.role) {
          (session.user as { role?: string }).role = token.role as string;
        }
      }
      return session;
    },
    /**
     * Persist user id and role in the JWT.
     *
     * @param params - Auth.js JWT callback parameters.
     * @returns Updated token.
     */
    async jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
        token.role = (user as { role?: string }).role;
      }
      return token;
    },
  },
} satisfies NextAuthConfig;

export default authConfig;
