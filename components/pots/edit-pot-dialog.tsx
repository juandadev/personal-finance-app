"use client"

import { useMemo } from "react"
import { z } from "zod"

import { ThemeSelect } from "@/components/theme-select"
import { Button } from "@/components/ui/button"
import { CurrencyInput } from "@/components/ui/currency-input"
import {
  Dialog,
  DialogCloseButton,
  DialogContent,
  DialogDescription,
  DialogFinanceForm,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { FormField, FormStatusMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useFinance } from "@/hooks/use-finance"
import { formatDollarInput } from "@/lib/finance/form-utils"
import { isFutureISODate } from "@/lib/finance/pot-due-date"
import {
  currencyCentsSchema,
  requiredStringSchema,
  themeColorSchema,
} from "@/lib/forms/validation"
import { useStandardForm } from "@/lib/forms/use-standard-form"
import type { Pot } from "@/lib/types"
import { PotDueDatePicker } from "./pot-due-date-picker"

const maxPotNameLength = 30

const dueDateSchema = z
  .string()
  .nullable()
  .refine((value) => !value || isFutureISODate(value), {
    message: "Choose a future due date.",
  })

type EditPotFormValues = {
  dueDate: string | null
  name: string
  target: string
  themeColor: Pot["color"]
}

interface EditPotDialogProps {
  pot: Pot
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditPotDialog({ pot, open, onOpenChange }: EditPotDialogProps) {
  const { state, actions } = useFinance()
  const currentPot = state.pots.find((potRecord) => potRecord.id === pot.id)

  const existingPotNames = useMemo(
    () =>
      new Set(
        state.pots
          .filter((potRecord) => potRecord.id !== currentPot?.id)
          .map((potRecord) => potRecord.name.trim().toLowerCase()),
      ),
    [currentPot?.id, state.pots],
  )
  const usedThemeColors = useMemo(
    () =>
      new Set(
        state.pots
          .filter((potRecord) => potRecord.id !== currentPot?.id)
          .map((potRecord) => potRecord.theme_color.toLowerCase()),
      ),
    [currentPot?.id, state.pots],
  )
  const editPotFormSchema = useMemo(
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
        name: pot.name,
        target: formatDollarInput(pot.target),
        dueDate: pot.dueDate ?? null,
        themeColor: pot.color,
      }) satisfies EditPotFormValues,
    [pot.color, pot.dueDate, pot.name, pot.target],
  )

  const standardForm = useStandardForm({
    defaultValues,
    schema: editPotFormSchema,
    onSubmit: async ({ applyActionResult, value }) => {
      if (!currentPot) {
        applyActionResult({
          ok: false,
          message: "This pot is no longer available.",
        })
        return
      }

      const result = await actions.updatePot(currentPot.id, {
        name: value.name,
        target_cents: value.target,
        theme_color: value.themeColor,
        due_date: value.dueDate,
      })

      if (!applyActionResult(result)) {
        return
      }

      onOpenChange(false)
    },
  })

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      standardForm.reset(defaultValues)
    }

    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent variant="finance" showCloseButton={false}>
        <DialogHeader className="text-left">
          <DialogTitle variant="finance">Edit Pot</DialogTitle>
          <DialogDescription variant="finance">
            If your saving targets change, feel free to update your pots.
          </DialogDescription>
        </DialogHeader>

        <DialogCloseButton aria-label="Close edit pot dialog" />

        <DialogFinanceForm
          onSubmit={standardForm.handleSubmit}
          actions={
            <>
              {standardForm.status?.message ? (
                <FormStatusMessage variant={standardForm.status.variant}>
                  {standardForm.status.message}
                </FormStatusMessage>
              ) : null}
              <standardForm.form.Subscribe
                selector={(state) => state.isSubmitting}
              >
                {(isSubmitting) => (
                  <Button
                    type="submit"
                    size="finance-submit"
                    disabled={!currentPot || isSubmitting}
                  >
                    {isSubmitting ? "Saving..." : "Save Changes"}
                  </Button>
                )}
              </standardForm.form.Subscribe>
            </>
          }
        >
          <standardForm.form.Field name="name">
            {(field) => (
              <FormField
                id="edit-pot-name"
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
                  />
                )}
              </FormField>
            )}
          </standardForm.form.Field>

          <standardForm.form.Field name="target">
            {(field) => (
              <FormField
                id="edit-pot-target"
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
                  />
                )}
              </FormField>
            )}
          </standardForm.form.Field>

          <standardForm.form.Field name="dueDate">
            {(field) => (
              <FormField
                id="edit-pot-due-date"
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
                id="edit-pot-theme"
                value={field.state.value}
                onValueChange={(value) =>
                  standardForm.setValue("themeColor", value)
                }
                usedThemeColors={usedThemeColors}
              />
            )}
          </standardForm.form.Field>
        </DialogFinanceForm>
      </DialogContent>
    </Dialog>
  )
}
