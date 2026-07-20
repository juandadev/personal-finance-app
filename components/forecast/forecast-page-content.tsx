"use client"

import { useState } from "react"
import { BankIcon, CardsIcon, WarningIcon } from "@phosphor-icons/react"

import { HeaderMenuItem, ModuleHeaderActions } from "@/components/actions"
import { EmptyDataCard } from "@/components/empty-data-card"
import { ForecastActivityReport } from "@/components/forecast/forecast-activity-report"
import { AddForecastItemDialog } from "@/components/forecast/forecast-item-dialog"
import { ForecastSummaryChart } from "@/components/forecast/forecast-summary-chart"
import { MonthlyIncomeDialog } from "@/components/forecast/monthly-income-dialog"
import { PageHeading } from "@/components/overview/page-heading"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { useCashForecast } from "@/hooks/use-cash-forecast"
import { useFinance } from "@/hooks/use-finance"
import type { CashForecastResult } from "@/lib/finance/cash-forecast"

type ReadyForecast = Extract<CashForecastResult, { status: "ready" }>

export function ForecastPageContent() {
  const { state } = useFinance()
  const report = useCashForecast()
  const [incomeDialogOpen, setIncomeDialogOpen] = useState(
    state.cashForecastSettings === null,
  )
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false)
  const readyReport = report?.status === "ready" ? report : null
  const periods = readyReport?.months.map((month) => month.period) ?? []

  return (
    <div className="mx-auto flex h-[calc(100dvh-var(--page-chrome-block))] min-h-0 w-full max-w-6xl flex-col gap-8 overflow-hidden rounded-xl">
      <PageHeading title="Cash Forecast" fixed className="shrink-0">
        <ModuleHeaderActions
          ariaLabel="More cash forecast actions"
          primaryAction={
            readyReport ? (
              <Button
                aria-label="Add Forecast Item"
                onClick={() => setAddItemDialogOpen(true)}
              >
                <span className="sm:hidden">Add Item</span>
                <span className="hidden sm:inline">Add Forecast Item</span>
              </Button>
            ) : (
              <Button disabled aria-label="Add Forecast Item">
                <span className="sm:hidden">Add Item</span>
                <span className="hidden sm:inline">Add Forecast Item</span>
              </Button>
            )
          }
          primaryMenuItem={
            readyReport ? (
              <HeaderMenuItem onSelect={() => setAddItemDialogOpen(true)}>
                Add Forecast Item
              </HeaderMenuItem>
            ) : (
              <HeaderMenuItem disabled>Add Forecast Item</HeaderMenuItem>
            )
          }
        >
          {state.cashForecastSettings ? (
            <DropdownMenuItem onSelect={() => setIncomeDialogOpen(true)}>
              Edit Monthly Income
            </DropdownMenuItem>
          ) : null}
        </ModuleHeaderActions>
      </PageHeading>

      <div className="min-h-0 flex-1 overflow-y-auto pr-2">
        {report === null ? (
          <ForecastClientLoading />
        ) : report.status === "blocked" ? (
          <ForecastBlockedState
            reason={report.reason}
            onSetIncome={() => setIncomeDialogOpen(true)}
          />
        ) : (
          <ForecastReadyContent report={report} />
        )}
      </div>

      <MonthlyIncomeDialog
        initialIncomeCents={
          state.cashForecastSettings?.default_monthly_income_cents
        }
        open={incomeDialogOpen}
        onOpenChange={setIncomeDialogOpen}
      />
      {readyReport ? (
        <AddForecastItemDialog
          periods={periods}
          open={addItemDialogOpen}
          onOpenChange={setAddItemDialogOpen}
        />
      ) : null}
    </div>
  )
}

function ForecastBlockedState({
  reason,
  onSetIncome,
}: {
  reason: Exclude<CashForecastResult, { status: "ready" }>["reason"]
  onSetIncome: () => void
}) {
  if (reason === "missing-settings") {
    return (
      <EmptyDataCard
        surface="card"
        className="min-h-96"
        icon={<CardsIcon weight="fill" className="size-5" aria-hidden />}
        title="Set Up Your Forecast"
        description="Add your usual monthly income to unlock the current month plus 12 future months. A value of $0 is valid."
        action={<Button onClick={onSetIncome}>Set Monthly Income</Button>}
      />
    )
  }

  if (reason === "missing-primary-account") {
    return (
      <EmptyDataCard
        surface="card"
        className="min-h-96"
        icon={<BankIcon weight="fill" className="size-5" aria-hidden />}
        title="Primary Account Needed"
        description="Cash Forecast needs a checking or savings account with a current balance before it can calculate your projection."
      />
    )
  }

  return (
    <EmptyDataCard
      surface="card"
      className="min-h-96"
      icon={<WarningIcon weight="fill" className="size-5" aria-hidden />}
      title="Mixed Currencies Are Not Supported"
      description="Your primary account, default currency, and recurring bills must use the same currency before Cash Forecast can combine them."
    />
  )
}

function ForecastReadyContent({ report }: { report: ReadyForecast }) {
  const { state, budgets } = useFinance()
  const [pinnedPeriod, setPinnedPeriod] = useState(
    report.months[0]?.period ?? "",
  )
  const selectedMonth =
    report.months.find((month) => month.period === pinnedPeriod) ??
    report.months[0]
  const selectedPeriod = selectedMonth?.period ?? ""
  const periods = report.months.map((month) => month.period)
  const budgetColorsById = Object.fromEntries(
    budgets.map((budget) => [budget.id, budget.color]),
  )

  if (!selectedMonth) {
    return null
  }

  return (
    <div className="space-y-6">
      <ForecastSummaryChart
        report={report}
        pinnedPeriod={selectedPeriod}
        onPinnedPeriodChange={setPinnedPeriod}
      />
      <ForecastActivityReport
        key={selectedPeriod}
        adjustments={state.cashForecastAdjustments}
        budgetColorsById={budgetColorsById}
        currency={report.currency}
        month={selectedMonth}
        periods={periods}
      />
    </div>
  )
}

function ForecastClientLoading() {
  return (
    <Card
      className="space-y-6"
      aria-label="Loading cash forecast"
      aria-busy="true"
    >
      <p className="sr-only">Loading forecast...</p>
      <div className="space-y-3">
        <Skeleton className="h-4 w-56 max-w-full" />
        <Skeleton className="h-10 w-48 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-18 rounded-lg" />
        <Skeleton className="h-18 rounded-lg" />
      </div>
      <Skeleton className="h-72 rounded-lg" />
    </Card>
  )
}
