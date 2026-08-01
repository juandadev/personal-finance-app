import { afterEach, describe, expect, mock, test } from "bun:test"
import type { ReactNode } from "react"
import { cleanup, render, screen } from "@testing-library/react"

import { MANUAL_BILLS_DUE_REMINDER_HREF } from "@/lib/finance/url-filters"
import type { RecurringBill } from "@/lib/types"

function makeBill(
  overrides: Partial<RecurringBill> & { id: string; concept: string },
): RecurringBill {
  return {
    name: "Merchant",
    avatarUrl: "",
    contactColor: "chart-1",
    contactInitials: "ME",
    counterpartyId: "counterparty-1",
    amount: 25,
    frequency: "monthly",
    firstDueDate: "2026-07-10",
    settledCount: 0,
    categoryId: "category-1",
    category: "Bills",
    occurrences: [],
    currentOccurrence: {
      dueDate: overrides.firstDueDate ?? "2026-07-10",
      sequence: 1,
      amount: overrides.amount ?? 25,
      status: overrides.status ?? "due-soon",
    },
    status: "due-soon",
    hasPayments: false,
    ...overrides,
  }
}

let manualBillsDueReminder: RecurringBill[] = []

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
    manualBillsDueReminder,
    state: {
      preferences: {
        hideAmounts: false,
        default_currency: "USD",
      },
    },
  }),
}))

mock.module("@/components/money-amount", () => ({
  MoneyAmount: ({ amount }: { amount: number }) => <span>{`$${amount}`}</span>,
}))

mock.module("@/components/contact-avatar", () => ({
  ContactAvatar: ({ name }: { name: string }) => <div>{name}</div>,
}))

const { DueForPaymentCard } = await import("./due-for-payment-card")

afterEach(() => {
  cleanup()
  manualBillsDueReminder = []
})

describe("DueForPaymentCard", () => {
  test("renders empty state when there are no matching bills", () => {
    render(<DueForPaymentCard />)

    expect(
      screen.getByRole("heading", { name: "Due for payment" }),
    ).toBeTruthy()
    expect(screen.getByText("You’re all caught up")).toBeTruthy()
    expect(screen.getByText("No manual bills need payment soon.")).toBeTruthy()

    const viewAll = screen.getByRole("link", { name: /View All/i })
    expect(viewAll.getAttribute("href")).toBe(MANUAL_BILLS_DUE_REMINDER_HREF)
  })

  test("shows at most four bills and links rows to the reminder href", () => {
    manualBillsDueReminder = [
      makeBill({
        id: "bill-1",
        concept: "Bill One",
        status: "overdue",
        firstDueDate: "2026-07-01",
      }),
      makeBill({
        id: "bill-2",
        concept: "Bill Two",
        status: "due-today",
        firstDueDate: "2026-07-15",
      }),
      makeBill({
        id: "bill-3",
        concept: "Bill Three",
        status: "due-soon",
        firstDueDate: "2026-07-18",
      }),
      makeBill({
        id: "bill-4",
        concept: "Bill Four",
        status: "due-soon",
        firstDueDate: "2026-07-19",
      }),
      makeBill({
        id: "bill-5",
        concept: "Bill Five",
        status: "due-soon",
        firstDueDate: "2026-07-20",
      }),
    ]

    render(<DueForPaymentCard />)

    expect(screen.getByText("Bill One")).toBeTruthy()
    expect(screen.getByText("Bill Four")).toBeTruthy()
    expect(screen.queryByText("Bill Five")).toBeNull()

    const billLink = screen.getByRole("link", { name: /Bill One/i })
    expect(billLink.getAttribute("href")).toBe(MANUAL_BILLS_DUE_REMINDER_HREF)
    expect(MANUAL_BILLS_DUE_REMINDER_HREF).toContain("source=bank_account")
    expect(MANUAL_BILLS_DUE_REMINDER_HREF).toContain("status=overdue")
    expect(MANUAL_BILLS_DUE_REMINDER_HREF).toContain("status=due-today")
    expect(MANUAL_BILLS_DUE_REMINDER_HREF).toContain("status=due-soon")
  })
})
