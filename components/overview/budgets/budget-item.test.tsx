import { describe, expect, test } from "bun:test"
import { render, screen } from "@testing-library/react"

import { BudgetItem } from "./budget-item"

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
    expect(amount.className).toContain("text-foreground")
    expect(amount.className).not.toContain("text-destructive")
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
    expect(amount.className).toContain("text-destructive")
  })
})
