import { afterEach, describe, expect, mock, test } from "bun:test"
import type { ReactNode } from "react"
import { cleanup, render, screen } from "@testing-library/react"

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

mock.module("@/components/actions", () => ({
  HeaderMenuItem: ({ children }: { children: ReactNode }) => <>{children}</>,
  ItemActions: ({ children }: { children: ReactNode }) => <>{children}</>,
  ModuleHeaderActions: ({ children }: { children?: ReactNode }) => (
    <>{children}</>
  ),
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

afterEach(cleanup)

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

  test("shows Free with remaining amount when within budget", () => {
    render(
      <BudgetCategoryCard
        budget={{
          id: "budget-1",
          period: "2026-07",
          category: "Groceries",
          categoryId: "category-1",
          maximum: 500,
          spent: 200,
          color: "chart-1",
        }}
        transactions={[]}
      />,
    )

    expect(screen.getByText("Free")).toBeTruthy()
    expect(screen.getByText("$300.00")).toBeTruthy()
    expect(screen.queryByText("Exceeded")).toBeNull()
  })

  test("shows Exceeded with overage when over budget", () => {
    render(
      <BudgetCategoryCard
        budget={{
          id: "budget-1",
          period: "2026-07",
          category: "Groceries",
          categoryId: "category-1",
          maximum: 500,
          spent: 545,
          color: "chart-1",
        }}
        transactions={[]}
      />,
    )

    expect(screen.getByText("Exceeded")).toBeTruthy()
    const overage = screen.getByText("$45.00")
    expect(overage.parentElement?.className).toContain("text-destructive")
    expect(screen.queryByText("Free")).toBeNull()
  })
})
