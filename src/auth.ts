/**
 * @fileoverview Auth.js (NextAuth v5) configuration for Project Nexus.
 *
 * Providers: Google, Apple, Credentials (login/password + Telegram bridge).
 * Session strategy: JWT. User data loaded from MongoDB via AuthDomain.
 *
 * @module src/auth
 */

import NextAuth, { CredentialsSignin } from "next-auth";
import Google from "next-auth/providers/google";
import Apple from "next-auth/providers/apple";
import Credentials from "next-auth/providers/credentials";
import { cookies } from "next/headers";
import { AuthDomain, type OAuthProfileInput } from "@shared/domains/AuthDomain";
import connectDB from "@shared/lib/db";
import { verifyTelegramBridgeToken } from "@/lib/telegramBridge";
import { OAUTH_LINK_USER_COOKIE } from "@/lib/oauthLinkCookie";
import { authConfig } from "@/auth.config";

/** Thrown when no credentials account exists for the submitted login. */
class AccountNotFoundError extends CredentialsSignin {
  code = "account_not_found";
}

/** Thrown when the account only supports OAuth / Telegram sign-in. */
class OAuthOnlyError extends CredentialsSignin {
  code = "oauth_only";

  /**
   * @param providers - Linked provider slugs for targeted messaging.
   */
  constructor(providers: Array<"google" | "apple" | "telegram">) {
    super();
    if (providers.length === 1) {
      this.code = `oauth_only_${providers[0]}`;
    }
  }
}

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
        login: { label: "Login", type: "text" },
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

        const login = credentials?.login as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!login || !password) return null;

        const resolution = await AuthDomain.resolveCredentialsLogin(login, password);

        if (resolution.status === "not_found") {
          throw new AccountNotFoundError();
        }

        if (resolution.status === "oauth_only") {
          throw new OAuthOnlyError(resolution.providers);
        }

        if (resolution.status === "invalid_password") {
          return null;
        }

        const user = resolution.user;
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

      const cookieStore = await cookies();
      const linkUserId = cookieStore.get(OAUTH_LINK_USER_COOKIE)?.value ?? null;

      try {
        const oauthProfile = normalizeOAuthProfile(account, profile);

        if (linkUserId) {
          if (account.provider === "google") {
            await AuthDomain.linkGoogleProfile(linkUserId, oauthProfile);
          } else if (account.provider === "apple") {
            await AuthDomain.linkAppleProfile(linkUserId, oauthProfile);
          } else {
            return false;
          }

          cookieStore.delete(OAUTH_LINK_USER_COOKIE);
          return true;
        }

        if (account.provider === "google") {
          await AuthDomain.findOrCreateFromGoogle(oauthProfile);
        }

        if (account.provider === "apple") {
          await AuthDomain.findOrCreateFromApple(oauthProfile);
        }

        return true;
      } catch {
        cookieStore.delete(OAUTH_LINK_USER_COOKIE);
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
        try {
          await connectDB();
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
        } catch (error) {
          console.error("[auth] OAuth JWT hydration failed:", error);
        }
      }

      return token;
    },

    /**
     * Hydrate session.user from MongoDB on each request.
     *
     * When the JWT references a deleted or missing user (e.g. after a DB reset),
     * the session is returned without `user.id` so API routes treat the viewer
     * as signed out instead of returning 404 profile errors.
     *
     * MongoDB outages must not throw — Auth.js maps any session-callback error to
     * `JWTSessionError` and deletes the session cookie. On transient DB failure we
     * fall back to JWT `sub` / `role` only so the cookie survives until MongoDB
     * is reachable again.
     *
     * @param params - Auth.js session callback parameters.
     * @returns Session with full public user fields when the MongoDB row exists.
     */
    async session({ session, token }) {
      if (!token.sub || !session.user) {
        return session;
      }

      try {
        const user = await AuthDomain.getUserById(token.sub);
        if (!user) {
          return session;
        }

        const publicUser = AuthDomain.toPublicUser(user);
        const { AccessControlDomain } = await import("@shared/domains/AccessControlDomain");
        const effectivePermissions = await AccessControlDomain.resolvePermissionsForUser(user);
        session.user = {
          ...publicUser,
          effectivePermissions,
          emailVerified: user.emailVerified ?? null,
        } as typeof session.user;

        return session;
      } catch (error) {
        console.error("[auth] Session hydration failed — using JWT fallback:", error);
        session.user.id = token.sub;
        if (token.role) {
          (session.user as { role?: string }).role = token.role as string;
        }
        return session;
      }
    },
  },
});

/**
 * Normalise an Auth.js OAuth profile into {@link OAuthProfileInput}.
 *
 * @param account - Auth.js provider account payload.
 * @param profile - Auth.js provider profile payload.
 * @returns Normalised OAuth profile for AuthDomain.
 */
function normalizeOAuthProfile(
  account: { providerAccountId: string },
  profile: unknown,
): OAuthProfileInput {
  const p = profile as {
    sub?: string;
    email?: string;
    name?: string;
    picture?: string;
    email_verified?: boolean;
  };

  return {
    providerId: p.sub ?? account.providerAccountId,
    email: p.email ?? null,
    name: p.name ?? "Nexus User",
    image: p.picture ?? null,
    emailVerified: p.email_verified ? new Date() : null,
  };
}
