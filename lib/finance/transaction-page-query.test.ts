import { describe, expect, test } from "bun:test"

import { normalizeTransactionFilters } from "@/lib/finance/url-filters/normalize"
import {
  buildTransactionQueryParts,
  getTransactionPageBounds,
} from "./transaction-page-query"

const USER_ID = "00000000-0000-4000-8000-000000000001"
const CATEGORY_ID = "00000000-0000-4000-8000-000000000002"
const CARD_ID = "00000000-0000-4000-8000-000000000003"
const BUDGET_ID = "00000000-0000-4000-8000-000000000004"

describe("transaction page query construction", () => {
  test("combines normalized filters with parameterized SQL", () => {
    const filters = normalizeTransactionFilters({
      q: "  50%_ off  ",
      sort: "highest",
      page: 2,
      category: [CATEGORY_ID, "not-a-uuid"],
      budget: [BUDGET_ID, "unassigned"],
      account: [],
      counterparty: [],
      method: ["credit_card", "voucher"],
      card: [CARD_ID],
      direction: "expense",
      from: "2026-07-01",
      to: "2026-07-31",
      minAmount: 10.25,
      maxAmount: 200,
    })

    const query = buildTransactionQueryParts(USER_ID, filters)

    expect(query.whereSql).toContain("t.user_id = $1")
    expect(query.whereSql).toContain("t.category_id = ANY($3::uuid[])")
    expect(query.whereSql).toContain("t.credit_card_id = ANY($4::uuid[])")
    expect(query.whereSql).toContain(
      "(assignment.budget_id = ANY($5::uuid[]) OR assignment.budget_id IS NULL)",
    )
    expect(query.whereSql).toContain("t.payment_method = ANY($6::text[])")
    expect(query.whereSql).toContain("t.amount_cents < 0")
    expect(query.whereSql).toContain("t.posted_at >= $7::date")
    expect(query.whereSql).toContain("t.posted_at <= $8::date")
    expect(query.whereSql).toContain("abs(t.amount_cents) >= $9::integer")
    expect(query.whereSql).toContain("abs(t.amount_cents) <= $10::integer")
    expect(query.whereSql).not.toContain("50%_ off")
    expect(query.whereSql).not.toContain(CATEGORY_ID)
    expect(query.orderBySql).toBe(
      "ORDER BY t.amount_cents DESC, t.created_at DESC, t.id",
    )
    expect(query.values).toEqual([
      USER_ID,
      "%50\\%\\_ off%",
      [CATEGORY_ID],
      [CARD_ID],
      [BUDGET_ID],
      ["credit_card", "voucher"],
      "2026-07-01",
      "2026-07-31",
      1025,
      20000,
    ])
  })

  test("turns an invalid-only identifier filter into no matches", () => {
    const filters = normalizeTransactionFilters({
      q: "",
      sort: "latest",
      page: 1,
      category: ["not-a-uuid"],
      budget: [],
      account: [],
      counterparty: [],
      method: [],
      card: [],
      direction: null,
      from: null,
      to: null,
      minAmount: null,
      maxAmount: null,
    })

    const query = buildTransactionQueryParts(USER_ID, filters)

    expect(query.whereSql).toContain("AND FALSE")
    expect(query.values).toEqual([USER_ID])
  })
})

describe("transaction page bounds", () => {
  test("clamps an out-of-range page after counting", () => {
    expect(getTransactionPageBounds(21, 99)).toEqual({
      pageSize: 10,
      safePage: 3,
      totalPages: 3,
      offset: 20,
    })
  })

  test("uses the first empty page when no rows match", () => {
    expect(getTransactionPageBounds(0, 5)).toEqual({
      pageSize: 10,
      safePage: 1,
      totalPages: 0,
      offset: 0,
    })
  })
})
