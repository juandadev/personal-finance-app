import type {
  BudgetRecord,
  FinanceState,
  PotRecord,
  RecurringBillRecord,
  TransactionRecord,
} from "./types"

export type FinanceAction =
  | { type: "transaction/add"; transaction: TransactionRecord }
  | { type: "transaction/update"; id: string; updates: Partial<Omit<TransactionRecord, "id">> }
  | { type: "transaction/delete"; id: string }
  | { type: "budget/add"; budget: BudgetRecord; spentCents?: number }
  | { type: "budget/update"; id: string; updates: Partial<Omit<BudgetRecord, "id">>; spentCents?: number }
  | { type: "budget/delete"; id: string }
  | { type: "pot/add"; pot: PotRecord }
  | { type: "pot/update"; id: string; updates: Partial<Omit<PotRecord, "id">> }
  | { type: "pot/delete"; id: string }
  | { type: "pot/deposit"; id: string; amountCents: number }
  | { type: "pot/withdraw"; id: string; amountCents: number }
  | { type: "recurring-bill/add"; bill: RecurringBillRecord }
  | { type: "recurring-bill/update"; id: string; updates: Partial<Omit<RecurringBillRecord, "id">> }
  | { type: "recurring-bill/delete"; id: string }

export interface FinanceActions {
  addTransaction: (transaction: TransactionRecord) => void
  updateTransaction: (id: string, updates: Partial<Omit<TransactionRecord, "id">>) => void
  deleteTransaction: (id: string) => void
  addBudget: (budget: BudgetRecord, spentCents?: number) => void
  updateBudget: (id: string, updates: Partial<Omit<BudgetRecord, "id">>, spentCents?: number) => void
  deleteBudget: (id: string) => void
  addPot: (pot: PotRecord) => void
  updatePot: (id: string, updates: Partial<Omit<PotRecord, "id">>) => void
  deletePot: (id: string) => void
  depositToPot: (id: string, amountCents: number) => void
  withdrawFromPot: (id: string, amountCents: number) => void
  addRecurringBill: (bill: RecurringBillRecord) => void
  updateRecurringBill: (id: string, updates: Partial<Omit<RecurringBillRecord, "id">>) => void
  deleteRecurringBill: (id: string) => void
}

function updateById<T extends { id: string }>(
  records: T[],
  id: string,
  updates: Partial<Omit<T, "id">>,
): T[] {
  return records.map((record) => (record.id === id ? { ...record, ...updates } : record))
}

function removeById<T extends { id: string }>(records: T[], id: string): T[] {
  return records.filter((record) => record.id !== id)
}

function upsertBudgetSummary(
  summaries: FinanceState["budgetSummaries"],
  budgetId: string,
  spentCents: number,
): FinanceState["budgetSummaries"] {
  const hasSummary = summaries.some((summary) => summary.budgetId === budgetId)

  if (!hasSummary) {
    return [...summaries, { budgetId, spentCents }]
  }

  return summaries.map((summary) =>
    summary.budgetId === budgetId ? { ...summary, spentCents } : summary,
  )
}

export function financeReducer(state: FinanceState, action: FinanceAction): FinanceState {
  switch (action.type) {
    case "transaction/add":
      return { ...state, transactions: [...state.transactions, action.transaction] }
    case "transaction/update":
      return { ...state, transactions: updateById(state.transactions, action.id, action.updates) }
    case "transaction/delete":
      return { ...state, transactions: removeById(state.transactions, action.id) }
    case "budget/add":
      return {
        ...state,
        budgets: [...state.budgets, action.budget],
        budgetSummaries:
          action.spentCents === undefined
            ? state.budgetSummaries
            : upsertBudgetSummary(state.budgetSummaries, action.budget.id, action.spentCents),
      }
    case "budget/update":
      return {
        ...state,
        budgets: updateById(state.budgets, action.id, action.updates),
        budgetSummaries:
          action.spentCents === undefined
            ? state.budgetSummaries
            : upsertBudgetSummary(state.budgetSummaries, action.id, action.spentCents),
      }
    case "budget/delete":
      return {
        ...state,
        budgets: removeById(state.budgets, action.id),
        budgetSummaries: state.budgetSummaries.filter((summary) => summary.budgetId !== action.id),
      }
    case "pot/add":
      return { ...state, pots: [...state.pots, action.pot] }
    case "pot/update":
      return { ...state, pots: updateById(state.pots, action.id, action.updates) }
    case "pot/delete":
      return { ...state, pots: removeById(state.pots, action.id) }
    case "pot/deposit":
      return {
        ...state,
        pots: state.pots.map((pot) =>
          pot.id === action.id
            ? { ...pot, balanceCents: pot.balanceCents + Math.max(action.amountCents, 0) }
            : pot,
        ),
      }
    case "pot/withdraw":
      return {
        ...state,
        pots: state.pots.map((pot) =>
          pot.id === action.id
            ? { ...pot, balanceCents: Math.max(pot.balanceCents - Math.max(action.amountCents, 0), 0) }
            : pot,
        ),
      }
    case "recurring-bill/add":
      return { ...state, recurringBills: [...state.recurringBills, action.bill] }
    case "recurring-bill/update":
      return { ...state, recurringBills: updateById(state.recurringBills, action.id, action.updates) }
    case "recurring-bill/delete":
      return { ...state, recurringBills: removeById(state.recurringBills, action.id) }
    default:
      return state
  }
}
