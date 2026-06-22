/**
 * Run: npm run test:user-directory-save
 * Registry: .ai/docs/testing.md
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildProfilePatchDelta } from "@shared/lib/userDirectoryProfilePatch";
import {
  buildDirectoryProfileSavePatch,
  buildDirectorySaveProfileSlice,
  directoryRowRequiresMemberPhone,
  resolveDirectoryPhoneForSave,
  validateDirectorySaveProfileRequirements,
} from "@shared/lib/userDirectorySaveLogic";
import { PROFILE_PHONE_REQUIRED_ERROR } from "@shared/lib/userProfileCompleteness";

const baseInput = {
  name: "Ada",
  surname: "Lovelace",
  specialty: "SE",
  group: "42",
  avatar: "https://cdn.example/avatar.jpg",
  storedPhone: null,
  sociumRoleLabels: [] as string[],
  sociumRoles: [] as const,
  canEditProfile: true,
};

describe("resolveDirectoryPhoneForSave", () => {
  it("prefers the edit field when profile editing is allowed", () => {
    assert.equal(
      resolveDirectoryPhoneForSave({
        storedPhone: null,
        editPhone: "+380939583362",
        canEditProfile: true,
      }),
      "+380939583362",
    );
  });

  it("falls back to the live DOM value when React state is empty", () => {
    assert.equal(
      resolveDirectoryPhoneForSave({
        storedPhone: null,
        editPhone: "",
        domPhone: "+380939583362",
        canEditProfile: true,
      }),
      "+380939583362",
    );
  });
});

describe("directoryRowRequiresMemberPhone", () => {
  it("detects self-government membership from always-visible labels", () => {
    assert.equal(
      directoryRowRequiresMemberPhone({
        sociumRoles: [],
        sociumRoleLabels: ["Student", "Self-Government Member"],
      }),
      true,
    );
  });
});

describe("buildProfilePatchDelta", () => {
  it("includes phone when the edit field differs from the persisted row", () => {
    const patch = buildProfilePatchDelta(
      { specialty: "SE", group: "42", phone: "+380939583362" },
      { specialty: "SE", group: "42", phone: "+380939583362" },
      null,
    );

    assert.equal(patch.phone, "+380939583362");
  });

  it("omits phone when the edit field matches the persisted row", () => {
    const patch = buildProfilePatchDelta(
      { specialty: "SE", group: "42", phone: "+380939583362" },
      { specialty: "SE", group: "42", phone: "+380939583362" },
      "+380939583362",
    );

    assert.equal(patch.phone, undefined);
  });
});

describe("buildDirectoryProfileSavePatch", () => {
  it("forces phone when a member needs it but the delta omitted it", () => {
    const patch = buildDirectoryProfileSavePatch({
      profile: { specialty: "KI", group: "106", phone: "+380939583362" },
      profileBaseline: { specialty: "KI", group: "106", phone: "+380939583362" },
      storedPhone: "+380939583362",
      resolvedPhone: "+380939583362",
      requiresPhone: true,
    });

    assert.equal(patch.phone, "+380939583362");
  });
});

describe("buildDirectorySaveProfileSlice", () => {
  it("uses edited phone when profile editing is allowed", () => {
    const slice = buildDirectorySaveProfileSlice({
      ...baseInput,
      storedPhone: null,
      editPhone: "+380 99 123 45 67",
    });
    assert.equal(slice.phone, "+380991234567");
  });

  it("keeps stored phone when profile editing is not allowed", () => {
    const slice = buildDirectorySaveProfileSlice({
      ...baseInput,
      storedPhone: "+380990000000",
      editPhone: "",
      canEditProfile: false,
    });
    assert.equal(slice.phone, "+380990000000");
  });
});

describe("validateDirectorySaveProfileRequirements", () => {
  it("requires phone when assigning a self-government socium role", () => {
    const errors = validateDirectorySaveProfileRequirements({
      ...baseInput,
      editPhone: "",
      sociumRoles: [
        {
          roleKey: "self_government_member",
          roleLabel: "Member",
          kind: "self_government_member",
          source: "admin",
          assignedAt: new Date(),
        },
      ],
    });

    assert.equal(errors.phone, PROFILE_PHONE_REQUIRED_ERROR);
  });

  it("passes when a self-government member keeps a valid phone", () => {
    const errors = validateDirectorySaveProfileRequirements({
      ...baseInput,
      editPhone: "+380 99 123 45 67",
      sociumRoles: [
        {
          roleKey: "self_government_member",
          roleLabel: "Member",
          kind: "self_government_member",
          source: "admin",
          assignedAt: new Date(),
        },
      ],
    });

    assert.deepEqual(errors, {});
  });

  it("passes when labels show self-government and DOM phone is present", () => {
    const errors = validateDirectorySaveProfileRequirements({
      ...baseInput,
      editPhone: "",
      domPhone: "+380939583362",
      sociumRoleLabels: ["Student", "Self-Government Member"],
    });

    assert.deepEqual(errors, {});
  });
});
