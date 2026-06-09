/**
 * @fileoverview Image upload API route for Project Nexus.
 *
 * Provides a POST endpoint to upload images to `public/uploads/`.
 * Returns `{ url: "/uploads/<filename>" }` on success.
 *
 * Includes a dev bypass for authorization similar to `/api/puck`.
 *
 * @module src/app/api/upload/route
 */

import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Verify a basic bearer token guard.
 * Dev bypass: when `NEXTAUTH_SECRET` is not configured, all uploads are
 * permitted so the editor works out of the box without auth setup.
 *
 * @param req - Incoming Next.js request.
 * @returns `true` if the request is authorised.
 */
function isAuthorised(req: NextRequest): boolean {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return true;
  const auth = req.headers.get("Authorization") ?? "";
  return auth === `Bearer ${secret}`;
}

// ── POST ──────────────────────────────────────────────────────────────────────

/**
 * Handle image uploads.
 *
 * @param req - Next.js request containing multipart form data.
 * @returns JSON `{ url }` on success, or an error payload.
 */
export async function POST(req: NextRequest) {
  if (!isAuthorised(req)) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }

    // Validate file type (images only)
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image files are allowed." }, { status: 400 });
    }

    // Validate file size (max 5MB)
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File size exceeds the 5MB limit." }, { status: 400 });
    }

    // Read file bytes
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate unique filename to prevent overwrites
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const fileExtension = path.extname(file.name) || ".png";
    const filename = `${file.name.replace(fileExtension, "").replace(/[^a-zA-Z0-9]/g, "-")}-${uniqueSuffix}${fileExtension}`;

    // Define saving path
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    
    // Ensure upload directory exists
    await fs.mkdir(uploadDir, { recursive: true });
    
    const filePath = path.join(uploadDir, filename);

    // Write file to disk
    await fs.writeFile(filePath, buffer);

    return NextResponse.json({ url: `/uploads/${filename}` });
  } catch (err) {
    console.error("[API /api/upload POST]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
