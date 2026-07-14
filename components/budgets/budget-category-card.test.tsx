import { describe, expect, mock, test } from "bun:test"
import type { ReactNode } from "react"
import { render, screen } from "@testing-library/react"

mock.module("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: ReactNode
    href: string
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

mock.module("@/components/actions", () => ({
  ItemActions: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

mock.module("./budget-progress-bar", () => ({
  BudgetProgressBar: () => null,
}))

mock.module("./delete-budget-dialog", () => ({
  DeleteBudgetDialog: () => null,
}))

mock.module("./edit-budget-dialog", () => ({
  EditBudgetDialog: () => null,
}))

mock.module("./latest-spending-item", () => ({
  LatestSpendingItem: () => null,
}))

mock.module("@/components/ui/dropdown-menu", () => ({
  DropdownMenuItem: ({ children }: { children: ReactNode }) => (
    <button>{children}</button>
  ),
}))

const { BudgetCategoryCard } = await import("./budget-category-card")

describe("BudgetCategoryCard", () => {
  test("links See All to the canonical budget transaction filter", () => {
    render(
      <BudgetCategoryCard
        budget={{
          id: "budget with spaces",
          period: "2026-07",
          category: "Groceries",
          categoryId: "category-1",
          maximum: 500,
          spent: 50,
          color: "chart-1",
        }}
        transactions={[]}
      />,
    )

    expect(
      screen.getByRole("link", { name: "See All" }).getAttribute("href"),
    ).toBe("/transactions?budget=budget%20with%20spaces")
  })
})
