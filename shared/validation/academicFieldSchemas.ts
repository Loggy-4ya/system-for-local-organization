/**
 * @fileoverview Shared Zod validators for academic specialty codes and group numbers.
 *
 * @module shared/validation/academicFieldSchemas
 */

import { z } from "zod";

/** Specialty letter code — 2–12 letters, no digits (e.g. `SE`, `KN`). */
export const academicSpecialtyCodeField = z
  .string()
  .trim()
  .regex(/^[A-Za-z]{2,12}$/, "Specialty must be a letter code (e.g. SE).")
  .transform((val) => val.toUpperCase());

/** Student group number — 1–4 digits only. */
export const academicGroupNumberField = z.preprocess(
  (value) => {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (typeof value === "string" && value.trim() === "") return null;
    if (typeof value === "string") return value.trim();
    return value;
  },
  z.union([
    z.undefined(),
    z.null(),
    z.string().regex(/^\d{1,4}$/, "Group must be a number (e.g. 42)."),
  ]),
);

/** Admin directory PATCH — optional specialty update (letter code or explicit null). */
export const adminDirectorySpecialtyField = z.preprocess(
  (value) => {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (typeof value === "string" && value.trim() === "") return null;
    return value;
  },
  z.union([z.undefined(), z.null(), academicSpecialtyCodeField]),
);

/** Admin directory PATCH — optional group update (numeric string or explicit null). */
export const adminDirectoryGroupField = academicGroupNumberField;
