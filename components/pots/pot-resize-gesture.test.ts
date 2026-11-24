import { describe, expect, test } from "bun:test"

import { getPotResizePreview } from "./pot-resize-gesture"

describe("getPotResizePreview", () => {
  test("snaps to one axis and caps the size at two cells", () => {
    expect(getPotResizePreview("standard", "standard", 18, 0)).toBe("standard")
    expect(getPotResizePreview("standard", "standard", 500, 80)).toBe("wide")
    expect(getPotResizePreview("standard", "wide", 90, 500)).toBe("tall")
  })

  test("holds the preview near the threshold and restores the initial size", () => {
    expect(getPotResizePreview("standard", "wide", 25, 0)).toBe("wide")
    expect(getPotResizePreview("standard", "wide", 42, 45)).toBe("wide")
    expect(getPotResizePreview("standard", "wide", 16, 0)).toBe("standard")
  })

  test("reverses a saved span on its own axis", () => {
    expect(getPotResizePreview("wide", "wide", -50, 0)).toBe("standard")
    expect(getPotResizePreview("tall", "tall", 0, -50)).toBe("standard")
    expect(getPotResizePreview("wide", "wide", 0, -50)).toBe("wide")
    expect(getPotResizePreview("tall", "tall", 50, 0)).toBe("wide")
  })
})
