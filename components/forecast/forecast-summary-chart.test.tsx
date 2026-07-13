import { afterEach, describe, expect, mock, test } from "bun:test"
import { Fragment, useState, type ReactNode } from "react"
import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import type {
  CashForecastMonth,
  CashForecastResult,
} from "@/lib/finance/cash-forecast"

function RechartsStub({ children }: { children?: ReactNode }) {
  return <Fragment>{children}</Fragment>
}

mock.module("recharts", () => ({
  Bar: RechartsStub,
  CartesianGrid: RechartsStub,
  Cell: RechartsStub,
  ComposedChart: RechartsStub,
  Legend: RechartsStub,
  Line: RechartsStub,
  ReferenceLine: RechartsStub,
  ResponsiveContainer: RechartsStub,
  Tooltip: RechartsStub,
  YAxis: RechartsStub,
}))

const { ForecastSummaryChart } =
  await import("@/components/forecast/forecast-summary-chart")

type ReadyForecast = Extract<CashForecastResult, { status: "ready" }>

const months = [
  makeMonth("2026-08", "August 2026", 100_000, true),
  makeMonth("2026-09", "September 2026", 150_050),
  makeMonth("2026-10", "October 2026", -20_000),
]

const report: ReadyForecast = {
  status: "ready",
  currency: "USD",
  primaryAccountId: "account-1",
  bridge: {
    period: "2026-07",
    asOfDate: "2026-07-12",
    startingBalanceCents: 200_000,
    actualIncomeCents: 60_000,
    actualOutflowCents: 10_000,
    actualNetMovementCents: 50_000,
    directBillObligationsCents: 30_000,
    creditCardObligationsCents: 20_000,
    remainingObligationsCents: 50_000,
    pendingAdditionalIncomeCents: 5_000,
    pendingPlannedOutflowCents: 10_000,
    pendingOutflowsCents: 60_000,
    openingBalanceCents: 150_000,
    activities: [],
  },
  months,
}

afterEach(cleanup)

describe("ForecastSummaryChart", () => {
  test("previews transient months and pins months by click or keyboard", async () => {
    const user = userEvent.setup()

    function SummaryHarness() {
      const [pinnedPeriod, setPinnedPeriod] = useState(months[0]!.period)

      return (
        <ForecastSummaryChart
          report={report}
          pinnedPeriod={pinnedPeriod}
          onPinnedPeriodChange={setPinnedPeriod}
        />
      )
    }

    render(<SummaryHarness />)

    const august = screen.getByRole("button", {
      name: /August 2026, income/,
    })
    const september = screen.getByRole("button", {
      name: /September 2026, income/,
    })
    const october = screen.getByRole("button", {
      name: /October 2026, income/,
    })

    expect(screen.getByText("$1,000.00")).toBeTruthy()
    expect(august.getAttribute("aria-pressed")).toBe("true")

    await user.hover(september)

    expect(screen.getByText("$1,500.50")).toBeTruthy()
    expect(screen.getByText("Previewing month")).toBeTruthy()
    expect(august.getAttribute("aria-pressed")).toBe("true")
    expect(september.getAttribute("aria-pressed")).toBe("false")

    await user.unhover(september)

    expect(screen.getByText("$1,000.00")).toBeTruthy()
    expect(screen.getByText("Selected month")).toBeTruthy()

    await user.click(september)

    expect(screen.getByText("$1,500.50")).toBeTruthy()
    expect(september.getAttribute("aria-pressed")).toBe("true")

    await user.keyboard("{ArrowRight}")

    expect(document.activeElement).toBe(october)
    expect(screen.getByText("-$200.00")).toBeTruthy()
    expect(screen.getByText(/Previewing month/)).toBeTruthy()
    expect(september.getAttribute("aria-pressed")).toBe("true")

    await user.keyboard("{Enter}")

    expect(october.getAttribute("aria-pressed")).toBe("true")
    expect(screen.getByText(/Selected month/)).toBeTruthy()
  })

  test("renders all 13 month controls with the current month selected", () => {
    const thirteenMonths = [
      ["2026-07", "July 2026"],
      ["2026-08", "August 2026"],
      ["2026-09", "September 2026"],
      ["2026-10", "October 2026"],
      ["2026-11", "November 2026"],
      ["2026-12", "December 2026"],
      ["2027-01", "January 2027"],
      ["2027-02", "February 2027"],
      ["2027-03", "March 2027"],
      ["2027-04", "April 2027"],
      ["2027-05", "May 2027"],
      ["2027-06", "June 2027"],
      ["2027-07", "July 2027"],
    ].map(([period, label], index) =>
      makeMonth(period!, label!, 100_000 + index * 1_000, index === 0),
    )

    render(
      <ForecastSummaryChart
        report={{ ...report, months: thirteenMonths }}
        pinnedPeriod={thirteenMonths[0]!.period}
        onPinnedPeriodChange={() => undefined}
      />,
    )

    expect(
      screen.getByLabelText("Thirteen-month cash forecast chart"),
    ).toBeTruthy()
    const controls = screen.getAllByRole("button", { name: /income/ })

    expect(controls).toHaveLength(13)
    expect(controls[0]?.getAttribute("aria-pressed")).toBe("true")
  })
})

function makeMonth(
  period: string,
  label: string,
  endingBalanceCents: number,
  isCurrentPeriod = false,
): CashForecastMonth {
  return {
    period,
    label,
    isCurrentPeriod,
    openingBalanceCents: 50_000,
    actualIncomeCents: isCurrentPeriod ? 25_000 : 0,
    actualOutflowCents: isCurrentPeriod ? 5_000 : 0,
    defaultIncomeCents: 75_000,
    additionalIncomeCents: 0,
    directBillOutflowCents: 15_000,
    creditCardOutflowCents: 5_000,
    plannedOutflowCents: 5_000,
    totalIncomeCents: 75_000,
    totalOutflowsCents: 25_000,
    monthlyChangeCents: 50_000,
    endingBalanceCents,
    activities: [],
  }
}
