"use client"

import { useMemo, useState } from "react"
import { z } from "zod"

import { ThemeSelect } from "@/components/theme-select"
import { Button } from "@/components/ui/button"
import { CurrencyInput } from "@/components/ui/currency-input"
import {
  Dialog,
  DialogCloseButton,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { FormField, FormStatusMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useFinance } from "@/hooks/use-finance"
import { themeOptions } from "@/lib/finance/form-utils"
import { isFutureISODate } from "@/lib/finance/pot-due-date"
import {
  currencyCentsSchema,
  requiredStringSchema,
  themeColorSchema,
} from "@/lib/forms/validation"
import { useStandardForm } from "@/lib/forms/use-standard-form"
import { PotDueDatePicker } from "./pot-due-date-picker"

const maxPotNameLength = 30

const dueDateSchema = z
  .string()
  .nullable()
  .refine((value) => !value || isFutureISODate(value), {
    message: "Choose a future due date.",
  })

type AddPotFormValues = {
  dueDate: string | null
  name: string
  target: string
  themeColor: (typeof themeOptions)[number]["value"]
}

export function AddPotDialog() {
  const { state, actions } = useFinance()
  const [open, setOpen] = useState(false)

  const existingPotNames = useMemo(
    () => new Set(state.pots.map((pot) => pot.name.trim().toLowerCase())),
    [state.pots],
  )
  const usedThemeColors = useMemo(
    () => new Set(state.pots.map((pot) => pot.theme_color.toLowerCase())),
    [state.pots],
  )
  const addPotFormSchema = useMemo(
    () =>
      z.object({
        name: requiredStringSchema(
          "Enter a pot name.",
          maxPotNameLength,
        ).refine(
          (value) => !existingPotNames.has(value.toLowerCase()),
          "A pot with this name already exists.",
        ),
        target: currencyCentsSchema("Enter a target greater than $0."),
        dueDate: dueDateSchema,
        themeColor: themeColorSchema,
      }),
    [existingPotNames],
  )
  const defaultValues = useMemo(
    () =>
      ({
        name: "",
        target: "",
        dueDate: null,
        themeColor: themeOptions[0].value,
      }) satisfies AddPotFormValues,
    [],
  )

  const standardForm = useStandardForm({
    defaultValues,
    schema: addPotFormSchema,
    onSubmit: async ({ applyActionResult, resetForm, value }) => {
      const result = await actions.addPot({
        id: crypto.randomUUID(),
        name: value.name,
        balance_cents: 0,
        target_cents: value.target,
        theme_color: value.themeColor,
        due_date: value.dueDate,
      })

      if (!applyActionResult(result)) {
        return
      }

      setOpen(false)
      resetForm(defaultValues)
    },
  })

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)

    if (!nextOpen) {
      standardForm.reset(defaultValues)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>Add Pot</Button>
      </DialogTrigger>
      <DialogContent variant="finance" showCloseButton={false}>
        <DialogHeader className="text-left">
          <DialogTitle variant="finance">Add New Pot</DialogTitle>
          <DialogDescription variant="finance">
            Create a pot to set savings targets. These can help keep you on
            track as you save for special purchases.
          </DialogDescription>
        </DialogHeader>

        <DialogCloseButton aria-label="Close add pot dialog" />

        <form className="mt-6 space-y-5" onSubmit={standardForm.handleSubmit}>
          <standardForm.form.Field name="name">
            {(field) => (
              <FormField
                id="pot-name"
                label="Pot Name"
                error={standardForm.fieldErrors.name}
                helperAlign="right"
                helperText={`${maxPotNameLength - field.state.value.length} characters left`}
              >
                {(fieldProps) => (
                  <Input
                    {...fieldProps}
                    value={field.state.value}
                    onChange={(event) =>
                      standardForm.setValue("name", event.target.value)
                    }
                    onBlur={field.handleBlur}
                    maxLength={maxPotNameLength}
                    placeholder="e.g. Rainy Days"
                  />
                )}
              </FormField>
            )}
          </standardForm.form.Field>

          <standardForm.form.Field name="target">
            {(field) => (
              <FormField
                id="pot-target"
                label="Target"
                error={standardForm.fieldErrors.target}
              >
                {(fieldProps) => (
                  <CurrencyInput
                    {...fieldProps}
                    inputMode="decimal"
                    value={field.state.value}
                    onChange={(event) =>
                      standardForm.setValue("target", event.target.value)
                    }
                    onBlur={field.handleBlur}
                    placeholder="e.g. 2000"
                  />
                )}
              </FormField>
            )}
          </standardForm.form.Field>

          <standardForm.form.Field name="dueDate">
            {(field) => (
              <FormField
                id="pot-due-date"
                label="Due Date"
                error={standardForm.fieldErrors.dueDate}
              >
                {(fieldProps) => (
                  <PotDueDatePicker
                    id={fieldProps.id}
                    value={field.state.value}
                    onChange={(nextDate) =>
                      standardForm.setValue("dueDate", nextDate)
                    }
                    hasError={fieldProps["aria-invalid"] === "true"}
                    describedBy={fieldProps["aria-describedby"]}
                  />
                )}
              </FormField>
            )}
          </standardForm.form.Field>

          <standardForm.form.Field name="themeColor">
            {(field) => (
              <ThemeSelect
                id="pot-theme"
                value={field.state.value}
                onValueChange={(value) =>
                  standardForm.setValue("themeColor", value)
                }
                usedThemeColors={usedThemeColors}
              />
            )}
          </standardForm.form.Field>

          {standardForm.status?.message ? (
            <FormStatusMessage variant={standardForm.status.variant}>
              {standardForm.status.message}
            </FormStatusMessage>
          ) : null}
          <standardForm.form.Subscribe selector={(state) => state.isSubmitting}>
            {(isSubmitting) => (
              <Button
                type="submit"
                size="finance-submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving..." : "Add Pot"}
              </Button>
            )}
          </standardForm.form.Subscribe>
        </form>
      </DialogContent>
    </Dialog>
  )
}
