import { getCreditCardDueStatus } from "@/lib/finance/credit-card-cycle"
import { formatDisplayDate } from "@/lib/format"
import type {
  Budget,
  CreditCard,
  CreditCardPayment,
  CreditCardStatement,
  RecurringBill,
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

function selectRecurringBills(
  recurringBills: RecurringBillRecord[],
  counterparties: Map<string, CounterpartyRecord>,
): RecurringBill[] {
  return recurringBills.map((bill) => {
    const counterparty = getRequired(
      counterparties,
      bill.counterparty_id,
      "counterparty",
    )

    return {
      id: bill.id,
      name: counterparty.display_name,
      avatarUrl: counterparty.avatar_url ?? "",
      amount: centsToDollars(bill.amount_cents),
      dueDay: bill.due_day_of_month,
      status: bill.status,
    }
  })
}

function selectRecurringBillsSummary(
  recurringBills: RecurringBill[],
): FinanceViewModel["recurringBillsSummary"] {
  const paidAmount = recurringBills
    .filter((bill) => bill.status === "paid")
    .reduce((sum, bill) => sum + bill.amount, 0)
  const upcomingAmount = recurringBills
    .filter((bill) => bill.status === "upcoming" || bill.status === "due-soon")
    .reduce((sum, bill) => sum + bill.amount, 0)
  const dueSoonAmount = recurringBills
    .filter((bill) => bill.status === "due-soon")
    .reduce((sum, bill) => sum + bill.amount, 0)

  return [
    { label: "Paid Bills", amount: paidAmount, color: "chart-1" },
    {
      label: "Total Upcoming",
      amount: upcomingAmount,
      color: "chart-4",
    },
    { label: "Due Soon", amount: dueSoonAmount, color: "chart-2" },
  ]
}

function selectCreditCardStatements(
  statements: CreditCardStatementRecord[],
): CreditCardStatement[] {
  return statements.map((statement) => ({
    id: statement.id,
    creditCardId: statement.credit_card_id,
    periodStart: statement.period_start,
    periodEnd: statement.period_end,
    paymentDueDate: statement.payment_due_date,
    amount: centsToDollars(statement.statement_amount_cents),
    lifecycleStatus: statement.lifecycle_status,
    dueStatus: getCreditCardDueStatus(statement),
    paidAt: statement.paid_at ?? undefined,
  }))
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

function selectCreditCards(
  cards: CreditCardRecord[],
  statements: CreditCardStatementRecord[],
  payments: CreditCardPaymentRecord[],
): CreditCard[] {
  const selectedStatements = selectCreditCardStatements(statements)
  const selectedPayments = selectCreditCardPayments(payments)

  return cards.map((card) => {
    const cardStatements = selectedStatements
      .filter((statement) => statement.creditCardId === card.id)
      .sort((a, b) => b.periodEnd.localeCompare(a.periodEnd))
    const cardPayments = selectedPayments.filter(
      (payment) => payment.creditCardId === card.id,
    )
    const currentStatement = selectCurrentCreditCardStatement(cardStatements)
    const currentStatementAmount = currentStatement?.amount ?? 0

    return {
      id: card.id,
      nickname: card.nickname,
      issuer: card.issuer,
      network: card.network,
      lastFour: card.last_four,
      expirationMonth: card.expiration_month,
      expirationYear: card.expiration_year,
      creditLimit: centsToDollars(card.credit_limit_cents),
      closingDay: card.closing_day_of_month,
      paymentDueDay: card.payment_due_day_of_month,
      color: card.theme_color,
      initials: getInitials(card.nickname),
      archivedAt: card.archived_at ?? undefined,
      currentStatement,
      statements: cardStatements,
      payments: cardPayments,
      currentStatementAmount,
      availableCredit:
        centsToDollars(card.credit_limit_cents) - currentStatementAmount,
      dueStatus: currentStatement?.dueStatus ?? "upcoming",
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
      amount: paidCards.reduce(
        (sum, card) => sum + card.currentStatementAmount,
        0,
      ),
      color: "chart-1",
    },
    {
      label: "Upcoming",
      count: upcomingCards.length,
      amount: upcomingCards.reduce(
        (sum, card) => sum + card.currentStatementAmount,
        0,
      ),
      color: "chart-4",
    },
    {
      label: "Due Soon / Overdue",
      count: urgentCards.length,
      amount: urgentCards.reduce(
        (sum, card) => sum + card.currentStatementAmount,
        0,
      ),
      color: "chart-2",
    },
  ]
}

function selectSummaryStats(
  state: FinanceState,
): FinanceViewModel["summaryStats"] {
  const primaryAccount = state.accounts[0]
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

export function selectFinanceViewModel(state: FinanceState): FinanceViewModel {
  const categories = byId(state.categories)
  const counterparties = byId(state.counterparties)
  const creditCardsById = byId(state.creditCards)
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
  const recurringBills = selectRecurringBills(
    state.recurringBills,
    counterparties,
  )
  const totalBillsAmount = recurringBills.reduce(
    (sum, bill) => sum + bill.amount,
    0,
  )
  const creditCards = selectCreditCards(
    state.creditCards,
    state.creditCardStatements,
    state.creditCardPayments,
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
    recurringBillsSummary: selectRecurringBillsSummary(recurringBills),
    totalBillsAmount,
    creditCards,
    creditCardSummary,
    totalCreditCardStatementBalance: creditCards.reduce(
      (sum, card) => sum + card.currentStatementAmount,
      0,
    ),
  }
}
