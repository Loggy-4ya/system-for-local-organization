/**
 * @fileoverview Next.js middleware — protects profile and admin routes.
 *
 * Uses edge-safe {@link authConfig} only (no Node crypto/bcrypt imports).
 * Also opts into `Sec-CH-Prefers-Color-Scheme` for SSR theme resolution.
 *
 * @module src/middleware
 */

import NextAuth from "next-auth";
import { acceptClientHintsHeader } from "@teispace/next-themes/server";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";
import { publicUrl } from "@/lib/publicOrigin";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isProtected =
    pathname.startsWith("/profile") || pathname.startsWith("/admin");

  if (isProtected && !req.auth) {
    const loginUrl = publicUrl("/login", req);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return Response.redirect(loginUrl);
  }

  if (pathname.startsWith("/admin") && req.auth?.user?.role !== "Admin") {
    const profileUrl = publicUrl("/profile", req);
    return Response.redirect(profileUrl);
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", pathname);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  response.headers.set("Accept-CH", acceptClientHintsHeader());
  return response;
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
