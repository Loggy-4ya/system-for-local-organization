/**
 * @fileoverview Student signup form with client-side validation and native POST fallback (iOS-safe).
 *
 * @module src/components/auth/StudentSignUpForm
 */

"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import type { StudentTitle } from "@shared/models/User";
import { AuthShell } from "@/components/auth/AuthShell";
import { OAuthButtonRow } from "@/components/auth/OAuthButtonRow";
import { RoleChipGroup } from "@/components/auth/RoleChipGroup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { FormAlert } from "@/components/ui/form-alert";
import { signupSchema } from "@shared/validation/authSchemas";
import { formatZodErrors } from "@shared/validation/formatValidationErrors";
import { getAuthErrorMessage } from "@shared/validation/authErrorCodes";

/**
 * Student registration form with credentials and OAuth options.
 *
 * @returns Signup form page content.
 */
export function StudentSignUpForm() {
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");
  const initialError = getAuthErrorMessage(errorParam);

  // Repopulate fields from query parameters on server-side redirect fallback
  const initialEmail = searchParams.get("email") ?? "";
  const initialSpecialty = searchParams.get("specialty") ?? "";
  const initialGroup = searchParams.get("group") ?? "";

  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [specialty, setSpecialty] = useState(initialSpecialty);
  const [group, setGroup] = useState(initialGroup);
  const [studentTitle, setStudentTitle] = useState<StudentTitle | null>("Neither");
  const [formError, setFormError] = useState<string | null>(initialError);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  /**
   * Handle form submission.
   * Validates inputs on the client side before allowing native POST submission.
   *
   * @param e - Form submit event.
   */
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    setFormError(null);
    setFieldErrors({});

    const result = signupSchema.safeParse({
      email,
      password,
      specialty: specialty || null,
      group: group || null,
      studentTitle: studentTitle ?? "Neither",
    });

    if (!result.success) {
      e.preventDefault();
      const formatted = formatZodErrors(result.error);
      setFormError(formatted.formError || "Please correct the validation errors.");
      setFieldErrors(formatted.fieldErrors);
    }
  }

  return (
    <AuthShell title="Create account">
      <form
        method="POST"
        action="/api/auth/signup"
        onSubmit={handleSubmit}
        className="flex flex-col gap-4"
        noValidate
      >
        <input type="hidden" name="studentTitle" value={studentTitle ?? "Neither"} />

        {formError && (
          <FormAlert variant="error">
            {formError}
          </FormAlert>
        )}

        <FormField
          label="Email"
          htmlFor="signup-email"
          error={fieldErrors.email}
        >
          <Input
            id="signup-email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </FormField>

        <FormField
          label="Password"
          htmlFor="signup-password"
          error={fieldErrors.password}
        >
          <Input
            id="signup-password"
            name="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </FormField>

        <FormField
          label="Specialty"
          htmlFor="specialty"
          error={fieldErrors.specialty}
        >
          <Input
            id="specialty"
            name="specialty"
            type="text"
            placeholder="e.g. Software Engineering"
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
          />
        </FormField>

        <FormField
          label="Group"
          htmlFor="group"
          error={fieldErrors.group}
        >
          <Input
            id="group"
            name="group"
            type="text"
            placeholder="e.g. SE-42"
            value={group}
            onChange={(e) => setGroup(e.target.value)}
          />
        </FormField>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-(--color-text-primary)">Role</span>
          <RoleChipGroup value={studentTitle} onChange={setStudentTitle} />
        </div>

        <Button type="submit" className="h-12 w-full mt-2">
          Create account
        </Button>

        <p className="text-center text-sm text-(--color-text-secondary) mt-2">
          Already have an account?{" "}
          <Link href="/login" className="text-(--color-accent-user) no-underline hover:underline">
            Sign in
          </Link>
        </p>
      </form>

      <OAuthButtonRow callbackUrl="/profile" />
    </AuthShell>
  );
}

export default StudentSignUpForm;
