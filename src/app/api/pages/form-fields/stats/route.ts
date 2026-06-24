/**
 * @fileoverview Author statistics for a Puck form / survey / quiz field.
 *
 * @module src/app/api/pages/form-fields/stats/route
 */

import { NextRequest, NextResponse } from "next/server";
import { FormFieldDomain, FormFieldDomainError } from "@shared/domains/FormFieldDomain";
import { formFieldStatsQuerySchema } from "@shared/validation/formFieldSchemas";
import { getOptionalSession } from "@/lib/authGuards";

/**
 * Return aggregate response statistics for page editors.
 *
 * @param req - Query `path` and `fieldId`.
 * @returns Stats snapshot for the Puck statistics chapter.
 */
export async function GET(req: NextRequest) {
  const session = await getOptionalSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
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
    const stats = await FormFieldDomain.getFieldStats(
      query.data.path,
      query.data.fieldId,
      session.user.id,
    );
    return NextResponse.json({ stats });
  } catch (err) {
    if (err instanceof FormFieldDomainError) {
      return NextResponse.json({ error: err.message }, { status: err.httpStatus });
    }
    console.error("[API /api/pages/form-fields/stats GET]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
