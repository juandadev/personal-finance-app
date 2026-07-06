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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { FormField, FormStatusMessage } from "@/components/ui/form"
import { useFinance } from "@/hooks/use-finance"
import { parseDollarAmount } from "@/lib/finance/form-utils"
import { formatCurrency } from "@/lib/format"
import { currencyCentsSchema } from "@/lib/forms/validation"
import { useStandardForm } from "@/lib/forms/use-standard-form"
import { themeColorClasses } from "@/lib/theme-colors"
import type { Pot } from "@/lib/types"
import { cn } from "@/lib/utils"

type PotTransferMode = "add" | "withdraw"

interface PotTransferDialogProps {
  pot: Pot
  mode: PotTransferMode
  open: boolean
  onOpenChange: (open: boolean) => void
}

type PotTransferFormValues = {
  amount: string
}

function getPreviewAmount(
  currentAmount: number,
  inputAmount: string,
  mode: PotTransferMode,
) {
  const parsedCents = parseDollarAmount(inputAmount)

  if (parsedCents === null) {
    return currentAmount
  }

  const amount = parsedCents / 100

  if (mode === "withdraw") {
    return Math.max(currentAmount - amount, 0)
  }

  return currentAmount + amount
}

export function PotTransferDialog({
  pot,
  mode,
  open,
  onOpenChange,
}: PotTransferDialogProps) {
  const { actions } = useFinance()
  const isWithdrawal = mode === "withdraw"
  const availableCents = Math.round(pot.amount * 100)
  const defaultValues = useMemo(
    () =>
      ({
        amount: "",
      }) satisfies PotTransferFormValues,
    [],
  )
  const transferFormSchema = useMemo(
    () =>
      z.object({
        amount: currencyCentsSchema("Enter an amount greater than $0.").refine(
          (amountCents) => !isWithdrawal || amountCents <= availableCents,
          "You cannot withdraw more than this pot contains.",
        ),
      }),
    [availableCents, isWithdrawal],
  )
  const copy = useMemo(
    () =>
      isWithdrawal
        ? {
            title: `Withdraw from '${pot.name}'`,
            label: "Amount to Withdraw",
            button: "Withdraw Money",
            description:
              "Enter the amount to withdraw from this pot. The preview shows the new saved total before you save.",
          }
        : {
            title: `Add to '${pot.name}'`,
            label: "Amount to Add",
            button: "Add Money",
            description:
              "Enter the amount to add to this pot. The preview shows the new saved total before you save.",
          },
    [isWithdrawal, pot.name],
  )

  const standardForm = useStandardForm({
    defaultValues,
    schema: transferFormSchema,
    onSubmit: async ({ applyActionResult, resetForm, value }) => {
      const result = isWithdrawal
        ? await actions.withdrawFromPot(pot.id, value.amount)
        : await actions.depositToPot(pot.id, value.amount)

      if (!applyActionResult(result)) {
        return
      }

      onOpenChange(false)
      resetForm(defaultValues)
    },
  })

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen)

    if (!nextOpen) {
      standardForm.reset(defaultValues)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent variant="finance" showCloseButton={false}>
        <DialogHeader className="text-left">
          <DialogTitle variant="finance">{copy.title}</DialogTitle>
          <DialogDescription variant="finance">
            {copy.description}
          </DialogDescription>
        </DialogHeader>

        <DialogCloseButton aria-label={`Close ${copy.title} dialog`} />

        <form className="mt-8" onSubmit={standardForm.handleSubmit}>
          <standardForm.form.Subscribe
            selector={(state) => state.values.amount}
          >
            {(amount) => {
              const previewAmount = getPreviewAmount(pot.amount, amount, mode)
              const currentPercentage = (pot.amount / pot.target) * 100
              const previewPercentage = (previewAmount / pot.target) * 100
              const clampedCurrentPercentage = Math.min(currentPercentage, 100)
              const clampedPreviewPercentage = Math.min(previewPercentage, 100)
              const deltaStart = Math.min(
                clampedCurrentPercentage,
                clampedPreviewPercentage,
              )
              const deltaWidth = Math.abs(
                clampedPreviewPercentage - clampedCurrentPercentage,
              )

              return (
                <>
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-muted-foreground text-sm">New Amount</p>
                    <p className="text-foreground text-3xl leading-tight font-bold tracking-tight">
                      {formatCurrency(previewAmount, { forceDecimals: true })}
                    </p>
                  </div>

                  <div className="mt-4">
                    <div className="bg-background relative h-2 w-full overflow-hidden rounded-full">
                      <div
                        className="bg-foreground absolute inset-y-0 left-0 rounded-full"
                        style={{
                          width: `${isWithdrawal ? clampedPreviewPercentage : clampedCurrentPercentage}%`,
                        }}
                      />
                      <div
                        className={cn(
                          "absolute inset-y-0 rounded-full",
                          isWithdrawal
                            ? "bg-destructive"
                            : themeColorClasses[pot.color].bg,
                        )}
                        style={{
                          left: `${deltaStart}%`,
                          width: `${deltaWidth}%`,
                        }}
                      />
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs">
                      <span
                        className={cn(
                          isWithdrawal
                            ? "text-destructive"
                            : ["font-bold", themeColorClasses[pot.color].text],
                        )}
                      >
                        {previewPercentage.toFixed(
                          previewPercentage < 10 ? 2 : 1,
                        )}
                        %
                      </span>
                      <span className="text-muted-foreground">
                        Target of {formatCurrency(pot.target)}
                      </span>
                    </div>
                  </div>
                </>
              )
            }}
          </standardForm.form.Subscribe>

          <standardForm.form.Field name="amount">
            {(field) => (
              <FormField
                id={`${mode}-pot-amount-${pot.id}`}
                label={copy.label}
                className="mt-8"
                error={standardForm.fieldErrors.amount}
              >
                {(fieldProps) => (
                  <CurrencyInput
                    {...fieldProps}
                    inputMode="decimal"
                    value={field.state.value}
                    onChange={(event) =>
                      standardForm.setValue("amount", event.target.value)
                    }
                    onBlur={field.handleBlur}
                    placeholder={isWithdrawal ? "e.g. 20" : "e.g. 400"}
                  />
                )}
              </FormField>
            )}
          </standardForm.form.Field>

          {standardForm.status?.message ? (
            <div className="mt-5">
              <FormStatusMessage variant={standardForm.status.variant}>
                {standardForm.status.message}
              </FormStatusMessage>
            </div>
          ) : null}
          <standardForm.form.Subscribe selector={(state) => state.isSubmitting}>
            {(isSubmitting) => (
              <Button
                type="submit"
                size="finance-submit"
                className="mt-5"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving..." : copy.button}
              </Button>
            )}
          </standardForm.form.Subscribe>
        </form>
      </DialogContent>
    </Dialog>
  )
}
