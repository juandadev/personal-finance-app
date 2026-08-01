import { afterEach, describe, expect, mock, test } from "bun:test"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {
  type OnUrlUpdateFunction,
  withNuqsTestingAdapter,
} from "nuqs/adapters/testing"
import type { Transaction } from "@/lib/types"

const transactions: Transaction[] = [
  {
    id: "transaction-1",
    name: "Groceries Market",
    avatarUrl: "",
    contactColor: "chart-1",
    contactInitials: "GM",
    amount: -42,
    accountId: "account-1",
    counterpartyId: "counterparty-1",
    categoryId: "category-1",
    concept: "Weekly groceries",
    date: "Jul 10, 2026",
    postedAt: "2026-07-10",
    createdAt: "2026-07-10T00:00:00.000Z",
    isVoucherExpense: false,
    paymentMethod: "bank_account",
    paymentMethodLabel: "Bank Account",
    category: "Groceries",
    budgetId: "budget-1",
  },
  {
    id: "transaction-2",
    name: "Book Shop",
    avatarUrl: "",
    contactColor: "chart-2",
    contactInitials: "BS",
    amount: -20,
    accountId: "account-1",
    counterpartyId: "counterparty-2",
    categoryId: "category-2",
    concept: "Paperback",
    date: "Jul 11, 2026",
    postedAt: "2026-07-11",
    createdAt: "2026-07-11T00:00:00.000Z",
    isVoucherExpense: false,
    paymentMethod: "bank_account",
    paymentMethodLabel: "Bank Account",
    category: "Books",
  },
]

mock.module("@/hooks/use-finance", () => ({
  useFinance: () => ({
    state: {
      categories: [
        { id: "category-1", name: "Groceries" },
        { id: "category-2", name: "Books" },
      ],
    },
    transactions,
  }),
}))

mock.module("@/components/reset-url-filters-button", () => ({
  ResetUrlFiltersButton: ({ onReset }: { onReset: () => void }) => (
    <button
      type="button"
      aria-label="Reset filters and sorting"
      onClick={onReset}
    >
      Reset Filters
    </button>
  ),
}))

mock.module("./search-input", () => ({
  SearchInput: ({
    value,
    onChange,
  }: {
    value: string
    onChange: (value: string) => void
  }) => (
    <input
      aria-label="Search transactions"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}))

mock.module("./filter-dropdown", () => ({
  FilterDropdown: ({
    label,
    value,
    options,
    onChange,
  }: {
    label: string
    value: string
    options: { value: string; label: string }[]
    onChange: (value: string) => void
  }) => (
    <label>
      {label}
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  ),
}))

mock.module("./transactions-table", () => ({
  TransactionsTable: ({ transactions }: { transactions: Transaction[] }) => (
    <ul>
      {transactions.map((transaction) => (
        <li key={transaction.id}>{transaction.name}</li>
      ))}
    </ul>
  ),
}))

mock.module("./pagination", () => ({
  Pagination: ({
    currentPage,
    totalPages,
    onPageChange,
  }: {
    currentPage: number
    totalPages: number
    onPageChange: (page: number) => void
  }) => (
    <button type="button" onClick={() => onPageChange(currentPage + 1)}>
      Page {currentPage} of {totalPages}
    </button>
  ),
}))

const { TransactionsContent } = await import("./transactions-content")

afterEach(cleanup)

describe("TransactionsContent URL state", () => {
  test("hydrates transaction controls from the URL", () => {
    render(<TransactionsContent />, {
      wrapper: withNuqsTestingAdapter({
        searchParams: "?q=book&category=category-2",
      }),
    })

    const search = screen.getByRole("textbox", {
      name: "Search transactions",
    }) as HTMLInputElement

    expect(search.value).toBe("book")
    expect(screen.getByRole("combobox", { name: "Category" }).value).toBe(
      "category-2",
    )
    expect(screen.queryByText("Groceries Market")).toBeNull()
    expect(screen.getByText("Book Shop")).toBeTruthy()
    expect(
      screen.getByRole("button", { name: "Reset filters and sorting" }),
    ).toBeTruthy()
  })

  test("writes category changes with replace history and resets the page", async () => {
    const user = userEvent.setup()
    const updates: Parameters<OnUrlUpdateFunction>[0][] = []

    render(<TransactionsContent />, {
      wrapper: withNuqsTestingAdapter({
        searchParams: "?page=2",
        hasMemory: true,
        onUrlUpdate: (event) => updates.push(event),
      }),
    })

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Category" }),
      "category-2",
    )

    await waitFor(() => {
      const update = updates.at(-1)

      expect(update?.searchParams.get("category")).toBe("category-2")
      expect(update?.searchParams.get("page")).toBeNull()
      expect(update?.options.history).toBe("replace")
    })
  })

  test("clears every managed query value", async () => {
    const user = userEvent.setup()
    const updates: Parameters<OnUrlUpdateFunction>[0][] = []

    render(<TransactionsContent />, {
      wrapper: withNuqsTestingAdapter({
        searchParams:
          "?q=book&sort=oldest&page=2&budget=budget-1&direction=expense",
        hasMemory: true,
        onUrlUpdate: (event) => updates.push(event),
      }),
    })

    await user.click(
      screen.getByRole("button", { name: "Reset filters and sorting" }),
    )

    await waitFor(() => {
      const update = updates.at(-1)

      expect(update?.queryString).toBe("")
      expect(update?.options.history).toBe("replace")
    })
  })
})
