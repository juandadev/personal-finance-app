"use client"

import { createContext, useContext, useMemo, useReducer } from "react"
import type { Dispatch, ReactNode } from "react"
import {
  financeReducer,
  runFinanceAction,
  type FinanceActions,
  type FinanceAction,
} from "@/lib/finance/reducer"
import {
  assignTransactionToBudgetAction,
  createBudgetAction,
  createPotAction,
  deleteBudgetAction,
  deletePotAction,
  transferPotAction,
  unassignTransactionFromBudgetAction,
  updateBudgetAction,
  updatePotAction,
} from "@/lib/finance/actions"
import { createInitialFinanceState } from "@/lib/finance/seed"
import { selectFinanceViewModel } from "@/lib/finance/selectors"
import type {
  BudgetRecord,
  FinanceState,
  FinanceViewModel,
  NewBudgetRecord,
  NewPotRecord,
  PotRecord,
  RecurringBillRecord,
  TransactionRecord,
} from "@/lib/finance/types"
import { SidebarProvider } from "@/components/ui/sidebar"

interface FinanceContextValue extends FinanceViewModel {
  state: FinanceState
  dispatch: Dispatch<FinanceAction>
  actions: FinanceActions
}

const FinanceContext = createContext<FinanceContextValue | null>(null)

interface FinanceProviderProps {
  children: ReactNode
  initialState?: FinanceState
}

export function FinanceProvider({
  children,
  initialState,
}: FinanceProviderProps) {
  const [state, dispatch] = useReducer(
    financeReducer,
    initialState ?? createInitialFinanceState(),
  )

  const actions = useMemo<FinanceActions>(
    () => ({
      addTransaction: (transaction: TransactionRecord) =>
        dispatch({ type: "transaction/add", transaction }),
      updateTransaction: (
        id: string,
        updates: Partial<Omit<TransactionRecord, "id">>,
      ) => dispatch({ type: "transaction/update", id, updates }),
      deleteTransaction: (id: string) =>
        dispatch({ type: "transaction/delete", id }),
      addBudget: (budget: NewBudgetRecord, spent_cents?: number) =>
        runFinanceAction(() =>
          createBudgetAction(budget, spent_cents ?? 0).then((result) => {
            if (result.ok) {
              dispatch({
                type: "budget/add",
                budget: result.data.budget,
                spent_cents: result.data.budgetSummary.spent_cents,
              })
            }

            return result
          }),
        ),
      updateBudget: (
        id: string,
        updates: Partial<Omit<BudgetRecord, "id" | "user_id">>,
        spent_cents?: number,
      ) =>
        runFinanceAction(() =>
          updateBudgetAction(id, updates, spent_cents).then((result) => {
            if (result.ok) {
              dispatch({
                type: "budget/update",
                id,
                updates: {
                  category_id: result.data.budget.category_id,
                  period: result.data.budget.period,
                  limit_cents: result.data.budget.limit_cents,
                  theme_color: result.data.budget.theme_color,
                },
                spent_cents: result.data.budgetSummary?.spent_cents,
              })
            }

            return result
          }),
        ),
      deleteBudget: (id: string) =>
        runFinanceAction(() =>
          deleteBudgetAction(id).then((result) => {
            if (result.ok) {
              dispatch({ type: "budget/delete", id })
            }

            return result
          }),
        ),
      assignTransactionToBudget: (transactionId: string, budgetId: string) =>
        runFinanceAction(() =>
          assignTransactionToBudgetAction(transactionId, budgetId).then(
            (result) => {
              if (result.ok) {
                dispatch({
                  type: "budget-assignment/upsert",
                  assignment: result.data,
                })
              }

              return result
            },
          ),
        ),
      unassignTransactionFromBudget: (transactionId: string) =>
        runFinanceAction(() =>
          unassignTransactionFromBudgetAction(transactionId).then((result) => {
            if (result.ok) {
              dispatch({
                type: "budget-assignment/delete",
                transaction_id: transactionId,
              })
            }

            return result
          }),
        ),
      addPot: (pot: NewPotRecord) =>
        runFinanceAction(() =>
          createPotAction(pot).then((result) => {
            if (result.ok) {
              dispatch({ type: "pot/add", pot: result.data })
            }

            return result
          }),
        ),
      updatePot: (
        id: string,
        updates: Partial<Omit<PotRecord, "id" | "user_id">>,
      ) =>
        runFinanceAction(() =>
          updatePotAction(id, updates).then((result) => {
            if (result.ok) {
              dispatch({
                type: "pot/update",
                id,
                updates: {
                  name: result.data.name,
                  balance_cents: result.data.balance_cents,
                  target_cents: result.data.target_cents,
                  theme_color: result.data.theme_color,
                  due_date: result.data.due_date,
                },
              })
            }

            return result
          }),
        ),
      deletePot: (id: string) =>
        runFinanceAction(() =>
          deletePotAction(id).then((result) => {
            if (result.ok) {
              dispatch({ type: "pot/delete", id })
            }

            return result
          }),
        ),
      depositToPot: (id: string, amount_cents: number) =>
        runFinanceAction(() =>
          transferPotAction(id, amount_cents, "deposit").then((result) => {
            if (result.ok) {
              dispatch({
                type: "pot/update",
                id,
                updates: {
                  name: result.data.name,
                  balance_cents: result.data.balance_cents,
                  target_cents: result.data.target_cents,
                  theme_color: result.data.theme_color,
                  due_date: result.data.due_date,
                },
              })
            }

            return result
          }),
        ),
      withdrawFromPot: (id: string, amount_cents: number) =>
        runFinanceAction(() =>
          transferPotAction(id, amount_cents, "withdraw").then((result) => {
            if (result.ok) {
              dispatch({
                type: "pot/update",
                id,
                updates: {
                  name: result.data.name,
                  balance_cents: result.data.balance_cents,
                  target_cents: result.data.target_cents,
                  theme_color: result.data.theme_color,
                  due_date: result.data.due_date,
                },
              })
            }

            return result
          }),
        ),
      addRecurringBill: (bill: RecurringBillRecord) =>
        dispatch({ type: "recurring-bill/add", bill }),
      updateRecurringBill: (
        id: string,
        updates: Partial<Omit<RecurringBillRecord, "id">>,
      ) => dispatch({ type: "recurring-bill/update", id, updates }),
      deleteRecurringBill: (id: string) =>
        dispatch({ type: "recurring-bill/delete", id }),
    }),
    [dispatch],
  )

  const value = useMemo<FinanceContextValue>(
    () => ({
      state,
      dispatch,
      actions,
      ...selectFinanceViewModel(state),
    }),
    [actions, state],
  )

  return (
    <FinanceContext.Provider value={value}>
      <SidebarProvider defaultOpen className="bg-background">
        {children}
      </SidebarProvider>
    </FinanceContext.Provider>
  )
}

export function useFinance(): FinanceContextValue {
  const context = useContext(FinanceContext)

  if (!context) {
    throw new Error("useFinance must be used within a FinanceProvider")
  }

  return context
}
