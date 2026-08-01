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

const { PrivacyValue } = await import("./privacy-value")

afterEach(() => {
  hideAmounts = false
  cleanup()
})

describe("PrivacyValue", () => {
  test("renders children when privacy mode is off", () => {
    render(
      <PrivacyValue>
        <span>**** 4242</span>
      </PrivacyValue>,
    )

    expect(screen.getByText("**** 4242")).toBeTruthy()
  })

  test("masks children when privacy mode is on", () => {
    hideAmounts = true
    const { container } = render(
      <PrivacyValue>
        <span>**** 4242</span>
      </PrivacyValue>,
    )

    expect(
      screen.getByLabelText("Hidden. Turn off privacy mode to show it."),
    ).toBeTruthy()
    expect(container.querySelector('[data-slot="skeleton"]')?.tagName).toBe(
      "SPAN",
    )
    expect(screen.queryByLabelText("**** 4242")).toBeNull()
  })

  test("supports a custom hidden label", () => {
    hideAmounts = true
    render(
      <PrivacyValue hiddenLabel="Card number hidden. Turn off privacy mode.">
        4242
      </PrivacyValue>,
    )

    expect(
      screen.getByLabelText("Card number hidden. Turn off privacy mode."),
    ).toBeTruthy()
  })
})
