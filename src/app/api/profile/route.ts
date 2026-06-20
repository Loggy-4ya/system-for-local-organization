/**
 * @fileoverview Profile update API route.
 *
 * PATCH /api/profile — session-required profile field updates and password change.
 *
 * @module src/app/api/profile/route
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { AuthDomain } from "@shared/domains/AuthDomain";
import { userNeedsProfileOnboarding } from "@shared/lib/userProfileCompleteness";
import { profileUpdateSchema } from "@shared/validation/profileSchemas";
import { formatZodErrors } from "@shared/validation/formatValidationErrors";

/**
 * Update the authenticated user's profile fields.
 *
 * @param req - JSON body with optional profile fields and password change.
 * @returns Updated public user object.
 */
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = await req.json();

    // Server-side Zod validation
    const parsed = profileUpdateSchema.safeParse(body);
    if (!parsed.success) {
      const formatted = formatZodErrors(parsed.error);
      return NextResponse.json(
        {
          error: formatted.formError || "Validation failed.",
          fieldErrors: formatted.fieldErrors,
        },
        { status: 400 }
      );
    }

    const {
      name,
      surname,
      specialty,
      group,
      studentTitle,
      avatar,
      about,
      socialLinks,
      phone,
      accentFamily,
      accentShade,
      currentPassword,
      newPassword,
      completeOAuthOnboarding,
      personalDataConsent,
    } = parsed.data;

    const patch: Parameters<typeof AuthDomain.updateProfile>[1] = {};

    if (name !== undefined) patch.name = name;
    if (surname !== undefined) patch.surname = surname;
    if (specialty !== undefined) patch.specialty = specialty;
    if (group !== undefined) patch.group = group;
    if (avatar !== undefined) patch.avatar = avatar;
    if (about !== undefined) patch.about = about;
    if (socialLinks !== undefined) patch.socialLinks = socialLinks;
    if (phone !== undefined) patch.phone = phone;
    if (studentTitle !== undefined) patch.studentTitle = studentTitle;
    if (accentFamily !== undefined) patch.accentFamily = accentFamily;
    if (accentShade !== undefined) patch.accentShade = accentShade;
    if (personalDataConsent === true) patch.personalDataConsent = true;

    let user = await AuthDomain.updateProfile(session.user.id, patch);

    if (currentPassword && newPassword) {
      await AuthDomain.changePassword(session.user.id, currentPassword, newPassword);
      user = (await AuthDomain.getUserById(session.user.id))!;
    }

    return NextResponse.json({
      user: AuthDomain.toPublicUser(user),
      onboardingComplete: !userNeedsProfileOnboarding(user),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Profile update failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

/**
 * Return the authenticated user's public profile.
 *
 * @returns Public user object.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const user = await AuthDomain.getUserById(session.user.id);
  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  return NextResponse.json({ user: AuthDomain.toPublicUser(user) });
}
