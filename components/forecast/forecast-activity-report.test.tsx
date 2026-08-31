import { afterEach, describe, expect, mock, test } from "bun:test"
import { createContext, useContext, type ReactNode } from "react"
import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import type {
  CashForecastActivity,
  CashForecastMonth,
} from "@/lib/finance/cash-forecast"

const setCashForecastExclusion = mock(() =>
  Promise.resolve({
    ok: true as const,
    message: "Excluded from this month’s projection.",
  }),
)

mock.module("@/hooks/use-finance", () => ({
  useFinance: () => ({
    state: {
      preferences: {
        user_id: "user-1",
        hideAmounts: false,
        default_currency: "USD",
      },
      budgets: [
        {
          id: "budget-1",
          category_id: "11111111-1111-4111-8111-111111111111",
        },
      ],
    },
    actions: {
      setCashForecastExclusion,
    },
  }),
}))

mock.module("@/components/forecast/delete-forecast-item-dialog", () => ({
  DeleteForecastItemDialog: () => null,
}))
mock.module("@/components/forecast/forecast-item-dialog", () => ({
  EditForecastItemDialog: () => null,
}))
mock.module("@/components/actions", () => ({
  HeaderMenuItem: ({ children }: { children: ReactNode }) => <>{children}</>,
  ItemActions: ({
    ariaLabel,
    children,
    disabled,
  }: {
    ariaLabel: string
    children: ReactNode
    disabled?: boolean
  }) => (
    <div data-disabled={disabled ? "true" : "false"}>
      <button type="button" aria-label={ariaLabel} disabled={disabled}>
        More
      </button>
      {children}
    </div>
  ),
  ModuleHeaderActions: ({ children }: { children?: ReactNode }) => (
    <>{children}</>
  ),
}))
mock.module("@/components/ui/dropdown-menu", () => ({
  DropdownMenuItem: ({
    children,
    onSelect,
  }: {
    children: ReactNode
    onSelect?: () => void
  }) => (
    <button type="button" onClick={() => onSelect?.()}>
      {children}
    </button>
  ),
}))

interface CollapsibleState {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const CollapsibleContext = createContext<CollapsibleState | null>(null)

mock.module("@/components/ui/collapsible", () => ({
  Collapsible: ({
    children,
    onOpenChange,
    open = false,
  }: {
    children: ReactNode
    onOpenChange: (open: boolean) => void
    open?: boolean
  }) => (
    <CollapsibleContext.Provider value={{ open, onOpenChange }}>
      {children}
    </CollapsibleContext.Provider>
  ),
  CollapsibleContent: ({ children }: { children: ReactNode }) => {
    const collapsible = useContext(CollapsibleContext)

    return collapsible?.open ? children : null
  },
  CollapsibleTrigger: ({ children }: { children: ReactNode }) => {
    const collapsible = useContext(CollapsibleContext)

    return (
      <span
        onClick={() => collapsible?.onOpenChange(!collapsible.open)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            collapsible?.onOpenChange(!collapsible.open)
          }
        }}
      >
        {children}
      </span>
    )
  },
}))

const { ForecastActivityReport } =
  await import("@/components/forecast/forecast-activity-report")

afterEach(cleanup)

describe("ForecastActivityReport", () => {
  test("renders the explicit empty state for a month without activities", () => {
    render(
      <ForecastActivityReport
        adjustments={[]}
        currency="USD"
        month={makeMonth([])}
        periods={["2026-08"]}
      />,
    )

    expect(
      screen.getByRole("region", { name: "August 2026 Activity" }),
    ).toBeTruthy()
    expect(screen.getByText("0 items")).toBeTruthy()
    expect(
      screen.queryAllByText("No projected activity").length,
    ).toBeGreaterThan(0)
  })

  test("renders current-month empty copy for actual and pending activity", () => {
    render(
      <ForecastActivityReport
        adjustments={[]}
        currency="USD"
        month={makeMonth([], true)}
        periods={["2026-08"]}
      />,
    )

    expect(
      screen.queryAllByText("No actual cash activity or pending items").length,
    ).toBeGreaterThan(0)
    expect(
      screen.getByText(
        "Posted bank movements already in today’s balance, plus pending items still left this month.",
      ),
    ).toBeTruthy()
  })

  test("expands statement details while paginating by parent activities", async () => {
    const user = userEvent.setup()
    const statement: CashForecastActivity = {
      key: "credit-card-payment:travel-card",
      sourceType: "credit_card_statement",
      label: "Travel Card Statement",
      period: "2026-08",
      amountCents: -45_000,
      effectiveDate: "2026-08-18",
      status: "pending",
      children: [
        {
          key: "statement-child:flight",
          sourceType: "credit_card_charge",
          label: "Flight",
          amountCents: -30_000,
          effectiveDate: "2026-07-08",
        },
        {
          key: "statement-child:hotel",
          sourceType: "statement_remainder",
          label: "Other Statement Balance",
          amountCents: -15_000,
        },
      ],
    }
    const parentActivities = Array.from(
      { length: 10 },
      (_, index): CashForecastActivity => ({
        key: `parent:${index + 2}`,
        sourceType: "default_income",
        label: `Parent activity ${index + 2}`,
        period: "2026-08",
        amountCents: 10_000,
        status: "pending",
      }),
    )

    render(
      <ForecastActivityReport
        adjustments={[]}
        currency="USD"
        month={makeMonth([statement, ...parentActivities])}
        periods={["2026-08"]}
      />,
    )

    expect(screen.queryByText("Flight")).toBeNull()
    expect(screen.queryAllByText("Parent activity 10").length).toBeGreaterThan(
      0,
    )
    expect(screen.queryByText("Parent activity 11")).toBeNull()
    expect(screen.getByRole("link", { name: "Go to page 2" })).toBeTruthy()
    expect(screen.queryByRole("link", { name: "Go to page 3" })).toBeNull()

    const statementDisclosures = screen.getAllByRole("button", {
      name: "Expand Travel Card Statement, 2 statement details",
    })

    await user.click(statementDisclosures[0]!)

    expect(screen.getByText("Flight")).toBeTruthy()
    expect(screen.getByText("Other Statement Balance")).toBeTruthy()

    await user.click(screen.getByRole("link", { name: "Go to page 2" }))

    expect(screen.queryByText("Travel Card Statement")).toBeNull()
    expect(screen.queryAllByText("Parent activity 11").length).toBeGreaterThan(
      0,
    )
  })

  test("styles monthly change with destructive text when negative", () => {
    render(
      <ForecastActivityReport
        adjustments={[]}
        currency="USD"
        month={{
          ...makeMonth([]),
          monthlyChangeCents: -25_000,
        }}
        periods={["2026-08"]}
      />,
    )

    expect(
      activityTotal("Monthly Change")?.className.includes("text-destructive"),
    ).toBe(true)
  })

  test("labels current-month actual and pending sources clearly", () => {
    render(
      <ForecastActivityReport
        adjustments={[]}
        currency="USD"
        month={makeMonth(
          [
            {
              key: "cash-transaction:salary",
              sourceType: "cash_transaction",
              sourceId: "salary",
              label: "Salary",
              period: "2026-08",
              amountCents: 100_000,
              effectiveDate: "2026-08-05",
              status: "actual",
            },
            {
              key: "recurring-bill:rent:2026-08-20",
              sourceType: "recurring_bill",
              sourceId: "rent",
              label: "Rent",
              period: "2026-08",
              amountCents: -40_000,
              effectiveDate: "2026-08-20",
              status: "pending",
            },
          ],
          true,
        )}
        periods={["2026-08"]}
      />,
    )

    expect(
      screen.queryAllByText("Actual · Cash transaction").length,
    ).toBeGreaterThan(0)
    expect(
      screen.queryAllByText("Pending · Recurring bill").length,
    ).toBeGreaterThan(0)
    expect(
      screen.getByText(
        "Posted bank movements already in today’s balance, plus pending items still left this month.",
      ),
    ).toBeTruthy()
  })
})

function makeMonth(
  activities: CashForecastActivity[],
  isCurrentPeriod = false,
): CashForecastMonth {
  return {
    period: "2026-08",
    label: "August 2026",
    isCurrentPeriod,
    openingBalanceCents: 100_000,
    actualIncomeCents: 0,
    actualOutflowCents: 0,
    defaultIncomeCents: 100_000,
    additionalIncomeCents: 0,
    directBillOutflowCents: 0,
    creditCardOutflowCents: 45_000,
    plannedOutflowCents: 0,
    budgetProjectionOutflowCents: 0,
    totalIncomeCents: 100_000,
    totalOutflowsCents: 45_000,
    monthlyChangeCents: 55_000,
    endingBalanceCents: 155_000,
    activities,
  }
}

function activityTotal(label: string) {
  const term = screen.getByText(label)
  return term.parentElement?.querySelector("dd")
}

describe("ForecastActivityReport budget projection source", () => {
  test("labels budget projection rows", () => {
    render(
      <ForecastActivityReport
        adjustments={[]}
        budgetColorsById={{ "budget-1": "finance-purple" }}
        currency="USD"
        month={makeMonth([
          {
            key: "budget-projection:1",
            sourceType: "budget_projection",
            sourceId: "budget-1",
            label: "Groceries",
            period: "2026-08",
            amountCents: -88_600,
            status: "pending",
          },
        ])}
        periods={["2026-07", "2026-08"]}
      />,
    )

    expect(
      screen.getAllByText("Pending · Budget projection").length,
    ).toBeGreaterThan(0)
    expect(screen.getAllByText("Projected").length).toBeGreaterThan(0)
    expect(
      screen
        .getAllByText("Groceries")[0]
        ?.className.includes("text-finance-purple"),
    ).toBe(true)
    expect(
      screen
        .getAllByText("-$886.00")[0]
        ?.parentElement?.className.includes("text-finance-purple"),
    ).toBe(true)
  })
})

describe("ForecastActivityReport month exclusions", () => {
  test("shows Exclude for excludable rows and Read-only for cash and cards", () => {
    render(
      <ForecastActivityReport
        adjustments={[]}
        currency="USD"
        month={makeMonth([
          {
            key: "default-income:2026-08",
            sourceType: "default_income",
            label: "Default Monthly Income",
            period: "2026-08",
            amountCents: 200_000,
            status: "pending",
          },
          {
            key: "cash-transaction:salary",
            sourceType: "cash_transaction",
            sourceId: "salary",
            label: "Salary",
            period: "2026-08",
            amountCents: 100_000,
            effectiveDate: "2026-08-05",
            status: "actual",
          },
          {
            key: "credit-card-payment:travel-card",
            sourceType: "credit_card_statement",
            label: "Travel Card Statement",
            period: "2026-08",
            amountCents: -45_000,
            effectiveDate: "2026-08-18",
            status: "pending",
          },
        ])}
        periods={["2026-08"]}
      />,
    )

    expect(
      screen.getAllByRole("button", { name: "Exclude" }).length,
    ).toBeGreaterThan(0)
    expect(screen.getAllByText("Read-only").length).toBeGreaterThan(0)
    expect(screen.queryByRole("button", { name: "Include" })).toBeNull()
  })

  test("mutes and strikes excluded rows and offers Include", () => {
    render(
      <ForecastActivityReport
        adjustments={[]}
        currency="USD"
        month={makeMonth([
          {
            key: "default-income:2026-08",
            sourceType: "default_income",
            label: "Default Monthly Income",
            period: "2026-08",
            amountCents: 200_000,
            status: "pending",
            excludedFromProjection: true,
          },
        ])}
        periods={["2026-08"]}
      />,
    )

    expect(
      screen.getAllByRole("button", { name: "Include" }).length,
    ).toBeGreaterThan(0)
    expect(
      screen
        .getAllByText("Default Monthly Income")[0]
        ?.className.includes("line-through"),
    ).toBe(true)
    const amountNode =
      screen.queryAllByText("+$2,000.00")[0] ?? screen.queryAllByText("+$2K")[0]
    expect(amountNode?.parentElement?.className.includes("line-through")).toBe(
      true,
    )
  })

  test("calls setCashForecastExclusion when Exclude is pressed", async () => {
    const user = userEvent.setup()
    setCashForecastExclusion.mockClear()

    render(
      <ForecastActivityReport
        adjustments={[]}
        currency="USD"
        month={makeMonth([
          {
            key: "default-income:2026-08",
            sourceType: "default_income",
            label: "Default Monthly Income",
            period: "2026-08",
            amountCents: 200_000,
            status: "pending",
          },
        ])}
        periods={["2026-08"]}
      />,
    )

    await user.click(screen.getAllByRole("button", { name: "Exclude" })[0]!)

    expect(setCashForecastExclusion).toHaveBeenCalledWith({
      sourceType: "default_income",
      sourceKey: "default_income",
      period: "2026-08",
      excluded: true,
    })
  })

  test("shows Exclude in the adjustment overflow menu", () => {
    const adjustmentId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"

    render(
      <ForecastActivityReport
        adjustments={[
          {
            id: adjustmentId,
            user_id: "user-1",
            kind: "planned_outflow",
            name: "Insurance",
            amount_cents: 15_000,
            start_period: "2026-08",
            recurrence: "monthly",
            created_at: "2026-07-01T00:00:00.000Z",
            updated_at: "2026-07-01T00:00:00.000Z",
          },
        ]}
        currency="USD"
        month={makeMonth([
          {
            key: `forecast-adjustment:${adjustmentId}:2026-08`,
            sourceType: "planned_outflow",
            sourceId: adjustmentId,
            label: "Insurance",
            period: "2026-08",
            amountCents: -15_000,
            status: "pending",
          },
        ])}
        periods={["2026-08"]}
      />,
    )

    expect(
      screen.getAllByRole("button", { name: "More options for Insurance" })
        .length,
    ).toBeGreaterThan(0)
    expect(
      screen.getAllByRole("button", { name: "Exclude" }).length,
    ).toBeGreaterThan(0)
    expect(
      screen.getAllByRole("button", { name: "Edit Forecast Item" }).length,
    ).toBeGreaterThan(0)
    expect(
      screen.getAllByRole("button", { name: "Delete Forecast Item" }).length,
    ).toBeGreaterThan(0)
  })

  test("mutes excluded adjustment rows and offers Include in the menu", () => {
    const adjustmentId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd"

    render(
      <ForecastActivityReport
        adjustments={[
          {
            id: adjustmentId,
            user_id: "user-1",
            kind: "additional_income",
            name: "Bonus",
            amount_cents: 25_000,
            start_period: "2026-08",
            recurrence: "once",
            created_at: "2026-07-01T00:00:00.000Z",
            updated_at: "2026-07-01T00:00:00.000Z",
          },
        ]}
        currency="USD"
        month={makeMonth([
          {
            key: `forecast-adjustment:${adjustmentId}:2026-08`,
            sourceType: "additional_income",
            sourceId: adjustmentId,
            label: "Bonus",
            period: "2026-08",
            amountCents: 25_000,
            status: "pending",
            excludedFromProjection: true,
          },
        ])}
        periods={["2026-08"]}
      />,
    )

    expect(
      screen.getAllByRole("button", { name: "Include" }).length,
    ).toBeGreaterThan(0)
    expect(
      screen.getAllByText("Bonus")[0]?.className.includes("line-through"),
    ).toBe(true)
  })

  test("calls setCashForecastExclusion for a custom adjustment", async () => {
    const user = userEvent.setup()
    const adjustmentId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee"
    setCashForecastExclusion.mockClear()

    render(
      <ForecastActivityReport
        adjustments={[
          {
            id: adjustmentId,
            user_id: "user-1",
            kind: "planned_outflow",
            name: "Insurance",
            amount_cents: 15_000,
            start_period: "2026-08",
            recurrence: "monthly",
            created_at: "2026-07-01T00:00:00.000Z",
            updated_at: "2026-07-01T00:00:00.000Z",
          },
        ]}
        currency="USD"
        month={makeMonth([
          {
            key: `forecast-adjustment:${adjustmentId}:2026-08`,
            sourceType: "planned_outflow",
            sourceId: adjustmentId,
            label: "Insurance",
            period: "2026-08",
            amountCents: -15_000,
            status: "pending",
          },
        ])}
        periods={["2026-08"]}
      />,
    )

    await user.click(screen.getAllByRole("button", { name: "Exclude" })[0]!)

    expect(setCashForecastExclusion).toHaveBeenCalledWith({
      sourceType: "planned_outflow",
      sourceKey: adjustmentId,
      period: "2026-08",
      excluded: true,
    })
  })
})
