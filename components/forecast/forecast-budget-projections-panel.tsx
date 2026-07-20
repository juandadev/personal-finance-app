"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { CaretDownIcon } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { useFinance } from "@/hooks/use-finance"
import { getCurrentPeriod } from "@/lib/finance/period"
import { cn } from "@/lib/utils"

export function ForecastBudgetProjectionsPanel() {
  const { state, actions, budgets } = useFinance()
  const activePeriod = getCurrentPeriod()
  const activeBudgets = useMemo(
    () =>
      budgets
        .filter((budget) => budget.period === activePeriod)
        .toSorted((left, right) => left.category.localeCompare(right.category)),
    [activePeriod, budgets],
  )
  const savedIncludedIds = useMemo(
    () =>
      new Set(state.cashForecastSettings?.included_budget_category_ids ?? []),
    [state.cashForecastSettings?.included_budget_category_ids],
  )
  const [open, setOpen] = useState(false)
  const [selectedCategoryIds, setSelectedCategoryIds] = useState(
    () => new Set(savedIncludedIds),
  )
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!isSaving) {
      setSelectedCategoryIds(new Set(savedIncludedIds))
    }
  }, [isSaving, savedIncludedIds])

  const includedCount = selectedCategoryIds.size

  const handleToggle = async (categoryId: string, checked: boolean) => {
    if (isSaving) {
      return
    }

    const previous = new Set(selectedCategoryIds)
    const next = new Set(selectedCategoryIds)

    if (checked) {
      next.add(categoryId)
    } else {
      next.delete(categoryId)
    }

    setSelectedCategoryIds(next)
    setError(null)
    setIsSaving(true)

    const result = await actions.saveCashForecastIncludedBudgets([...next])

    setIsSaving(false)

    if (!result.ok) {
      setSelectedCategoryIds(previous)
      setError(result.message)
    }
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="space-y-2">
      <div className="flex items-center gap-2">
        <CollapsibleTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            className="text-muted-foreground hover:text-foreground h-auto gap-1.5 px-0 py-1 text-xs font-bold"
            aria-label={`${open ? "Collapse" : "Expand"} budget projections`}
          >
            <CaretDownIcon
              weight="fill"
              className={cn(
                "size-3 transition-transform motion-reduce:transition-none",
                open && "rotate-180",
              )}
              aria-hidden
            />
            Budget projections
            {includedCount > 0 ? (
              <span className="font-normal">({includedCount} included)</span>
            ) : null}
          </Button>
        </CollapsibleTrigger>
        {isSaving ? (
          <Spinner className="text-muted-foreground size-3.5" />
        ) : null}
      </div>

      <CollapsibleContent className="space-y-2">
        {activeBudgets.length === 0 ? (
          <p className="text-muted-foreground text-xs leading-normal">
            No active budgets.{" "}
            <Link
              href="/budgets"
              className="text-foreground font-bold underline-offset-4 hover:underline"
            >
              Add budgets
            </Link>
          </p>
        ) : (
          <ul className="ml-4 flex flex-col gap-2 md:flex-row md:flex-wrap md:gap-x-4 md:gap-y-2">
            {activeBudgets.map((budget) => {
              const checkboxId = `forecast-budget-${budget.id}`

              return (
                <li key={budget.id}>
                  <Label
                    htmlFor={checkboxId}
                    className={cn(
                      "text-muted-foreground flex cursor-pointer items-center gap-2 text-xs font-normal",
                      isSaving && "pointer-events-none opacity-60",
                    )}
                  >
                    <Checkbox
                      id={checkboxId}
                      className="size-3.5"
                      checkedThemeColor={budget.color}
                      checked={selectedCategoryIds.has(budget.categoryId)}
                      disabled={isSaving}
                      onCheckedChange={(checked) => {
                        void handleToggle(budget.categoryId, checked === true)
                      }}
                    />
                    <span className="text-foreground">{budget.category}</span>
                  </Label>
                </li>
              )
            })}
          </ul>
        )}

        {error ? (
          <p className="text-destructive text-xs" role="alert">
            {error}
          </p>
        ) : null}
      </CollapsibleContent>
    </Collapsible>
  )
}
