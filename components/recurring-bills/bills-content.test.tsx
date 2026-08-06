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

const paginatedBills: RecurringBill[] = Array.from(
  { length: 11 },
  (_, index) => ({
    ...bills[0],
    id: `paginated-bill-${index + 1}`,
    name: `Paginated Bill ${index + 1}`,
    concept: `Recurring payment ${index + 1}`,
    currentOccurrence: {
      dueDate: `2026-07-${String(index + 1).padStart(2, "0")}`,
      sequence: 1,
      amount: 60,
      status: "due-soon",
    },
  }),
)

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
        <li key={bill.id}>
          {bill.name}
          {bill.scheduledEndDate && bill.scheduledEndMode === "archive"
            ? ` · Cancels on ${bill.scheduledEndDate}`
            : null}
        </li>
      ))}
    </ul>
  ),
}))

mock.module("../transactions/pagination", () => ({
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

  test("writes sort changes with replace history and resets the page", async () => {
    const user = userEvent.setup()
    const updates: Parameters<OnUrlUpdateFunction>[0][] = []

    render(<BillsContent bills={bills} />, {
      wrapper: withNuqsTestingAdapter({
        searchParams: "?page=2",
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
      expect(update?.searchParams.get("page")).toBeNull()
      expect(update?.options.history).toBe("replace")
    })
  })

  test("shows ten bills per page and writes page navigation to the URL", async () => {
    const user = userEvent.setup()
    const updates: Parameters<OnUrlUpdateFunction>[0][] = []

    render(<BillsContent bills={paginatedBills} />, {
      wrapper: withNuqsTestingAdapter({
        hasMemory: true,
        onUrlUpdate: (event) => updates.push(event),
      }),
    })

    expect(screen.getAllByRole("listitem")).toHaveLength(10)

    await user.click(screen.getByRole("button", { name: "Page 1 of 2" }))

    await waitFor(() => {
      const update = updates.at(-1)

      expect(update?.searchParams.get("page")).toBe("2")
      expect(update?.options.history).toBe("replace")
    })
  })

  test("caps stale pages and renders the final bill page", () => {
    render(<BillsContent bills={paginatedBills} />, {
      wrapper: withNuqsTestingAdapter({
        searchParams: "?page=99",
      }),
    })

    expect(screen.getAllByRole("listitem")).toHaveLength(1)
    expect(screen.getByRole("button", { name: "Page 2 of 2" })).toBeTruthy()
  })

  test("shows ending labels in the active list", () => {
    render(
      <BillsContent
        bills={[
          {
            ...bills[0],
            id: "ending-bill",
            creditCardId: "card-1",
            scheduledEndDate: "2026-08-28",
            scheduledEndMode: "archive",
          },
        ]}
      />,
      {
        wrapper: withNuqsTestingAdapter(),
      },
    )

    expect(screen.getByText(/Cancels on 2026-08-28/)).toBeTruthy()
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
