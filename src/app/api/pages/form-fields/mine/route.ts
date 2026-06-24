/**
 * @fileoverview Hydrate the current user's prior answer for a form field.
 *
 * @module src/app/api/pages/form-fields/mine/route
 */

import { NextRequest, NextResponse } from "next/server";
import { FormFieldDomain, FormFieldDomainError } from "@shared/domains/FormFieldDomain";
import { formFieldStatsQuerySchema } from "@shared/validation/formFieldSchemas";
import { getOptionalSession } from "@/lib/authGuards";

/**
 * Return the session user's stored response for a field, if any.
 *
 * @param req - Query `path` and `fieldId`.
 * @returns Prior response or null.
 */
export async function GET(req: NextRequest) {
  const session = await getOptionalSession();
  if (!session?.user?.id) {
    return NextResponse.json({ response: null });
  }

  const query = formFieldStatsQuerySchema.safeParse({
    path: req.nextUrl.searchParams.get("path"),
    fieldId: req.nextUrl.searchParams.get("fieldId"),
  });

  if (!query.success) {
    return NextResponse.json(
      { error: "Valid `path` and `fieldId` query params are required." },
      { status: 400 },
    );
  }

  try {
    const response = await FormFieldDomain.getUserResponse(
      query.data.path,
      query.data.fieldId,
      session.user.id,
    );
    return NextResponse.json({ response });
  } catch (err) {
    if (err instanceof FormFieldDomainError) {
      return NextResponse.json({ error: err.message }, { status: err.httpStatus });
    }
    console.error("[API /api/pages/form-fields/mine GET]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
