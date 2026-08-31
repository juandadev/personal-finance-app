"use client"

import { useCallback, useState, type FormEvent } from "react"
import { useForm } from "@tanstack/react-form"
import type { AnyFormApi } from "@tanstack/react-form"
import type { z } from "zod"

import {
  defaultFormErrorMessage,
  fieldErrorsFromAction,
  fieldErrorsFromZod,
  hasFieldErrors,
  type FieldErrors,
  type StandardActionResult,
} from "@/lib/forms/validation"

type FormStatus = {
  message: string
  variant: "error" | "success" | "info"
}

type UseStandardFormOptions<
  TValues extends Record<string, unknown>,
  TParsed,
> = {
  defaultValues: TValues
  schema: z.ZodType<TParsed, z.ZodTypeDef, TValues>
  onSubmit: (props: {
    applyActionResult: (result: StandardActionResult | null) => boolean
    formApi: AnyFormApi
    rawValue: TValues
    resetForm: (values?: TValues) => void
    setFieldErrors: (errors: FieldErrors<TValues>) => void
    setStatus: (status: FormStatus | null) => void
    value: TParsed
  }) => Promise<void> | void
}

export function useStandardForm<
  TValues extends Record<string, unknown>,
  TParsed,
>({
  defaultValues,
  onSubmit,
  schema,
}: UseStandardFormOptions<TValues, TParsed>) {
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<TValues>>({})
  const [status, setStatus] = useState<FormStatus | null>(null)
  const [shouldValidateOnChange, setShouldValidateOnChange] = useState(false)

  const clearErrors = useCallback(() => {
    setFieldErrors({})
    setStatus(null)
  }, [])

  const validateValues = useCallback(
    (values: TValues) => {
      const parsed = schema.safeParse(values)

      if (parsed.success) {
        setFieldErrors({})
        setStatus(null)
        return parsed
      }

      setFieldErrors(fieldErrorsFromZod<TValues>(parsed.error))
      setStatus({
        message: defaultFormErrorMessage,
        variant: "error",
      })

      return parsed
    },
    [schema],
  )

  const form = useForm({
    defaultValues,
    onSubmit: async ({ formApi, value }) => {
      clearErrors()

      const parsed = validateValues(value)

      if (!parsed.success) {
        setShouldValidateOnChange(true)
        return
      }

      const resetForm = (values?: TValues) => {
        formApi.reset(values)
        clearErrors()
        setShouldValidateOnChange(false)
      }

      const applyActionResult = (result: StandardActionResult | null) => {
        if (!result) {
          return true
        }

        if (result.ok) {
          return true
        }

        const nextFieldErrors = fieldErrorsFromAction<TValues>(
          result.fieldErrors,
        )

        setFieldErrors(nextFieldErrors)
        setStatus({
          message: result.message || defaultFormErrorMessage,
          variant: "error",
        })
        setShouldValidateOnChange(hasFieldErrors(nextFieldErrors))

        return false
      }

      await onSubmit({
        applyActionResult,
        formApi,
        rawValue: value,
        resetForm,
        setFieldErrors,
        setStatus,
        value: parsed.data,
      })
    },
  })

  const setValue = useCallback(
    <TField extends Extract<keyof TValues, string>>(
      name: TField,
      value: TValues[TField],
    ) => {
      const nextValues = {
        ...form.state.values,
        [name]: value,
      }

      form.setFieldValue(name as never, value as never)

      if (shouldValidateOnChange) {
        validateValues(nextValues)
      }
    },
    [form, shouldValidateOnChange, validateValues],
  )

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      event.stopPropagation()

      // Prefer native field values so iOS autofill and keyboard "Go" submit
      // still see what is in the DOM, not only React-controlled state.
      const formData = new FormData(event.currentTarget)

      for (const fieldName of Object.keys(form.state.values) as Array<
        Extract<keyof TValues, string>
      >) {
        const nextValue = formData.get(fieldName)

        if (typeof nextValue === "string") {
          form.setFieldValue(fieldName as never, nextValue as never)
        }
      }

      void form.handleSubmit()
    },
    [form],
  )

  const reset = useCallback(
    (values?: TValues) => {
      form.reset(values)
      clearErrors()
      setShouldValidateOnChange(false)
    },
    [clearErrors, form],
  )

  return {
    clearErrors,
    fieldErrors,
    form,
    handleSubmit,
    reset,
    setFieldErrors,
    setStatus,
    setValue,
    status,
    validateValues,
  }
}
