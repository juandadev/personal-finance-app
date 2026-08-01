"use client"

import {
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react"
import { WarningIcon } from "@phosphor-icons/react"
import { useReducedMotion } from "motion/react"
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ReferenceLine,
  YAxis,
} from "recharts"

import { ForecastBudgetProjectionsPanel } from "@/components/forecast/forecast-budget-projections-panel"
import { isForecastPeriodPreviewing } from "@/components/forecast/forecast-ui-state"
import { MoneyAmount } from "@/components/money-amount"
import { Card } from "@/components/ui/card"
import { ChartContainer, type ChartConfig } from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import { useFinance } from "@/hooks/use-finance"
import {
  formatCompactCurrency,
  formatCurrency,
  formatDisplayDate,
  formatSignedAmount,
} from "@/lib/format"
import type {
  CashForecastMonth,
  CashForecastResult,
} from "@/lib/finance/cash-forecast"
import type { CurrencyCode } from "@/lib/finance/types"
import { getHiddenAmountAriaLabel } from "@/lib/finance/ui-preferences"
import { cn } from "@/lib/utils"

const chartConfig = {
  income: {
    label: "Income",
    color: "var(--color-chart-1)",
  },
  outflows: {
    label: "Outflows",
    color: "var(--color-chart-4)",
  },
  endingBalance: {
    label: "Ending Balance",
    color: "var(--color-chart-3)",
  },
} satisfies ChartConfig

type ReadyForecast = Extract<CashForecastResult, { status: "ready" }>

interface ForecastSummaryChartProps {
  report: ReadyForecast
  pinnedPeriod: string
  onPinnedPeriodChange: (period: string) => void
}

interface ForecastChartDatum {
  period: string
  shortLabel: string
  income: number
  outflows: number
  monthlyChange: number
  endingBalance: number
}

export function ForecastSummaryChart({
  report,
  pinnedPeriod,
  onPinnedPeriodChange,
}: ForecastSummaryChartProps) {
  const {
    state: {
      preferences: { hideAmounts },
    },
  } = useFinance()
  const [hoveredPeriod, setHoveredPeriod] = useState<string | null>(null)
  const [focusedPeriod, setFocusedPeriod] = useState<string | null>(null)
  const monthButtonsRef = useRef<Array<HTMLButtonElement | null>>([])
  const shouldReduceMotion = useReducedMotion()
  const previewedPeriod = hoveredPeriod ?? focusedPeriod
  const pinnedMonth = getMonth(report.months, pinnedPeriod) ?? report.months[0]
  const activeMonth =
    getMonth(report.months, previewedPeriod) ?? pinnedMonth ?? report.months[0]
  const chartData = useMemo(
    () =>
      report.months.map((month): ForecastChartDatum => ({
        period: month.period,
        shortLabel: month.label.split(" ")[0]?.slice(0, 3) ?? month.label,
        income: month.totalIncomeCents / 100,
        outflows: month.totalOutflowsCents / 100,
        monthlyChange: month.monthlyChangeCents / 100,
        endingBalance: month.endingBalanceCents / 100,
      })),
    [report.months],
  )
  const activePeriod = activeMonth?.period ?? pinnedPeriod

  const pinPeriod = (period: string) => {
    setHoveredPeriod(null)
    onPinnedPeriodChange(period)
  }

  const handleMonthKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      pinPeriod(report.months[index]?.period ?? pinnedPeriod)
      return
    }

    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
      return
    }

    event.preventDefault()
    const direction = event.key === "ArrowLeft" ? -1 : 1
    const nextIndex = Math.min(
      report.months.length - 1,
      Math.max(0, index + direction),
    )
    monthButtonsRef.current[nextIndex]?.focus()
    monthButtonsRef.current[nextIndex]?.scrollIntoView({
      behavior: shouldReduceMotion ? "auto" : "smooth",
      block: "nearest",
      inline: "center",
    })
  }

  if (!activeMonth || !pinnedMonth) {
    return null
  }

  const isNegative = activeMonth.endingBalanceCents < 0
  const isPreviewing = isForecastPeriodPreviewing(previewedPeriod, pinnedPeriod)
  const balanceLabel = activeMonth.isCurrentPeriod
    ? `Current-Month Ending Balance · ${activeMonth.label}`
    : `Projected Ending Balance · ${activeMonth.label}`

  return (
    <Card asChild>
      <section aria-labelledby="forecast-summary-title">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col-reverse gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <p
                id="forecast-summary-title"
                className="text-muted-foreground text-sm"
              >
                {balanceLabel}
              </p>
              <p
                className={cn(
                  "mt-2 flex items-center gap-2 text-3xl font-bold tracking-tight tabular-nums md:text-4xl",
                  isNegative && "text-destructive",
                )}
              >
                {isNegative ? (
                  <WarningIcon
                    weight="fill"
                    className="size-6 shrink-0"
                    aria-hidden
                  />
                ) : null}
                <MoneyAmount
                  amount={activeMonth.endingBalanceCents / 100}
                  currency={report.currency}
                  forceDecimals
                />
              </p>
              <p
                className={cn(
                  "mt-1 text-xs",
                  isNegative ? "text-destructive" : "text-muted-foreground",
                )}
              >
                {isPreviewing ? "Previewing month" : "Selected month"}
                {isNegative ? " · Negative projected balance" : ""}
              </p>
            </div>

            <dl className="grid gap-3 sm:grid-cols-2 xl:min-w-md">
              <BridgeValue
                label="Current Month Opening"
                amountCents={report.bridge.openingBalanceCents}
                value={
                  <MoneyAmount
                    amount={report.bridge.openingBalanceCents / 100}
                    currency={report.currency}
                    forceDecimals
                  />
                }
              />
              <BridgeValue
                label={`Balance on ${formatDisplayDate(report.bridge.asOfDate)}`}
                amountCents={report.bridge.startingBalanceCents}
                value={
                  <MoneyAmount
                    amount={report.bridge.startingBalanceCents / 100}
                    currency={report.currency}
                    forceDecimals
                  />
                }
              />
              <BridgeValue
                label="Pending Income This Month"
                amountCents={report.bridge.pendingAdditionalIncomeCents}
                value={
                  <MoneyAmount
                    amount={report.bridge.pendingAdditionalIncomeCents / 100}
                    currency={report.currency}
                    forceDecimals
                  />
                }
              />
              <BridgeValue
                label="Pending Outflows This Month"
                amountCents={report.bridge.pendingOutflowsCents}
                alwaysDanger
                value={
                  <MoneyAmount
                    amount={report.bridge.pendingOutflowsCents / 100}
                    currency={report.currency}
                    forceDecimals
                  />
                }
              />
            </dl>
          </div>

          <div>
            <div className="mb-4">
              <ForecastBudgetProjectionsPanel />
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
              <LegendItem className="bg-chart-1" label="Income" shape="bar" />
              <LegendItem className="bg-chart-4" label="Outflows" shape="bar" />
              <LegendItem
                className="bg-chart-3"
                label="Ending Balance"
                shape="line"
              />
            </div>

            <div
              className="overflow-x-auto pb-2"
              onPointerLeave={() => setHoveredPeriod(null)}
            >
              <div className="relative h-72 min-w-190 sm:min-w-0">
                <ChartContainer
                  config={chartConfig}
                  className="aspect-auto h-full w-full"
                  aria-label="Thirteen-month cash forecast chart"
                >
                  <ComposedChart
                    data={chartData}
                    margin={{ top: 14, right: 12, bottom: 38, left: 12 }}
                  >
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tickMargin={8}
                      width={56}
                      tick={(props) => (
                        <ForecastYAxisTick
                          {...props}
                          currency={report.currency}
                          hideAmounts={hideAmounts}
                        />
                      )}
                    />
                    <ReferenceLine y={0} stroke="var(--color-border)" />
                    <Bar
                      dataKey="income"
                      fill="var(--color-income)"
                      radius={[3, 3, 0, 0]}
                      maxBarSize={18}
                      isAnimationActive={false}
                    >
                      {chartData.map((datum) => (
                        <Cell
                          key={`income:${datum.period}`}
                          opacity={datum.period === activePeriod ? 1 : 0.4}
                        />
                      ))}
                    </Bar>
                    <Bar
                      dataKey="outflows"
                      fill="var(--color-outflows)"
                      radius={[3, 3, 0, 0]}
                      maxBarSize={18}
                      isAnimationActive={false}
                    >
                      {chartData.map((datum) => (
                        <Cell
                          key={`outflow:${datum.period}`}
                          opacity={datum.period === activePeriod ? 1 : 0.4}
                        />
                      ))}
                    </Bar>
                    <Line
                      type="monotone"
                      dataKey="endingBalance"
                      stroke="var(--color-endingBalance)"
                      strokeWidth={2}
                      dot={({ key, ...props }) => (
                        <ForecastBalanceDot
                          key={key}
                          {...props}
                          activePeriod={activePeriod}
                        />
                      )}
                      activeDot={false}
                      isAnimationActive={false}
                    />
                  </ComposedChart>
                </ChartContainer>

                <div
                  className="pointer-events-none absolute inset-[0_12px_0_68px] grid"
                  style={{
                    gridTemplateColumns: `repeat(${report.months.length}, minmax(0, 1fr))`,
                  }}
                >
                  {report.months.map((month, index) => {
                    const datum = chartData[index]
                    const active = month.period === activePeriod

                    return (
                      <button
                        key={month.period}
                        ref={(node) => {
                          monthButtonsRef.current[index] = node
                        }}
                        type="button"
                        className={cn(
                          "focus-visible:ring-ring/50 pointer-events-auto relative flex min-w-11 items-end justify-center rounded-sm pb-1 text-xs transition-opacity outline-none focus-visible:ring-3 focus-visible:ring-inset motion-reduce:transition-none",
                          active
                            ? "text-foreground opacity-100"
                            : "text-muted-foreground opacity-55",
                        )}
                        aria-label={monthAriaLabel(
                          month,
                          report.currency,
                          hideAmounts,
                        )}
                        aria-pressed={month.period === pinnedPeriod}
                        onMouseEnter={() => setHoveredPeriod(month.period)}
                        onFocus={() => setFocusedPeriod(month.period)}
                        onBlur={() => setFocusedPeriod(null)}
                        onClick={() => pinPeriod(month.period)}
                        onKeyDown={(event) => handleMonthKeyDown(event, index)}
                      >
                        <span className="flex items-center gap-1">
                          {datum?.shortLabel}
                          {month.endingBalanceCents < 0 ? (
                            <WarningIcon
                              weight="fill"
                              className="text-destructive size-3"
                              aria-hidden
                            />
                          ) : null}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
            <p className="text-muted-foreground mt-2 text-xs sm:hidden">
              Scroll to see all 13 months. Tap a month to select it.
            </p>
          </div>
        </div>
      </section>
    </Card>
  )
}

function BridgeValue({
  label,
  value,
  amountCents,
  alwaysDanger = false,
}: {
  label: string
  value: ReactNode
  amountCents: number
  alwaysDanger?: boolean
}) {
  const isDanger = alwaysDanger || amountCents < 0

  return (
    <div className="bg-background rounded-lg p-4">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd
        className={cn(
          "mt-1 font-bold tabular-nums",
          isDanger && "text-destructive",
        )}
      >
        {value}
      </dd>
    </div>
  )
}

function LegendItem({
  className,
  label,
  shape,
}: {
  className: string
  label: string
  shape: "bar" | "line"
}) {
  return (
    <span className="text-muted-foreground flex items-center gap-2">
      <span
        className={cn(
          className,
          shape === "bar" ? "size-2.5 rounded-sm" : "h-0.5 w-4",
        )}
        aria-hidden
      />
      {label}
    </span>
  )
}

function ForecastBalanceDot({
  cx,
  cy,
  payload,
  activePeriod,
}: {
  cx?: number
  cy?: number
  payload?: ForecastChartDatum
  activePeriod: string
}) {
  if (cx === undefined || cy === undefined || !payload) {
    return null
  }

  const negative = payload.endingBalance < 0
  const active = payload.period === activePeriod

  return (
    <circle
      cx={cx}
      cy={cy}
      r={active ? 5 : 3.5}
      fill={
        negative ? "var(--color-destructive)" : "var(--color-endingBalance)"
      }
      stroke="var(--color-card)"
      strokeWidth={2}
      opacity={active ? 1 : 0.45}
    />
  )
}

function getMonth(months: CashForecastMonth[], period: string | null) {
  return months.find((month) => month.period === period)
}

function ForecastYAxisTick({
  x,
  y,
  payload,
  currency,
  hideAmounts,
}: {
  x?: number
  y?: number
  payload?: { value?: number }
  currency: CurrencyCode
  hideAmounts: boolean
}) {
  const tickX = x ?? 0
  const tickY = y ?? 0
  const value = payload?.value ?? 0

  if (hideAmounts) {
    return (
      <g transform={`translate(${tickX},${tickY})`}>
        <foreignObject x={-52} y={-8} width={48} height={16}>
          <Skeleton animate={false} className="h-4 w-full" />
        </foreignObject>
      </g>
    )
  }

  return (
    <text
      x={tickX}
      y={tickY}
      dy={4}
      textAnchor="end"
      className="fill-muted-foreground text-[11px]"
    >
      {formatCompactCurrency(value, { currency })}
    </text>
  )
}

function monthAriaLabel(
  month: CashForecastMonth,
  currency: ReadyForecast["currency"],
  hideAmounts: boolean,
) {
  if (hideAmounts) {
    return [month.label, getHiddenAmountAriaLabel()].join(", ")
  }

  const options = { currency } as const

  return [
    month.label,
    `income ${formatCurrency(month.totalIncomeCents / 100, options)}`,
    `outflows ${formatCurrency(month.totalOutflowsCents / 100, options)}`,
    `monthly change ${formatSignedAmount(month.monthlyChangeCents / 100, options)}`,
    `ending balance ${formatCurrency(month.endingBalanceCents / 100, options)}`,
  ].join(", ")
}
