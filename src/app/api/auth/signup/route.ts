/**
 * @fileoverview Form POST signup fallback — register then sign in and redirect.
 *
 * POST /api/auth/signup — accepts form fields from the student registration form.
 * Primary UI uses `/api/auth/register` + client `signIn`; this route remains for no-JS fallback.
 *
 * @module src/app/api/auth/signup/route
 */

import { NextRequest, NextResponse } from "next/server";
import { signIn } from "@/auth";
import { AuthDomain } from "@shared/domains/AuthDomain";
import { AuthError } from "next-auth";
import { publicUrl } from "@/lib/publicOrigin";
import type { StudentTitle } from "@shared/models/User";
import { signupSchema } from "@shared/validation/authSchemas";

/** Valid student title values for registration. */
const VALID_TITLES: StudentTitle[] = ["Starosta", "Deputy", "Neither"];

/**
 * Register a student and sign in, redirecting to profile on success.
 *
 * @param req - Form POST with registration fields.
 * @returns Redirect to profile or back to signup with error query param.
 */
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const login = String(formData.get("login") ?? "");
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const specialty = String(formData.get("specialty") ?? "").trim() || null;
  const group = String(formData.get("group") ?? "").trim() || null;
  const studentTitleRaw = String(formData.get("studentTitle") ?? "");
  const studentTitle = VALID_TITLES.includes(studentTitleRaw as StudentTitle)
    ? (studentTitleRaw as StudentTitle)
    : null;

  const result = signupSchema.safeParse({
    login,
    email: email || null,
    password,
    specialty,
    group,
    studentTitle: studentTitle ?? "Neither",
  });

  if (!result.success) {
    const signupUrl = publicUrl("/signup", req);
    signupUrl.searchParams.set("error", "validation");
    signupUrl.searchParams.set("login", login);
    if (email) signupUrl.searchParams.set("email", email);
    if (specialty) signupUrl.searchParams.set("specialty", specialty);
    if (group) signupUrl.searchParams.set("group", group);
    return NextResponse.redirect(signupUrl);
  }

  try {
    await AuthDomain.registerWithCredentials({
      login: result.data.login,
      email: result.data.email,
      password: result.data.password,
      name: result.data.login,
      specialty,
      group,
      studentTitle,
    });

    await signIn("credentials", {
      login: result.data.login,
      password: result.data.password,
      redirectTo: "/profile",
    });
  } catch (error) {
    const signupUrl = publicUrl("/signup", req);
    signupUrl.searchParams.set("login", login);
    if (email) signupUrl.searchParams.set("email", email);
    if (specialty) signupUrl.searchParams.set("specialty", specialty);
    if (group) signupUrl.searchParams.set("group", group);

    if (error instanceof AuthError) {
      signupUrl.searchParams.set("error", "signin");
      return NextResponse.redirect(signupUrl);
    }

    const message = error instanceof Error ? error.message : "Registration failed.";
    const code = message.includes("login already")
      ? "login_exists"
      : message.includes("email already")
        ? "email_exists"
        : message;
    signupUrl.searchParams.set("error", code);
    return NextResponse.redirect(signupUrl);
  }
}
