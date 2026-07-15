import { describe, expect, test } from "bun:test"

import { getPotMovementSource } from "@/lib/finance/pot-movement"

describe("getPotMovementSource", () => {
  test("uses a direct adjustment by default", () => {
    expect(
      getPotMovementSource("direct", {
        categoryId: "",
        concept: "",
        postedAt: "2026-07-14",
      }),
    ).toEqual({ type: "direct" })
  })

  test("preserves optional transaction data for the main account", () => {
    expect(
      getPotMovementSource("primary_account", {
        categoryId: "category-1",
        concept: "Vacation deposit",
        postedAt: "2026-07-14",
      }),
    ).toEqual({
      type: "primary_account",
      categoryId: "category-1",
      concept: "Vacation deposit",
      postedAt: "2026-07-14",
    })
  })

  test("turns a selected pot option into an internal transfer", () => {
    expect(
      getPotMovementSource("pot:pot-2", {
        categoryId: "",
        concept: "",
        postedAt: "",
      }),
    ).toEqual({ type: "pot", potId: "pot-2" })
  })
})
