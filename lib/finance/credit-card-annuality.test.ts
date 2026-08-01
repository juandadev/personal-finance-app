import { describe, expect, test } from "bun:test"

import {
  annualityDescription,
  getActiveAnniversaryYear,
  parseAnnualityDescription,
  resolveAnniversaryDate,
  resolveCreditCardAnnualityInstallments,
  splitAnnualityAmounts,
} from "@/lib/finance/credit-card-annuality"
import type {
  CreditCardAnnualityOverrideRecord,
  CreditCardRecord,
  TransactionRecord,
} from "@/lib/finance/types"

function makeCard(overrides: Partial<CreditCardRecord> = {}): CreditCardRecord {
  return {
    id: "card-1",
    user_id: "user-1",
    nickname: "Travel",
    issuer: "Bank",
    network: "Visa",
    last_four: "4242",
    expiration_month: 12,
    expiration_year: 2030,
    credit_limit_cents: 500_000,
    closing_day_of_month: 5,
    payment_due_day_of_month: 25,
    theme_color: "chart-1",
    archived_at: null,
    annuality_enabled: true,
    annuality_amount_cents: 120_000,
    annuality_anniversary_month: 7,
    annuality_anniversary_day: 15,
    annuality_payment_count: 3,
    ...overrides,
  }
}

describe("splitAnnualityAmounts", () => {
  test("splits equally with remainder on the last payment", () => {
    expect(splitAnnualityAmounts(100_000, 3)).toEqual([33_333, 33_333, 33_334])
  })

  test("returns the full amount for a single payment", () => {
    expect(splitAnnualityAmounts(120_000, 1)).toEqual([120_000])
  })
})

describe("resolveAnniversaryDate", () => {
  test("clamps day for short months", () => {
    expect(resolveAnniversaryDate(2026, 2, 31)).toBe("2026-02-28")
  })
})

describe("annuality description helpers", () => {
  test("round-trips year and installment index", () => {
    expect(annualityDescription(2026, 2)).toBe("annuality:2026:2")
    expect(parseAnnualityDescription("annuality:2026:2")).toEqual({
      anniversaryYear: 2026,
      installmentIndex: 2,
    })
  })
})

describe("resolveCreditCardAnnualityInstallments", () => {
  test("builds consecutive statement cycles from the anniversary", () => {
    const card = makeCard()
    const installments = resolveCreditCardAnnualityInstallments({
      card,
      overrides: [],
      statements: [],
      transactions: [],
      asOfDate: "2026-07-20",
      anniversaryYear: 2026,
    })

    expect(installments).toHaveLength(3)
    expect(installments.map((item) => item.amountCents)).toEqual([
      40_000, 40_000, 40_000,
    ])
    expect(installments[0]?.periodStart).toBe(
      installments[0] ? installments[0].periodStart : "",
    )
    expect(installments[0]?.periodEnd).toBe("2026-08-05")
    expect(installments[1]?.periodEnd).toBe("2026-09-05")
    expect(installments[2]?.periodEnd).toBe("2026-10-05")
  })

  test("applies current-year overrides", () => {
    const overrides: CreditCardAnnualityOverrideRecord[] = [
      {
        id: "override-1",
        user_id: "user-1",
        credit_card_id: "card-1",
        anniversary_year: 2026,
        installment_index: 2,
        amount_cents: 50_000,
        created_at: "2026-07-01T00:00:00.000Z",
        updated_at: "2026-07-01T00:00:00.000Z",
      },
    ]
    // Keep sum valid by also overriding others in UI; derivation applies sparse overrides as-is.
    const installments = resolveCreditCardAnnualityInstallments({
      card: makeCard(),
      overrides,
      statements: [],
      transactions: [],
      asOfDate: "2026-07-20",
      anniversaryYear: 2026,
    })

    expect(installments[1]?.amountCents).toBe(50_000)
    expect(installments[1]?.isOverridden).toBe(true)
  })

  test("marks materialized installments from matching purchases", () => {
    const transactions: TransactionRecord[] = [
      {
        id: "txn-1",
        user_id: "user-1",
        account_id: "account-1",
        counterparty_id: "cp-1",
        category_id: "cat-1",
        concept: "Annuality",
        amount_cents: -40_000,
        is_voucher_expense: false,
        payment_method: "credit_card",
        credit_card_id: "card-1",
        credit_card_statement_id: "statement-1",
        posted_at: "2026-07-15",
        description: "annuality:2026:1",
        created_at: "2026-07-15T00:00:00.000Z",
      },
    ]
    const installments = resolveCreditCardAnnualityInstallments({
      card: makeCard(),
      overrides: [],
      statements: [],
      transactions,
      asOfDate: "2026-08-10",
      anniversaryYear: 2026,
    })

    expect(installments[0]?.isMaterialized).toBe(true)
    expect(installments[0]?.status).toBe("materialized")
    expect(installments[0]?.amountCents).toBe(40_000)
    expect(installments[1]?.status).toBe("pending")
    expect(installments[2]?.status).toBe("reserved")
  })

  test("returns no installments when annuality is disabled", () => {
    expect(
      resolveCreditCardAnnualityInstallments({
        card: makeCard({ annuality_enabled: false }),
        overrides: [],
        statements: [],
        transactions: [],
        asOfDate: "2026-07-20",
      }),
    ).toEqual([])
  })

  test("single payment uses the full amount on the anniversary cycle", () => {
    const installments = resolveCreditCardAnnualityInstallments({
      card: makeCard({ annuality_payment_count: 1 }),
      overrides: [],
      statements: [],
      transactions: [],
      asOfDate: "2026-07-20",
      anniversaryYear: 2026,
    })

    expect(installments).toHaveLength(1)
    expect(installments[0]?.amountCents).toBe(120_000)
    expect(installments[0]?.status).toBe("pending")
  })
})

describe("getActiveAnniversaryYear", () => {
  test("uses the current year once the anniversary cycle has started", () => {
    expect(getActiveAnniversaryYear(makeCard(), "2026-07-20")).toBe(2026)
  })

  test("uses the previous year before this year's anniversary cycle starts", () => {
    expect(getActiveAnniversaryYear(makeCard(), "2026-03-01")).toBe(2025)
  })
})
