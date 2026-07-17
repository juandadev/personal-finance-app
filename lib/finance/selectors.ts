import { getCreditCardDueStatus } from "@/lib/finance/credit-card-cycle"
import { selectPrimaryPaymentAccount } from "@/lib/finance/accounts"
import {
  buildCashForecast,
  type CashForecastResult,
} from "@/lib/finance/cash-forecast"
import {
  buildCreditCardObligations,
  type CreditCardObligation,
} from "@/lib/finance/credit-card-obligations"
import {
  getBillOccurrenceStatementCycle,
  getRecurringBillDueStatus,
  resolveRecurringBillOccurrences,
  selectCurrentOccurrence,
  todayIsoDate,
  type RecurringBillOccurrenceState,
} from "@/lib/finance/recurring-bill-schedule"
import { formatDisplayDate } from "@/lib/format"
import type {
  Budget,
  CreditCard,
  CreditCardDueStatus,
  CreditCardPayment,
  CreditCardPendingBillLine,
  CreditCardStatement,
  RecurringBill,
  RecurringBillOccurrence,
  TransactionCategory,
} from "@/lib/types"
import type {
  BudgetRecord,
  CategoryRecord,
  CounterpartyRecord,
  CreditCardPaymentRecord,
  CreditCardRecord,
  CreditCardStatementRecord,
  FinanceState,
  FinanceViewModel,
  RecurringBillPaymentRecord,
  RecurringBillRecord,
  TransactionRecord,
} from "./types"

function centsToDollars(cents: number): number {
  return cents / 100
}

function byId<T extends { id: string }>(records: T[]): Map<string, T> {
  return new Map(records.map((record) => [record.id, record]))
}

function getRequired<T>(
  records: Map<string, T>,
  id: string,
  recordName: string,
): T {
  const record = records.get(id)

  if (!record) {
    throw new Error(`Missing ${recordName} record for id "${id}"`)
  }

  return record
}

function getInitials(name: string): string {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")

  return initials || "?"
}

function selectTransactionCategories(
  categories: CategoryRecord[],
): TransactionCategory[] {
  return categories.map((category) => category.name)
}

function selectTransactions(
  transactions: TransactionRecord[],
  categories: Map<string, CategoryRecord>,
  counterparties: Map<string, CounterpartyRecord>,
  creditCards: Map<string, CreditCardRecord>,
  budgetAssignments: FinanceState["budgetTransactionAssignments"],
  budgets: Map<string, BudgetRecord>,
) {
  const assignmentByTransactionId = new Map(
    budgetAssignments.map((assignment) => [
      assignment.transaction_id,
      assignment,
    ]),
  )

  return transactions.map((transaction) => {
    const category = getRequired(
      categories,
      transaction.category_id,
      "category",
    )
    const counterparty = getRequired(
      counterparties,
      transaction.counterparty_id,
      "counterparty",
    )
    const assignment = assignmentByTransactionId.get(transaction.id)
    const assignedBudget = assignment
      ? budgets.get(assignment.budget_id)
      : undefined
    const assignedCategory = assignedBudget
      ? getRequired(categories, assignedBudget.category_id, "category")
      : undefined
    const creditCard = transaction.credit_card_id
      ? creditCards.get(transaction.credit_card_id)
      : undefined

    return {
      id: transaction.id,
      name: counterparty.display_name,
      avatarUrl: counterparty.avatar_url ?? "",
      contactColor: counterparty.theme_color,
      contactInitials: getInitials(counterparty.display_name),
      amount: centsToDollars(transaction.amount_cents),
      accountId: transaction.account_id,
      counterpartyId: transaction.counterparty_id,
      categoryId: transaction.category_id,
      concept: transaction.concept,
      date: formatDisplayDate(transaction.posted_at),
      postedAt: transaction.posted_at,
      isVoucherExpense: transaction.is_voucher_expense,
      paymentMethod: transaction.payment_method,
      creditCardId: transaction.credit_card_id ?? undefined,
      creditCardStatementId: transaction.credit_card_statement_id ?? undefined,
      paymentMethodLabel: getPaymentMethodLabel(transaction, creditCard),
      category: category.name,
      description: transaction.description ?? undefined,
      budgetId: assignment?.budget_id,
      budgetCategory: assignedCategory?.name,
    }
  })
}

function getPaymentMethodLabel(
  transaction: TransactionRecord,
  creditCard?: CreditCardRecord,
) {
  switch (transaction.payment_method) {
    case "bank_account":
      return "Bank Account"
    case "credit_card":
      return creditCard
        ? `${creditCard.nickname} •••• ${creditCard.last_four}`
        : "Credit Card"
    case "credit_card_payment":
      return creditCard ? `${creditCard.nickname} Payment` : "Card Payment"
    case "voucher":
      return "Voucher"
  }
}

function selectBudgets(
  budgets: BudgetRecord[],
  budgetAssignments: FinanceState["budgetTransactionAssignments"],
  categories: Map<string, CategoryRecord>,
): Budget[] {
  const spendingByBudgetId = new Map(budgets.map((budget) => [budget.id, 0]))

  for (const assignment of budgetAssignments) {
    spendingByBudgetId.set(
      assignment.budget_id,
      (spendingByBudgetId.get(assignment.budget_id) ?? 0) +
        assignment.assigned_amount_cents,
    )
  }

  return budgets.map((budget) => {
    const category = getRequired(categories, budget.category_id, "category")

    return {
      id: budget.id,
      period: budget.period,
      category: category.name,
      categoryId: budget.category_id,
      maximum: centsToDollars(budget.limit_cents),
      spent: centsToDollars(spendingByBudgetId.get(budget.id) ?? 0),
      color: budget.theme_color,
    }
  })
}

function selectBudgetAssignmentsForCurrentBudgets(
  budgetAssignments: FinanceState["budgetTransactionAssignments"],
  budgets: BudgetRecord[],
) {
  const currentBudgetIds = new Set(budgets.map((budget) => budget.id))

  return budgetAssignments.filter((assignment) =>
    currentBudgetIds.has(assignment.budget_id),
  )
}

function groupPaymentsByBillId(payments: RecurringBillPaymentRecord[]) {
  const paymentsByBillId = new Map<string, RecurringBillPaymentRecord[]>()

  for (const payment of payments) {
    const billPayments = paymentsByBillId.get(payment.recurring_bill_id)

    if (billPayments) {
      billPayments.push(payment)
    } else {
      paymentsByBillId.set(payment.recurring_bill_id, [payment])
    }
  }

  return paymentsByBillId
}

function groupCreditCardStatementsByCardId(
  statements: CreditCardStatementRecord[],
) {
  const statementsByCardId = new Map<string, CreditCardStatementRecord[]>()

  for (const statement of statements) {
    const cardStatements = statementsByCardId.get(statement.credit_card_id)

    if (cardStatements) {
      cardStatements.push(statement)
    } else {
      statementsByCardId.set(statement.credit_card_id, [statement])
    }
  }

  return statementsByCardId
}

function toOccurrenceView(
  occurrence: RecurringBillOccurrenceState,
): RecurringBillOccurrence {
  return {
    dueDate: occurrence.dueDate,
    statusDueDate: occurrence.statusDueDate,
    sequence: occurrence.sequence,
    amount: centsToDollars(occurrence.amountCents),
    status: occurrence.status,
    paymentId: occurrence.paymentId,
    transactionId: occurrence.transactionId,
    paidAt: occurrence.paidAt,
  }
}

function resolveBillOccurrencePresentation(
  bill: Pick<RecurringBillRecord, "credit_card_id">,
  occurrences: RecurringBillOccurrenceState[],
  creditCards: Map<string, CreditCardRecord>,
  statementsByCardId: Map<string, CreditCardStatementRecord[]>,
  today: string,
) {
  if (!bill.credit_card_id) {
    return occurrences
  }

  const card = creditCards.get(bill.credit_card_id)

  if (!card) {
    return occurrences
  }

  const statements = statementsByCardId.get(card.id) ?? []

  return occurrences.map((occurrence) => {
    if (occurrence.status === "paid" || occurrence.status === "skipped") {
      return occurrence
    }

    const cycle = getBillOccurrenceStatementCycle(
      occurrence.dueDate,
      card,
      statements,
      today,
    )

    return {
      ...occurrence,
      statusDueDate: cycle.paymentDueDate,
      status: getRecurringBillDueStatus(cycle.paymentDueDate, today),
    }
  })
}

function selectRecurringBills(
  recurringBills: RecurringBillRecord[],
  paymentsByBillId: Map<string, RecurringBillPaymentRecord[]>,
  counterparties: Map<string, CounterpartyRecord>,
  categories: Map<string, CategoryRecord>,
  creditCards: Map<string, CreditCardRecord>,
  statementsByCardId: Map<string, CreditCardStatementRecord[]>,
  today: string,
): RecurringBill[] {
  return recurringBills.map((bill) => {
    const counterparty = getRequired(
      counterparties,
      bill.counterparty_id,
      "counterparty",
    )
    const category = getRequired(categories, bill.category_id, "category")
    const payments = paymentsByBillId.get(bill.id) ?? []
    const occurrenceStates = resolveBillOccurrencePresentation(
      bill,
      resolveRecurringBillOccurrences(bill, payments, today),
      creditCards,
      statementsByCardId,
      today,
    )
    const currentOccurrence = selectCurrentOccurrence(occurrenceStates)

    return {
      id: bill.id,
      name: counterparty.display_name,
      concept: bill.concept,
      avatarUrl: counterparty.avatar_url ?? "",
      contactColor: counterparty.theme_color,
      contactInitials: getInitials(counterparty.display_name),
      counterpartyId: bill.counterparty_id,
      amount: centsToDollars(bill.amount_cents),
      frequency: bill.frequency,
      firstDueDate: bill.first_due_date,
      totalPayments: bill.total_payments ?? undefined,
      settledCount: payments.length,
      creditCardId: bill.credit_card_id ?? undefined,
      categoryId: bill.category_id,
      category: category.name,
      archivedAt: bill.archived_at ?? undefined,
      occurrences: occurrenceStates.map(toOccurrenceView),
      currentOccurrence: currentOccurrence
        ? toOccurrenceView(currentOccurrence)
        : undefined,
      status: currentOccurrence?.status ?? "upcoming",
      hasPayments: payments.length > 0,
    }
  })
}

const URGENT_BILL_STATUSES = new Set(["due-soon", "due-today", "overdue"])

function selectRecurringBillsSummary(
  recurringBills: RecurringBill[],
  today: string,
): FinanceViewModel["recurringBillsSummary"] {
  const currentMonth = today.slice(0, 7)
  const activeBills = recurringBills.filter((bill) => !bill.archivedAt)

  let paidCount = 0
  let paidAmount = 0
  let upcomingCount = 0
  let upcomingAmount = 0
  let dueSoonCount = 0
  let dueSoonAmount = 0

  for (const bill of activeBills) {
    for (const occurrence of bill.occurrences) {
      if (occurrence.status === "paid" || occurrence.status === "skipped") {
        if (
          occurrence.status === "paid" &&
          occurrence.dueDate.slice(0, 7) === currentMonth
        ) {
          paidCount += 1
          paidAmount += occurrence.amount
        }

        continue
      }

      upcomingCount += 1
      upcomingAmount += occurrence.amount

      if (URGENT_BILL_STATUSES.has(occurrence.status)) {
        dueSoonCount += 1
        dueSoonAmount += occurrence.amount
      }
    }
  }

  return [
    {
      label: "Paid Bills",
      amount: paidAmount,
      count: paidCount,
      color: "chart-1",
    },
    {
      label: "Total Upcoming",
      amount: upcomingAmount,
      count: upcomingCount,
      color: "chart-4",
    },
    {
      label: "Due Soon",
      amount: dueSoonAmount,
      count: dueSoonCount,
      color: "warning",
    },
  ]
}

function selectPendingBillLines(
  obligation: CreditCardObligation,
  counterparties: Map<string, CounterpartyRecord>,
  categories: Map<string, CategoryRecord>,
): CreditCardPendingBillLine[] {
  return obligation.pendingBillLines.map((line) => {
    const counterparty = getRequired(
      counterparties,
      line.counterpartyId,
      "counterparty",
    )
    const category = getRequired(categories, line.categoryId, "category")

    return {
      billId: line.billId,
      name: counterparty.display_name,
      concept: line.label,
      avatarUrl: counterparty.avatar_url ?? "",
      contactColor: counterparty.theme_color,
      contactInitials: getInitials(counterparty.display_name),
      dueDate: line.dueDate,
      amount: centsToDollars(line.amountCents),
      category: category.name,
    }
  })
}

function selectReservedInstallmentCentsByCard(
  recurringBills: RecurringBillRecord[],
  paymentsByBillId: Map<string, RecurringBillPaymentRecord[]>,
  obligations: CreditCardObligation[],
  today: string,
): Map<string, number> {
  const reservedCentsByCard = new Map<string, number>()
  const pendingOccurrenceKeys = new Set(
    obligations.flatMap((obligation) =>
      obligation.pendingBillLines.map(
        (line) => `${line.billId}:${line.dueDate}`,
      ),
    ),
  )

  for (const bill of recurringBills) {
    if (!bill.credit_card_id || bill.total_payments === null) {
      continue
    }

    const occurrences = resolveRecurringBillOccurrences(
      bill,
      paymentsByBillId.get(bill.id) ?? [],
      today,
      { includeAllFuture: true },
    )

    for (const occurrence of occurrences) {
      if (
        occurrence.status === "paid" ||
        occurrence.status === "skipped" ||
        pendingOccurrenceKeys.has(`${bill.id}:${occurrence.dueDate}`)
      ) {
        continue
      }

      reservedCentsByCard.set(
        bill.credit_card_id,
        (reservedCentsByCard.get(bill.credit_card_id) ?? 0) +
          occurrence.amountCents,
      )
    }
  }

  return reservedCentsByCard
}

function selectCreditCardStatements(
  obligations: CreditCardObligation[],
  counterparties: Map<string, CounterpartyRecord>,
  categories: Map<string, CategoryRecord>,
  today: string,
): CreditCardStatement[] {
  return obligations.map((obligation) => {
    const pendingBills = selectPendingBillLines(
      obligation,
      counterparties,
      categories,
    )
    const amount = centsToDollars(obligation.statementAmountCents)
    const pendingBillsAmount = centsToDollars(obligation.pendingBillAmountCents)

    return {
      id:
        obligation.statementId ??
        `virtual-${obligation.cardId}-${obligation.periodStart}`,
      creditCardId: obligation.cardId,
      periodStart: obligation.periodStart,
      periodEnd: obligation.periodEnd,
      paymentDueDate: obligation.paymentDueDate,
      amount,
      pendingBills,
      pendingBillsAmount,
      totalAmount: amount + pendingBillsAmount,
      lifecycleStatus: obligation.lifecycleStatus,
      dueStatus: getCreditCardDueStatus(
        {
          lifecycle_status: obligation.lifecycleStatus,
          payment_due_date: obligation.paymentDueDate,
        },
        today,
      ),
      paidAt: obligation.paidAt ?? undefined,
      isVirtual: obligation.isVirtual || undefined,
    }
  })
}

function selectCreditCardPayments(
  payments: CreditCardPaymentRecord[],
): CreditCardPayment[] {
  return payments.map((payment) => ({
    id: payment.id,
    creditCardId: payment.credit_card_id,
    statementId: payment.statement_id,
    sourceAccountId: payment.source_account_id,
    cashflowTransactionId: payment.cashflow_transaction_id,
    amount: centsToDollars(payment.amount_cents),
    paidAt: payment.paid_at,
  }))
}

function selectCurrentCreditCardStatement(
  statements: CreditCardStatement[],
  today = new Date().toISOString().slice(0, 10),
) {
  const unpaidStatements = statements.filter(
    (statement) => statement.lifecycleStatus !== "paid",
  )
  const activeStatement = unpaidStatements.find(
    (statement) =>
      statement.periodStart <= today && today <= statement.periodEnd,
  )

  return activeStatement ?? unpaidStatements[0] ?? statements[0]
}

const creditCardDueStatusPriority: Record<CreditCardDueStatus, number> = {
  paid: 0,
  upcoming: 1,
  "due-soon": 2,
  "due-today": 3,
  overdue: 4,
}

function selectCreditCardPendingSummary(
  statements: CreditCardStatement[],
  currentStatement?: CreditCardStatement,
) {
  const unpaidStatements = statements.filter(
    (statement) => statement.lifecycleStatus !== "paid",
  )
  const oldestPayableStatement = unpaidStatements
    .filter((statement) => statement.totalAmount > 0)
    .toSorted((left, right) => {
      const dueDateComparison = left.paymentDueDate.localeCompare(
        right.paymentDueDate,
      )

      return dueDateComparison !== 0
        ? dueDateComparison
        : left.periodStart.localeCompare(right.periodStart)
    })[0]
  const mostUrgentUnpaidStatement = unpaidStatements.toSorted((left, right) => {
    const statusComparison =
      creditCardDueStatusPriority[right.dueStatus] -
      creditCardDueStatusPriority[left.dueStatus]

    if (statusComparison !== 0) {
      return statusComparison
    }

    const dueDateComparison = left.paymentDueDate.localeCompare(
      right.paymentDueDate,
    )

    return dueDateComparison !== 0
      ? dueDateComparison
      : left.periodStart.localeCompare(right.periodStart)
  })[0]
  const totalPendingCents = unpaidStatements.reduce(
    (sum, statement) => sum + Math.round(statement.totalAmount * 100),
    0,
  )

  return {
    totalPendingAmount: centsToDollars(totalPendingCents),
    oldestPayableStatement,
    hasOverdueStatement: mostUrgentUnpaidStatement?.dueStatus === "overdue",
    dueStatus:
      mostUrgentUnpaidStatement?.dueStatus ??
      currentStatement?.dueStatus ??
      "upcoming",
  }
}

function selectCreditCards(
  cards: CreditCardRecord[],
  obligations: CreditCardObligation[],
  payments: CreditCardPaymentRecord[],
  reservedInstallmentCentsByCard: Map<string, number>,
  counterparties: Map<string, CounterpartyRecord>,
  categories: Map<string, CategoryRecord>,
  today: string,
): CreditCard[] {
  const selectedStatements = selectCreditCardStatements(
    obligations,
    counterparties,
    categories,
    today,
  )
  const selectedPayments = selectCreditCardPayments(payments)

  return cards.map((card) => {
    const cardStatements = selectedStatements
      .filter((statement) => statement.creditCardId === card.id)
      .sort((a, b) => b.periodEnd.localeCompare(a.periodEnd))
    const cardPayments = selectedPayments.filter(
      (payment) => payment.creditCardId === card.id,
    )
    const currentStatement = selectCurrentCreditCardStatement(cardStatements)
    const currentStatementAmount = currentStatement?.totalAmount ?? 0
    const pendingSummary = selectCreditCardPendingSummary(
      cardStatements,
      currentStatement,
    )
    const creditLimit = centsToDollars(card.credit_limit_cents)
    const reservedInstallmentAmount = centsToDollars(
      reservedInstallmentCentsByCard.get(card.id) ?? 0,
    )

    return {
      id: card.id,
      nickname: card.nickname,
      issuer: card.issuer,
      network: card.network,
      lastFour: card.last_four,
      expirationMonth: card.expiration_month,
      expirationYear: card.expiration_year,
      creditLimit,
      closingDay: card.closing_day_of_month,
      paymentDueDay: card.payment_due_day_of_month,
      color: card.theme_color,
      initials: getInitials(card.nickname),
      archivedAt: card.archived_at ?? undefined,
      currentStatement,
      statements: cardStatements,
      payments: cardPayments,
      currentStatementAmount,
      totalPendingAmount: pendingSummary.totalPendingAmount,
      oldestPayableStatement: pendingSummary.oldestPayableStatement,
      hasOverdueStatement: pendingSummary.hasOverdueStatement,
      reservedInstallmentAmount,
      availableCredit:
        creditLimit -
        pendingSummary.totalPendingAmount -
        reservedInstallmentAmount,
      dueStatus: pendingSummary.dueStatus,
    }
  })
}

function selectCreditCardSummary(
  creditCards: CreditCard[],
): FinanceViewModel["creditCardSummary"] {
  const activeCards = creditCards.filter((card) => !card.archivedAt)
  const paidCards = activeCards.filter(
    (card) => card.currentStatement?.dueStatus === "paid",
  )
  const upcomingCards = activeCards.filter(
    (card) => card.dueStatus === "upcoming",
  )
  const urgentCards = activeCards.filter(
    (card) =>
      card.dueStatus === "due-soon" ||
      card.dueStatus === "due-today" ||
      card.dueStatus === "overdue",
  )

  return [
    {
      label: "Paid",
      count: paidCards.length,
      amount: paidCards.reduce((sum, card) => sum + card.totalPendingAmount, 0),
      color: "chart-1",
    },
    {
      label: "Upcoming",
      count: upcomingCards.length,
      amount: upcomingCards.reduce(
        (sum, card) => sum + card.totalPendingAmount,
        0,
      ),
      color: "chart-4",
    },
    {
      label: "Due Soon / Overdue",
      count: urgentCards.length,
      amount: urgentCards.reduce(
        (sum, card) => sum + card.totalPendingAmount,
        0,
      ),
      color: "chart-2",
    },
  ]
}

function selectSummaryStats(
  state: FinanceState,
): FinanceViewModel["summaryStats"] {
  const primaryAccount = selectPrimaryPaymentAccount(state.accounts)
  const accountSummary = state.accountSummaries[0]

  return [
    {
      label: "Current Balance",
      amount: centsToDollars(primaryAccount?.current_balance_cents ?? 0),
      variant: "primary",
    },
    {
      label: "Income",
      amount: centsToDollars(accountSummary?.income_cents ?? 0),
      variant: "default",
    },
    {
      label: "Expenses",
      amount: centsToDollars(accountSummary?.expense_cents ?? 0),
      variant: "default",
    },
  ]
}

export function selectFinanceViewModel(
  state: FinanceState,
  today = todayIsoDate(),
): FinanceViewModel {
  const categories = byId(state.categories)
  const counterparties = byId(state.counterparties)
  const creditCardsById = byId(state.creditCards)
  const creditCardStatementsByCardId = groupCreditCardStatementsByCardId(
    state.creditCardStatements,
  )
  const budgetsById = byId(state.budgets)
  const currentBudgetAssignments = selectBudgetAssignmentsForCurrentBudgets(
    state.budgetTransactionAssignments,
    state.budgets,
  )
  const pots = state.pots.map((pot) => ({
    id: pot.id,
    name: pot.name,
    amount: centsToDollars(pot.balance_cents),
    target: centsToDollars(pot.target_cents),
    color: pot.theme_color,
    dueDate: pot.due_date ?? undefined,
  }))
  const budgets = selectBudgets(
    state.budgets,
    currentBudgetAssignments,
    categories,
  )
  const transactions = selectTransactions(
    state.transactions,
    categories,
    counterparties,
    creditCardsById,
    currentBudgetAssignments,
    budgetsById,
  )
  const paymentsByBillId = groupPaymentsByBillId(state.recurringBillPayments)
  const recurringBills = selectRecurringBills(
    state.recurringBills,
    paymentsByBillId,
    counterparties,
    categories,
    creditCardsById,
    creditCardStatementsByCardId,
    today,
  )
  const totalBillsAmount = recurringBills
    .filter((bill) => !bill.archivedAt)
    .reduce((sum, bill) => sum + bill.amount, 0)
  const creditCardObligations = buildCreditCardObligations({
    cards: state.creditCards,
    statements: state.creditCardStatements,
    cardPayments: state.creditCardPayments,
    transactions: state.transactions,
    recurringBills: state.recurringBills,
    recurringBillPayments: state.recurringBillPayments,
    asOfDate: today,
    throughDate: today,
  })
  const creditCards = selectCreditCards(
    state.creditCards,
    creditCardObligations,
    state.creditCardPayments,
    selectReservedInstallmentCentsByCard(
      state.recurringBills,
      paymentsByBillId,
      creditCardObligations,
      today,
    ),
    counterparties,
    categories,
    today,
  )
  const creditCardSummary = selectCreditCardSummary(creditCards)

  return {
    summaryStats: selectSummaryStats(state),
    pots,
    totalSaved: pots.reduce((sum, pot) => sum + pot.amount, 0),
    budgets,
    budgetSpent: budgets.reduce((sum, budget) => sum + budget.spent, 0),
    budgetLimit: budgets.reduce((sum, budget) => sum + budget.maximum, 0),
    transactions,
    transactionCategories: selectTransactionCategories(state.categories),
    recurringBills,
    recurringBillsSummary: selectRecurringBillsSummary(recurringBills, today),
    totalBillsAmount,
    creditCards,
    creditCardSummary,
    totalCreditCardPendingBalance: creditCards.reduce(
      (sum, card) => sum + card.totalPendingAmount,
      0,
    ),
  }
}

export function selectCashForecast(
  state: FinanceState,
  asOf: Date,
): CashForecastResult {
  return buildCashForecast(state, asOf)
}
