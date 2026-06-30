"use client"

import { useMemo, useState, type FormEvent } from "react"
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
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ThemeSelect } from "@/components/theme-select"
import { useFinance } from "@/hooks/use-finance"
import {
  getCurrentPeriod,
  parseDollarAmount,
  themeOptions,
} from "@/lib/finance/form-utils"
import { AuthStatusMessage } from "@/components/auth/auth-page-shell"
import type { ThemeColor } from "@/lib/theme-colors"
import { cn } from "@/lib/utils"

export function AddBudgetDialog() {
  const { state, actions } = useFinance()
  const [open, setOpen] = useState(false)
  const [categoryId, setCategoryId] = useState("")
  const [maximumSpend, setMaximumSpend] = useState("")
  const [themeColor, setThemeColor] = useState<ThemeColor>(
    themeOptions[0].value,
  )
  const [amountError, setAmountError] = useState("")
  const [statusMessage, setStatusMessage] = useState("")
  const [isSaving, setIsSaving] = useState(false)

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
  const selectedCategoryId = availableCategories.some(
    (category) => category.id === categoryId,
  )
    ? categoryId
    : firstCategoryId

  const resetForm = () => {
    setCategoryId("")
    setMaximumSpend("")
    setThemeColor(themeOptions[0].value)
    setAmountError("")
    setStatusMessage("")
  }

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)

    if (!nextOpen) {
      resetForm()
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStatusMessage("")

    const limit_cents = parseDollarAmount(maximumSpend)

    if (limit_cents === null) {
      setAmountError("Enter a maximum spend greater than $0.")
      return
    }

    const category = availableCategories.find(
      (option) => option.id === selectedCategoryId,
    )

    if (!category) {
      return
    }

    const period = state.budgets[0]?.period ?? getCurrentPeriod()
    setIsSaving(true)

    const result = await actions.addBudget(
      {
        id: crypto.randomUUID(),
        category_id: category.id,
        period,
        limit_cents,
        theme_color: themeColor,
      },
      0,
    )

    setIsSaving(false)

    if (!result.ok) {
      setStatusMessage(result.message)
      return
    }

    setOpen(false)
    resetForm()
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

        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label
              htmlFor="budget-category"
              className="text-muted-foreground text-xs font-bold"
            >
              Budget Category
            </Label>
            <Select
              value={selectedCategoryId}
              onValueChange={setCategoryId}
              disabled={availableCategories.length === 0}
            >
              <SelectTrigger id="budget-category" variant="form">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent className="max-h-107.5" matchTriggerWidth>
                {state.categories.map((category) => {
                  const isAlreadyBudgeted = budgetedCategoryIds.has(category.id)

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
            {availableCategories.length === 0 && (
              <p className="text-muted-foreground text-xs">
                Every category already has a budget.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="maximum-spend"
              className="text-muted-foreground text-xs font-bold"
            >
              Maximum Spend
            </Label>
            <CurrencyInput
              id="maximum-spend"
              inputMode="decimal"
              value={maximumSpend}
              onChange={(event) => {
                setMaximumSpend(event.target.value)
                setAmountError("")
              }}
              placeholder="e.g. 2000"
              aria-invalid={amountError ? "true" : "false"}
              aria-describedby={amountError ? "maximum-spend-error" : undefined}
            />
            {amountError && (
              <p id="maximum-spend-error" className="text-destructive text-xs">
                {amountError}
              </p>
            )}
          </div>

          <ThemeSelect
            id="budget-theme"
            value={themeColor}
            onValueChange={setThemeColor}
            usedThemeColors={usedThemeColors}
          />

          <Button
            type="submit"
            size="finance-submit"
            disabled={availableCategories.length === 0 || isSaving}
          >
            {isSaving ? "Saving..." : "Add Budget"}
          </Button>
          {statusMessage ? (
            <AuthStatusMessage variant="error">
              {statusMessage}
            </AuthStatusMessage>
          ) : null}
        </form>
      </DialogContent>
    </Dialog>
  )
}
