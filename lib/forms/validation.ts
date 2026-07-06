import { z } from "zod"

import { parseDollarAmount } from "@/lib/finance/form-utils"
import { themeColorClasses, type ThemeColor } from "@/lib/theme-colors"

export const defaultFormErrorMessage =
  "Check the highlighted fields and try again."

export type FieldErrors<TValues extends Record<string, unknown>> = Partial<
  Record<Extract<keyof TValues, string>, string>
>

export type StandardActionResult =
  | { ok: true; message: string }
  | {
      ok: false
      message: string
      fieldErrors?: Record<string, string[] | undefined>
    }

export function fieldErrorsFromZod<TValues extends Record<string, unknown>>(
  error: z.ZodError,
): FieldErrors<TValues> {
  return error.issues.reduce<FieldErrors<TValues>>((errors, issue) => {
    const fieldName = issue.path[0]

    if (typeof fieldName !== "string" || errors[fieldName]) {
      return errors
    }

    return {
      ...errors,
      [fieldName]: issue.message,
    }
  }, {})
}

export function fieldErrorsFromAction<TValues extends Record<string, unknown>>(
  fieldErrors: Record<string, string[] | undefined> | undefined,
): FieldErrors<TValues> {
  if (!fieldErrors) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(fieldErrors).flatMap(([fieldName, messages]) => {
      const message = messages?.[0]

      return message ? [[fieldName, message]] : []
    }),
  ) as FieldErrors<TValues>
}

export function hasFieldErrors<TValues extends Record<string, unknown>>(
  fieldErrors: FieldErrors<TValues>,
) {
  return Object.values(fieldErrors).some(Boolean)
}

export function currencyCentsSchema(message: string) {
  return z.string().transform((value, context) => {
    const amountCents = parseDollarAmount(value)

    if (amountCents === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message,
      })

      return z.NEVER
    }

    return amountCents
  })
}

export function requiredStringSchema(message: string, maxLength?: number) {
  let schema = z.string().trim().min(1, message)

  if (maxLength !== undefined) {
    schema = schema.max(maxLength, `Keep this to ${maxLength} characters.`)
  }

  return schema
}

export function requiredSelectSchema(message: string) {
  return z.string().trim().min(1, message)
}

export function optionalTrimmedStringSchema(maxLength: number) {
  return z
    .string()
    .trim()
    .max(maxLength, `Keep this to ${maxLength} characters.`)
}

export const themeColorSchema = z.custom<ThemeColor>(
  (value) =>
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(themeColorClasses, value),
  "Choose a theme.",
)
