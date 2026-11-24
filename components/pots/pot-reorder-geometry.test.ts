import { expect, test } from "bun:test"

import {
  getClosestPotSlot,
  getPotDragScrollSpeed,
} from "./pot-reorder-geometry"

test("uses the visible footprint of wide and tall cards when finding a drop target", () => {
  const slots = [
    { potId: "wide", left: 0, top: 0, width: 220, height: 100 },
    { potId: "tall", left: 240, top: 0, width: 100, height: 220 },
    { potId: "standard", left: 120, top: 120, width: 100, height: 100 },
  ]

  expect(getClosestPotSlot(slots, 215, 90)).toBe("wide")
  expect(getClosestPotSlot(slots, 241, 200)).toBe("tall")
  expect(getClosestPotSlot(slots, 211, 112)).toBe("standard")
})

test("scroll velocity ramps toward both edges and stops in the middle", () => {
  expect(getPotDragScrollSpeed(450, 900)).toBe(0)
  expect(getPotDragScrollSpeed(0, 900)).toBeLessThan(
    getPotDragScrollSpeed(40, 900),
  )
  expect(getPotDragScrollSpeed(40, 900)).toBeLessThan(0)
  expect(getPotDragScrollSpeed(900, 900)).toBeGreaterThan(
    getPotDragScrollSpeed(860, 900),
  )
  expect(getPotDragScrollSpeed(860, 900)).toBeGreaterThan(0)
})
