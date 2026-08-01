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

const { BudgetItem } = await import("./budget-item")

afterEach(cleanup)

describe("BudgetItem", () => {
  test("shows spent amount with normal styling when within budget", () => {
    render(
      <BudgetItem
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

    const amount = screen.getByText("$200.00")
    expect(amount.parentElement?.className).toContain("text-foreground")
    expect(amount.parentElement?.className).not.toContain("text-destructive")
  })

  test("shows spent amount with destructive styling when over budget", () => {
    render(
      <BudgetItem
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

    const amount = screen.getByText("$545.00")
    expect(amount.parentElement?.className).toContain("text-destructive")
  })
})
