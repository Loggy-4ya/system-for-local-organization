/**
 * @fileoverview Next.js middleware — locale routing, auth guards, CSP.
 *
 * Composes next-intl locale negotiation with NextAuth route protection.
 *
 * @module src/middleware
 */

import NextAuth from "next-auth";
import { acceptClientHintsHeader } from "@teispace/next-themes/server";
import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { authConfig } from "@/auth.config";
import { routing, defaultLocale } from "@/i18n/routing";
import {
  buildContentSecurityPolicy,
  CSP_NONCE_HEADER,
  generateCspNonce,
  isCspNonceEnabled,
} from "@/lib/contentSecurityPolicy";
import { localeFromPathname, stripLocalePrefix, withLocalePrefix } from "@/lib/localePathLogic";
import { publicUrl } from "@/lib/publicOrigin";

const intlMiddleware = createIntlMiddleware(routing);
const { auth } = NextAuth(authConfig);

/**
 * Apply CSP and client-hints headers to a middleware response.
 *
 * @param req - Incoming request.
 * @param response - Response to augment.
 * @returns Response with security headers applied.
 */
function applySecurityHeaders(req: NextRequest, response: NextResponse): NextResponse {
  const isDev = process.env.NODE_ENV !== "production";
  const useNonce = isCspNonceEnabled();
  const nonce = useNonce ? generateCspNonce() : undefined;
  const csp = buildContentSecurityPolicy({ isDev, nonce });

  if (nonce) {
    response.headers.set(CSP_NONCE_HEADER, nonce);
  }

  response.headers.set("Accept-CH", acceptClientHintsHeader());
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export default auth((req) => {
  const intlResponse = intlMiddleware(req);

  const pathname = req.nextUrl.pathname;
  const locale = localeFromPathname(pathname) ?? defaultLocale;
  const pathnameWithoutLocale = stripLocalePrefix(pathname);

  const isProtected =
    pathnameWithoutLocale.startsWith("/profile") ||
    pathnameWithoutLocale.startsWith("/admin") ||
    pathnameWithoutLocale.startsWith("/tasks") ||
    pathnameWithoutLocale.startsWith("/task-groups") ||
    pathnameWithoutLocale.startsWith("/users/");

  if (isProtected && !req.auth) {
    const loginPath = withLocalePrefix(locale, "/login");
    const loginUrl = publicUrl(loginPath, req);
    loginUrl.searchParams.set("callbackUrl", pathnameWithoutLocale);
    return Response.redirect(loginUrl);
  }

  const legacyAdminOnly = pathnameWithoutLocale.startsWith("/admin/global-layout");

  if (legacyAdminOnly && req.auth?.user?.role !== "Admin") {
    const profilePath = withLocalePrefix(locale, "/profile");
    return Response.redirect(publicUrl(profilePath, req));
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", pathname);

  const isDev = process.env.NODE_ENV !== "production";
  const useNonce = isCspNonceEnabled();
  const nonce = useNonce ? generateCspNonce() : undefined;
  const csp = buildContentSecurityPolicy({ isDev, nonce });

  if (nonce) {
    requestHeaders.set(CSP_NONCE_HEADER, nonce);
    requestHeaders.set("Content-Security-Policy", csp);
  }

  if (intlResponse.status >= 300 && intlResponse.status < 400) {
    return applySecurityHeaders(req, intlResponse);
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  intlResponse.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") {
      response.headers.append(key, value);
    } else {
      response.headers.set(key, value);
    }
  });

  return applySecurityHeaders(req, response);
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
