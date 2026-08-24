"use client"

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react"
import type { Dispatch, ReactNode } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  financeReducer,
  runFinanceAction,
  type FinanceActions,
  type FinanceAction,
} from "@/lib/finance/reducer"
import {
  assignTransactionToBudgetAction,
  archiveCreditCardAction,
  archiveRecurringBillAction,
  pauseRecurringBillAction,
  undoScheduledRecurringBillEndAction,
  resumeRecurringBillAction,
  closeCreditCardStatementAction,
  createBudgetAction,
  createCashForecastAdjustmentAction,
  createCategoryAction,
  createCounterpartyAction,
  createCreditCardAction,
  createPotAction,
  createRecurringBillAction,
  createTransactionAction,
  deleteBudgetAction,
  deleteCashForecastAdjustmentAction,
  setCashForecastExclusionAction,
  deleteCategoryAction,
  deleteCounterpartyAction,
  deletePotAction,
  deleteRecurringBillAction,
  deleteTransactionAction,
  payRecurringBillOccurrenceAction,
  skipRecurringBillOccurrenceAction,
  saveCashForecastIncludedBudgetsAction,
  saveCashForecastSettingsAction,
  movePotAction,
  unassignTransactionFromBudgetAction,
  updateBudgetAction,
  updateCashForecastAdjustmentAction,
  updateCategoryAction,
  updateCounterpartyAction,
  updateCreditCardAction,
  updatePotAction,
  updateRecurringBillAction,
  updateTransactionAction,
  payCreditCardCycleAction,
  payCreditCardStatementAction,
  resetCreditCardAnnualityOverridesAction,
  saveCreditCardAnnualityOverridesAction,
  updateUiPreferencesAction,
} from "@/lib/finance/actions"
import { createInitialFinanceState } from "@/lib/finance/seed"
import { selectFinanceViewModel } from "@/lib/finance/selectors"
import type {
  BudgetRecord,
  CreatableRecurringBillRecord,
  CreditCardRecord,
  FinanceState,
  FinanceViewModel,
  NewCashForecastAdjustmentRecord,
  NewBudgetRecord,
  NewCategoryRecord,
  NewCounterpartyRecord,
  NewCreditCardRecord,
  NewPotRecord,
  NewTransactionRecord,
  PotRecord,
  RecurringBillPaymentSource,
  UpdatableRecurringBillRecord,
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
  const router = useRouter()
  const [state, dispatch] = useReducer(
    financeReducer,
    initialState ?? createInitialFinanceState(),
  )
  const stateRef = useRef(state)
  const initialStateRef = useRef(initialState)

  useEffect(() => {
    if (initialState && initialStateRef.current !== initialState) {
      dispatch({ type: "state/replace", state: initialState })
    }

    initialStateRef.current = initialState
  }, [initialState])

  useEffect(() => {
    stateRef.current = state
  }, [state])

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
              router.refresh()
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
              router.refresh()
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
                creditCardStatements: result.data.creditCardStatements,
              })
              router.refresh()
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
                  monthly_voucher_coverage_cents:
                    result.data.budget.monthly_voucher_coverage_cents,
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
                router.refresh()
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
              router.refresh()
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
      movePot: (movement) =>
        runFinanceAction(() =>
          movePotAction(movement).then((result) => {
            if (result.ok) {
              dispatch({
                type: "pot/move",
                payload: result.data,
              })
            }

            return result
          }),
        ),
      addRecurringBill: (bill: CreatableRecurringBillRecord) =>
        runFinanceAction(() =>
          createRecurringBillAction(bill).then((result) => {
            if (result.ok) {
              dispatch({ type: "recurring-bill/add", bill: result.data })
            }

            return result
          }),
        ),
      updateRecurringBill: (
        id: string,
        updates: Partial<UpdatableRecurringBillRecord>,
      ) =>
        runFinanceAction(() =>
          updateRecurringBillAction(id, updates).then((result) => {
            if (result.ok) {
              dispatch({ type: "recurring-bill/update", bill: result.data })
            }

            return result
          }),
        ),
      pauseRecurringBill: (id: string) =>
        runFinanceAction(() =>
          pauseRecurringBillAction(id).then((result) => {
            if (result.ok) {
              dispatch({
                type: "recurring-bill/update",
                bill: result.data.bill,
              })
            }

            return result
          }),
        ),
      archiveRecurringBill: (id: string) =>
        runFinanceAction(() =>
          archiveRecurringBillAction(id).then((result) => {
            if (result.ok) {
              dispatch({
                type: "recurring-bill/update",
                bill: result.data.bill,
              })
            }

            return result
          }),
        ),
      undoScheduledRecurringBillEnd: (id: string) =>
        runFinanceAction(() =>
          undoScheduledRecurringBillEndAction(id).then((result) => {
            if (result.ok) {
              dispatch({ type: "recurring-bill/update", bill: result.data })
            }

            return result
          }),
        ),
      resumeRecurringBill: (id: string, firstDueDate: string) =>
        runFinanceAction(() =>
          resumeRecurringBillAction(id, firstDueDate).then((result) => {
            if (result.ok) {
              dispatch({ type: "recurring-bill/update", bill: result.data })
            }

            return result
          }),
        ),
      deleteRecurringBill: (id: string) =>
        runFinanceAction(() =>
          deleteRecurringBillAction(id).then((result) => {
            if (result.ok) {
              dispatch({ type: "recurring-bill/delete", id })
            }

            return result
          }),
        ),
      payRecurringBillOccurrence: (
        billId: string,
        dueDate: string,
        source: RecurringBillPaymentSource,
        paidAt: string,
      ) =>
        runFinanceAction(() =>
          payRecurringBillOccurrenceAction(
            billId,
            dueDate,
            source,
            paidAt,
          ).then((result) => {
            if (result.ok) {
              dispatch({
                type: "recurring-bill/settle",
                billPayment: result.data.billPayment,
                transaction: result.data.transaction,
                accounts: result.data.accounts,
                accountSummaries: result.data.accountSummaries,
                creditCardStatements: result.data.creditCardStatements,
              })
            }

            return result
          }),
        ),
      skipRecurringBillOccurrence: (billId: string, dueDate: string) =>
        runFinanceAction(() =>
          skipRecurringBillOccurrenceAction(billId, dueDate).then((result) => {
            if (result.ok) {
              dispatch({
                type: "recurring-bill/settle",
                billPayment: result.data,
              })
            }

            return result
          }),
        ),
      addCreditCard: (creditCard: NewCreditCardRecord) =>
        runFinanceAction(() =>
          createCreditCardAction(creditCard).then((result) => {
            if (result.ok) {
              dispatch({
                type: "credit-card/add",
                creditCard: result.data,
              })
            }

            return result
          }),
        ),
      updateCreditCard: (
        id: string,
        updates: Partial<Omit<CreditCardRecord, "id" | "user_id">>,
      ) =>
        runFinanceAction(() =>
          updateCreditCardAction(id, updates).then((result) => {
            if (result.ok) {
              dispatch({
                type: "credit-card/update",
                id,
                updates: {
                  nickname: result.data.nickname,
                  issuer: result.data.issuer,
                  network: result.data.network,
                  last_four: result.data.last_four,
                  expiration_month: result.data.expiration_month,
                  expiration_year: result.data.expiration_year,
                  credit_limit_cents: result.data.credit_limit_cents,
                  closing_day_of_month: result.data.closing_day_of_month,
                  payment_due_day_of_month:
                    result.data.payment_due_day_of_month,
                  theme_color: result.data.theme_color,
                  archived_at: result.data.archived_at,
                  annuality_enabled: result.data.annuality_enabled,
                  annuality_amount_cents: result.data.annuality_amount_cents,
                  annuality_anniversary_month:
                    result.data.annuality_anniversary_month,
                  annuality_anniversary_day:
                    result.data.annuality_anniversary_day,
                  annuality_payment_count: result.data.annuality_payment_count,
                },
              })
            }

            return result
          }),
        ),
      archiveCreditCard: (id: string) =>
        runFinanceAction(() =>
          archiveCreditCardAction(id).then((result) => {
            if (result.ok) {
              dispatch({
                type: "credit-card/update",
                id,
                updates: {
                  archived_at: result.data.archived_at,
                },
              })
            }

            return result
          }),
        ),
      payCreditCardStatement: (statementId: string, paidAt: string) =>
        runFinanceAction(() =>
          payCreditCardStatementAction(statementId, paidAt).then((result) => {
            if (result.ok) {
              dispatch({
                type: "credit-card/payment",
                payment: result.data.payment,
                transaction: result.data.transaction,
                counterparty: result.data.counterparty,
                accounts: result.data.accounts,
                accountSummaries: result.data.accountSummaries,
                statement: result.data.statement,
                billTransactions: result.data.billTransactions,
                recurringBillPayments: result.data.recurringBillPayments,
              })
            }

            return result
          }),
        ),
      payCreditCardCycle: (
        creditCardId: string,
        referenceDate: string,
        paidAt: string,
      ) =>
        runFinanceAction(() =>
          payCreditCardCycleAction(creditCardId, referenceDate, paidAt).then(
            (result) => {
              if (result.ok) {
                dispatch({
                  type: "credit-card/payment",
                  payment: result.data.payment,
                  transaction: result.data.transaction,
                  counterparty: result.data.counterparty,
                  accounts: result.data.accounts,
                  accountSummaries: result.data.accountSummaries,
                  statement: result.data.statement,
                  billTransactions: result.data.billTransactions,
                  recurringBillPayments: result.data.recurringBillPayments,
                })
              }

              return result
            },
          ),
        ),
      closeCreditCardStatement: (statementId: string) =>
        runFinanceAction(() =>
          closeCreditCardStatementAction(statementId).then((result) => {
            if (result.ok) {
              dispatch({
                type: "credit-card/statement-upsert",
                statements: [result.data],
              })
            }

            return result
          }),
        ),
      saveCreditCardAnnualityOverrides: (
        creditCardId: string,
        anniversaryYear: number,
        overrides: Array<{ installmentIndex: number; amountCents: number }>,
      ) =>
        runFinanceAction(() =>
          saveCreditCardAnnualityOverridesAction(
            creditCardId,
            anniversaryYear,
            overrides,
          ).then((result) => {
            if (result.ok) {
              dispatch({
                type: "credit-card/annuality-overrides-set",
                creditCardId,
                anniversaryYear,
                overrides: result.data,
              })
            }

            return result
          }),
        ),
      resetCreditCardAnnualityOverrides: (
        creditCardId: string,
        anniversaryYear: number,
      ) =>
        runFinanceAction(() =>
          resetCreditCardAnnualityOverridesAction(
            creditCardId,
            anniversaryYear,
          ).then((result) => {
            if (result.ok) {
              dispatch({
                type: "credit-card/annuality-overrides-set",
                creditCardId,
                anniversaryYear,
                overrides: result.data,
              })
            }

            return result
          }),
        ),
      saveCashForecastSettings: (defaultMonthlyIncomeCents: number) =>
        runFinanceAction(() =>
          saveCashForecastSettingsAction(defaultMonthlyIncomeCents).then(
            (result) => {
              if (result.ok) {
                dispatch({
                  type: "cash-forecast/settings-save",
                  settings: result.data,
                })
              }

              return result
            },
          ),
        ),
      saveCashForecastIncludedBudgets: (includedBudgetCategoryIds: string[]) =>
        runFinanceAction(() =>
          saveCashForecastIncludedBudgetsAction(includedBudgetCategoryIds).then(
            (result) => {
              if (result.ok) {
                dispatch({
                  type: "cash-forecast/settings-save",
                  settings: result.data,
                })
              }

              return result
            },
          ),
        ),
      addCashForecastAdjustment: (
        adjustment: NewCashForecastAdjustmentRecord,
      ) =>
        runFinanceAction(() =>
          createCashForecastAdjustmentAction(adjustment).then((result) => {
            if (result.ok) {
              dispatch({
                type: "cash-forecast/adjustment-add",
                adjustment: result.data,
              })
            }

            return result
          }),
        ),
      updateCashForecastAdjustment: (
        id: string,
        adjustment: Omit<NewCashForecastAdjustmentRecord, "id">,
      ) =>
        runFinanceAction(() =>
          updateCashForecastAdjustmentAction(id, adjustment).then((result) => {
            if (result.ok) {
              dispatch({
                type: "cash-forecast/adjustment-update",
                adjustment: result.data,
              })
            }

            return result
          }),
        ),
      deleteCashForecastAdjustment: (id: string) =>
        runFinanceAction(() =>
          deleteCashForecastAdjustmentAction(id).then((result) => {
            if (result.ok) {
              dispatch({
                type: "cash-forecast/adjustment-delete",
                id: result.data.id,
              })
            }

            return result
          }),
        ),
      setCashForecastExclusion: (input) => {
        const previousExclusion =
          stateRef.current.cashForecastExclusions.find(
            (exclusion) =>
              exclusion.source_type === input.sourceType &&
              exclusion.source_key === input.sourceKey &&
              exclusion.period === input.period,
          ) ?? null

        if (input.excluded) {
          const optimisticExclusion = {
            id: previousExclusion?.id ?? crypto.randomUUID(),
            user_id: stateRef.current.preferences.user_id,
            source_type: input.sourceType,
            source_key: input.sourceKey,
            period: input.period,
            created_at:
              previousExclusion?.created_at ?? new Date().toISOString(),
          }
          dispatch({
            type: "cash-forecast/exclusion-upsert",
            exclusion: optimisticExclusion,
          })
        } else {
          dispatch({
            type: "cash-forecast/exclusion-delete",
            source_type: input.sourceType,
            source_key: input.sourceKey,
            period: input.period,
          })
        }

        return runFinanceAction(() =>
          setCashForecastExclusionAction(input).then((result) => {
            if (!result.ok) {
              if (previousExclusion) {
                dispatch({
                  type: "cash-forecast/exclusion-upsert",
                  exclusion: previousExclusion,
                })
              } else {
                dispatch({
                  type: "cash-forecast/exclusion-delete",
                  source_type: input.sourceType,
                  source_key: input.sourceKey,
                  period: input.period,
                })
              }
              toast.error(result.message)
              return result
            }

            if (result.data.exclusion) {
              dispatch({
                type: "cash-forecast/exclusion-upsert",
                exclusion: result.data.exclusion,
              })
            } else {
              dispatch({
                type: "cash-forecast/exclusion-delete",
                source_type: input.sourceType,
                source_key: input.sourceKey,
                period: input.period,
              })
            }

            return result
          }),
        )
      },
      updateUiPreferences: (hideAmounts: boolean) => {
        const previousHideAmounts = stateRef.current.preferences.hideAmounts
        dispatch({ type: "preferences/ui-update", hideAmounts })

        return runFinanceAction(() =>
          updateUiPreferencesAction({ hideAmounts }).then((result) => {
            if (!result.ok) {
              dispatch({
                type: "preferences/ui-update",
                hideAmounts: previousHideAmounts,
              })
              toast.error(result.message)
            }

            return result
          }),
        )
      },
    }),
    [dispatch, router],
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
