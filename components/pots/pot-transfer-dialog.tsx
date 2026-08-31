"use client"

import { useMemo } from "react"
import { z } from "zod"

import { MoneyAmount } from "@/components/money-amount"
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
import { DatePicker } from "@/components/ui/date-picker"
import { FormField, FormStatusMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useFinance } from "@/hooks/use-finance"
import { getForecastLocalDate } from "@/lib/finance/forecast-period"
import { parseDollarAmount } from "@/lib/finance/form-utils"
import {
  defaultCategoryValue,
  directAdjustmentValue,
  getPotMovementSource,
  primaryAccountValue,
} from "@/lib/finance/pot-movement"
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
  source: string
  concept: string
  categoryId: string
  postedAt: string
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
  const { actions, state } = useFinance()
  const isWithdrawal = mode === "withdraw"
  const availableCents = Math.round(pot.amount * 100)
  const localToday = getForecastLocalDate(
    new Date(),
    state.preferences.timezone,
  )
  const otherPots = state.pots.filter((candidate) => candidate.id !== pot.id)
  const defaultValues = useMemo(
    () =>
      ({
        amount: "",
        source: directAdjustmentValue,
        concept: "",
        categoryId: "",
        postedAt: localToday,
      }) satisfies PotTransferFormValues,
    [localToday],
  )
  const transferFormSchema = useMemo(
    () =>
      z.object({
        amount: currencyCentsSchema("Enter an amount greater than $0.").refine(
          (amountCents) => !isWithdrawal || amountCents <= availableCents,
          "You cannot withdraw more than this pot contains.",
        ),
        source: z.string().min(1, "Choose where the money is moving."),
        concept: z.string().trim().max(80),
        categoryId: z.string(),
        postedAt: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date."),
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
              "Enter an amount, then choose whether to adjust this pot directly, move money to your main account, or transfer it to another pot.",
          }
        : {
            title: `Add to '${pot.name}'`,
            label: "Amount to Add",
            button: "Add Money",
            description:
              "Enter an amount, then choose whether to adjust this pot directly, take it from your main account, or transfer it from another pot.",
          },
    [isWithdrawal, pot.name],
  )

  const standardForm = useStandardForm({
    defaultValues,
    schema: transferFormSchema,
    onSubmit: async ({ applyActionResult, resetForm, value }) => {
      const result = await actions.movePot({
        potId: pot.id,
        amountCents: value.amount,
        direction: isWithdrawal ? "withdraw" : "deposit",
        source: getPotMovementSource(value.source, value),
      })

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

        <DialogFinanceForm
          className="mt-8"
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
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Saving..." : copy.button}
                  </Button>
                )}
              </standardForm.form.Subscribe>
            </>
          }
        >
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
                      <MoneyAmount amount={previewAmount} forceDecimals />
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
                        Target of <MoneyAmount amount={pot.target} />
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

          <standardForm.form.Field name="source">
            {(field) => (
              <FormField
                id={`${mode}-pot-source-${pot.id}`}
                label={isWithdrawal ? "Money Destination" : "Money Source"}
                className="mt-5"
                error={standardForm.fieldErrors.source}
              >
                {(fieldProps) => (
                  <Select
                    value={field.state.value}
                    onValueChange={(value) =>
                      standardForm.setValue("source", value)
                    }
                  >
                    <SelectTrigger {...fieldProps} variant="form">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent matchTriggerWidth>
                      <SelectItem value={directAdjustmentValue} variant="form">
                        Direct Adjustment
                      </SelectItem>
                      <SelectItem value={primaryAccountValue} variant="form">
                        Main Account
                      </SelectItem>
                      {otherPots.map((otherPot) => (
                        <SelectItem
                          key={otherPot.id}
                          value={`pot:${otherPot.id}`}
                          variant="form"
                        >
                          {isWithdrawal
                            ? `Transfer To ${otherPot.name}`
                            : `Transfer From ${otherPot.name}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </FormField>
            )}
          </standardForm.form.Field>

          <standardForm.form.Subscribe
            selector={(formState) => formState.values.source}
          >
            {(source) =>
              source === primaryAccountValue ? (
                <div className="mt-5 space-y-5">
                  <standardForm.form.Field name="concept">
                    {(field) => (
                      <FormField
                        id={`${mode}-pot-concept-${pot.id}`}
                        label="Concept (Optional)"
                        error={standardForm.fieldErrors.concept}
                      >
                        {(fieldProps) => (
                          <Input
                            {...fieldProps}
                            value={field.state.value}
                            onChange={(event) =>
                              standardForm.setValue(
                                "concept",
                                event.target.value,
                              )
                            }
                            onBlur={field.handleBlur}
                            placeholder={
                              isWithdrawal
                                ? `Taken from ${pot.name}`
                                : `Deposit to ${pot.name}`
                            }
                          />
                        )}
                      </FormField>
                    )}
                  </standardForm.form.Field>

                  <standardForm.form.Field name="categoryId">
                    {(field) => (
                      <FormField
                        id={`${mode}-pot-category-${pot.id}`}
                        label="Category (Optional)"
                      >
                        {(fieldProps) => (
                          <Select
                            value={field.state.value || defaultCategoryValue}
                            onValueChange={(value) =>
                              standardForm.setValue(
                                "categoryId",
                                value === defaultCategoryValue ? "" : value,
                              )
                            }
                          >
                            <SelectTrigger {...fieldProps} variant="form">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent matchTriggerWidth>
                              <SelectItem
                                value={defaultCategoryValue}
                                variant="form"
                              >
                                General (Default)
                              </SelectItem>
                              {state.categories
                                .filter(
                                  (category) =>
                                    category.name.toLowerCase() !== "general",
                                )
                                .map((category) => (
                                  <SelectItem
                                    key={category.id}
                                    value={category.id}
                                    variant="form"
                                  >
                                    {category.name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        )}
                      </FormField>
                    )}
                  </standardForm.form.Field>

                  <standardForm.form.Field name="postedAt">
                    {(field) => (
                      <FormField
                        id={`${mode}-pot-posted-at-${pot.id}`}
                        label="Transaction Date"
                        error={standardForm.fieldErrors.postedAt}
                      >
                        {(fieldProps) => (
                          <DatePicker
                            {...fieldProps}
                            max={localToday}
                            value={field.state.value}
                            onChange={(nextDate) => {
                              if (nextDate) {
                                standardForm.setValue("postedAt", nextDate)
                              }
                            }}
                            onBlur={field.handleBlur}
                          />
                        )}
                      </FormField>
                    )}
                  </standardForm.form.Field>
                </div>
              ) : null
            }
          </standardForm.form.Subscribe>
        </DialogFinanceForm>
      </DialogContent>
    </Dialog>
  )
}
