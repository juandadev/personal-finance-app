import { afterEach, describe, expect, mock, test } from "bun:test"
import { cleanup, render, screen } from "@testing-library/react"

let hideAmounts = false

mock.module("@/hooks/use-finance", () => ({
  useFinance: () => ({
    state: {
      preferences: {
        hideAmounts,
        default_currency: "USD",
      },
    },
  }),
}))

const { MoneyAmount } = await import("./money-amount")

afterEach(() => {
  hideAmounts = false
  cleanup()
})

describe("MoneyAmount", () => {
  test("renders the full amount below the compact threshold", () => {
    render(<MoneyAmount amount={99999.5} forceDecimals />)
    expect(screen.getByText("$99,999.50")).toBeTruthy()
  })

  test("renders compact notation at or above $100,000", () => {
    render(<MoneyAmount amount={100000} />)
    expect(screen.getByLabelText("$100,000")).toBeTruthy()
    expect(screen.getAllByText("$100.0K").length).toBeGreaterThan(0)
  })

  test("masks the amount when privacy mode is on", () => {
    hideAmounts = true
    const { container } = render(<MoneyAmount amount={2500} forceDecimals />)

    expect(
      screen.getByLabelText("Amount hidden. Turn off privacy mode to show it."),
    ).toBeTruthy()
    const skeleton = container.querySelector('[data-slot="skeleton"]')
    expect(skeleton).toBeTruthy()
    expect(skeleton?.tagName).toBe("SPAN")
    expect(screen.queryByLabelText("$2,500.00", { exact: true })).toBeNull()
  })

  test("does not expose digits in the accessible name while hidden", () => {
    hideAmounts = true
    render(<MoneyAmount amount={123456} />)

    const label = screen.getByLabelText(
      "Amount hidden. Turn off privacy mode to show it.",
    )
    expect(label.getAttribute("aria-label")).not.toMatch(/\d/)
  })
})
