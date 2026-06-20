/**
 * @fileoverview Public signup catalog options API.
 *
 * GET /api/auth/signup-options — approved specialty and group labels for dropdowns.
 *
 * @module src/app/api/auth/signup-options/route
 */

import { NextResponse } from "next/server";
import { AuthDomain } from "@shared/domains/AuthDomain";

/**
 * Return approved specialty and group labels for the student signup form.
 *
 * @returns JSON payload with sorted label arrays.
 */
export async function GET() {
  try {
    const options = await AuthDomain.listSignupAcademicOptions();
    return NextResponse.json(options);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load signup options.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
