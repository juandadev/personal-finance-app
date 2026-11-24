import { expect, test } from "bun:test"

import { getOrderedPotLayout } from "@/lib/finance/pot-layout"

test("uses creation order for pots without a saved layout", () => {
  expect(getOrderedPotLayout(["first", "second"], [])).toEqual([
    { potId: "first", size: "standard" },
    { potId: "second", size: "standard" },
  ])
})

test("keeps saved order and sizes, drops stale and duplicate entries, and appends new pots", () => {
  expect(
    getOrderedPotLayout(
      ["first", "second", "new"],
      [
        { potId: "second", size: "tall" },
        { potId: "deleted", size: "wide" },
        { potId: "first", size: "wide" },
        { potId: "second", size: "standard" },
      ],
    ),
  ).toEqual([
    { potId: "second", size: "tall" },
    { potId: "first", size: "wide" },
    { potId: "new", size: "standard" },
  ])
})
