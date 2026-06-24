/**
 * @fileoverview Reusable form alert component for displaying validation errors and success messages.
 *
 * Integrates with the unified design system and color tokens.
 *
 * @module src/components/ui/form-alert
 */

import * as React from "react";
import { cn } from "@/lib/utils";

/** Props for {@link FormAlert}. */
export interface FormAlertProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The alert style variant. Defaults to "error". */
  variant?: "error" | "success" | "info" | "destructive";
  /** Optional bold title prefix. */
  title?: string;
}

/**
 * FormAlert component to show validation errors, success states, or info banners.
 *
 * @param props - See {@link FormAlertProps}.
 * @returns FormAlert JSX.
 */
export function FormAlert({
  className,
  variant = "error",
  title,
  children,
  ...props
}: FormAlertProps) {
  return (
    <div
      role={variant === "error" || variant === "destructive" ? "alert" : "status"}
      className={cn(
        "form-alert",
        {
          "form-alert--error": variant === "error" || variant === "destructive",
          "form-alert--success": variant === "success",
          "form-alert--info": variant === "info",
        },
        className
      )}
      {...props}
    >
      {title && <strong className="font-semibold">{title}</strong>}
      {children && <div className="text-xs md:text-sm">{children}</div>}
    </div>
  );
}

export default FormAlert;
