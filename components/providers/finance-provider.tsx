"use client"

import { createContext, useContext, useMemo, useReducer } from "react"
import type { Dispatch, ReactNode } from "react"
import { financeReducer, type FinanceActions, type FinanceAction } from "@/lib/finance/reducer"
import { createInitialFinanceState } from "@/lib/finance/seed"
import { selectFinanceViewModel } from "@/lib/finance/selectors"
import type {
  BudgetRecord,
  FinanceState,
  FinanceViewModel,
  PotRecord,
  RecurringBillRecord,
  TransactionRecord,
} from "@/lib/finance/types"

interface FinanceContextValue extends FinanceViewModel {
  state: FinanceState
  dispatch: Dispatch<FinanceAction>
  actions: FinanceActions
}

const FinanceContext = createContext<FinanceContextValue | null>(null)

interface FinanceProviderProps {
  children: ReactNode
}

export function FinanceProvider({ children }: FinanceProviderProps) {
  const [state, dispatch] = useReducer(financeReducer, createInitialFinanceState())

  const actions = useMemo<FinanceActions>(
    () => ({
      addTransaction: (transaction: TransactionRecord) =>
        dispatch({ type: "transaction/add", transaction }),
      updateTransaction: (id: string, updates: Partial<Omit<TransactionRecord, "id">>) =>
        dispatch({ type: "transaction/update", id, updates }),
      deleteTransaction: (id: string) => dispatch({ type: "transaction/delete", id }),
      addBudget: (budget: BudgetRecord, spentCents?: number) =>
        dispatch({ type: "budget/add", budget, spentCents }),
      updateBudget: (id: string, updates: Partial<Omit<BudgetRecord, "id">>, spentCents?: number) =>
        dispatch({ type: "budget/update", id, updates, spentCents }),
      deleteBudget: (id: string) => dispatch({ type: "budget/delete", id }),
      addPot: (pot: PotRecord) => dispatch({ type: "pot/add", pot }),
      updatePot: (id: string, updates: Partial<Omit<PotRecord, "id">>) =>
        dispatch({ type: "pot/update", id, updates }),
      deletePot: (id: string) => dispatch({ type: "pot/delete", id }),
      depositToPot: (id: string, amountCents: number) =>
        dispatch({ type: "pot/deposit", id, amountCents }),
      withdrawFromPot: (id: string, amountCents: number) =>
        dispatch({ type: "pot/withdraw", id, amountCents }),
      addRecurringBill: (bill: RecurringBillRecord) =>
        dispatch({ type: "recurring-bill/add", bill }),
      updateRecurringBill: (
        id: string,
        updates: Partial<Omit<RecurringBillRecord, "id">>,
      ) => dispatch({ type: "recurring-bill/update", id, updates }),
      deleteRecurringBill: (id: string) => dispatch({ type: "recurring-bill/delete", id }),
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

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>
}

export function useFinance(): FinanceContextValue {
  const context = useContext(FinanceContext)

  if (!context) {
    throw new Error("useFinance must be used within a FinanceProvider")
  }

  return context
}
