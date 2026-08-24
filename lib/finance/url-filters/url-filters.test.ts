import { describe, expect, test } from "bun:test"
import type { RecurringBill, Transaction } from "@/lib/types"
import {
  normalizeRecurringBillFilters,
  normalizeTransactionFilters,
} from "./normalize"
import { getFilteredPagination } from "./pagination"
import {
  filterRecurringBills,
  sortRecurringBills,
} from "./recurring-bill-filters"
import {
  recurringBillQueryParsers,
  transactionQueryParsers,
} from "./query-state"
import { filterTransactions, sortTransactions } from "./transaction-filters"

function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
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
    ...overrides,
  }
}

function makeBill(overrides: Partial<RecurringBill> = {}): RecurringBill {
  return {
    id: "bill-1",
    name: "Internet Provider",
    concept: "Home internet",
    avatarUrl: "",
    contactColor: "chart-1",
    contactInitials: "IP",
    counterpartyId: "counterparty-1",
    amount: 60,
    frequency: "monthly",
    firstDueDate: "2026-01-15",
    settledCount: 1,
    categoryId: "category-1",
    category: "Utilities",
    occurrences: [],
    currentOccurrence: {
      dueDate: "2026-07-15",
      sequence: 7,
      amount: 60,
      status: "due-soon",
    },
    status: "due-soon",
    hasPayments: true,
    ...overrides,
  }
}

describe("query parsers and normalization", () => {
  test("rejects invalid enum values and normalizes unsafe filter values", () => {
    expect(transactionQueryParsers.sort.parse("invalid")).toBeNull()
    expect(recurringBillQueryParsers.lifecycle.parse("hidden")).toBeNull()

    const filters = normalizeTransactionFilters({
      q: "  groceries ",
      sort: "latest",
      page: 0,
      category: ["category-1", "category-1", "  "],
      budget: [],
      account: [],
      counterparty: [],
      method: [],
      card: [],
      direction: null,
      from: "2026-07-20",
      to: "2026-07-10",
      minAmount: -2,
      maxAmount: Number.NaN,
    })

    expect(filters).toMatchObject({
      q: "groceries",
      page: 1,
      category: ["category-1"],
      dateRange: {},
      amountRange: {},
    })
  })

  test("keeps inclusive recurring bill bounds when valid", () => {
    const filters = normalizeRecurringBillFilters({
      q: "",
      sort: "latest",
      page: 3,
      category: [],
      counterparty: [],
      frequency: [],
      status: [],
      dueFrom: "2026-07-01",
      dueTo: "2026-07-31",
      minAmount: 5,
      maxAmount: 25,
      source: [],
      card: [],
      lifecycle: "all",
      schedule: null,
    })

    expect(filters.dueDateRange).toEqual({
      from: "2026-07-01",
      to: "2026-07-31",
    })
    expect(filters.amountRange).toEqual({ min: 5, max: 25 })
    expect(filters.page).toBe(3)
  })

  test("normalizes invalid recurring bill pages to the first page", () => {
    const filters = normalizeRecurringBillFilters({
      q: "",
      sort: "latest",
      page: 0,
      category: [],
      counterparty: [],
      frequency: [],
      status: [],
      dueFrom: null,
      dueTo: null,
      minAmount: null,
      maxAmount: null,
      source: [],
      card: [],
      lifecycle: "all",
      schedule: null,
    })

    expect(filters.page).toBe(1)
  })
})

describe("transaction sort", () => {
  test("orders same-day transactions by createdAt for latest and oldest", () => {
    const older = makeTransaction({
      id: "older",
      postedAt: "2026-07-10",
      createdAt: "2026-07-10T10:00:00.000Z",
    })
    const newer = makeTransaction({
      id: "newer",
      postedAt: "2026-07-10",
      createdAt: "2026-07-10T12:00:00.000Z",
    })

    expect(
      sortTransactions([older, newer], "latest").map(
        (transaction) => transaction.id,
      ),
    ).toEqual(["newer", "older"])
    expect(
      sortTransactions([newer, older], "oldest").map(
        (transaction) => transaction.id,
      ),
    ).toEqual(["older", "newer"])
  })

  test("prefers postedAt over createdAt when dates differ", () => {
    const earlierDay = makeTransaction({
      id: "earlier-day",
      postedAt: "2026-07-09",
      createdAt: "2026-07-11T12:00:00.000Z",
    })
    const laterDay = makeTransaction({
      id: "later-day",
      postedAt: "2026-07-10",
      createdAt: "2026-07-08T12:00:00.000Z",
    })

    expect(
      sortTransactions([earlierDay, laterDay], "latest").map(
        (transaction) => transaction.id,
      ),
    ).toEqual(["later-day", "earlier-day"])
  })
})

describe("transaction filters", () => {
  test("combines groups with AND and values in a group with OR", () => {
    const matching = makeTransaction()
    const anotherCategory = makeTransaction({
      id: "transaction-2",
      categoryId: "category-2",
      budgetId: undefined,
      amount: -20,
    })
    const wrongAccount = makeTransaction({
      id: "transaction-3",
      accountId: "account-2",
    })
    const filters = normalizeTransactionFilters({
      q: "",
      sort: "latest",
      page: 1,
      category: ["category-1", "category-2"],
      budget: ["budget-1", "unassigned"],
      account: ["account-1"],
      counterparty: [],
      method: [],
      card: [],
      direction: "expense",
      from: "2026-07-01",
      to: "2026-07-31",
      minAmount: 20,
      maxAmount: 50,
    })

    expect(
      filterTransactions(
        [matching, anotherCategory, wrongAccount],
        filters,
      ).map((transaction) => transaction.id),
    ).toEqual(["transaction-1", "transaction-2"])
  })

  test("matches text in descriptions and absolute amount ranges", () => {
    const income = makeTransaction({
      id: "income",
      name: "Payroll",
      amount: 120,
      description: "July bonus",
      budgetId: undefined,
    })
    const filters = normalizeTransactionFilters({
      q: "bonus",
      sort: "latest",
      page: 1,
      category: [],
      budget: ["unassigned"],
      account: [],
      counterparty: [],
      method: [],
      card: [],
      direction: "income",
      from: null,
      to: null,
      minAmount: 100,
      maxAmount: 120,
    })

    expect(filterTransactions([income], filters)).toEqual([income])
  })
})

describe("recurring bill filters", () => {
  test("filters computed bill state, lifecycle, schedule, and source", () => {
    const matching = makeBill({
      totalPayments: 12,
      creditCardId: "card-1",
    })
    const archived = makeBill({
      id: "archived",
      archivedAt: "2026-07-01",
      status: "paid",
    })
    const paused = makeBill({
      id: "paused",
      pausedAt: "2026-07-02",
      status: "upcoming",
    })
    const filters = normalizeRecurringBillFilters({
      q: "internet",
      sort: "latest",
      page: 1,
      category: ["category-1"],
      counterparty: [],
      frequency: ["monthly"],
      status: ["due-soon"],
      dueFrom: "2026-07-15",
      dueTo: "2026-07-15",
      minAmount: 60,
      maxAmount: 60,
      source: ["credit_card"],
      card: ["card-1"],
      lifecycle: "active",
      schedule: "finite",
    })

    expect(filterRecurringBills([matching, archived], filters)).toEqual([
      matching,
    ])
    expect(
      filterRecurringBills(
        [matching, paused, archived],
        normalizeRecurringBillFilters({
          q: "",
          sort: "latest",
          page: 1,
          category: [],
          counterparty: [],
          frequency: [],
          status: [],
          dueFrom: null,
          dueTo: null,
          minAmount: null,
          maxAmount: null,
          source: [],
          card: [],
          lifecycle: "paused",
          schedule: null,
        }),
      ),
    ).toEqual([paused])
  })
})

describe("recurring bill sort", () => {
  test("orders latest by urgency then soonest due date", () => {
    const paid = makeBill({
      id: "paid",
      status: "paid",
      currentOccurrence: {
        dueDate: "2026-07-01",
        sequence: 1,
        amount: 60,
        status: "paid",
      },
    })
    const upcomingLater = makeBill({
      id: "upcoming-later",
      status: "upcoming",
      currentOccurrence: {
        dueDate: "2026-12-01",
        sequence: 1,
        amount: 60,
        status: "upcoming",
      },
    })
    const upcomingSooner = makeBill({
      id: "upcoming-sooner",
      status: "upcoming",
      currentOccurrence: {
        dueDate: "2026-08-05",
        sequence: 1,
        amount: 60,
        status: "upcoming",
      },
    })
    const dueSoon = makeBill({
      id: "due-soon",
      status: "due-soon",
      currentOccurrence: {
        dueDate: "2026-07-15",
        sequence: 1,
        amount: 60,
        status: "due-soon",
      },
    })
    const overdue = makeBill({
      id: "overdue",
      status: "overdue",
      currentOccurrence: {
        dueDate: "2026-07-01",
        sequence: 1,
        amount: 60,
        status: "overdue",
      },
    })

    expect(
      sortRecurringBills(
        [paid, upcomingLater, upcomingSooner, dueSoon, overdue],
        "latest",
      ).map((bill) => bill.id),
    ).toEqual([
      "overdue",
      "due-soon",
      "upcoming-sooner",
      "upcoming-later",
      "paid",
    ])
  })

  test("orders oldest by urgency then furthest due date", () => {
    const paid = makeBill({
      id: "paid",
      status: "paid",
      currentOccurrence: {
        dueDate: "2026-07-01",
        sequence: 1,
        amount: 60,
        status: "paid",
      },
    })
    const upcomingLater = makeBill({
      id: "upcoming-later",
      status: "upcoming",
      currentOccurrence: {
        dueDate: "2026-12-01",
        sequence: 1,
        amount: 60,
        status: "upcoming",
      },
    })
    const upcomingSooner = makeBill({
      id: "upcoming-sooner",
      status: "upcoming",
      currentOccurrence: {
        dueDate: "2026-08-05",
        sequence: 1,
        amount: 60,
        status: "upcoming",
      },
    })
    const overdue = makeBill({
      id: "overdue",
      status: "overdue",
      currentOccurrence: {
        dueDate: "2026-07-10",
        sequence: 1,
        amount: 60,
        status: "overdue",
      },
    })

    expect(
      sortRecurringBills(
        [paid, upcomingSooner, upcomingLater, overdue],
        "oldest",
      ).map((bill) => bill.id),
    ).toEqual(["overdue", "upcoming-later", "upcoming-sooner", "paid"])
  })
})

describe("filtered pagination", () => {
  test("keeps zero results on the no-results path and caps stale pages", () => {
    expect(getFilteredPagination(0, 10)).toMatchObject({
      totalPages: 0,
      safePage: 1,
    })
    expect(getFilteredPagination(21, 99)).toMatchObject({
      totalPages: 3,
      safePage: 3,
      startIndex: 20,
    })
  })
})
