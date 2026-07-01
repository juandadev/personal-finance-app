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
} from "@/components/ui/dialog"
import { CurrencyInput } from "@/components/ui/currency-input"
import { Label } from "@/components/ui/label"
import { AuthStatusMessage } from "@/components/auth/auth-page-shell"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ThemeSelect } from "@/components/theme-select"
import { useFinance } from "@/hooks/use-finance"
import { formatDollarInput, parseDollarAmount } from "@/lib/finance/form-utils"
import type { ThemeColor } from "@/lib/theme-colors"
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
  const currentBudget = state.budgets.find(
    (budgetRecord) => budgetRecord.id === budget.id,
  )
  const currentCategoryId = currentBudget?.category_id ?? ""
  const [categoryId, setCategoryId] = useState(currentCategoryId)
  const [maximumSpend, setMaximumSpend] = useState(
    formatDollarInput(budget.maximum),
  )
  const [themeColor, setThemeColor] = useState<ThemeColor>(budget.color)
  const [amountError, setAmountError] = useState("")
  const [statusMessage, setStatusMessage] = useState("")
  const [isSaving, setIsSaving] = useState(false)

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

  const resetForm = () => {
    setCategoryId(currentCategoryId)
    setMaximumSpend(formatDollarInput(budget.maximum))
    setThemeColor(budget.color)
    setAmountError("")
    setStatusMessage("")
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      resetForm()
    }

    onOpenChange(nextOpen)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStatusMessage("")

    if (!currentBudget) {
      return
    }

    const limit_cents = parseDollarAmount(maximumSpend)

    if (limit_cents === null) {
      setAmountError("Enter a maximum spend greater than $0.")
      return
    }

    const category = state.categories.find((option) => option.id === categoryId)

    if (!category) {
      return
    }

    setIsSaving(true)

    const result = await actions.updateBudget(currentBudget.id, {
      category_id: category.id,
      limit_cents,
      theme_color: themeColor,
    })

    setIsSaving(false)

    if (!result.ok) {
      setStatusMessage(result.message)
      return
    }

    onOpenChange(false)
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

        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label
              htmlFor="edit-budget-category"
              className="text-muted-foreground text-xs font-bold"
            >
              Budget Category
            </Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger id="edit-budget-category" variant="form">
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
            <CurrencyInput
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
            />
            {amountError && (
              <p
                id="edit-maximum-spend-error"
                className="text-destructive text-xs"
              >
                {amountError}
              </p>
            )}
          </div>

          <ThemeSelect
            id="edit-budget-theme"
            value={themeColor}
            onValueChange={setThemeColor}
            usedThemeColors={usedThemeColors}
          />

          <Button
            type="submit"
            size="finance-submit"
            disabled={!currentBudget || isSaving}
          >
            {isSaving ? "Saving..." : "Save Changes"}
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
