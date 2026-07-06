"use client"

import { useMemo, useState } from "react"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogCloseButton,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { getCurrentPeriod, themeOptions } from "@/lib/finance/form-utils"
import {
  currencyCentsSchema,
  requiredSelectSchema,
  themeColorSchema,
} from "@/lib/forms/validation"
import { useStandardForm } from "@/lib/forms/use-standard-form"
import { cn } from "@/lib/utils"

const addBudgetFormSchema = z.object({
  categoryId: requiredSelectSchema("Choose a budget category."),
  maximumSpend: currencyCentsSchema("Enter a maximum spend greater than $0."),
  themeColor: themeColorSchema,
})

type AddBudgetFormValues = z.input<typeof addBudgetFormSchema>

export function AddBudgetDialog() {
  const { state, actions } = useFinance()
  const [open, setOpen] = useState(false)

  const budgetedCategoryIds = useMemo(
    () => new Set(state.budgets.map((budget) => budget.category_id)),
    [state.budgets],
  )
  const usedThemeColors = useMemo(
    () =>
      new Set(state.budgets.map((budget) => budget.theme_color.toLowerCase())),
    [state.budgets],
  )

  const availableCategories = useMemo(
    () =>
      state.categories.filter(
        (category) => !budgetedCategoryIds.has(category.id),
      ),
    [budgetedCategoryIds, state.categories],
  )

  const firstCategoryId = availableCategories[0]?.id ?? ""
  const defaultValues = useMemo(
    () =>
      ({
        categoryId: firstCategoryId,
        maximumSpend: "",
        themeColor: themeOptions[0].value,
      }) satisfies AddBudgetFormValues,
    [firstCategoryId],
  )

  const standardForm = useStandardForm({
    defaultValues,
    schema: addBudgetFormSchema,
    onSubmit: async ({ applyActionResult, resetForm, value }) => {
      const category = availableCategories.find(
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

      const period = state.budgets[0]?.period ?? getCurrentPeriod()
      const result = await actions.addBudget(
        {
          id: crypto.randomUUID(),
          category_id: category.id,
          period,
          limit_cents: value.maximumSpend,
          theme_color: value.themeColor,
        },
        0,
      )

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
        <Button>Add Budget</Button>
      </DialogTrigger>
      <DialogContent variant="finance" showCloseButton={false}>
        <DialogHeader className="text-left">
          <DialogTitle variant="finance">Add New Budget</DialogTitle>
          <DialogDescription variant="finance">
            Choose a category to set a spending budget. These categories can
            help you monitor spending.
          </DialogDescription>
        </DialogHeader>

        <DialogCloseButton aria-label="Close add budget dialog" />

        <form className="mt-6 space-y-5" onSubmit={standardForm.handleSubmit}>
          <standardForm.form.Field name="categoryId">
            {(field) => (
              <FormField
                id="budget-category"
                label="Budget Category"
                error={standardForm.fieldErrors.categoryId}
              >
                {(fieldProps) => (
                  <Select
                    value={field.state.value}
                    onValueChange={(value) =>
                      standardForm.setValue("categoryId", value)
                    }
                    disabled={availableCategories.length === 0}
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
                      {state.categories.length === 0 && (
                        <SelectItem value="empty" disabled>
                          No categories available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                )}
              </FormField>
            )}
          </standardForm.form.Field>
          <div>
            {availableCategories.length === 0 && (
              <p className="text-muted-foreground text-xs">
                Every category already has a budget.
              </p>
            )}
          </div>

          <standardForm.form.Field name="maximumSpend">
            {(field) => (
              <FormField
                id="maximum-spend"
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
                    placeholder="e.g. 2000"
                  />
                )}
              </FormField>
            )}
          </standardForm.form.Field>

          <standardForm.form.Field name="themeColor">
            {(field) => (
              <ThemeSelect
                id="budget-theme"
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
                disabled={availableCategories.length === 0 || isSubmitting}
              >
                {isSubmitting ? "Saving..." : "Add Budget"}
              </Button>
            )}
          </standardForm.form.Subscribe>
        </form>
      </DialogContent>
    </Dialog>
  )
}
