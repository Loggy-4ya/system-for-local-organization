"use client";

/**
 * @fileoverview Puck block for styled Input Fields.
 *
 * Maps to Figma Input/Default components with required toggle and helper text.
 *
 * @module src/components/puck/blocks/content/NexusInput
 */

import React from "react";

export const NexusInput = {
  label: "Form Input",
  fields: {
    label: {
      type: "text" as const,
      label: "Field Label",
    },
    placeholder: {
      type: "text" as const,
      label: "Placeholder Text",
    },
    type: {
      type: "select" as const,
      label: "Input Type",
      options: [
        { label: "Text", value: "text" },
        { label: "Email", value: "email" },
        { label: "Password", value: "password" },
        { label: "Number", value: "number" },
      ],
    },
    required: {
      type: "radio" as const,
      label: "Required Field",
      options: [
        { label: "No", value: "no" },
        { label: "Yes", value: "yes" },
      ],
    },
    helperText: {
      type: "text" as const,
      label: "Helper / Description Text",
    },
  },
  defaultProps: {
    label: "Full Name",
    placeholder: "Enter your name...",
    type: "text" as const,
    required: "no" as const,
    helperText: "",
  },
  render({
    label,
    placeholder,
    type,
    required,
    helperText,
  }: {
    label: string;
    placeholder: string;
    type: "text" | "email" | "password" | "number";
    required: "no" | "yes";
    helperText?: string;
  }) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          width: "100%",
          textAlign: "left",
        }}
      >
        {label && (
          <label
            style={{
              fontSize: "12px",
              fontWeight: 500,
              color: "var(--color-text-secondary)",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <span>{label}</span>
            {required === "yes" && <span style={{ color: "var(--color-danger)" }}>*</span>}
          </label>
        )}
        <input
          type={type || "text"}
          placeholder={placeholder}
          disabled
          style={{
            padding: "10px 12px",
            background: "var(--color-bg-cell)",
            border: "1px solid var(--color-border-default)",
            color: "var(--color-text-primary)",
            borderRadius: "var(--radius-md)",
            fontSize: "13px",
            outline: "none",
            width: "100%",
            cursor: "not-allowed",
            boxSizing: "border-box",
          }}
        />
        {helperText && (
          <span
            style={{
              fontSize: "11px",
              color: "var(--color-text-secondary)",
              marginTop: "2px",
            }}
          >
            {helperText}
          </span>
        )}
      </div>
    );
  },
};

export default NexusInput;
