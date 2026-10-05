import { describe, expect, test } from "bun:test"

import {
  adjustmentPostedAt,
  parseNonNegativeDollarCents,
  selectDefaultAdjustmentStatement,
  statementAdjustmentTransactionCents,
  statementPeriodHasCardTransactions,
  type AdjustmentStatementChoice,
} from "@/lib/finance/statement-adjustment"

const august: AdjustmentStatementChoice = {
  id: "august",
  lifecycleStatus: "open",
  totalAmount: 80,
  periodStart: "2026-08-01",
  periodEnd: "2026-08-31",
  paymentDueDate: "2026-09-15",
}

const september: AdjustmentStatementChoice = {
  id: "september",
  lifecycleStatus: "open",
  totalAmount: 12,
  periodStart: "2026-09-01",
  periodEnd: "2026-09-30",
  paymentDueDate: "2026-10-15",
}

describe("statement adjustments", () => {
  test("dates the adjustment inside the statement period", () => {
    expect(adjustmentPostedAt("2026-08-01", "2026-08-31", "2026-08-20")).toBe(
      "2026-08-20",
    )
    expect(adjustmentPostedAt("2026-08-01", "2026-08-31", "2026-09-30")).toBe(
      "2026-08-31",
    )
    expect(adjustmentPostedAt("2026-10-01", "2026-10-31", "2026-09-30")).toBe(
      "2026-10-01",
    )
  })

  test("stores a credit when the bank wants less and a charge when it wants more", () => {
    expect(statementAdjustmentTransactionCents(800_000, 720_000)).toBe(80_000)
    expect(statementAdjustmentTransactionCents(140_000, 143_000)).toBe(-3_000)
    expect(statementAdjustmentTransactionCents(140_000, 140_000)).toBe(0)
  })

  test("parses a zero bank amount and rejects blanks", () => {
    expect(parseNonNegativeDollarCents("0")).toBe(0)
    expect(parseNonNegativeDollarCents("1,430.50")).toBe(143_050)
    expect(parseNonNegativeDollarCents("")).toBeNull()
    expect(parseNonNegativeDollarCents("-5")).toBeNull()
  })

  test("defaults to the oldest unpaid statement with a balance", () => {
    expect(
      selectDefaultAdjustmentStatement([september, august], "2026-09-30")?.id,
    ).toBe("august")
  })

  test("defaults to the current statement when every unpaid statement is zero", () => {
    expect(
      selectDefaultAdjustmentStatement(
        [
          { ...august, totalAmount: 0 },
          { ...september, totalAmount: 0 },
        ],
        "2026-09-30",
      )?.id,
    ).toBe("september")
  })

  test("sees a card transaction dated inside the statement period", () => {
    expect(
      statementPeriodHasCardTransactions(
        [
          {
            credit_card_id: "card-1",
            posted_at: "2026-08-31",
          },
        ],
        "card-1",
        "2026-08-01",
        "2026-08-31",
      ),
    ).toBe(true)
    expect(
      statementPeriodHasCardTransactions(
        [
          {
            credit_card_id: "card-1",
            posted_at: "2026-09-01",
          },
        ],
        "card-1",
        "2026-08-01",
        "2026-08-31",
      ),
    ).toBe(false)
  })
})
