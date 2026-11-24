import { expect, test } from "bun:test"

import {
  applyPotLayoutChange,
  getOrderedPotLayout,
} from "@/lib/finance/pot-layout"

test("uses creation order for pots without a saved layout", () => {
  expect(getOrderedPotLayout(["first", "second"], [])).toEqual([
    { potId: "first", size: "standard" },
    { potId: "second", size: "standard" },
  ])
})

test("moves whole layout entries in both directions and retains resized spans", () => {
  const original = getOrderedPotLayout(
    ["first", "second", "third"],
    [
      { potId: "first", size: "wide" },
      { potId: "second", size: "tall" },
    ],
  )
  const moved = applyPotLayoutChange(original, {
    type: "move",
    potId: "first",
    targetId: "third",
    placement: "after",
  })

  expect(moved).toEqual([
    { potId: "second", size: "tall" },
    { potId: "third", size: "standard" },
    { potId: "first", size: "wide" },
  ])
  expect(
    applyPotLayoutChange(moved, {
      type: "move",
      potId: "first",
      targetId: "second",
      placement: "before",
    }),
  ).toEqual(original)
  expect(
    applyPotLayoutChange(moved, {
      type: "move",
      potId: "first",
      targetId: "removed",
      placement: "before",
    }),
  ).toBe(moved)
})

test("preserves a manual highlight when moving or resizing the same pot", () => {
  const initial = getOrderedPotLayout(["first", "second"], [])
  const highlighted = applyPotLayoutChange(initial, {
    type: "highlight",
    potId: "first",
    highlighted: true,
  })
  const moved = applyPotLayoutChange(highlighted, {
    type: "move",
    potId: "first",
    targetId: "second",
    placement: "after",
  })
  const resized = applyPotLayoutChange(moved, {
    type: "resize",
    potId: "first",
    size: "wide",
  })

  expect(resized).toEqual([
    { potId: "second", size: "standard" },
    { potId: "first", size: "wide", highlighted: true },
  ])
  expect(
    applyPotLayoutChange(resized, {
      type: "highlight",
      potId: "first",
      highlighted: false,
    }),
  ).toEqual([
    { potId: "second", size: "standard" },
    { potId: "first", size: "wide", highlighted: false },
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
