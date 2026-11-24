import { describe, expect, test } from "bun:test"

import type { PotLayout } from "@/lib/finance/pot-layout"
import {
  defaultUiPreferences,
  getHiddenAmountAriaLabel,
  getHiddenValueAriaLabel,
  parseUiPreferences,
} from "@/lib/finance/ui-preferences"

describe("parseUiPreferences", () => {
  test("returns defaults for nullish or non-object input", () => {
    expect(parseUiPreferences(null)).toEqual(defaultUiPreferences)
    expect(parseUiPreferences(undefined)).toEqual(defaultUiPreferences)
    expect(parseUiPreferences("nope")).toEqual(defaultUiPreferences)
  })

  test("fills missing keys with defaults", () => {
    expect(parseUiPreferences({})).toEqual(defaultUiPreferences)
  })

  test("preserves valid hideAmounts values", () => {
    expect(parseUiPreferences({ hideAmounts: true })).toEqual({
      hideAmounts: true,
      potLayout: [],
    })
    expect(parseUiPreferences({ hideAmounts: false })).toEqual({
      hideAmounts: false,
      potLayout: [],
    })
  })

  test("ignores unknown keys and invalid hideAmounts", () => {
    expect(
      parseUiPreferences({ hideAmounts: "yes", futureFlag: true }),
    ).toEqual({
      hideAmounts: false,
      potLayout: [],
    })
  })

  test("preserves a saved pot layout independently of privacy mode", () => {
    const potLayout: PotLayout = [
      { potId: "c14e4ced-f134-4344-840b-f91d26cadfcf", size: "tall" },
    ]

    expect(parseUiPreferences({ hideAmounts: "yes", potLayout })).toEqual({
      hideAmounts: false,
      potLayout,
    })
    expect(parseUiPreferences({ hideAmounts: true, potLayout: false })).toEqual(
      {
        hideAmounts: true,
        potLayout: [],
      },
    )
  })
})

describe("hidden value aria labels", () => {
  test("explains that privacy mode hides generic values", () => {
    expect(getHiddenValueAriaLabel()).toBe(
      "Hidden. Turn off privacy mode to show it.",
    )
  })

  test("explains that privacy mode hides amounts", () => {
    expect(getHiddenAmountAriaLabel()).toBe(
      "Amount hidden. Turn off privacy mode to show it.",
    )
  })
})
