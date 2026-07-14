import { afterEach, describe, expect, mock, test } from "bun:test"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {
  type OnUrlUpdateFunction,
  withNuqsTestingAdapter,
} from "nuqs/adapters/testing"
import type { RecurringBill } from "@/lib/types"

const bills: RecurringBill[] = [
  {
    id: "bill-1",
    name: "Internet Provider",
    concept: "Home internet",
    avatarUrl: "",
    contactColor: "chart-1",
    contactInitials: "IP",
    counterpartyId: "counterparty-1",
    amount: 60,
    frequency: "monthly",
    firstDueDate: "2026-07-15",
    settledCount: 0,
    categoryId: "category-1",
    category: "Utilities",
    occurrences: [],
    currentOccurrence: {
      dueDate: "2026-07-15",
      sequence: 1,
      amount: 60,
      status: "due-soon",
    },
    status: "due-soon",
    hasPayments: false,
  },
  {
    id: "bill-2",
    name: "Phone Service",
    concept: "Mobile plan",
    avatarUrl: "",
    contactColor: "chart-2",
    contactInitials: "PS",
    counterpartyId: "counterparty-2",
    amount: 20,
    frequency: "monthly",
    firstDueDate: "2026-07-20",
    settledCount: 0,
    categoryId: "category-1",
    category: "Utilities",
    occurrences: [],
    currentOccurrence: {
      dueDate: "2026-07-20",
      sequence: 1,
      amount: 20,
      status: "upcoming",
    },
    status: "upcoming",
    hasPayments: false,
  },
]

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

mock.module("../transactions/search-input", () => ({
  SearchInput: ({
    label,
    value,
    onChange,
  }: {
    label?: string
    value: string
    onChange: (value: string) => void
  }) => (
    <input
      aria-label={label ?? "Search Transactions"}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}))

mock.module("../transactions/filter-dropdown", () => ({
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

mock.module("./bills-table", () => ({
  BillsTable: ({ bills }: { bills: RecurringBill[] }) => (
    <ul>
      {bills.map((bill) => (
        <li key={bill.id}>{bill.name}</li>
      ))}
    </ul>
  ),
}))

const { BillsContent } = await import("./bills-content")

afterEach(cleanup)

describe("BillsContent URL state", () => {
  test("hydrates search from the URL and matches bill concepts", () => {
    render(<BillsContent bills={bills} />, {
      wrapper: withNuqsTestingAdapter({
        searchParams: "?q=internet",
      }),
    })

    const search = screen.getByRole("textbox", {
      name: "Search Bills",
    }) as HTMLInputElement

    expect(search.value).toBe("internet")
    expect(screen.getByText("Internet Provider")).toBeTruthy()
    expect(screen.queryByText("Phone Service")).toBeNull()
  })

  test("writes sort changes with replace history", async () => {
    const user = userEvent.setup()
    const updates: Parameters<OnUrlUpdateFunction>[0][] = []

    render(<BillsContent bills={bills} />, {
      wrapper: withNuqsTestingAdapter({
        hasMemory: true,
        onUrlUpdate: (event) => updates.push(event),
      }),
    })

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Sort by" }),
      "oldest",
    )

    await waitFor(() => {
      const update = updates.at(-1)

      expect(update?.searchParams.get("sort")).toBe("oldest")
      expect(update?.options.history).toBe("replace")
    })
  })

  test("hides reset at defaults", () => {
    render(<BillsContent bills={bills} />, {
      wrapper: withNuqsTestingAdapter(),
    })

    expect(
      screen.queryByRole("button", { name: "Reset filters and sorting" }),
    ).toBeNull()
  })

  test("clears active filters", async () => {
    const user = userEvent.setup()
    const updates: Parameters<OnUrlUpdateFunction>[0][] = []

    render(<BillsContent bills={bills} />, {
      wrapper: withNuqsTestingAdapter({
        searchParams: "?q=internet&sort=oldest&lifecycle=archived",
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
