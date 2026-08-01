import { afterEach, describe, expect, mock, test } from "bun:test"
import type { ReactNode } from "react"
import { cleanup, render, screen } from "@testing-library/react"
import type { CreditCard, RecurringBill } from "@/lib/types"

const activeStatement = {
  id: "statement-active",
  creditCardId: "card-1",
  periodStart: "2026-07-01",
  periodEnd: "2026-07-31",
  paymentDueDate: "2026-08-15",
  amount: 120,
  pendingBills: [],
  pendingBillsAmount: 0,
  totalAmount: 120,
  lifecycleStatus: "open" as const,
  dueStatus: "upcoming" as const,
}

const zeroActivityStatement = {
  id: "statement-zero",
  creditCardId: "card-1",
  periodStart: "2026-06-01",
  periodEnd: "2026-06-30",
  paymentDueDate: "2026-07-15",
  amount: 0,
  pendingBills: [],
  pendingBillsAmount: 0,
  totalAmount: 0,
  lifecycleStatus: "paid" as const,
  dueStatus: "paid" as const,
  paidAt: "2026-07-10",
}

const creditCard: CreditCard = {
  id: "card-1",
  nickname: "Travel Card",
  issuer: "Example Bank",
  network: "Visa",
  lastFour: "4242",
  expirationMonth: 12,
  expirationYear: 2030,
  creditLimit: 5000,
  closingDay: 31,
  paymentDueDay: 15,
  color: "chart-1",
  initials: "TC",
  currentStatement: activeStatement,
  statements: [activeStatement, zeroActivityStatement],
  payments: [],
  currentStatementAmount: 120,
  totalPendingAmount: 120,
  oldestPayableStatement: activeStatement,
  hasOverdueStatement: false,
  reservedInstallmentAmount: 0,
  availableCredit: 4880,
  dueStatus: "upcoming",
  annualityEnabled: false,
  annualityAmount: null,
  annualityAnniversaryMonth: null,
  annualityAnniversaryDay: null,
  annualityPaymentCount: null,
  annualitySchedule: [],
}

const monthlyBill: RecurringBill = {
  id: "bill-monthly",
  name: "Streaming Co",
  concept: "Family streaming",
  avatarUrl: "",
  contactColor: "chart-1",
  contactInitials: "SC",
  counterpartyId: "counterparty-1",
  amount: 18,
  frequency: "monthly",
  firstDueDate: "2026-07-05",
  settledCount: 0,
  creditCardId: "card-1",
  categoryId: "category-1",
  category: "Entertainment",
  occurrences: [],
  currentOccurrence: {
    dueDate: "2026-07-05",
    sequence: 1,
    amount: 18,
    status: "upcoming",
  },
  status: "upcoming",
  hasPayments: false,
}

const archivedYearlyBill: RecurringBill = {
  id: "bill-yearly",
  name: "Cloud Host",
  concept: "Annual hosting",
  avatarUrl: "",
  contactColor: "chart-2",
  contactInitials: "CH",
  counterpartyId: "counterparty-2",
  amount: 120,
  frequency: "yearly",
  firstDueDate: "2026-01-01",
  settledCount: 1,
  creditCardId: "card-1",
  categoryId: "category-1",
  category: "Services",
  archivedAt: "2026-06-01T00:00:00.000Z",
  occurrences: [],
  currentOccurrence: {
    dueDate: "2026-01-01",
    sequence: 1,
    amount: 120,
    status: "paid",
  },
  status: "paid",
  hasPayments: true,
}

const oneTimeCharge: RecurringBill = {
  id: "bill-one-time",
  name: "Appliance Store",
  concept: "Washer installment",
  avatarUrl: "",
  contactColor: "chart-3",
  contactInitials: "AS",
  counterpartyId: "counterparty-3",
  amount: 200,
  frequency: "one_time",
  firstDueDate: "2026-08-01",
  settledCount: 0,
  creditCardId: "card-1",
  categoryId: "category-1",
  category: "Shopping",
  occurrences: [],
  currentOccurrence: {
    dueDate: "2026-08-01",
    sequence: 1,
    amount: 200,
    status: "upcoming",
  },
  status: "upcoming",
  hasPayments: false,
}

let recurringBills: RecurringBill[] = []

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
    creditCards: [creditCard],
    recurringBills,
    state: {
      preferences: {
        hideAmounts: false,
        default_currency: "USD",
      },
    },
  }),
}))

mock.module("@/components/actions", () => ({
  HeaderMenuItem: ({ children }: { children: ReactNode }) => (
    <button type="button">{children}</button>
  ),
  ItemActions: ({
    ariaLabel,
    children,
  }: {
    ariaLabel: string
    children: ReactNode
  }) => (
    <div>
      <button type="button" aria-label={ariaLabel}>
        More actions
      </button>
      {children}
    </div>
  ),
  ModuleHeaderActions: ({
    children,
    primaryAction,
  }: {
    children?: ReactNode
    primaryAction?: ReactNode
  }) => (
    <>
      {primaryAction}
      {children}
    </>
  ),
}))

mock.module("./pay-credit-card-statement-dialog", () => ({
  PayCreditCardStatementDialog: () => null,
}))

mock.module("./close-credit-card-statement-dialog", () => ({
  CloseCreditCardStatementDialog: () => null,
}))

mock.module("./scheduled-credit-card-charge-dialog", () => ({
  AddScheduledCreditCardChargeDialog: () => null,
  EditScheduledCreditCardChargeDialog: () => null,
}))

mock.module("@/components/recurring-bills/bill-dialog", () => ({
  EditBillDialog: () => null,
}))

const { CreditCardDetailContent } = await import("./credit-card-detail-content")

afterEach(() => {
  recurringBills = []
  cleanup()
})

describe("CreditCardDetailContent", () => {
  test("links eligible statements to filtered transactions and hides zero-activity controls", () => {
    render(<CreditCardDetailContent creditCardId="card-1" />)

    const links = screen.getAllByRole("link", {
      name: "View statement transactions",
    })
    expect(links).toHaveLength(1)
    expect(links[0]?.getAttribute("href")).toBe(
      "/transactions?card=card-1&from=2026-07-01&to=2026-07-31",
    )
    expect(screen.queryByText("Card Transactions")).toBeNull()
  })

  test("lists card recurring bills with manage link and excludes one-time charges", () => {
    recurringBills = [monthlyBill, archivedYearlyBill, oneTimeCharge]
    render(<CreditCardDetailContent creditCardId="card-1" />)

    const recurringBillsHeading = screen.getByText("Recurring Bills")
    expect(recurringBillsHeading).toBeTruthy()
    expect(screen.getByText("Family streaming")).toBeTruthy()
    expect(screen.getByText("Annual hosting")).toBeTruthy()
    expect(screen.getByText("Washer installment")).toBeTruthy()
    expect(
      recurringBillsHeading.parentElement?.parentElement?.textContent?.includes(
        "Washer installment",
      ),
    ).toBe(false)
    expect(
      screen
        .getByRole("link", { name: "Manage recurring bills" })
        .getAttribute("href"),
    ).toBe("/recurring-bills?card=card-1")
    expect(
      screen.getByRole("button", {
        name: "More options for Family streaming",
      }),
    ).toBeTruthy()
    expect(
      screen.queryByRole("button", {
        name: "More options for Annual hosting",
      }),
    ).toBeNull()
  })

  test("hides the recurring bills section when the card has none", () => {
    recurringBills = [oneTimeCharge]
    render(<CreditCardDetailContent creditCardId="card-1" />)

    expect(screen.queryByText("Recurring Bills")).toBeNull()
    expect(
      screen.queryByRole("link", { name: "Manage recurring bills" }),
    ).toBeNull()
  })
})
