"use client"

import { useMemo } from "react"
import { z } from "zod"

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
import { useFinance } from "@/hooks/use-finance"
import { formatDollarInput } from "@/lib/finance/form-utils"
import { useStandardForm } from "@/lib/forms/use-standard-form"

const MAXIMUM_MONEY_CENTS = 2_147_483_647

const monthlyIncomeSchema = z.object({
  monthlyIncome: z.string().transform((value, context) => {
    const normalizedValue = value.trim().replaceAll(",", "")
    const amount = Number(normalizedValue)
    const amountCents = Math.round(amount * 100)

    if (
      normalizedValue === "" ||
      !Number.isFinite(amount) ||
      amount < 0 ||
      amountCents > MAXIMUM_MONEY_CENTS
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter a monthly income of $0 or more.",
      })
      return z.NEVER
    }

    return amountCents
  }),
})

type MonthlyIncomeValues = z.input<typeof monthlyIncomeSchema>

interface MonthlyIncomeDialogProps {
  initialIncomeCents?: number
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MonthlyIncomeDialog({
  initialIncomeCents,
  open,
  onOpenChange,
}: MonthlyIncomeDialogProps) {
  const { actions } = useFinance()
  const isSetup = initialIncomeCents === undefined
  const defaultValues = useMemo<MonthlyIncomeValues>(
    () => ({
      monthlyIncome:
        initialIncomeCents === undefined
          ? ""
          : formatDollarInput(initialIncomeCents / 100),
    }),
    [initialIncomeCents],
  )
  const form = useStandardForm<
    MonthlyIncomeValues,
    z.output<typeof monthlyIncomeSchema>
  >({
    defaultValues,
    schema: monthlyIncomeSchema,
    onSubmit: async ({ applyActionResult, value }) => {
      const result = await actions.saveCashForecastSettings(value.monthlyIncome)

      if (!applyActionResult(result)) {
        return
      }

      onOpenChange(false)
    },
  })

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen)

    if (nextOpen) {
      form.reset(defaultValues)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent variant="finance" showCloseButton={false}>
        <DialogHeader className="text-left">
          <DialogTitle variant="finance">
            {isSetup ? "Set Monthly Income" : "Edit Monthly Income"}
          </DialogTitle>
          <DialogDescription variant="finance">
            This amount is added once to every full forecast month. It is only
            used for planning and does not create income transactions.
          </DialogDescription>
        </DialogHeader>
        <DialogCloseButton aria-label="Close monthly income dialog" />

        <DialogFinanceForm
          onSubmit={form.handleSubmit}
          actions={
            <>
              {form.status?.message ? (
                <FormStatusMessage variant={form.status.variant}>
                  {form.status.message}
                </FormStatusMessage>
              ) : null}

              <form.form.Subscribe selector={(state) => state.isSubmitting}>
                {(isSubmitting) => (
                  <Button
                    type="submit"
                    size="finance-submit"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Saving monthly income..." : "Save Income"}
                  </Button>
                )}
              </form.form.Subscribe>
            </>
          }
        >
          <form.form.Field name="monthlyIncome">
            {(field) => (
              <FormField
                id="forecast-monthly-income"
                label="Monthly Income"
                error={form.fieldErrors.monthlyIncome}
                helperText="$0 is valid if you do not want to project regular income."
              >
                {(fieldProps) => (
                  <CurrencyInput
                    {...fieldProps}
                    className="text-base sm:text-sm"
                    value={field.state.value}
                    onChange={(event) =>
                      form.setValue("monthlyIncome", event.target.value)
                    }
                    onBlur={field.handleBlur}
                    placeholder="e.g. 5000"
                  />
                )}
              </FormField>
            )}
          </form.form.Field>
        </DialogFinanceForm>
      </DialogContent>
    </Dialog>
  )
}
