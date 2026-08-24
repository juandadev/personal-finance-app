import { describe, expect, test } from "bun:test"

import { financeReducer } from "@/lib/finance/reducer"
import { createInitialFinanceState } from "@/lib/finance/seed"
import type {
  AccountRecord,
  AccountSummaryRecord,
  CashForecastAdjustmentRecord,
  CashForecastExclusionRecord,
  PotRecord,
  TransactionRecord,
} from "@/lib/finance/types"

const adjustment: CashForecastAdjustmentRecord = {
  id: "adjustment-1",
  user_id: "user-1",
  kind: "planned_outflow",
  name: "Insurance",
  amount_cents: 10_000,
  start_period: "2026-08",
  recurrence: "monthly",
  created_at: "2026-07-01T00:00:00.000Z",
  updated_at: "2026-07-01T00:00:00.000Z",
}

describe("financeReducer shell state", () => {
  test("replaces the client snapshot after a server refresh", () => {
    const current = createInitialFinanceState()
    const refreshed = {
      ...createInitialFinanceState(),
      preferences: {
        ...createInitialFinanceState().preferences,
        user_id: "user-1",
      },
    }

    expect(
      financeReducer(current, { type: "state/replace", state: refreshed }),
    ).toBe(refreshed)
  })
})

describe("financeReducer cash forecast events", () => {
  test("saves zero-income settings without treating them as missing", () => {
    const state = createInitialFinanceState()
    const next = financeReducer(state, {
      type: "cash-forecast/settings-save",
      settings: {
        user_id: "user-1",
        default_monthly_income_cents: 0,
        included_budget_category_ids: [],
        created_at: "2026-07-01T00:00:00.000Z",
        updated_at: "2026-07-01T00:00:00.000Z",
      },
    })

    expect(next.cashForecastSettings?.default_monthly_income_cents).toBe(0)
  })

  test("adds, updates, and deletes adjustments immutably", () => {
    const state = createInitialFinanceState()
    const added = financeReducer(state, {
      type: "cash-forecast/adjustment-add",
      adjustment,
    })
    const updated = financeReducer(added, {
      type: "cash-forecast/adjustment-update",
      adjustment: {
        ...adjustment,
        amount_cents: 20_000,
      },
    })
    const deleted = financeReducer(updated, {
      type: "cash-forecast/adjustment-delete",
      id: adjustment.id,
    })

    expect(state.cashForecastAdjustments).toEqual([])
    expect(added.cashForecastAdjustments[0]?.amount_cents).toBe(10_000)
    expect(updated.cashForecastAdjustments[0]?.amount_cents).toBe(20_000)
    expect(deleted.cashForecastAdjustments).toEqual([])
  })

  test("upserts and deletes exclusions by source identity", () => {
    const exclusion: CashForecastExclusionRecord = {
      id: "exclusion-1",
      user_id: "user-1",
      source_type: "default_income",
      source_key: "default_income",
      period: "2026-08",
      created_at: "2026-07-01T00:00:00.000Z",
    }
    const state = createInitialFinanceState()
    const added = financeReducer(state, {
      type: "cash-forecast/exclusion-upsert",
      exclusion,
    })
    const replaced = financeReducer(added, {
      type: "cash-forecast/exclusion-upsert",
      exclusion: {
        ...exclusion,
        id: "exclusion-2",
      },
    })
    const deleted = financeReducer(replaced, {
      type: "cash-forecast/exclusion-delete",
      source_type: "default_income",
      source_key: "default_income",
      period: "2026-08",
    })

    expect(state.cashForecastExclusions).toEqual([])
    expect(added.cashForecastExclusions).toEqual([exclusion])
    expect(replaced.cashForecastExclusions).toEqual([
      {
        ...exclusion,
        id: "exclusion-2",
      },
    ])
    expect(deleted.cashForecastExclusions).toEqual([])
  })
})

describe("financeReducer pot movements", () => {
  test("applies all records returned by an account-backed movement together", () => {
    const state = createInitialFinanceState()
    const existingPot: PotRecord = {
      id: "pot-1",
      user_id: "user-1",
      name: "Vacation",
      balance_cents: 20_000,
      target_cents: 50_000,
      theme_color: "chart-1",
      due_date: null,
    }
    const updatedPot = { ...existingPot, balance_cents: 30_000 }
    const account: AccountRecord = {
      id: "account-1",
      user_id: "user-1",
      name: "Main Account",
      type: "checking",
      currency: "USD",
      current_balance_cents: 90_000,
      is_primary: true,
    }
    const transaction: TransactionRecord = {
      id: "transaction-1",
      user_id: "user-1",
      account_id: account.id,
      counterparty_id: "owner-1",
      category_id: "general-1",
      concept: "Deposit to Vacation",
      amount_cents: -10_000,
      is_voucher_expense: false,
      payment_method: "bank_account",
      credit_card_id: null,
      credit_card_statement_id: null,
      posted_at: "2026-07-14",
      description: null,
      created_at: "2026-07-14T00:00:00.000Z",
    }
    const summary: AccountSummaryRecord = {
      id: "summary-1",
      user_id: "user-1",
      account_id: account.id,
      period: "2026-07",
      income_cents: 0,
      expense_cents: 10_000,
    }

    const next = financeReducer(
      {
        ...state,
        pots: [existingPot],
        accounts: [{ ...account, current_balance_cents: 100_000 }],
      },
      {
        type: "pot/move",
        payload: {
          pots: [updatedPot],
          transaction,
          accounts: [account],
          accountSummaries: [summary],
        },
      },
    )

    expect(next.pots[0]?.balance_cents).toBe(30_000)
    expect(next.transactions).toEqual([transaction])
    expect(next.accounts[0]?.current_balance_cents).toBe(90_000)
    expect(next.accountSummaries).toEqual([summary])
    expect(next.budgetTransactionAssignments).toEqual([])
  })

  test("updates both pots without creating a transaction for internal transfers", () => {
    const state = createInitialFinanceState()
    const source: PotRecord = {
      id: "pot-1",
      user_id: "user-1",
      name: "Emergency Fund",
      balance_cents: 20_000,
      target_cents: 50_000,
      theme_color: "chart-1",
      due_date: null,
    }
    const destination: PotRecord = {
      ...source,
      id: "pot-2",
      name: "Vacation",
      balance_cents: 5_000,
    }

    const next = financeReducer(
      { ...state, pots: [source, destination] },
      {
        type: "pot/move",
        payload: {
          pots: [
            { ...source, balance_cents: 15_000 },
            { ...destination, balance_cents: 10_000 },
          ],
          transaction: null,
          accounts: [],
          accountSummaries: [],
        },
      },
    )

    expect(next.pots.map((pot) => pot.balance_cents)).toEqual([15_000, 10_000])
    expect(next.transactions).toEqual([])
  })
})
