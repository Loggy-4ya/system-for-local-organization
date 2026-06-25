/**
 * @fileoverview Form POST login fallback — sets session cookie and redirects.
 *
 * POST /api/auth/login — accepts `application/x-www-form-urlencoded` or `multipart/form-data`.
 * Primary UI uses client-side `signIn({ redirect: false })`; this route remains for no-JS fallback.
 *
 * @module src/app/api/auth/login/route
 */

import { NextRequest, NextResponse } from "next/server";
import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import { publicUrl } from "@/lib/publicOrigin";
import { loginSchema } from "@shared/validation/authSchemas";

/**
 * Resolve a safe same-origin redirect path from form input.
 *
 * @param value - Raw `redirectTo` field value.
 * @returns Path starting with `/`, defaulting to `/profile`.
 */
function resolveRedirectTo(value: FormDataEntryValue | null): string {
  if (typeof value === "string" && value.startsWith("/") && !value.startsWith("//")) {
    return value;
  }
  return "/profile";
}

/**
 * Authenticate with login/password and redirect to `redirectTo`.
 *
 * @param req - Form POST with login, password, and optional redirectTo.
 * @returns Redirect to profile on success or back to login with error.
 */
export async function POST(req: NextRequest) {
  let login = "";
  let password = "";
  let redirectPath = "/profile";

  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    login = String(body.login ?? "");
    password = String(body.password ?? "");
    redirectPath = resolveRedirectTo(
      typeof body.redirectTo === "string" ? body.redirectTo : null,
    );
  } else {
    const formData = await req.formData();
    login = String(formData.get("login") ?? "");
    password = String(formData.get("password") ?? "");
    redirectPath = resolveRedirectTo(formData.get("redirectTo"));
  }

  const result = loginSchema.safeParse({ login, password });
  if (!result.success) {
    const loginUrl = publicUrl("/login", req);
    loginUrl.searchParams.set("error", "validation");
    loginUrl.searchParams.set("callbackUrl", redirectPath);
    return NextResponse.redirect(loginUrl);
  }

  try {
    await signIn("credentials", {
      login: result.data.login,
      password: result.data.password,
      redirectTo: redirectPath,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      const loginUrl = publicUrl("/login", req);
      loginUrl.searchParams.set("error", "credentials");
      loginUrl.searchParams.set("callbackUrl", redirectPath);
      return NextResponse.redirect(loginUrl);
    }
    throw error;
  }
}
