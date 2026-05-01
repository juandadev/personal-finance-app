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
  formatDollarInput,
  parseDollarAmount,
  themeOptions,
} from "@/lib/finance/form-utils"
import { themeColorClasses, type ThemeColor } from "@/lib/theme-colors"
import type { Budget } from "@/lib/types"
import { cn } from "@/lib/utils"

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
  const currentBudget = state.budgets.find((budgetRecord) => {
    const category = state.categories.find(
      (option) => option.id === budgetRecord.categoryId,
    )

    return category?.name === budget.category
  })
  const currentCategoryId = currentBudget?.categoryId ?? ""
  const [categoryId, setCategoryId] = useState(currentCategoryId)
  const [maximumSpend, setMaximumSpend] = useState(
    formatDollarInput(budget.maximum),
  )
  const [themeColor, setThemeColor] = useState<ThemeColor>(budget.color)
  const [amountError, setAmountError] = useState("")

  const budgetedCategoryIds = useMemo(
    () =>
      new Set(
        state.budgets
          .filter((budgetRecord) => budgetRecord.id !== currentBudget?.id)
          .map((budgetRecord) => budgetRecord.categoryId),
      ),
    [currentBudget?.id, state.budgets],
  )
  const usedThemeColors = useMemo(
    () =>
      new Set(
        state.budgets
          .filter((budgetRecord) => budgetRecord.id !== currentBudget?.id)
          .map((budgetRecord) => budgetRecord.themeColor.toLowerCase()),
      ),
    [currentBudget?.id, state.budgets],
  )
  const selectedTheme = themeOptions.find((theme) => theme.value === themeColor)

  const resetForm = () => {
    setCategoryId(currentCategoryId)
    setMaximumSpend(formatDollarInput(budget.maximum))
    setThemeColor(budget.color)
    setAmountError("")
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      resetForm()
    }

    onOpenChange(nextOpen)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!currentBudget) {
      return
    }

    const limitCents = parseDollarAmount(maximumSpend)

    if (limitCents === null) {
      setAmountError("Enter a maximum spend greater than $0.")
      return
    }

    const category = state.categories.find((option) => option.id === categoryId)

    if (!category) {
      return
    }

    actions.updateBudget(currentBudget.id, {
      categoryId: category.id,
      limitCents,
      themeColor,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="bg-card max-w-140 gap-0 rounded-xl border-none p-8 shadow-xl sm:max-w-140"
        showCloseButton={false}
      >
        <DialogHeader className="pr-12 text-left">
          <DialogTitle className="text-[2rem] leading-tight font-bold tracking-[-0.02em]">
            Edit Budget
          </DialogTitle>
          <DialogDescription className="mt-5 text-sm leading-6">
            As your budgets change, feel free to update your spending limits.
          </DialogDescription>
        </DialogHeader>

        <DialogClose asChild>
          <button
            type="button"
            aria-label="Close edit budget dialog"
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring absolute top-9 right-8 flex size-7 items-center justify-center rounded-full border border-current transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            <X className="size-4" aria-hidden />
          </button>
        </DialogClose>

        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label
              htmlFor="edit-budget-category"
              className="text-muted-foreground text-xs font-bold"
            >
              Budget Category
            </Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger
                id="edit-budget-category"
                className="border-finance-input-border h-11 w-full rounded-lg px-5 text-sm"
              >
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent className="max-h-107.5">
                {state.categories.map((category) => {
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
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="edit-maximum-spend"
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
                id="edit-maximum-spend"
                inputMode="decimal"
                value={maximumSpend}
                onChange={(event) => {
                  setMaximumSpend(event.target.value)
                  setAmountError("")
                }}
                aria-invalid={amountError ? "true" : "false"}
                aria-describedby={
                  amountError ? "edit-maximum-spend-error" : undefined
                }
                className="border-finance-input-border h-11 rounded-lg pl-10 text-sm"
              />
            </div>
            {amountError && (
              <p
                id="edit-maximum-spend-error"
                className="text-destructive text-xs"
              >
                {amountError}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="edit-budget-theme"
              className="text-muted-foreground text-xs font-bold"
            >
              Theme
            </Label>
            <Select
              value={themeColor}
              onValueChange={(value) => setThemeColor(value as ThemeColor)}
            >
              <SelectTrigger
                id="edit-budget-theme"
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
            disabled={!currentBudget}
            className="h-13.25 w-full rounded-lg text-sm font-bold"
          >
            Save Changes
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
