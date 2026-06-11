"use client";

/**
 * @fileoverview Stable Puck override map — module-level references for React Compiler.
 *
 * Avoid inline `overrides={{ ... }}` in {@link PuckEditorShell}; Puck memoizes overrides
 * by reference and invalidates its provider when the object identity changes.
 *
 * @module src/components/puck/puckEditorOverrides
 */

import { FieldLabel, type Overrides } from "@measured/puck";
import Link from "next/link";
import { PuckIframeTheme } from "@/components/puck/PuckIframeTheme";
import { EditorModeToggle } from "@/components/puck/EditorModeToggle";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { componentDrawerIcon, fieldLabelIcon } from "@/components/puck/lib/puckIcons";
import { PuckSelectField } from "@/components/puck/fields/PuckSelectField";
import { PuckSwitchField } from "@/components/puck/fields/PuckSwitchField";
import { SegmentedControl } from "@/components/puck/fields/SegmentedControl";
import {
  isBinaryToggleField,
  resolveToggleValues,
} from "@/components/puck/lib/binaryToggleFields";
import { usePuckEditorError } from "@/components/puck/PuckEditorErrorContext";

/** Puck field label wrapper passed into `fieldTypes` overrides. */
type PuckFieldLabelComponent = React.ComponentType<{
  children?: React.ReactNode;
  icon?: React.ReactNode;
  label: string;
  el?: "label" | "div";
  readOnly?: boolean;
  className?: string;
}>;

/** Shared props for Puck `fieldTypes.select` / `fieldTypes.radio` overrides. */
interface PuckBuiltinFieldOverrideProps {
  field: {
    label?: string;
    options?: Array<{ label: string; value: string | number | boolean | null | undefined }>;
  };
  value: string;
  onChange: (value: string) => void;
  label?: string;
  labelIcon?: React.ReactNode;
  Label?: PuckFieldLabelComponent;
  readOnly?: boolean;
  name?: string;
}

/** Puck `fieldTypes.select` override — discrete commits on value pick. */
function PuckSelectFieldOverride({
  field,
  value,
  onChange,
  label,
  labelIcon,
  Label: LabelComponent,
  readOnly,
  name,
}: PuckBuiltinFieldOverrideProps) {
  const options = (field.options ?? []).map((opt) => ({
    label: opt.label,
    value: String(opt.value ?? ""),
  }));

  const fieldLabel = label ?? field.label ?? name ?? "Select";

  if (!LabelComponent) {
    return (
      <PuckSelectField value={String(value ?? "")} onChange={onChange} options={options} />
    );
  }

  return (
    <LabelComponent label={fieldLabel} icon={labelIcon} readOnly={readOnly}>
      <PuckSelectField value={String(value ?? "")} onChange={onChange} options={options} />
    </LabelComponent>
  );
}

/** Puck `fieldTypes.radio` override — switches for binary toggles, segmented for multi-option. */
function PuckRadioFieldOverride({
  field,
  value,
  onChange,
  label,
  labelIcon,
  Label: LabelComponent,
  readOnly,
  name,
}: PuckBuiltinFieldOverrideProps) {
  const options = (field.options ?? []).map((opt) => ({
    label: opt.label,
    value: String(opt.value ?? ""),
  }));

  const fieldLabel = label ?? field.label ?? name ?? "Option";

  if (isBinaryToggleField(options)) {
    const { trueValue, falseValue } = resolveToggleValues(options);
    return (
      <PuckSwitchField
        label={fieldLabel}
        showLabel={true}
        value={String(value ?? "")}
        onChange={onChange}
        trueValue={trueValue}
        falseValue={falseValue}
      />
    );
  }

  const control = (
    <SegmentedControl
      ariaLabel={fieldLabel}
      value={String(value ?? "")}
      onChange={onChange}
      options={options}
    />
  );

  if (!LabelComponent) {
    return control;
  }

  return (
    <LabelComponent label={fieldLabel} icon={labelIcon} readOnly={readOnly} el="div">
      {control}
    </LabelComponent>
  );
}

/** Puck `iframe` override — sync Nexus theme tokens into the preview document. */
function PuckIframeOverride({
  children,
  document,
}: {
  children: React.ReactNode;
  document?: Document;
}) {
  return <PuckIframeTheme document={document}>{children}</PuckIframeTheme>;
}

/** Puck `drawerItem` override — icon + label for component drawer rows. */
function PuckDrawerItemOverride({
  children,
  name,
}: {
  children: React.ReactNode;
  name: string;
}) {
  const icon = componentDrawerIcon(name);
  return (
    <div className="nexus-drawer-item">
      {icon ? <span className="nexus-drawer-item__icon">{icon}</span> : null}
      <span className="nexus-drawer-item__label">{children}</span>
    </div>
  );
}

/** Puck `fieldLabel` override — Nexus icons on sidebar field labels. */
function PuckFieldLabelOverride({
  children,
  icon,
  label,
  el,
  readOnly,
  className,
}: {
  children?: React.ReactNode;
  icon?: React.ReactNode;
  label: string;
  el?: "label" | "div";
  readOnly?: boolean;
  className?: string;
}) {
  return (
    <FieldLabel
      label={label}
      icon={icon ?? fieldLabelIcon(label)}
      el={el}
      readOnly={readOnly}
      className={className}
    >
      {children}
    </FieldLabel>
  );
}

/** Puck `headerActions` override — publish controls plus Nexus chrome. */
function PuckHeaderActionsOverride({ children }: { children: React.ReactNode }) {
  const error = usePuckEditorError();

  return (
    <>
      {error ? (
        <span
          style={{
            fontSize: "12px",
            color: "#ef4444",
            marginRight: "12px",
            fontWeight: 500,
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.2)",
            padding: "4px 8px",
            borderRadius: "var(--radius-sm)",
          }}
        >
          {error}
        </span>
      ) : null}

      <Link
        href="/pages"
        style={{
          fontSize: "12px",
          color: "var(--color-text-primary)",
          textDecoration: "none",
          padding: "6px 12px",
          background: "var(--color-bg-elevated)",
          border: "1px solid var(--color-border-default)",
          borderRadius: "var(--radius-sm)",
          fontWeight: 500,
          marginRight: "8px",
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
        }}
      >
        <span>All Pages</span>
      </Link>

      <span style={{ marginRight: "8px", display: "inline-flex", gap: "8px" }}>
        <EditorModeToggle />
        <ThemeToggle />
      </span>

      {children}
    </>
  );
}

/**
 * Stable Puck overrides object — do not recreate per render.
 */
export const PUCK_EDITOR_OVERRIDES: Partial<Overrides> = {
  fieldTypes: {
    select: PuckSelectFieldOverride as never,
    radio: PuckRadioFieldOverride as never,
  },
  iframe: PuckIframeOverride,
  drawerItem: PuckDrawerItemOverride,
  fieldLabel: PuckFieldLabelOverride,
  headerActions: PuckHeaderActionsOverride,
};
