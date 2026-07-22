import { describe, expect, test } from "bun:test"

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
    expect(parseUiPreferences({})).toEqual({ hideAmounts: false })
  })

  test("preserves valid hideAmounts values", () => {
    expect(parseUiPreferences({ hideAmounts: true })).toEqual({
      hideAmounts: true,
    })
    expect(parseUiPreferences({ hideAmounts: false })).toEqual({
      hideAmounts: false,
    })
  })

  test("ignores unknown keys and invalid hideAmounts", () => {
    expect(
      parseUiPreferences({ hideAmounts: "yes", futureFlag: true }),
    ).toEqual({
      hideAmounts: false,
    })
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
