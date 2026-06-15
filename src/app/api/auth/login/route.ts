/**
 * @fileoverview Native form POST login — sets session cookie and redirects to profile.
 *
 * POST /api/auth/login — accepts `application/x-www-form-urlencoded` or `multipart/form-data`.
 * Works without client-side JavaScript (iOS Safari safe).
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
 * Authenticate with email/password and redirect to `redirectTo`.
 *
 * @param req - Form POST with email, password, and optional redirectTo.
 * @returns Redirect to profile on success or back to login with error.
 */
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const redirectPath = resolveRedirectTo(formData.get("redirectTo"));

  // Server-side Zod validation
  const result = loginSchema.safeParse({ email, password });
  if (!result.success) {
    const loginUrl = publicUrl("/login", req);
    loginUrl.searchParams.set("error", "validation");
    loginUrl.searchParams.set("callbackUrl", redirectPath);
    return NextResponse.redirect(loginUrl);
  }

  try {
    await signIn("credentials", {
      email,
      password,
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
