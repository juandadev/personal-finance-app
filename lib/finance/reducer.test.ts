import { describe, expect, test } from "bun:test"

import { financeReducer } from "@/lib/finance/reducer"
import { createInitialFinanceState } from "@/lib/finance/seed"
import type { CashForecastAdjustmentRecord } from "@/lib/finance/types"

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

describe("financeReducer cash forecast events", () => {
  test("saves zero-income settings without treating them as missing", () => {
    const state = createInitialFinanceState()
    const next = financeReducer(state, {
      type: "cash-forecast/settings-save",
      settings: {
        user_id: "user-1",
        default_monthly_income_cents: 0,
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
})
