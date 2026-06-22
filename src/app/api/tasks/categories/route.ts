/**
 * @fileoverview GET institutional task categories for compose forms and filters.
 *
 * @module src/app/api/tasks/categories/route
 */

import { NextResponse } from "next/server";
import { TaskDomain } from "@shared/domains/TaskDomain";
import { listEnabledTaskCategories } from "@shared/lib/taskCategoriesSettingsLogic";
import { authGuardErrorStatus, requireAuthenticatedActor } from "@/lib/authGuards";

/** GET /api/tasks/categories — enabled task categories from general rules. */
export async function GET() {
  try {
    await requireAuthenticatedActor();
    const categories = await TaskDomain.loadTaskCategories();
    return NextResponse.json({ categories: listEnabledTaskCategories(categories) });
  } catch (err) {
    const guardStatus = authGuardErrorStatus(err);
    if (guardStatus) {
      return NextResponse.json({ error: "Unauthorized." }, { status: guardStatus });
    }
    console.error("[API /api/tasks/categories GET]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
