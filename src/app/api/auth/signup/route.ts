/**
 * @fileoverview Native form POST signup — register then sign in and redirect.
 *
 * POST /api/auth/signup — accepts form fields from the student registration form.
 * Works without client-side JavaScript (iOS Safari safe).
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
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const specialty = String(formData.get("specialty") ?? "").trim() || null;
  const group = String(formData.get("group") ?? "").trim() || null;
  const studentTitleRaw = String(formData.get("studentTitle") ?? "");
  const studentTitle = VALID_TITLES.includes(studentTitleRaw as StudentTitle)
    ? (studentTitleRaw as StudentTitle)
    : null;

  // Server-side Zod validation
  const result = signupSchema.safeParse({
    email,
    password,
    specialty,
    group,
    studentTitle: studentTitle ?? "Neither",
  });

  if (!result.success) {
    const signupUrl = publicUrl("/signup", req);
    signupUrl.searchParams.set("error", "validation");
    signupUrl.searchParams.set("email", email);
    if (specialty) signupUrl.searchParams.set("specialty", specialty);
    if (group) signupUrl.searchParams.set("group", group);
    return NextResponse.redirect(signupUrl);
  }

  try {
    await AuthDomain.registerWithCredentials({
      email,
      password,
      name: email.split("@")[0],
      specialty,
      group,
      studentTitle,
    });

    await signIn("credentials", {
      email,
      password,
      redirectTo: "/profile",
    });
  } catch (error) {
    const signupUrl = publicUrl("/signup", req);
    signupUrl.searchParams.set("email", email);
    if (specialty) signupUrl.searchParams.set("specialty", specialty);
    if (group) signupUrl.searchParams.set("group", group);

    if (error instanceof AuthError) {
      signupUrl.searchParams.set("error", "signin");
      return NextResponse.redirect(signupUrl);
    }

    const message = error instanceof Error ? error.message : "Registration failed.";
    const code = message.includes("already exists") ? "email_exists" : message;
    signupUrl.searchParams.set("error", code);
    return NextResponse.redirect(signupUrl);
  }
}
