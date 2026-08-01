import { describe, expect, test } from "bun:test"

import {
  getBudgetCloseStatus,
  getBudgetOverage,
  getBudgetRemaining,
  getBudgetSnapshotFields,
  isBudgetOverLimit,
} from "./budget-balance"

describe("getBudgetRemaining", () => {
  test("returns remaining when under limit", () => {
    expect(getBudgetRemaining(500, 200)).toBe(300)
  })

  test("returns zero at limit", () => {
    expect(getBudgetRemaining(500, 500)).toBe(0)
  })

  test("returns negative when over limit", () => {
    expect(getBudgetRemaining(500, 545)).toBe(-45)
  })

  test("returns zero when maximum is zero", () => {
    expect(getBudgetRemaining(0, 100)).toBe(0)
  })
})

describe("getBudgetOverage", () => {
  test("returns zero when under limit", () => {
    expect(getBudgetOverage(500, 200)).toBe(0)
  })

  test("returns zero at limit", () => {
    expect(getBudgetOverage(500, 500)).toBe(0)
  })

  test("returns overage when over limit", () => {
    expect(getBudgetOverage(500, 545)).toBe(45)
  })

  test("returns zero when maximum is zero", () => {
    expect(getBudgetOverage(0, 100)).toBe(0)
  })
})

describe("isBudgetOverLimit", () => {
  test("returns false when under limit", () => {
    expect(isBudgetOverLimit(500, 200)).toBe(false)
  })

  test("returns false at limit", () => {
    expect(isBudgetOverLimit(500, 500)).toBe(false)
  })

  test("returns true when over limit", () => {
    expect(isBudgetOverLimit(500, 545)).toBe(true)
  })

  test("returns false when maximum is zero", () => {
    expect(isBudgetOverLimit(0, 100)).toBe(false)
  })
})

describe("getBudgetCloseStatus", () => {
  test("returns within_budget when under limit", () => {
    expect(getBudgetCloseStatus(500, 200)).toBe("within_budget")
  })

  test("returns over_budget when over limit", () => {
    expect(getBudgetCloseStatus(500, 545)).toBe("over_budget")
  })
})

describe("getBudgetSnapshotFields", () => {
  test("returns within-budget snapshot fields in dollars", () => {
    expect(getBudgetSnapshotFields(500, 200)).toEqual({
      freeAmount: 300,
      overAmount: 0,
      status: "within_budget",
    })
  })

  test("returns over-budget snapshot fields in dollars", () => {
    expect(getBudgetSnapshotFields(500, 545)).toEqual({
      freeAmount: 0,
      overAmount: 45,
      status: "over_budget",
    })
  })

  test("matches monthly close cent-scale values", () => {
    expect(getBudgetSnapshotFields(50_000, 54_500)).toEqual({
      freeAmount: 0,
      overAmount: 4_500,
      status: "over_budget",
    })
  })
})
