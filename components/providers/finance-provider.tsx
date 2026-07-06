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
  createCategoryAction,
  createCounterpartyAction,
  createPotAction,
  createTransactionAction,
  deleteBudgetAction,
  deleteCategoryAction,
  deleteCounterpartyAction,
  deletePotAction,
  deleteTransactionAction,
  transferPotAction,
  unassignTransactionFromBudgetAction,
  updateBudgetAction,
  updateCategoryAction,
  updateCounterpartyAction,
  updatePotAction,
  updateTransactionAction,
} from "@/lib/finance/actions"
import { createInitialFinanceState } from "@/lib/finance/seed"
import { selectFinanceViewModel } from "@/lib/finance/selectors"
import type {
  BudgetRecord,
  FinanceState,
  FinanceViewModel,
  NewBudgetRecord,
  NewCategoryRecord,
  NewCounterpartyRecord,
  NewPotRecord,
  NewTransactionRecord,
  PotRecord,
  RecurringBillRecord,
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
      addTransaction: (
        transaction: NewTransactionRecord,
        budgetId: string | null,
      ) =>
        runFinanceAction(() =>
          createTransactionAction(transaction, budgetId).then((result) => {
            if (result.ok) {
              dispatch({ type: "transaction/save", payload: result.data })
            }

            return result
          }),
        ),
      updateTransaction: (
        id: string,
        updates: Omit<NewTransactionRecord, "id">,
        budgetId: string | null,
      ) =>
        runFinanceAction(() =>
          updateTransactionAction(id, updates, budgetId).then((result) => {
            if (result.ok) {
              dispatch({ type: "transaction/save", payload: result.data })
            }

            return result
          }),
        ),
      deleteTransaction: (id: string) =>
        runFinanceAction(() =>
          deleteTransactionAction(id).then((result) => {
            if (result.ok) {
              dispatch({
                type: "transaction/delete",
                id,
                accounts: result.data.accounts,
                accountSummaries: result.data.accountSummaries,
              })
            }

            return result
          }),
        ),
      addCategory: (
        category: Pick<NewCategoryRecord, "id" | "name" | "theme_color">,
      ) =>
        runFinanceAction(() =>
          createCategoryAction(category).then((result) => {
            if (result.ok) {
              dispatch({ type: "category/add", category: result.data })
            }

            return result
          }),
        ),
      updateCategory: (
        id: string,
        updates: Partial<Pick<NewCategoryRecord, "name" | "theme_color">>,
      ) =>
        runFinanceAction(() =>
          updateCategoryAction(id, updates).then((result) => {
            if (result.ok) {
              dispatch({ type: "category/update", category: result.data })
            }

            return result
          }),
        ),
      deleteCategory: (id: string) =>
        runFinanceAction(() =>
          deleteCategoryAction(id).then((result) => {
            if (result.ok) {
              dispatch({ type: "category/delete", id })
            }

            return result
          }),
        ),
      addCounterparty: (
        counterparty: Omit<NewCounterpartyRecord, "avatar_url">,
      ) =>
        runFinanceAction(() =>
          createCounterpartyAction(counterparty).then((result) => {
            if (result.ok) {
              dispatch({
                type: "counterparty/add",
                counterparty: result.data,
              })
            }

            return result
          }),
        ),
      updateCounterparty: (
        id: string,
        updates: Partial<Omit<NewCounterpartyRecord, "id" | "avatar_url">>,
      ) =>
        runFinanceAction(() =>
          updateCounterpartyAction(id, updates).then((result) => {
            if (result.ok) {
              dispatch({
                type: "counterparty/update",
                counterparty: result.data,
              })
            }

            return result
          }),
        ),
      deleteCounterparty: (id: string) =>
        runFinanceAction(() =>
          deleteCounterpartyAction(id).then((result) => {
            if (result.ok) {
              dispatch({ type: "counterparty/delete", id })
            }

            return result
          }),
        ),
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
