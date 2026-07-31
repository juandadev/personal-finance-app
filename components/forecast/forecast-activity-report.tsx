"use client"

import { useState, type ReactNode } from "react"
import { CaretDownIcon, CreditCardIcon } from "@phosphor-icons/react"

import { ItemActions } from "@/components/actions"
import { DeleteForecastItemDialog } from "@/components/forecast/delete-forecast-item-dialog"
import { EditForecastItemDialog } from "@/components/forecast/forecast-item-dialog"
import { getForecastActivityPagination } from "@/components/forecast/forecast-ui-state"
import { MoneyAmount } from "@/components/money-amount"
import { useFinance } from "@/hooks/use-finance"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Pagination } from "@/components/transactions/pagination"
import { Card } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatDisplayDate } from "@/lib/format"
import type {
  CashForecastActivity,
  CashForecastActivityChild,
  CashForecastMonth,
} from "@/lib/finance/cash-forecast"
import type {
  CashForecastAdjustmentRecord,
  CashForecastExclusionSourceType,
  CurrencyCode,
} from "@/lib/finance/types"
import { themeColorClasses, type ThemeColor } from "@/lib/theme-colors"
import { cn } from "@/lib/utils"

const PARENT_ROWS_PER_PAGE = 10

const activitySourceLabels: Record<CashForecastActivity["sourceType"], string> =
  {
    cash_transaction: "Cash transaction",
    default_income: "Monthly income",
    additional_income: "Additional income",
    recurring_bill: "Recurring bill",
    credit_card_statement: "Credit card payment",
    planned_outflow: "Planned outflow",
    budget_projection: "Budget projection",
  }

const childSourceLabels: Record<
  CashForecastActivityChild["sourceType"],
  string
> = {
  credit_card_charge: "Statement charge",
  recurring_bill: "Pending recurring bill",
  statement_remainder: "Statement remainder",
}

interface ForecastActivityReportProps {
  adjustments: CashForecastAdjustmentRecord[]
  budgetColorsById?: Record<string, ThemeColor>
  currency: CurrencyCode
  month: CashForecastMonth
  periods: string[]
}

export function ForecastActivityReport({
  adjustments,
  budgetColorsById = {},
  currency,
  month,
  periods,
}: ForecastActivityReportProps) {
  const { state } = useFinance()
  const [currentPage, setCurrentPage] = useState(1)
  const [pendingExclusionKeys, setPendingExclusionKeys] = useState<Set<string>>(
    () => new Set(),
  )
  const { totalPages, safePage, startIndex, endIndex } =
    getForecastActivityPagination(
      month.activities.length,
      currentPage,
      PARENT_ROWS_PER_PAGE,
    )
  const pageRows = month.activities.slice(startIndex, endIndex)
  const adjustmentsById = new Map(
    adjustments.map((adjustment) => [adjustment.id, adjustment]),
  )
  const budgetsById = new Map(
    state.budgets.map((budget) => [budget.id, budget]),
  )
  const emptyState = month.isCurrentPeriod
    ? "No actual cash activity or pending items"
    : "No projected activity"

  const handleRowDeleted = () => {
    setCurrentPage(
      (page) =>
        getForecastActivityPagination(
          month.activities.length - 1,
          page,
          PARENT_ROWS_PER_PAGE,
        ).safePage,
    )
  }

  const setExclusionPending = (activityKey: string, pending: boolean) => {
    setPendingExclusionKeys((current) => {
      const next = new Set(current)
      if (pending) {
        next.add(activityKey)
      } else {
        next.delete(activityKey)
      }
      return next
    })
  }

  return (
    <Card asChild>
      <section aria-labelledby="forecast-activity-title">
        <div className="space-y-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2
                id="forecast-activity-title"
                className="text-xl font-bold tracking-tight"
              >
                {month.label} Activity
              </h2>
              <p className="text-muted-foreground mt-1 text-sm">
                {month.isCurrentPeriod
                  ? "Actual bank cash activity to date plus pending forecast items."
                  : "Projected income and payments for the selected month."}
              </p>
            </div>
            <p className="text-muted-foreground text-xs">
              {month.activities.length}{" "}
              {month.activities.length === 1 ? "item" : "items"}
            </p>
          </div>

          <dl className="grid gap-3 sm:grid-cols-3">
            <ActivityTotal
              label="Total Income"
              value={
                <MoneyAmount
                  amount={month.totalIncomeCents / 100}
                  currency={currency}
                  forceDecimals
                />
              }
              valueClassName="text-accent"
            />
            <ActivityTotal
              label="Total Outflows"
              value={
                <MoneyAmount
                  amount={month.totalOutflowsCents / 100}
                  currency={currency}
                  forceDecimals
                />
              }
            />
            <ActivityTotal
              label="Monthly Change"
              value={
                <MoneyAmount
                  amount={month.monthlyChangeCents / 100}
                  currency={currency}
                  variant="signed"
                />
              }
              valueClassName={
                month.monthlyChangeCents > 0
                  ? "text-accent"
                  : month.monthlyChangeCents < 0
                    ? "text-destructive"
                    : undefined
              }
            />
          </dl>

          <ul className="divide-muted-foreground/10 divide-y md:hidden">
            {pageRows.length === 0 ? (
              <li className="text-muted-foreground py-8 text-center text-sm">
                {emptyState}
              </li>
            ) : (
              pageRows.map((activity) => (
                <MobileActivityRow
                  key={activity.key}
                  activity={activity}
                  adjustment={
                    activity.sourceId && isAdjustmentActivity(activity)
                      ? adjustmentsById.get(activity.sourceId)
                      : undefined
                  }
                  budgetColor={getBudgetProjectionColor(
                    activity,
                    budgetColorsById,
                  )}
                  budgetsById={budgetsById}
                  currency={currency}
                  exclusionPending={pendingExclusionKeys.has(activity.key)}
                  periods={periods}
                  onDeleted={handleRowDeleted}
                  onExclusionPendingChange={setExclusionPending}
                />
              ))
            )}
          </ul>

          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Forecast Item</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              {pageRows.length === 0 ? (
                <TableBody>
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-muted-foreground h-24 text-center"
                    >
                      {emptyState}
                    </TableCell>
                  </TableRow>
                </TableBody>
              ) : (
                pageRows.map((activity) => (
                  <DesktopActivityRows
                    key={activity.key}
                    activity={activity}
                    adjustment={
                      activity.sourceId && isAdjustmentActivity(activity)
                        ? adjustmentsById.get(activity.sourceId)
                        : undefined
                    }
                    budgetColor={getBudgetProjectionColor(
                      activity,
                      budgetColorsById,
                    )}
                    budgetsById={budgetsById}
                    currency={currency}
                    exclusionPending={pendingExclusionKeys.has(activity.key)}
                    periods={periods}
                    onDeleted={handleRowDeleted}
                    onExclusionPendingChange={setExclusionPending}
                  />
                ))
              )}
            </Table>
          </div>

          {totalPages > 1 ? (
            <Pagination
              currentPage={safePage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          ) : null}
        </div>
      </section>
    </Card>
  )
}

function ActivityTotal({
  label,
  value,
  valueClassName,
}: {
  label: string
  value: ReactNode
  valueClassName?: string
}) {
  return (
    <div className="bg-background rounded-lg p-4">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className={cn("mt-1 text-lg font-bold tabular-nums", valueClassName)}>
        {value}
      </dd>
    </div>
  )
}

function DesktopActivityRows({
  activity,
  adjustment,
  budgetColor,
  budgetsById,
  currency,
  exclusionPending,
  periods,
  onDeleted,
  onExclusionPendingChange,
}: ActivityRowProps) {
  const [open, setOpen] = useState(false)
  const hasChildren = Boolean(activity.children?.length)
  const excluded = Boolean(activity.excludedFromProjection)
  const budgetTextClassName =
    !excluded && budgetColor ? themeColorClasses[budgetColor].text : undefined
  const excludedClassName = excluded
    ? "text-muted-foreground line-through"
    : undefined

  return (
    <Collapsible asChild open={open} onOpenChange={setOpen}>
      <TableBody>
        <TableRow>
          <TableCell>
            <div className="flex items-center gap-2">
              {hasChildren ? (
                <StatementDisclosure
                  label={activity.label}
                  open={open}
                  childCount={activity.children?.length ?? 0}
                />
              ) : null}
              <span
                className={cn(
                  "font-bold",
                  budgetTextClassName,
                  excludedClassName,
                )}
              >
                {activity.label}
              </span>
            </div>
          </TableCell>
          <TableCell className="text-muted-foreground">
            <span className="flex items-center gap-2">
              {activity.sourceType === "credit_card_statement" ? (
                <CreditCardIcon weight="fill" className="size-4" aria-hidden />
              ) : null}
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span>{sourceLabel(activity, adjustment)}</span>
                {isExcludableActivity(activity) ? (
                  <span className="text-muted-foreground text-xs">
                    Projected
                  </span>
                ) : null}
              </span>
            </span>
          </TableCell>
          <TableCell className="text-muted-foreground">
            {activity.effectiveDate
              ? formatDisplayDate(activity.effectiveDate)
              : "—"}
          </TableCell>
          <TableCell
            className={cn(
              "text-right font-bold tabular-nums",
              excludedClassName ??
                budgetTextClassName ??
                (activity.amountCents > 0 ? "text-accent" : undefined),
            )}
          >
            <MoneyAmount
              amount={activity.amountCents / 100}
              currency={currency}
              variant="signed"
            />
          </TableCell>
          <TableCell className="text-right">
            {adjustment ? (
              <ForecastActivityActions
                activity={activity}
                adjustment={adjustment}
                periods={periods}
                pending={exclusionPending}
                onDeleted={onDeleted}
                onPendingChange={onExclusionPendingChange}
              />
            ) : isExcludableActivity(activity) ? (
              <ForecastExclusionAction
                activity={activity}
                budgetsById={budgetsById}
                pending={exclusionPending}
                onPendingChange={onExclusionPendingChange}
              />
            ) : (
              <span className="text-muted-foreground text-xs">Read-only</span>
            )}
          </TableCell>
        </TableRow>
        {hasChildren ? (
          <CollapsibleContent asChild>
            <TableRow className="bg-background/70 hover:bg-background/70">
              <TableCell colSpan={5} className="py-0">
                <StatementChildren
                  currency={currency}
                  items={activity.children ?? []}
                />
              </TableCell>
            </TableRow>
          </CollapsibleContent>
        ) : null}
      </TableBody>
    </Collapsible>
  )
}

function MobileActivityRow({
  activity,
  adjustment,
  budgetColor,
  budgetsById,
  currency,
  exclusionPending,
  periods,
  onDeleted,
  onExclusionPendingChange,
}: ActivityRowProps) {
  const [open, setOpen] = useState(false)
  const hasChildren = Boolean(activity.children?.length)
  const excluded = Boolean(activity.excludedFromProjection)
  const budgetTextClassName =
    !excluded && budgetColor ? themeColorClasses[budgetColor].text : undefined
  const excludedClassName = excluded
    ? "text-muted-foreground line-through"
    : undefined

  return (
    <li className="py-4">
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-2">
            {hasChildren ? (
              <StatementDisclosure
                label={activity.label}
                open={open}
                childCount={activity.children?.length ?? 0}
              />
            ) : null}
            <div className="min-w-0">
              <p
                className={cn(
                  "truncate text-sm font-bold",
                  budgetTextClassName,
                  excludedClassName,
                )}
              >
                {activity.label}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                {sourceLabel(activity, adjustment)}
                {isExcludableActivity(activity) ? " · Projected" : ""}
                {activity.effectiveDate
                  ? ` · ${formatDisplayDate(activity.effectiveDate)}`
                  : ""}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span
              className={cn(
                "pt-2 text-sm font-bold tabular-nums",
                excludedClassName ??
                  budgetTextClassName ??
                  (activity.amountCents > 0 ? "text-accent" : undefined),
              )}
            >
              <MoneyAmount
                amount={activity.amountCents / 100}
                currency={currency}
                variant="signed"
              />
            </span>
            {adjustment ? (
              <ForecastActivityActions
                activity={activity}
                adjustment={adjustment}
                periods={periods}
                pending={exclusionPending}
                onDeleted={onDeleted}
                onPendingChange={onExclusionPendingChange}
              />
            ) : isExcludableActivity(activity) ? (
              <ForecastExclusionAction
                activity={activity}
                budgetsById={budgetsById}
                pending={exclusionPending}
                onPendingChange={onExclusionPendingChange}
              />
            ) : null}
          </div>
        </div>
        {hasChildren ? (
          <CollapsibleContent>
            <StatementChildren
              currency={currency}
              items={activity.children ?? []}
              className="mt-3 ml-10"
            />
          </CollapsibleContent>
        ) : null}
      </Collapsible>
    </li>
  )
}

interface ActivityRowProps {
  activity: CashForecastActivity
  adjustment?: CashForecastAdjustmentRecord
  budgetColor?: ThemeColor
  budgetsById: Map<string, { id: string; category_id: string }>
  currency: CurrencyCode
  exclusionPending: boolean
  periods: string[]
  onDeleted: () => void
  onExclusionPendingChange: (activityKey: string, pending: boolean) => void
}

function StatementDisclosure({
  label,
  open,
  childCount,
}: {
  label: string
  open: boolean
  childCount: number
}) {
  return (
    <CollapsibleTrigger asChild>
      <Button
        variant="ghost"
        size="icon-lg"
        className="-my-2 -ml-2 size-11"
        aria-label={`${open ? "Collapse" : "Expand"} ${label}, ${childCount} statement details`}
      >
        <CaretDownIcon
          weight="fill"
          className={cn(
            "size-4 transition-transform motion-reduce:transition-none",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </Button>
    </CollapsibleTrigger>
  )
}

function StatementChildren({
  currency,
  items,
  className,
}: {
  currency: CurrencyCode
  items: CashForecastActivityChild[]
  className?: string
}) {
  return (
    <ul className={cn("divide-muted-foreground/10 divide-y py-2", className)}>
      {items.map((child) => (
        <li
          key={child.key}
          className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
        >
          <div className="min-w-0">
            <p className="truncate font-semibold">{child.label}</p>
            <p className="text-muted-foreground text-xs">
              {childSourceLabels[child.sourceType]}
              {child.effectiveDate
                ? ` · ${formatDisplayDate(child.effectiveDate)}`
                : ""}
            </p>
          </div>
          <span className="shrink-0 font-semibold tabular-nums">
            <MoneyAmount
              amount={child.amountCents / 100}
              currency={currency}
              variant="signed"
            />
          </span>
        </li>
      ))}
    </ul>
  )
}

function ForecastActivityActions({
  activity,
  adjustment,
  periods,
  pending,
  onDeleted,
  onPendingChange,
}: {
  activity: CashForecastActivity
  adjustment: CashForecastAdjustmentRecord
  periods: string[]
  pending: boolean
  onDeleted: () => void
  onPendingChange: (activityKey: string, pending: boolean) => void
}) {
  const { actions } = useFinance()
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const excluded = Boolean(activity.excludedFromProjection)
  const identity = getExclusionIdentity(activity, new Map())

  return (
    <>
      <ItemActions
        ariaLabel={`More options for ${adjustment.name}`}
        disabled={pending}
      >
        <DropdownMenuItem onSelect={() => setIsEditOpen(true)}>
          Edit Forecast Item
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          onSelect={() => setIsDeleteOpen(true)}
        >
          Delete Forecast Item
        </DropdownMenuItem>
        {identity ? (
          <DropdownMenuItem
            onSelect={() => {
              void (async () => {
                onPendingChange(activity.key, true)
                await actions.setCashForecastExclusion({
                  sourceType: identity.sourceType,
                  sourceKey: identity.sourceKey,
                  period: activity.period,
                  excluded: !excluded,
                })
                onPendingChange(activity.key, false)
              })()
            }}
          >
            {excluded ? "Include" : "Exclude"}
          </DropdownMenuItem>
        ) : null}
      </ItemActions>
      <EditForecastItemDialog
        adjustment={adjustment}
        periods={periods}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
      />
      <DeleteForecastItemDialog
        adjustment={adjustment}
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onDeleted={onDeleted}
      />
    </>
  )
}

function ForecastExclusionAction({
  activity,
  budgetsById,
  pending,
  onPendingChange,
}: {
  activity: CashForecastActivity
  budgetsById: Map<string, { id: string; category_id: string }>
  pending: boolean
  onPendingChange: (activityKey: string, pending: boolean) => void
}) {
  const { actions } = useFinance()
  const identity = getExclusionIdentity(activity, budgetsById)
  const excluded = Boolean(activity.excludedFromProjection)

  if (!identity) {
    return <span className="text-muted-foreground text-xs">Read-only</span>
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="text-muted-foreground h-8 px-2 text-xs"
      disabled={pending}
      onClick={async () => {
        onPendingChange(activity.key, true)
        await actions.setCashForecastExclusion({
          sourceType: identity.sourceType,
          sourceKey: identity.sourceKey,
          period: activity.period,
          excluded: !excluded,
        })
        onPendingChange(activity.key, false)
      }}
    >
      {excluded ? "Include" : "Exclude"}
    </Button>
  )
}

function sourceLabel(
  activity: CashForecastActivity,
  adjustment?: CashForecastAdjustmentRecord,
) {
  const statusLabel = activity.status === "actual" ? "Actual" : "Pending"

  if (adjustment?.recurrence === "monthly") {
    return `${statusLabel} · ${activitySourceLabels[activity.sourceType]} · Monthly`
  }

  return `${statusLabel} · ${activitySourceLabels[activity.sourceType]}`
}

function isAdjustmentActivity(activity: CashForecastActivity) {
  return (
    activity.sourceType === "additional_income" ||
    activity.sourceType === "planned_outflow"
  )
}

function isExcludableActivity(activity: CashForecastActivity) {
  return (
    activity.sourceType === "budget_projection" ||
    activity.sourceType === "default_income" ||
    activity.sourceType === "recurring_bill"
  )
}

function getExclusionIdentity(
  activity: CashForecastActivity,
  budgetsById: Map<string, { id: string; category_id: string }>,
): { sourceType: CashForecastExclusionSourceType; sourceKey: string } | null {
  if (activity.sourceType === "default_income") {
    return { sourceType: "default_income", sourceKey: "default_income" }
  }

  if (activity.sourceType === "recurring_bill") {
    if (!activity.sourceId) {
      return null
    }

    return { sourceType: "recurring_bill", sourceKey: activity.sourceId }
  }

  if (activity.sourceType === "budget_projection") {
    if (!activity.sourceId) {
      return null
    }

    const categoryId = budgetsById.get(activity.sourceId)?.category_id
    if (!categoryId) {
      return null
    }

    return { sourceType: "budget_projection", sourceKey: categoryId }
  }

  if (
    activity.sourceType === "additional_income" ||
    activity.sourceType === "planned_outflow"
  ) {
    if (!activity.sourceId) {
      return null
    }

    return { sourceType: activity.sourceType, sourceKey: activity.sourceId }
  }

  return null
}

function getBudgetProjectionColor(
  activity: CashForecastActivity,
  budgetColorsById: Record<string, ThemeColor>,
): ThemeColor | undefined {
  if (activity.sourceType !== "budget_projection" || !activity.sourceId) {
    return undefined
  }

  return budgetColorsById[activity.sourceId]
}
