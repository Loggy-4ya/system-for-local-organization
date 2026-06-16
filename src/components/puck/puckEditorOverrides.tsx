"use client";

/**
 * @fileoverview Stable Puck override map — module-level references for React Compiler.
 *
 * Avoid inline `overrides={{ ... }}` in {@link PuckEditorShell}; Puck memoizes overrides
 * by reference and invalidates its provider when the object identity changes.
 *
 * @module src/components/puck/puckEditorOverrides
 */

import { FieldLabel, type Overrides } from "@puckeditor/core";
import Link from "next/link";
import { GripVertical, LayoutList } from "lucide-react";
import { siteChromeLucideProps } from "@/components/global-layout/resolveLucideIcon";
import { PuckIframeTheme } from "@/components/puck/PuckIframeTheme";
import { EditorModeToggle } from "@/components/puck/EditorModeToggle";
import { IslandInsertDefaultsSync } from "@/components/puck/IslandInsertDefaultsSync";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { componentDrawerIcon, fieldLabelIcon } from "@/components/puck/lib/puckIcons";
import { useNexusPuck } from "@/components/puck/lib/useNexusPuck";
import { PuckSelectField } from "@/components/puck/fields/PuckSelectField";
import { PuckSwitchField } from "@/components/puck/fields/PuckSwitchField";
import { SegmentedControl } from "@/components/puck/fields/SegmentedControl";
import {
  isBinaryToggleField,
  resolveToggleValues,
} from "@/components/puck/lib/binaryToggleFields";
import { usePuckEditorError } from "@/components/puck/PuckEditorErrorContext";
import { NexusPuckHeaderShell } from "@/components/puck/NexusPuckHeaderShell";
import { PuckAutoViewportSync } from "@/components/puck/PuckAutoViewportSync";
import { PageHeaderLabel } from "@/components/puck/PageHeaderLabel";
import { editorPagePathRef } from "@/components/puck/lib/editorPagePathRef";
import { NexusMobilePanelResizer } from "@/components/puck/NexusMobilePanelResizer";
import { NexusMobileBlocksPalettePanelDismiss } from "@/components/puck/NexusMobileBlocksPalettePanelDismiss";
import { NexusMobileNavPanelGestures } from "@/components/puck/NexusMobileNavPanelGestures";
import { NexusMobilePanelOpenAnimation } from "@/components/puck/NexusMobilePanelOpenAnimation";
import { NexusSidebarWidthClamp } from "@/components/puck/NexusSidebarWidthClamp";
import { NexusMobilePanelCanvasStabilizer } from "@/components/puck/NexusMobilePanelCanvasStabilizer";
import { NexusPuckZoomGuard } from "@/components/puck/NexusPuckZoomGuard";
import { NexusSidebarResizeStabilizer } from "@/components/puck/NexusSidebarResizeStabilizer";
import { NexusViewportZoomEnhancer } from "@/components/puck/NexusViewportZoomEnhancer";
import { NexusHistoryCanvasIsland } from "@/components/puck/NexusHistoryToolbar";
import { NexusMobileViewportToggleIcon } from "@/components/puck/NexusMobileViewportToggleIcon";
import { NexusPublishButton } from "@/components/puck/NexusPublishButton";
import { NexusEditorScrollportGrid } from "@/components/puck/NexusEditorScrollportGrid";
import { NexusCanvasWheelBridge } from "@/components/puck/NexusCanvasWheelBridge";
import { NexusCompactEditorAttr } from "@/components/puck/NexusCompactEditorAttr";
import { NexusCompactRightSidebarGuard } from "@/components/puck/NexusCompactRightSidebarGuard";
import { NexusPreviewModeAttr } from "@/components/puck/NexusPreviewModeAttr";
import {
  NexusGridItemPlacementGuard,
} from "@/components/puck/NexusGridItemPlacementGuard";

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
    title: (opt as { title?: string }).title,
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
  name,
}: {
  children?: React.ReactNode;
  name: string;
}) {
  const label = useNexusPuck((state) => {
    const component = state.config.components[name] as { label?: string } | undefined;
    return component?.label ?? name;
  });
  const icon = componentDrawerIcon(name);

  return (
    <div className="nexus-plugin-panel-row nexus-plugin-panel-row--block">
      <span className="nexus-plugin-panel-row__handle" aria-hidden>
        <GripVertical size={12} />
      </span>
      {icon ? <span className="nexus-plugin-panel-row__icon">{icon}</span> : null}
      <span className="nexus-plugin-panel-row__label">{label}</span>
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
function PuckHeaderActionsOverride() {
  const error = usePuckEditorError();

  return (
    <span className="nexus-puck-header-actions">
      <IslandInsertDefaultsSync />
      {error ? (
        <span className="nexus-puck-header-actions__error">{error}</span>
      ) : null}

      <ThemeToggle className="nexus-editor-header-btn nexus-puck-header-actions__theme" />

      <Link
        href="/pages"
        className="nexus-puck-header-actions__pages-link nexus-editor-header-btn"
        aria-label="All pages"
        title="All pages"
      >
        <LayoutList
          className="nexus-puck-header-actions__pages-icon site-chrome-icon"
          {...siteChromeLucideProps()}
          aria-hidden
        />
        <span className="nexus-puck-header-actions__pages-label">All Pages</span>
      </Link>

      <EditorModeToggle className="nexus-mode-toggle nexus-editor-header-btn" />

      <NexusPublishButton />
    </span>
  );
}

/** Puck `header` override — site-header glass shell around the default toolbar. */
function PuckHeaderOverride({
  children,
}: {
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return <NexusPuckHeaderShell>{children}</NexusPuckHeaderShell>;
}

/** Puck root override — preserve default layout and mount viewport sync. */
function PuckRootOverride({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <PageHeaderLabel key={editorPagePathRef.currentPath} />
      <PuckAutoViewportSync />
      <NexusCompactEditorAttr />
      <NexusPreviewModeAttr />
      <NexusCompactRightSidebarGuard />
      <NexusSidebarResizeStabilizer />
      <NexusMobilePanelCanvasStabilizer />
      <NexusPuckZoomGuard />
      <NexusSidebarWidthClamp />
      <NexusMobilePanelResizer />
      <NexusMobilePanelOpenAnimation />
      <NexusMobileBlocksPalettePanelDismiss />
      <NexusMobileNavPanelGestures />
      <NexusViewportZoomEnhancer />
      <NexusHistoryCanvasIsland />
      <NexusMobileViewportToggleIcon />
      <NexusEditorScrollportGrid />
      <NexusCanvasWheelBridge />
      <NexusGridItemPlacementGuard />
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
  header: PuckHeaderOverride,
  headerActions: PuckHeaderActionsOverride,
  puck: PuckRootOverride,
};
