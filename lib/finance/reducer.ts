import type {
  AccountRecord,
  AccountSummaryRecord,
  BudgetRecord,
  BudgetTransactionAssignmentRecord,
  CashForecastAdjustmentRecord,
  CashForecastSettingsRecord,
  CategoryRecord,
  CounterpartyRecord,
  CreditCardPaymentRecord,
  CreditCardRecord,
  CreditCardStatementRecord,
  FinanceState,
  NewBudgetRecord,
  NewCashForecastAdjustmentRecord,
  NewCategoryRecord,
  NewCounterpartyRecord,
  NewCreditCardRecord,
  NewPotRecord,
  NewRecurringBillRecord,
  NewTransactionRecord,
  PotMovementRequest,
  PotRecord,
  RecurringBillPaymentRecord,
  RecurringBillPaymentSource,
  RecurringBillRecord,
  TransactionRecord,
} from "./types"

interface TransactionMutationPayload {
  transaction: TransactionRecord
  accounts: AccountRecord[]
  accountSummaries: AccountSummaryRecord[]
  creditCardStatements: CreditCardStatementRecord[]
  budgetAssignment: BudgetTransactionAssignmentRecord | null
}

export type FinanceAction =
  | { type: "transaction/add"; transaction: TransactionRecord }
  | { type: "transaction/save"; payload: TransactionMutationPayload }
  | {
      type: "transaction/update"
      id: string
      updates: Partial<Omit<TransactionRecord, "id" | "user_id">>
    }
  | {
      type: "transaction/delete"
      id: string
      accounts?: AccountRecord[]
      accountSummaries?: AccountSummaryRecord[]
      creditCardStatements?: CreditCardStatementRecord[]
    }
  | { type: "category/add"; category: CategoryRecord }
  | { type: "category/update"; category: CategoryRecord }
  | { type: "category/delete"; id: string }
  | { type: "counterparty/add"; counterparty: CounterpartyRecord }
  | { type: "counterparty/update"; counterparty: CounterpartyRecord }
  | { type: "counterparty/delete"; id: string }
  | { type: "budget/add"; budget: BudgetRecord; spent_cents?: number }
  | {
      type: "budget/update"
      id: string
      updates: Partial<Omit<BudgetRecord, "id" | "user_id">>
      spent_cents?: number
    }
  | { type: "budget/delete"; id: string }
  | {
      type: "budget-assignment/upsert"
      assignment: BudgetTransactionAssignmentRecord
    }
  | { type: "budget-assignment/delete"; transaction_id: string }
  | { type: "pot/add"; pot: PotRecord }
  | {
      type: "pot/update"
      id: string
      updates: Partial<Omit<PotRecord, "id" | "user_id">>
    }
  | { type: "pot/delete"; id: string }
  | {
      type: "pot/move"
      payload: {
        pots: PotRecord[]
        transaction: TransactionRecord | null
        accounts: AccountRecord[]
        accountSummaries: AccountSummaryRecord[]
      }
    }
  | { type: "recurring-bill/add"; bill: RecurringBillRecord }
  | { type: "recurring-bill/update"; bill: RecurringBillRecord }
  | { type: "recurring-bill/delete"; id: string }
  | {
      type: "recurring-bill/settle"
      billPayment: RecurringBillPaymentRecord
      transaction?: TransactionRecord
      accounts?: AccountRecord[]
      accountSummaries?: AccountSummaryRecord[]
      creditCardStatements?: CreditCardStatementRecord[]
    }
  | { type: "credit-card/add"; creditCard: CreditCardRecord }
  | {
      type: "credit-card/update"
      id: string
      updates: Partial<Omit<CreditCardRecord, "id" | "user_id">>
    }
  | {
      type: "credit-card/statement-upsert"
      statements: CreditCardStatementRecord[]
    }
  | {
      type: "credit-card/payment"
      payment: CreditCardPaymentRecord
      transaction: TransactionRecord
      counterparty?: CounterpartyRecord
      accounts: AccountRecord[]
      accountSummaries?: AccountSummaryRecord[]
      statement: CreditCardStatementRecord
      billTransactions?: TransactionRecord[]
      recurringBillPayments?: RecurringBillPaymentRecord[]
    }
  | {
      type: "cash-forecast/settings-save"
      settings: CashForecastSettingsRecord
    }
  | {
      type: "cash-forecast/adjustment-add"
      adjustment: CashForecastAdjustmentRecord
    }
  | {
      type: "cash-forecast/adjustment-update"
      adjustment: CashForecastAdjustmentRecord
    }
  | { type: "cash-forecast/adjustment-delete"; id: string }

export interface FinanceActions {
  addTransaction: (
    transaction: NewTransactionRecord,
    budgetId: string | null,
  ) => Promise<FinanceMutationResult>
  updateTransaction: (
    id: string,
    updates: Omit<NewTransactionRecord, "id">,
    budgetId: string | null,
  ) => Promise<FinanceMutationResult>
  deleteTransaction: (id: string) => Promise<FinanceMutationResult>
  addCategory: (
    category: Pick<NewCategoryRecord, "id" | "name" | "theme_color">,
  ) => Promise<FinanceMutationResult>
  updateCategory: (
    id: string,
    updates: Partial<Pick<CategoryRecord, "name" | "theme_color">>,
  ) => Promise<FinanceMutationResult>
  deleteCategory: (id: string) => Promise<FinanceMutationResult>
  addCounterparty: (
    counterparty: Omit<NewCounterpartyRecord, "avatar_url">,
  ) => Promise<FinanceMutationResult>
  updateCounterparty: (
    id: string,
    updates: Partial<Omit<CounterpartyRecord, "id" | "user_id" | "avatar_url">>,
  ) => Promise<FinanceMutationResult>
  deleteCounterparty: (id: string) => Promise<FinanceMutationResult>
  addBudget: (
    budget: NewBudgetRecord,
    spent_cents?: number,
  ) => Promise<FinanceMutationResult>
  updateBudget: (
    id: string,
    updates: Partial<Omit<BudgetRecord, "id" | "user_id">>,
    spent_cents?: number,
  ) => Promise<FinanceMutationResult>
  deleteBudget: (id: string) => Promise<FinanceMutationResult>
  assignTransactionToBudget: (
    transactionId: string,
    budgetId: string,
  ) => Promise<FinanceMutationResult>
  unassignTransactionFromBudget: (
    transactionId: string,
  ) => Promise<FinanceMutationResult>
  addPot: (pot: NewPotRecord) => Promise<FinanceMutationResult>
  updatePot: (
    id: string,
    updates: Partial<Omit<PotRecord, "id" | "user_id">>,
  ) => Promise<FinanceMutationResult>
  deletePot: (id: string) => Promise<FinanceMutationResult>
  movePot: (movement: PotMovementRequest) => Promise<FinanceMutationResult>
  addRecurringBill: (
    bill: Omit<NewRecurringBillRecord, "archived_at">,
  ) => Promise<FinanceMutationResult>
  updateRecurringBill: (
    id: string,
    updates: Partial<
      Omit<RecurringBillRecord, "id" | "user_id" | "archived_at">
    >,
  ) => Promise<FinanceMutationResult>
  archiveRecurringBill: (id: string) => Promise<FinanceMutationResult>
  deleteRecurringBill: (id: string) => Promise<FinanceMutationResult>
  payRecurringBillOccurrence: (
    billId: string,
    dueDate: string,
    source: RecurringBillPaymentSource,
    paidAt: string,
  ) => Promise<FinanceMutationResult>
  skipRecurringBillOccurrence: (
    billId: string,
    dueDate: string,
  ) => Promise<FinanceMutationResult>
  addCreditCard: (
    creditCard: NewCreditCardRecord,
  ) => Promise<FinanceMutationResult>
  updateCreditCard: (
    id: string,
    updates: Partial<Omit<CreditCardRecord, "id" | "user_id">>,
  ) => Promise<FinanceMutationResult>
  archiveCreditCard: (id: string) => Promise<FinanceMutationResult>
  payCreditCardStatement: (
    statementId: string,
    paidAt: string,
  ) => Promise<FinanceMutationResult>
  payCreditCardCycle: (
    creditCardId: string,
    referenceDate: string,
    paidAt: string,
  ) => Promise<FinanceMutationResult>
  closeCreditCardStatement: (
    statementId: string,
  ) => Promise<FinanceMutationResult>
  saveCashForecastSettings: (
    defaultMonthlyIncomeCents: number,
  ) => Promise<FinanceMutationResult>
  addCashForecastAdjustment: (
    adjustment: NewCashForecastAdjustmentRecord,
  ) => Promise<FinanceMutationResult>
  updateCashForecastAdjustment: (
    id: string,
    adjustment: Omit<NewCashForecastAdjustmentRecord, "id">,
  ) => Promise<FinanceMutationResult>
  deleteCashForecastAdjustment: (id: string) => Promise<FinanceMutationResult>
}

export type FinanceMutationResult =
  | { ok: true; message: string }
  | {
      ok: false
      message: string
      fieldErrors?: Record<string, string[] | undefined>
    }

/**
 * Server Actions can reject instead of resolving when the request itself
 * never reaches our try/catch (e.g. a dropped connection, or Next.js failing
 * to decode the response). Routing every call through this helper guarantees
 * callers always get a normal `{ ok: false }` result to show inline, instead
 * of an uncaught exception that crashes the UI with no feedback.
 */
export async function runFinanceAction<
  T extends { ok: boolean; message: string },
>(
  action: () => Promise<T>,
): Promise<T | Extract<FinanceMutationResult, { ok: false }>> {
  try {
    return await action()
  } catch (error) {
    console.error("Finance action request failed:", error)

    return {
      ok: false,
      message:
        "We couldn't reach the server. Check your connection and try again.",
    }
  }
}

function updateById<T extends { id: string }>(
  records: T[],
  id: string,
  updates: Partial<Omit<T, "id">>,
): T[] {
  return records.map((record) =>
    record.id === id ? { ...record, ...updates } : record,
  )
}

function removeById<T extends { id: string }>(records: T[], id: string): T[] {
  return records.filter((record) => record.id !== id)
}

function upsertById<T extends { id: string }>(
  records: T[],
  nextRecord: T,
): T[] {
  const hasRecord = records.some((record) => record.id === nextRecord.id)

  if (!hasRecord) {
    return [...records, nextRecord]
  }

  return records.map((record) =>
    record.id === nextRecord.id ? nextRecord : record,
  )
}

function upsertManyById<T extends { id: string }>(
  records: T[],
  nextRecords: T[],
): T[] {
  return nextRecords.reduce(upsertById, records)
}

function upsertBudgetSummary(
  summaries: FinanceState["budgetSummaries"],
  budget_id: string,
  user_id: string,
  spent_cents: number,
): FinanceState["budgetSummaries"] {
  const hasSummary = summaries.some(
    (summary) => summary.budget_id === budget_id,
  )

  if (!hasSummary) {
    return [...summaries, { budget_id, user_id, spent_cents }]
  }

  return summaries.map((summary) =>
    summary.budget_id === budget_id ? { ...summary, spent_cents } : summary,
  )
}

function upsertAccountSummaries(
  summaries: FinanceState["accountSummaries"],
  nextSummaries: AccountSummaryRecord[],
): FinanceState["accountSummaries"] {
  return nextSummaries.reduce(
    (currentSummaries, nextSummary) =>
      upsertById(currentSummaries, nextSummary),
    summaries,
  )
}

function upsertBudgetAssignment(
  assignments: FinanceState["budgetTransactionAssignments"],
  nextAssignment: BudgetTransactionAssignmentRecord,
): FinanceState["budgetTransactionAssignments"] {
  const hasAssignment = assignments.some(
    (assignment) => assignment.transaction_id === nextAssignment.transaction_id,
  )

  if (!hasAssignment) {
    return [...assignments, nextAssignment]
  }

  return assignments.map((assignment) =>
    assignment.transaction_id === nextAssignment.transaction_id
      ? nextAssignment
      : assignment,
  )
}

export function financeReducer(
  state: FinanceState,
  action: FinanceAction,
): FinanceState {
  switch (action.type) {
    case "transaction/add":
      return {
        ...state,
        transactions: [...state.transactions, action.transaction],
      }
    case "transaction/save":
      return {
        ...state,
        transactions: upsertById(
          state.transactions,
          action.payload.transaction,
        ).sort((a, b) => b.posted_at.localeCompare(a.posted_at)),
        accounts: upsertManyById(state.accounts, action.payload.accounts),
        accountSummaries: upsertAccountSummaries(
          state.accountSummaries,
          action.payload.accountSummaries,
        ),
        creditCardStatements: upsertManyById(
          state.creditCardStatements,
          action.payload.creditCardStatements,
        ),
        budgetTransactionAssignments: action.payload.budgetAssignment
          ? upsertBudgetAssignment(
              state.budgetTransactionAssignments,
              action.payload.budgetAssignment,
            )
          : state.budgetTransactionAssignments.filter(
              (assignment) =>
                assignment.transaction_id !== action.payload.transaction.id,
            ),
      }
    case "transaction/update":
      return {
        ...state,
        transactions: updateById(state.transactions, action.id, action.updates),
      }
    case "transaction/delete":
      return {
        ...state,
        transactions: removeById(state.transactions, action.id),
        accounts: action.accounts
          ? upsertManyById(state.accounts, action.accounts)
          : state.accounts,
        accountSummaries: action.accountSummaries
          ? upsertAccountSummaries(
              state.accountSummaries,
              action.accountSummaries,
            )
          : state.accountSummaries,
        creditCardStatements: action.creditCardStatements
          ? upsertManyById(
              state.creditCardStatements,
              action.creditCardStatements,
            )
          : state.creditCardStatements,
        budgetTransactionAssignments: state.budgetTransactionAssignments.filter(
          (assignment) => assignment.transaction_id !== action.id,
        ),
      }
    case "category/add":
      return {
        ...state,
        categories: [...state.categories, action.category].sort((a, b) =>
          a.name.localeCompare(b.name),
        ),
      }
    case "category/update":
      return {
        ...state,
        categories: upsertById(state.categories, action.category).sort((a, b) =>
          a.name.localeCompare(b.name),
        ),
      }
    case "category/delete":
      return { ...state, categories: removeById(state.categories, action.id) }
    case "counterparty/add":
      return {
        ...state,
        counterparties: [...state.counterparties, action.counterparty].sort(
          (a, b) => a.display_name.localeCompare(b.display_name),
        ),
      }
    case "counterparty/update":
      return {
        ...state,
        counterparties: upsertById(
          state.counterparties,
          action.counterparty,
        ).sort((a, b) => a.display_name.localeCompare(b.display_name)),
      }
    case "counterparty/delete":
      return {
        ...state,
        counterparties: removeById(state.counterparties, action.id),
      }
    case "budget/add":
      return {
        ...state,
        budgets: [...state.budgets, action.budget],
        budgetSummaries:
          action.spent_cents === undefined
            ? state.budgetSummaries
            : upsertBudgetSummary(
                state.budgetSummaries,
                action.budget.id,
                action.budget.user_id,
                action.spent_cents,
              ),
      }
    case "budget/update": {
      const existingBudget = state.budgets.find(
        (budget) => budget.id === action.id,
      )

      return {
        ...state,
        budgets: updateById(state.budgets, action.id, action.updates),
        budgetSummaries:
          action.spent_cents === undefined || !existingBudget
            ? state.budgetSummaries
            : upsertBudgetSummary(
                state.budgetSummaries,
                action.id,
                existingBudget.user_id,
                action.spent_cents,
              ),
      }
    }
    case "budget/delete":
      return {
        ...state,
        budgets: removeById(state.budgets, action.id),
        budgetSummaries: state.budgetSummaries.filter(
          (summary) => summary.budget_id !== action.id,
        ),
        budgetTransactionAssignments: state.budgetTransactionAssignments.filter(
          (assignment) => assignment.budget_id !== action.id,
        ),
      }
    case "budget-assignment/upsert":
      return {
        ...state,
        budgetTransactionAssignments: upsertBudgetAssignment(
          state.budgetTransactionAssignments,
          action.assignment,
        ),
      }
    case "budget-assignment/delete":
      return {
        ...state,
        budgetTransactionAssignments: state.budgetTransactionAssignments.filter(
          (assignment) => assignment.transaction_id !== action.transaction_id,
        ),
      }
    case "pot/add":
      return { ...state, pots: [...state.pots, action.pot] }
    case "pot/update":
      return {
        ...state,
        pots: updateById(state.pots, action.id, action.updates),
      }
    case "pot/delete":
      return { ...state, pots: removeById(state.pots, action.id) }
    case "pot/move":
      return {
        ...state,
        pots: upsertManyById(state.pots, action.payload.pots),
        transactions: action.payload.transaction
          ? upsertById(state.transactions, action.payload.transaction).sort(
              (a, b) => b.posted_at.localeCompare(a.posted_at),
            )
          : state.transactions,
        accounts: upsertManyById(state.accounts, action.payload.accounts),
        accountSummaries: upsertAccountSummaries(
          state.accountSummaries,
          action.payload.accountSummaries,
        ),
      }
    case "recurring-bill/add":
      return {
        ...state,
        recurringBills: [...state.recurringBills, action.bill].sort((a, b) =>
          a.first_due_date.localeCompare(b.first_due_date),
        ),
      }
    case "recurring-bill/update":
      return {
        ...state,
        recurringBills: upsertById(state.recurringBills, action.bill).sort(
          (a, b) => a.first_due_date.localeCompare(b.first_due_date),
        ),
      }
    case "recurring-bill/delete":
      return {
        ...state,
        recurringBills: removeById(state.recurringBills, action.id),
      }
    case "recurring-bill/settle":
      return {
        ...state,
        recurringBillPayments: upsertById(
          state.recurringBillPayments,
          action.billPayment,
        ),
        transactions: action.transaction
          ? upsertById(state.transactions, action.transaction).sort((a, b) =>
              b.posted_at.localeCompare(a.posted_at),
            )
          : state.transactions,
        accounts: action.accounts
          ? upsertManyById(state.accounts, action.accounts)
          : state.accounts,
        accountSummaries: action.accountSummaries
          ? upsertAccountSummaries(
              state.accountSummaries,
              action.accountSummaries,
            )
          : state.accountSummaries,
        creditCardStatements: action.creditCardStatements
          ? upsertManyById(
              state.creditCardStatements,
              action.creditCardStatements,
            )
          : state.creditCardStatements,
      }
    case "credit-card/add":
      return {
        ...state,
        creditCards: [...state.creditCards, action.creditCard].sort((a, b) =>
          a.nickname.localeCompare(b.nickname),
        ),
      }
    case "credit-card/update":
      return {
        ...state,
        creditCards: updateById(
          state.creditCards,
          action.id,
          action.updates,
        ).sort((a, b) => a.nickname.localeCompare(b.nickname)),
      }
    case "credit-card/statement-upsert":
      return {
        ...state,
        creditCardStatements: upsertManyById(
          state.creditCardStatements,
          action.statements,
        ),
      }
    case "credit-card/payment":
      return {
        ...state,
        creditCardPayments: upsertById(
          state.creditCardPayments,
          action.payment,
        ),
        counterparties: action.counterparty
          ? upsertById(state.counterparties, action.counterparty).sort((a, b) =>
              a.display_name.localeCompare(b.display_name),
            )
          : state.counterparties,
        transactions: upsertManyById(state.transactions, [
          ...(action.billTransactions ?? []),
          action.transaction,
        ]).sort((a, b) => b.posted_at.localeCompare(a.posted_at)),
        accounts: upsertManyById(state.accounts, action.accounts),
        accountSummaries: action.accountSummaries
          ? upsertAccountSummaries(
              state.accountSummaries,
              action.accountSummaries,
            )
          : state.accountSummaries,
        creditCardStatements: upsertById(
          state.creditCardStatements,
          action.statement,
        ),
        recurringBillPayments: action.recurringBillPayments
          ? upsertManyById(
              state.recurringBillPayments,
              action.recurringBillPayments,
            )
          : state.recurringBillPayments,
      }
    case "cash-forecast/settings-save":
      return {
        ...state,
        cashForecastSettings: action.settings,
      }
    case "cash-forecast/adjustment-add":
    case "cash-forecast/adjustment-update":
      return {
        ...state,
        cashForecastAdjustments: upsertById(
          state.cashForecastAdjustments,
          action.adjustment,
        ).sort((left, right) => {
          const createdComparison = left.created_at.localeCompare(
            right.created_at,
          )

          return createdComparison !== 0
            ? createdComparison
            : left.id.localeCompare(right.id)
        }),
      }
    case "cash-forecast/adjustment-delete":
      return {
        ...state,
        cashForecastAdjustments: removeById(
          state.cashForecastAdjustments,
          action.id,
        ),
      }
    default:
      return state
  }
}
