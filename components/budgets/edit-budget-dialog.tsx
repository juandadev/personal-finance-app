"use client"

import { useMemo } from "react"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogCloseButton,
  DialogContent,
  DialogDescription,
  DialogFinanceForm,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CurrencyInput } from "@/components/ui/currency-input"
import { FormField, FormStatusMessage } from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ThemeSelect } from "@/components/theme-select"
import { useFinance } from "@/hooks/use-finance"
import { formatDollarInput } from "@/lib/finance/form-utils"
import {
  currencyCentsSchema,
  requiredSelectSchema,
  themeColorSchema,
} from "@/lib/forms/validation"
import { useStandardForm } from "@/lib/forms/use-standard-form"
import type { Budget } from "@/lib/types"
import { cn } from "@/lib/utils"

const editBudgetFormSchema = z.object({
  categoryId: requiredSelectSchema("Choose a budget category."),
  maximumSpend: currencyCentsSchema("Enter a maximum spend greater than $0."),
  themeColor: themeColorSchema,
})

type EditBudgetFormValues = z.input<typeof editBudgetFormSchema>

interface EditBudgetDialogProps {
  budget: Budget
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditBudgetDialog({
  budget,
  open,
  onOpenChange,
}: EditBudgetDialogProps) {
  const { state, actions } = useFinance()
  const currentBudget = state.budgets.find(
    (budgetRecord) => budgetRecord.id === budget.id,
  )
  const currentCategoryId = currentBudget?.category_id ?? ""
  const defaultValues = useMemo(
    () =>
      ({
        categoryId: currentCategoryId,
        maximumSpend: formatDollarInput(budget.maximum),
        themeColor: budget.color,
      }) satisfies EditBudgetFormValues,
    [budget.color, budget.maximum, currentCategoryId],
  )

  const budgetedCategoryIds = useMemo(
    () =>
      new Set(
        state.budgets
          .filter((budgetRecord) => budgetRecord.id !== currentBudget?.id)
          .map((budgetRecord) => budgetRecord.category_id),
      ),
    [currentBudget?.id, state.budgets],
  )
  const usedThemeColors = useMemo(
    () =>
      new Set(
        state.budgets
          .filter((budgetRecord) => budgetRecord.id !== currentBudget?.id)
          .map((budgetRecord) => budgetRecord.theme_color.toLowerCase()),
      ),
    [currentBudget?.id, state.budgets],
  )

  const standardForm = useStandardForm({
    defaultValues,
    schema: editBudgetFormSchema,
    onSubmit: async ({ applyActionResult, value }) => {
      if (!currentBudget) {
        applyActionResult({
          ok: false,
          message: "This budget is no longer available.",
        })
        return
      }

      const category = state.categories.find(
        (option) => option.id === value.categoryId,
      )

      if (!category) {
        applyActionResult({
          ok: false,
          message: "Choose a budget category.",
          fieldErrors: { categoryId: ["Choose a budget category."] },
        })
        return
      }

      const result = await actions.updateBudget(currentBudget.id, {
        category_id: category.id,
        limit_cents: value.maximumSpend,
        theme_color: value.themeColor,
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
          <DialogTitle variant="finance">Edit Budget</DialogTitle>
          <DialogDescription variant="finance">
            As your budgets change, feel free to update your spending limits.
          </DialogDescription>
        </DialogHeader>

        <DialogCloseButton aria-label="Close edit budget dialog" />

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
                    disabled={!currentBudget || isSubmitting}
                  >
                    {isSubmitting ? "Saving..." : "Save Changes"}
                  </Button>
                )}
              </standardForm.form.Subscribe>
            </>
          }
        >
          <standardForm.form.Field name="categoryId">
            {(field) => (
              <FormField
                id="edit-budget-category"
                label="Budget Category"
                error={standardForm.fieldErrors.categoryId}
              >
                {(fieldProps) => (
                  <Select
                    value={field.state.value}
                    onValueChange={(value) =>
                      standardForm.setValue("categoryId", value)
                    }
                  >
                    <SelectTrigger {...fieldProps} variant="form">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent className="max-h-107.5" matchTriggerWidth>
                      {state.categories.map((category) => {
                        const isAlreadyBudgeted = budgetedCategoryIds.has(
                          category.id,
                        )

                        return (
                          <SelectItem
                            key={category.id}
                            value={category.id}
                            disabled={isAlreadyBudgeted}
                            variant="form"
                          >
                            <span className="flex w-full min-w-0 items-center justify-between gap-3">
                              <span
                                className={cn(
                                  "min-w-0",
                                  isAlreadyBudgeted && "opacity-35",
                                )}
                              >
                                {category.name}
                              </span>
                              {isAlreadyBudgeted && (
                                <span className="text-muted-foreground shrink-0 text-xs">
                                  Already used
                                </span>
                              )}
                            </span>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                )}
              </FormField>
            )}
          </standardForm.form.Field>

          <standardForm.form.Field name="maximumSpend">
            {(field) => (
              <FormField
                id="edit-maximum-spend"
                label="Maximum Spend"
                error={standardForm.fieldErrors.maximumSpend}
              >
                {(fieldProps) => (
                  <CurrencyInput
                    {...fieldProps}
                    inputMode="decimal"
                    value={field.state.value}
                    onChange={(event) =>
                      standardForm.setValue("maximumSpend", event.target.value)
                    }
                    onBlur={field.handleBlur}
                  />
                )}
              </FormField>
            )}
          </standardForm.form.Field>

          <standardForm.form.Field name="themeColor">
            {(field) => (
              <ThemeSelect
                id="edit-budget-theme"
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
