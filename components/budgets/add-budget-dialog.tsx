"use client"

import { useMemo, useState, type FormEvent } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useFinance } from "@/hooks/use-finance"
import {
  getCurrentPeriod,
  parseDollarAmount,
  themeOptions,
} from "@/lib/finance/form-utils"
import { themeColorClasses, type ThemeColor } from "@/lib/theme-colors"
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

  const budgetedCategoryIds = useMemo(
    () => new Set(state.budgets.map((budget) => budget.categoryId)),
    [state.budgets],
  )
  const usedThemeColors = useMemo(
    () =>
      new Set(state.budgets.map((budget) => budget.themeColor.toLowerCase())),
    [state.budgets],
  )

  const availableCategories = useMemo(
    () =>
      state.categories
        .filter((category) => !budgetedCategoryIds.has(category.id))
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [budgetedCategoryIds, state.categories],
  )
  const orderedCategories = useMemo(
    () => [...state.categories].sort((a, b) => a.sortOrder - b.sortOrder),
    [state.categories],
  )

  const firstCategoryId = availableCategories[0]?.id ?? ""
  const selectedCategoryId = availableCategories.some(
    (category) => category.id === categoryId,
  )
    ? categoryId
    : firstCategoryId
  const selectedTheme = themeOptions.find((theme) => theme.value === themeColor)

  const resetForm = () => {
    setCategoryId("")
    setMaximumSpend("")
    setThemeColor(themeOptions[0].value)
    setAmountError("")
  }

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)

    if (!nextOpen) {
      resetForm()
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const limitCents = parseDollarAmount(maximumSpend)

    if (limitCents === null) {
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

    actions.addBudget(
      {
        id: `budget-${category.slug}-${period}`,
        categoryId: category.id,
        period,
        limitCents,
        themeColor,
      },
      0,
    )
    setOpen(false)
    resetForm()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="bg-sidebar text-sidebar-primary-foreground hover:bg-sidebar/90 focus-visible:ring-ring rounded-lg px-4 py-3 text-sm font-bold transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          + Add New Budget
        </button>
      </DialogTrigger>
      <DialogContent
        className="bg-card max-w-140 gap-0 rounded-xl border-none p-8 shadow-xl sm:max-w-140"
        showCloseButton={false}
      >
        <DialogHeader className="pr-12 text-left">
          <DialogTitle className="text-[2rem] leading-tight font-bold tracking-[-0.02em]">
            Add New Budget
          </DialogTitle>
          <DialogDescription className="mt-5 text-sm leading-6">
            Choose a category to set a spending budget. These categories can
            help you monitor spending.
          </DialogDescription>
        </DialogHeader>

        <DialogClose asChild>
          <button
            type="button"
            aria-label="Close add budget dialog"
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring absolute top-9 right-8 flex size-7 items-center justify-center rounded-full border border-current transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            <X className="size-4" aria-hidden />
          </button>
        </DialogClose>

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
              <SelectTrigger
                id="budget-category"
                className="border-finance-input-border h-11 w-full rounded-lg px-5 text-sm"
              >
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent className="max-h-107.5">
                {orderedCategories.map((category) => {
                  const isAlreadyBudgeted = budgetedCategoryIds.has(category.id)

                  return (
                    <SelectItem
                      key={category.id}
                      value={category.id}
                      disabled={isAlreadyBudgeted}
                      className="border-border min-h-11 border-b py-3 pr-8 pl-4 last:border-b-0"
                    >
                      <span className="flex w-full items-center justify-between gap-6">
                        <span className={cn(isAlreadyBudgeted && "opacity-35")}>
                          {category.name}
                        </span>
                        {isAlreadyBudgeted && (
                          <span className="text-muted-foreground text-xs">
                            Already used
                          </span>
                        )}
                      </span>
                    </SelectItem>
                  )
                })}
                {orderedCategories.length === 0 && (
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
            <div className="relative">
              <span
                aria-hidden
                className="text-muted-foreground absolute top-1/2 left-5 -translate-y-1/2 text-sm"
              >
                $
              </span>
              <Input
                id="maximum-spend"
                inputMode="decimal"
                value={maximumSpend}
                onChange={(event) => {
                  setMaximumSpend(event.target.value)
                  setAmountError("")
                }}
                placeholder="e.g. 2000"
                aria-invalid={amountError ? "true" : "false"}
                aria-describedby={
                  amountError ? "maximum-spend-error" : undefined
                }
                className="border-finance-input-border h-11 rounded-lg pl-10 text-sm"
              />
            </div>
            {amountError && (
              <p id="maximum-spend-error" className="text-destructive text-xs">
                {amountError}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="budget-theme"
              className="text-muted-foreground text-xs font-bold"
            >
              Theme
            </Label>
            <Select
              value={themeColor}
              onValueChange={(value) => setThemeColor(value as ThemeColor)}
            >
              <SelectTrigger
                id="budget-theme"
                className="border-finance-input-border h-11 w-full rounded-lg px-5 text-sm"
              >
                <SelectValue>
                  <span className="flex items-center gap-3">
                    <span
                      aria-hidden
                      className={cn(
                        "size-4 rounded-full",
                        selectedTheme &&
                          themeColorClasses[selectedTheme.value].bg,
                      )}
                    />
                    {selectedTheme?.label}
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-107.5">
                {themeOptions.map((theme) => (
                  <SelectItem
                    key={theme.value}
                    value={theme.value}
                    className="border-border min-h-11 border-b py-3 pr-8 pl-4 last:border-b-0"
                  >
                    <span className="flex w-full items-center justify-between gap-6">
                      <span
                        className={cn(
                          "flex items-center gap-3",
                          usedThemeColors.has(theme.value.toLowerCase()) &&
                            "opacity-35",
                        )}
                      >
                        <span
                          aria-hidden
                          className={cn(
                            "size-4 rounded-full",
                            themeColorClasses[theme.value].bg,
                          )}
                        />
                        {theme.label}
                      </span>
                      {usedThemeColors.has(theme.value.toLowerCase()) && (
                        <span className="text-muted-foreground text-xs">
                          Already used
                        </span>
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            type="submit"
            disabled={availableCategories.length === 0}
            className="h-13.25 w-full rounded-lg text-sm font-bold"
          >
            Add Budget
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
