"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"

type FormFieldRenderProps = {
  id: string
  "aria-describedby"?: string
  "aria-invalid": "true" | "false"
}

interface FormFieldProps {
  children: (props: FormFieldRenderProps) => React.ReactNode
  className?: string
  error?: string
  helperAlign?: "left" | "right"
  helperText?: React.ReactNode
  id: string
  label: React.ReactNode
}

function FormField({
  children,
  className,
  error,
  helperAlign = "left",
  helperText,
  id,
  label,
}: FormFieldProps) {
  const helperId = helperText ? `${id}-helper` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [errorId, !error ? helperId : undefined]
    .filter(Boolean)
    .join(" ")

  return (
    <div data-slot="form-field" className={cn("space-y-2", className)}>
      <Label
        htmlFor={id}
        data-invalid={Boolean(error)}
        className="text-muted-foreground data-[invalid=true]:text-destructive text-xs font-bold"
      >
        {label}
      </Label>
      {children({
        id,
        "aria-invalid": error ? "true" : "false",
        "aria-describedby": describedBy || undefined,
      })}
      {error ? (
        <p id={errorId} className="text-destructive text-xs leading-normal">
          {error}
        </p>
      ) : helperText ? (
        <p
          id={helperId}
          className={cn(
            "text-muted-foreground text-xs leading-normal",
            helperAlign === "right" && "text-right",
          )}
          aria-live={helperAlign === "right" ? "polite" : undefined}
        >
          {helperText}
        </p>
      ) : null}
    </div>
  )
}

interface FormStatusMessageProps {
  children: React.ReactNode
  className?: string
  variant?: "error" | "success" | "info"
}

function FormStatusMessage({
  children,
  className,
  variant = "info",
}: FormStatusMessageProps) {
  return (
    <p
      data-slot="form-status-message"
      role={variant === "error" ? "alert" : "status"}
      className={cn(
        "rounded-lg border px-4 py-3 text-sm leading-normal",
        variant === "error" && "border-destructive/20 text-destructive",
        variant === "success" && "border-accent/20 text-foreground",
        variant === "info" && "border-border text-muted-foreground",
        className,
      )}
    >
      {children}
    </p>
  )
}

export { FormField, FormStatusMessage }
