import type {
  BudgetRecord,
  FinanceState,
  NewBudgetRecord,
  NewPotRecord,
  PotRecord,
  RecurringBillRecord,
  TransactionRecord,
} from "./types"

export type FinanceAction =
  | { type: "transaction/add"; transaction: TransactionRecord }
  | {
      type: "transaction/update"
      id: string
      updates: Partial<Omit<TransactionRecord, "id" | "user_id">>
    }
  | { type: "transaction/delete"; id: string }
  | { type: "budget/add"; budget: BudgetRecord; spent_cents?: number }
  | {
      type: "budget/update"
      id: string
      updates: Partial<Omit<BudgetRecord, "id" | "user_id">>
      spent_cents?: number
    }
  | { type: "budget/delete"; id: string }
  | { type: "pot/add"; pot: PotRecord }
  | {
      type: "pot/update"
      id: string
      updates: Partial<Omit<PotRecord, "id" | "user_id">>
    }
  | { type: "pot/delete"; id: string }
  | { type: "pot/deposit"; id: string; amount_cents: number }
  | { type: "pot/withdraw"; id: string; amount_cents: number }
  | { type: "recurring-bill/add"; bill: RecurringBillRecord }
  | {
      type: "recurring-bill/update"
      id: string
      updates: Partial<Omit<RecurringBillRecord, "id" | "user_id">>
    }
  | { type: "recurring-bill/delete"; id: string }

export interface FinanceActions {
  addTransaction: (transaction: TransactionRecord) => void
  updateTransaction: (
    id: string,
    updates: Partial<Omit<TransactionRecord, "id" | "user_id">>,
  ) => void
  deleteTransaction: (id: string) => void
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
  addPot: (pot: NewPotRecord) => Promise<FinanceMutationResult>
  updatePot: (
    id: string,
    updates: Partial<Omit<PotRecord, "id" | "user_id">>,
  ) => Promise<FinanceMutationResult>
  deletePot: (id: string) => Promise<FinanceMutationResult>
  depositToPot: (
    id: string,
    amount_cents: number,
  ) => Promise<FinanceMutationResult>
  withdrawFromPot: (
    id: string,
    amount_cents: number,
  ) => Promise<FinanceMutationResult>
  addRecurringBill: (bill: RecurringBillRecord) => void
  updateRecurringBill: (
    id: string,
    updates: Partial<Omit<RecurringBillRecord, "id" | "user_id">>,
  ) => void
  deleteRecurringBill: (id: string) => void
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
export async function runFinanceAction<T extends FinanceMutationResult>(
  action: () => Promise<T>,
): Promise<T | FinanceMutationResult> {
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
    case "transaction/update":
      return {
        ...state,
        transactions: updateById(state.transactions, action.id, action.updates),
      }
    case "transaction/delete":
      return {
        ...state,
        transactions: removeById(state.transactions, action.id),
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
    case "pot/deposit":
      return {
        ...state,
        pots: state.pots.map((pot) =>
          pot.id === action.id
            ? {
                ...pot,
                balance_cents:
                  pot.balance_cents + Math.max(action.amount_cents, 0),
              }
            : pot,
        ),
      }
    case "pot/withdraw":
      return {
        ...state,
        pots: state.pots.map((pot) =>
          pot.id === action.id
            ? {
                ...pot,
                balance_cents: Math.max(
                  pot.balance_cents - Math.max(action.amount_cents, 0),
                  0,
                ),
              }
            : pot,
        ),
      }
    case "recurring-bill/add":
      return {
        ...state,
        recurringBills: [...state.recurringBills, action.bill],
      }
    case "recurring-bill/update":
      return {
        ...state,
        recurringBills: updateById(
          state.recurringBills,
          action.id,
          action.updates,
        ),
      }
    case "recurring-bill/delete":
      return {
        ...state,
        recurringBills: removeById(state.recurringBills, action.id),
      }
    default:
      return state
  }
}
