/**
 * @fileoverview API route listing all reserved Puck page paths.
 *
 * @module src/app/api/pages/paths/route
 */

import { NextResponse } from "next/server";
import connectDB from "@shared/lib/db";
import Page from "@shared/models/Page";

/**
 * Return all page paths for slug validation in the editor and Page Manager.
 *
 * @returns JSON `{ paths: string[] }`.
 */
export async function GET() {
  try {
    await connectDB();
    const docs = await Page.find({}, { path: 1 }).lean();
    const paths = docs.map((doc) => doc.path).filter(Boolean).sort();

    return NextResponse.json({ paths });
  } catch (err) {
    console.error("[API /api/pages/paths GET]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
