import { describe, expect, test } from "bun:test"

import { formatMonthlyBudgetResetMessage } from "@/lib/admin/reset-message"

function makeResult(
  overrides: Partial<
    Parameters<typeof formatMonthlyBudgetResetMessage>[0]
  > = {},
) {
  return {
    period: "2026-08",
    usersChecked: 3,
    usersClosed: 2,
    usersSkipped: 1,
    failureCount: 0,
    ...overrides,
  }
}

describe("formatMonthlyBudgetResetMessage", () => {
  test("summarizes a successful close without failures", () => {
    expect(formatMonthlyBudgetResetMessage(makeResult())).toBe(
      "Budget reset completed for 2026-08. Checked 3 users, closed 2, skipped 1.",
    )
  })

  test("includes a failure count when users fail", () => {
    expect(
      formatMonthlyBudgetResetMessage(makeResult({ failureCount: 1 })),
    ).toBe(
      "Budget reset completed for 2026-08. Checked 3 users, closed 2, skipped 1. 1 user reset failed.",
    )
  })
})
