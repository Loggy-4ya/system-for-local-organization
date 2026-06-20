/**
 * @fileoverview REST API for Puck editor singleton settings.
 *
 * @module src/app/api/editor-settings/route
 */

import { NextRequest, NextResponse } from "next/server";
import connectDB from "@shared/lib/db";
import EditorSettings, { EDITOR_SETTINGS_ID } from "@shared/models/EditorSettings";
import { DEFAULT_ISLAND_COMPONENTS } from "@shared/constants/editorSettings";
import { isApiAuthorised } from "@/lib/authGuards";

/**
 * Load or seed the singleton editor settings document.
 *
 * @returns Settings payload for API responses.
 */
async function loadOrSeedSettings(): Promise<{ islandDefaultComponents: string[] }> {
  await connectDB();

  let doc = await EditorSettings.findById(EDITOR_SETTINGS_ID).lean();

  if (!doc) {
    const created = await EditorSettings.create({
      _id: EDITOR_SETTINGS_ID,
      islandDefaultComponents: [...DEFAULT_ISLAND_COMPONENTS],
    });
    doc = created.toObject();
  }

  return {
    islandDefaultComponents: doc?.islandDefaultComponents ?? [...DEFAULT_ISLAND_COMPONENTS],
  };
}

/**
 * GET /api/editor-settings — return island default component list.
 *
 * @returns JSON `{ islandDefaultComponents }`.
 */
export async function GET() {
  try {
    const settings = await loadOrSeedSettings();
    return NextResponse.json(settings);
  } catch (err) {
    console.error("[API /api/editor-settings GET]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

/**
 * POST /api/editor-settings — persist island default component list.
 *
 * Expected body: `{ islandDefaultComponents: string[] }`
 *
 * @param req - JSON request body.
 * @returns `{ ok: true }` on success.
 */
export async function POST(req: NextRequest) {
  if (!(await isApiAuthorised(req))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = (await req.json()) as { islandDefaultComponents?: unknown };
    const list = body.islandDefaultComponents;

    if (!Array.isArray(list) || !list.every((item) => typeof item === "string")) {
      return NextResponse.json(
        { error: "`islandDefaultComponents` must be an array of strings." },
        { status: 400 },
      );
    }

    await connectDB();
    await EditorSettings.findByIdAndUpdate(
      EDITOR_SETTINGS_ID,
      { islandDefaultComponents: list },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    );

    return NextResponse.json({ ok: true, islandDefaultComponents: list });
  } catch (err) {
    console.error("[API /api/editor-settings POST]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
