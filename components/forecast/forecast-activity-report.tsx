"use client"

import { useState } from "react"
import { ChevronDown, CreditCard } from "lucide-react"

import { ItemActions } from "@/components/actions"
import { DeleteForecastItemDialog } from "@/components/forecast/delete-forecast-item-dialog"
import { EditForecastItemDialog } from "@/components/forecast/forecast-item-dialog"
import { getForecastActivityPagination } from "@/components/forecast/forecast-ui-state"
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
import {
  formatCurrency,
  formatDisplayDate,
  formatSignedAmount,
} from "@/lib/format"
import type {
  CashForecastActivity,
  CashForecastActivityChild,
  CashForecastMonth,
} from "@/lib/finance/cash-forecast"
import type {
  CashForecastAdjustmentRecord,
  CurrencyCode,
} from "@/lib/finance/types"
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
  currency: CurrencyCode
  month: CashForecastMonth
  periods: string[]
}

export function ForecastActivityReport({
  adjustments,
  currency,
  month,
  periods,
}: ForecastActivityReportProps) {
  const [currentPage, setCurrentPage] = useState(1)
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
              value={formatCurrency(month.totalIncomeCents / 100, {
                currency,
                forceDecimals: true,
              })}
              valueClassName="text-accent"
            />
            <ActivityTotal
              label="Total Outflows"
              value={formatCurrency(month.totalOutflowsCents / 100, {
                currency,
                forceDecimals: true,
              })}
            />
            <ActivityTotal
              label="Monthly Change"
              value={formatSignedAmount(month.monthlyChangeCents / 100, {
                currency,
              })}
              valueClassName={
                month.monthlyChangeCents > 0 ? "text-accent" : undefined
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
                  currency={currency}
                  periods={periods}
                  onDeleted={handleRowDeleted}
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
                    currency={currency}
                    periods={periods}
                    onDeleted={handleRowDeleted}
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
  value: string
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
  currency,
  periods,
  onDeleted,
}: ActivityRowProps) {
  const [open, setOpen] = useState(false)
  const hasChildren = Boolean(activity.children?.length)

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
              <span className="font-bold">{activity.label}</span>
            </div>
          </TableCell>
          <TableCell className="text-muted-foreground">
            <span className="flex items-center gap-2">
              {activity.sourceType === "credit_card_statement" ? (
                <CreditCard className="size-4" aria-hidden />
              ) : null}
              {sourceLabel(activity, adjustment)}
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
              activity.amountCents > 0 && "text-accent",
            )}
          >
            {formatSignedAmount(activity.amountCents / 100, { currency })}
          </TableCell>
          <TableCell className="text-right">
            {adjustment ? (
              <ForecastActivityActions
                adjustment={adjustment}
                periods={periods}
                onDeleted={onDeleted}
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
                  items={activity.children ?? []}
                  currency={currency}
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
  currency,
  periods,
  onDeleted,
}: ActivityRowProps) {
  const [open, setOpen] = useState(false)
  const hasChildren = Boolean(activity.children?.length)

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
              <p className="truncate text-sm font-bold">{activity.label}</p>
              <p className="text-muted-foreground mt-1 text-xs">
                {sourceLabel(activity, adjustment)}
                {activity.effectiveDate
                  ? ` · ${formatDisplayDate(activity.effectiveDate)}`
                  : ""}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-start gap-1">
            <span
              className={cn(
                "pt-2 text-sm font-bold tabular-nums",
                activity.amountCents > 0 && "text-accent",
              )}
            >
              {formatSignedAmount(activity.amountCents / 100, { currency })}
            </span>
            {adjustment ? (
              <ForecastActivityActions
                adjustment={adjustment}
                periods={periods}
                onDeleted={onDeleted}
              />
            ) : null}
          </div>
        </div>
        {hasChildren ? (
          <CollapsibleContent>
            <StatementChildren
              items={activity.children ?? []}
              currency={currency}
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
  currency: CurrencyCode
  periods: string[]
  onDeleted: () => void
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
        <ChevronDown
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
  items,
  currency,
  className,
}: {
  items: CashForecastActivityChild[]
  currency: CurrencyCode
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
            {formatSignedAmount(child.amountCents / 100, { currency })}
          </span>
        </li>
      ))}
    </ul>
  )
}

function ForecastActivityActions({
  adjustment,
  periods,
  onDeleted,
}: {
  adjustment: CashForecastAdjustmentRecord
  periods: string[]
  onDeleted: () => void
}) {
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  return (
    <>
      <ItemActions ariaLabel={`More options for ${adjustment.name}`}>
        <DropdownMenuItem onSelect={() => setIsEditOpen(true)}>
          Edit Forecast Item
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          onSelect={() => setIsDeleteOpen(true)}
        >
          Delete Forecast Item
        </DropdownMenuItem>
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
