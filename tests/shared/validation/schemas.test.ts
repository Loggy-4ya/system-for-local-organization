/**
 * @fileoverview Unit tests for shared auth and profile validation schemas.
 *
 * Module under test: shared/validation/authSchemas.ts, shared/validation/profileSchemas.ts
 * Registry: .ai/docs/testing.md
 * Run: `npm run test:validation`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loginSchema, signupSchema, registerSchema } from "@shared/validation/authSchemas";
import { profileUpdateSchema, clientProfileSettingsSchema } from "@shared/validation/profileSchemas";

describe("loginSchema", () => {
  it("passes validation for valid login and password", () => {
    const result = loginSchema.safeParse({
      login: "student.nexus",
      password: "securepassword123",
    });
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.login, "student.nexus");
    }
  });

  it("fails validation for invalid login format", () => {
    const result = loginSchema.safeParse({
      login: "bad login!",
      password: "securepassword123",
    });
    assert.equal(result.success, false);
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      assert.ok(errors.login);
    }
  });

  it("fails validation for empty password", () => {
    const result = loginSchema.safeParse({
      login: "student.nexus",
      password: "",
    });
    assert.equal(result.success, false);
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      assert.ok(errors.password);
      assert.equal(errors.password[0], "Password is required.");
    }
  });
});

describe("signupSchema", () => {
  const validSignupPayload = {
    login: "student_nexus",
    password: "River-2026!",
    confirmPassword: "River-2026!",
    personalDataConsent: true as const,
  };

  it("passes validation for valid signup fields without email", () => {
    const result = signupSchema.safeParse({
      ...validSignupPayload,
      specialty: "Software Engineering",
      group: "42",
      signupSociumRole: "Starosta",
    });
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.login, "student_nexus");
      assert.equal(result.data.email, null);
      assert.equal(result.data.specialty, "Software Engineering");
      assert.equal(result.data.group, "42");
      assert.equal(result.data.studentTitle, "Starosta");
    }
  });

  it("passes validation with optional linked email", () => {
    const result = signupSchema.safeParse({
      ...validSignupPayload,
      email: "  STUDENT@nexus.edu  ",
    });
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.email, "student@nexus.edu");
    }
  });

  it("fails validation for weak password", () => {
    const result = signupSchema.safeParse({
      login: "student_nexus",
      password: "password",
      confirmPassword: "password",
      personalDataConsent: true,
    });
    assert.equal(result.success, false);
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      assert.ok(errors.password);
    }
  });

  it("fails validation when passwords do not match", () => {
    const result = signupSchema.safeParse({
      ...validSignupPayload,
      confirmPassword: "Different-2026!",
    });
    assert.equal(result.success, false);
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      assert.ok(errors.confirmPassword);
    }
  });

  it("fails validation without personal data consent", () => {
    const result = signupSchema.safeParse({
      ...validSignupPayload,
      personalDataConsent: false,
    });
    assert.equal(result.success, false);
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      assert.ok(errors.personalDataConsent);
    }
  });

  it("transforms empty specialty and group to null", () => {
    const result = signupSchema.safeParse({
      ...validSignupPayload,
      specialty: "",
      group: "   ",
    });
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.specialty, null);
      assert.equal(result.data.group, null);
    }
  });

  it("maps Student socium role to Neither student title", () => {
    const result = signupSchema.safeParse({
      ...validSignupPayload,
      signupSociumRole: "Student",
    });
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.studentTitle, "Neither");
    }
  });

  it("fails validation for non-numeric group", () => {
    const result = signupSchema.safeParse({
      ...validSignupPayload,
      group: "SE-42",
    });
    assert.equal(result.success, false);
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      assert.ok(errors.group);
    }
  });

  it("accepts numeric group values", () => {
    const result = signupSchema.safeParse({
      ...validSignupPayload,
      group: "42",
    });
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.group, "42");
    }
  });

  it("maps Teacher socium role and preserves signupSociumRole", () => {
    const result = signupSchema.safeParse({
      ...validSignupPayload,
      signupSociumRole: "Teacher",
    });
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.signupSociumRole, "Teacher");
      assert.equal(result.data.studentTitle, "Neither");
    }
  });

  it("fails validation for invalid socium role", () => {
    const result = signupSchema.safeParse({
      ...validSignupPayload,
      signupSociumRole: "Deputy",
    });
    assert.equal(result.success, false);
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      assert.ok(errors.signupSociumRole);
    }
  });
});

describe("profileUpdateSchema", () => {
  it("passes validation for valid profile fields", () => {
    const result = profileUpdateSchema.safeParse({
      name: "John Doe",
      specialty: "Computer Science",
      group: "CS-101",
      studentTitle: "Deputy",
      accentFamily: "purple",
      accentShade: "strong",
    });
    assert.equal(result.success, true);
  });

  it("fails validation for invalid accent family", () => {
    const result = profileUpdateSchema.safeParse({
      name: "John Doe",
      accentFamily: "orange",
    });
    assert.equal(result.success, false);
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      assert.ok(errors.accentFamily);
      assert.equal(errors.accentFamily[0], "Invalid accent family.");
    }
  });

  it("fails validation if newPassword is set but currentPassword is empty", () => {
    const result = profileUpdateSchema.safeParse({
      newPassword: "newpassword123",
    });
    assert.equal(result.success, false);
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      assert.ok(errors.currentPassword);
      assert.equal(errors.currentPassword[0], "Current password is required to set a new password.");
    }
  });

  it("fails validation if newPassword is too short", () => {
    const result = profileUpdateSchema.safeParse({
      currentPassword: "oldpassword123",
      newPassword: "short",
    });
    assert.equal(result.success, false);
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      assert.ok(errors.newPassword);
      assert.equal(errors.newPassword[0], "New password must be at least 8 characters.");
    }
  });

  it("passes validation for valid password change", () => {
    const result = profileUpdateSchema.safeParse({
      currentPassword: "oldpassword123",
      newPassword: "newpassword123",
    });
    assert.equal(result.success, true);
  });
});

describe("clientProfileSettingsSchema", () => {
  it("fails validation on password mismatch", () => {
    const result = clientProfileSettingsSchema.safeParse({
      currentPassword: "oldpassword123",
      newPassword: "newpassword123",
      confirmPassword: "differentpassword123",
    });
    assert.equal(result.success, false);
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      assert.ok(errors.confirmPassword);
      assert.equal(errors.confirmPassword[0], "New passwords do not match.");
    }
  });

  it("passes validation on password match", () => {
    const result = clientProfileSettingsSchema.safeParse({
      currentPassword: "oldpassword123",
      newPassword: "newpassword123",
      confirmPassword: "newpassword123",
    });
    assert.equal(result.success, true);
  });
});
