import { afterEach, describe, expect, mock, test } from "bun:test"
import { cleanup, render, screen } from "@testing-library/react"

mock.module("@/hooks/use-finance", () => ({
  useFinance: () => ({
    state: {
      preferences: {
        hideAmounts: false,
        default_currency: "USD",
      },
    },
  }),
}))

const { SpendingSummaryItem } = await import("./spending-summary-item")

afterEach(cleanup)

describe("SpendingSummaryItem", () => {
  test("uses normal styling when within budget", () => {
    render(
      <SpendingSummaryItem
        budget={{
          id: "budget-1",
          period: "2026-07",
          category: "Groceries",
          categoryId: "category-1",
          maximum: 500,
          spent: 200,
          color: "chart-1",
        }}
      />,
    )

    const spent = screen.getByText("$200.00")
    expect(spent.parentElement?.className).toContain("text-foreground")
    expect(spent.parentElement?.className).not.toContain("text-destructive")
  })

  test("uses destructive styling for spent and percentage when over budget", () => {
    render(
      <SpendingSummaryItem
        budget={{
          id: "budget-1",
          period: "2026-07",
          category: "Groceries",
          categoryId: "category-1",
          maximum: 500,
          spent: 545,
          color: "chart-1",
        }}
      />,
    )

    const spent = screen.getByText("$545.00")
    const percentage = screen.getByText("109.0%")

    expect(spent.parentElement?.className).toContain("text-destructive")
    expect(percentage.className).toContain("text-destructive")
  })
})
