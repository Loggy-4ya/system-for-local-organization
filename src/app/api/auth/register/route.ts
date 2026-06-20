/**
 * @fileoverview Student credentials registration API route.
 *
 * POST /api/auth/register — creates a user via AuthDomain then returns success.
 * Client should call signIn("credentials") after a successful registration.
 *
 * @module src/app/api/auth/register/route
 */

import { NextRequest, NextResponse } from "next/server";
import { AuthDomain } from "@shared/domains/AuthDomain";
import { registerSchema } from "@shared/validation/authSchemas";
import { formatZodErrors } from "@shared/validation/formatValidationErrors";

/**
 * Register a new student account with login and password.
 *
 * @param req - JSON body with login, optional email, password, name, specialty, group, studentTitle.
 * @returns 201 on success or error payload.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      const formatted = formatZodErrors(parsed.error);
      return NextResponse.json(
        {
          error: formatted.formError || "Validation failed.",
          fieldErrors: formatted.fieldErrors,
        },
        { status: 400 },
      );
    }

    const {
      login,
      email,
      password,
      name,
      surname,
      phone,
      specialty,
      group,
      studentTitle,
      applyForSelfGovernment,
    } = parsed.data;

    const user = await AuthDomain.registerWithCredentials({
      login,
      email: email ?? null,
      password,
      name: name?.trim() || login,
      surname: surname ?? null,
      phone: phone ?? null,
      specialty: specialty ?? null,
      group: group ?? null,
      studentTitle,
      signupSociumRole: parsed.signupSociumRole,
      applyForSelfGovernment: applyForSelfGovernment ?? false,
      personalDataConsent: true,
    });

    return NextResponse.json(
      { success: true, userId: String(user._id) },
      { status: 201 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Registration failed.";
    const status = message.includes("already exists") ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
