/**
 * @fileoverview Media upload API route for Project Nexus.
 *
 * Accepts image (max 5MB) and video (max 50MB) uploads to `public/uploads/`.
 *
 * @module src/app/api/upload/route
 */

import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

/**
 * Verify a basic bearer token guard.
 *
 * @param req - Incoming Next.js request.
 * @returns `true` when the request is authorised.
 */
function isAuthorised(req: NextRequest): boolean {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return true;
  const auth = req.headers.get("Authorization") ?? "";
  return auth === `Bearer ${secret}`;
}

/** Maximum upload size per media category in bytes. */
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

/**
 * Handle image and video uploads.
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

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");

    if (!isImage && !isVideo) {
      return NextResponse.json(
        { error: "Only image and video files are allowed." },
        { status: 400 },
      );
    }

    const maxSize = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
    if (file.size > maxSize) {
      const limitLabel = isVideo ? "50MB" : "5MB";
      return NextResponse.json(
        { error: `File size exceeds the ${limitLabel} limit.` },
        { status: 400 },
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const fileExtension = path.extname(file.name) || (isVideo ? ".mp4" : ".png");
    const filename = `${file.name.replace(fileExtension, "").replace(/[^a-zA-Z0-9]/g, "-")}-${uniqueSuffix}${fileExtension}`;

    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, filename);
    await fs.writeFile(filePath, buffer);

    return NextResponse.json({ url: `/uploads/${filename}` });
  } catch (err) {
    console.error("[API /api/upload POST]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
