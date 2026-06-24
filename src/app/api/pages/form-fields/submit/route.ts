/**
 * @fileoverview Submit a response to a Puck form / survey / quiz field.
 *
 * @module src/app/api/pages/form-fields/submit/route
 */

import { NextRequest, NextResponse } from "next/server";
import { FormFieldDomain, FormFieldDomainError } from "@shared/domains/FormFieldDomain";
import { submitFormFieldBodySchema } from "@shared/validation/formFieldSchemas";
import { getOptionalSession } from "@/lib/authGuards";

/**
 * Store one authenticated answer per user per form field.
 *
 * @param req - JSON body with page path, field id, and answer payload.
 * @returns Submission result with optional quiz grading.
 */
export async function POST(req: NextRequest) {
  const session = await getOptionalSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in to submit your answer." }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = submitFormFieldBodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
    const result = await FormFieldDomain.submitResponse(
      parsed.data.path,
      parsed.data.fieldId,
      session.user.id,
      {
        textAnswer: parsed.data.textAnswer,
        selectedOptionIds: parsed.data.selectedOptionIds,
      },
    );
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof FormFieldDomainError) {
      return NextResponse.json({ error: err.message }, { status: err.httpStatus });
    }
    console.error("[API /api/pages/form-fields/submit POST]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
