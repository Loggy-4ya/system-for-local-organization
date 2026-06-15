/**
 * @fileoverview Auth.js (NextAuth v5) configuration for Project Nexus.
 *
 * Providers: Google, Apple, Credentials (email/password + Telegram bridge).
 * Session strategy: JWT. User data loaded from MongoDB via AuthDomain.
 *
 * @module src/auth
 */

import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Apple from "next-auth/providers/apple";
import Credentials from "next-auth/providers/credentials";
import { AuthDomain } from "@shared/domains/AuthDomain";
import { verifyTelegramBridgeToken } from "@/lib/telegramBridge";
import { authConfig } from "@/auth.config";

/**
 * Auth.js configuration and exported helpers.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
    Apple({
      clientId: process.env.AUTH_APPLE_ID,
      clientSecret: process.env.AUTH_APPLE_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        bridgeToken: { label: "Bridge Token", type: "text" },
      },
      /**
       * Validate credentials or Telegram bridge token.
       *
       * @param credentials - Submitted credential fields.
       * @returns User id object for JWT or null when invalid.
       */
      async authorize(credentials) {
        const bridgeToken = credentials?.bridgeToken as string | undefined;
        if (bridgeToken) {
          try {
            const userId = verifyTelegramBridgeToken(bridgeToken);
            const user = await AuthDomain.getUserById(userId);
            if (!user) return null;
            return { id: String(user._id), role: user.role };
          } catch {
            return null;
          }
        }

        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const user = await AuthDomain.validateCredentials(email, password);
        if (!user) return null;
        return { id: String(user._id), role: user.role };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,

    /**
     * Merge OAuth identities into MongoDB on first provider sign-in.
     *
     * @param params - Auth.js signIn callback parameters.
     * @returns Whether sign-in is permitted.
     */
    async signIn({ account, profile }) {
      if (!account || account.provider === "credentials") return true;

      try {
        if (account.provider === "google" && profile) {
          const p = profile as { sub?: string; email?: string; name?: string; picture?: string; email_verified?: boolean };
          await AuthDomain.findOrCreateFromGoogle({
            providerId: p.sub ?? account.providerAccountId,
            email: p.email ?? null,
            name: p.name ?? "Nexus User",
            image: p.picture ?? null,
            emailVerified: p.email_verified ? new Date() : null,
          });
        }

        if (account.provider === "apple" && profile) {
          const p = profile as { sub?: string; email?: string; name?: string; picture?: string; email_verified?: boolean };
          await AuthDomain.findOrCreateFromApple({
            providerId: p.sub ?? account.providerAccountId,
            email: p.email ?? null,
            name: p.name ?? "Nexus User",
            image: p.picture ?? null,
            emailVerified: p.email_verified ? new Date() : null,
          });
        }

        return true;
      } catch {
        return false;
      }
    },

    /**
     * Persist user id and role into the JWT; hydrate from MongoDB on OAuth sign-in.
     *
     * @param params - Auth.js JWT callback parameters.
     * @returns Updated JWT payload.
     */
    async jwt({ token, user, account, profile }) {
      if (user?.id) {
        token.sub = user.id;
        token.role = (user as { role?: string }).role;
      }

      if (account && account.provider !== "credentials") {
        let dbUser = null;
        const { default: User } = await import("@shared/models/User");

        if (account.provider === "google") {
          const p = profile as { sub?: string } | undefined;
          const googleId = p?.sub ?? account.providerAccountId;
          dbUser = await User.findOne({ googleId });
        }

        if (account.provider === "apple") {
          const p = profile as { sub?: string } | undefined;
          const appleId = p?.sub ?? account.providerAccountId;
          dbUser = await User.findOne({ appleId });
        }

        if (dbUser) {
          token.sub = String(dbUser._id);
          token.role = dbUser.role;
        }
      }

      return token;
    },

    /**
     * Hydrate session.user from MongoDB on each request.
     *
     * @param params - Auth.js session callback parameters.
     * @returns Session with full public user fields.
     */
    async session({ session, token }) {
      if (token.sub && session.user) {
        session.user.id = token.sub;
        if (token.role) {
          (session.user as { role?: string }).role = token.role as string;
        }
      }

      if (token.sub) {
        const user = await AuthDomain.getUserById(token.sub);
        if (user) {
          session.user = {
            ...AuthDomain.toPublicUser(user),
            emailVerified: user.emailVerified,
          } as typeof session.user;
        }
      }

      return session;
    },
  },
});
