import { afterEach, describe, expect, mock, test } from "bun:test"
import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { DatePicker } from "@/components/ui/date-picker"

afterEach(() => {
  cleanup()
  mock.restore()
})

describe("DatePicker", () => {
  test("shows the shared display date instead of a native date input", () => {
    render(<DatePicker id="posted-at" value="2026-08-24" onChange={() => {}} />)

    expect(screen.queryByDisplayValue("2026-08-24")).toBeNull()
    expect(screen.getByRole("button", { name: /aug 24, 2026/i })).toBeTruthy()
  })

  test("selects a calendar day and reports an ISO date", async () => {
    const user = userEvent.setup()
    const onChange = mock(() => {})

    render(
      <DatePicker
        id="posted-at"
        value="2026-08-24"
        onChange={onChange}
        min="2026-08-01"
        max="2026-08-24"
      />,
    )

    await user.click(screen.getByRole("button", { name: /aug 24, 2026/i }))
    await user.click(
      screen.getByRole("button", { name: "Saturday, August 1st, 2026" }),
    )

    expect(onChange).toHaveBeenCalledWith("2026-08-01")
  })

  test("clears an optional date", async () => {
    const user = userEvent.setup()
    const onChange = mock(() => {})

    render(
      <DatePicker
        id="due-date"
        value="2026-09-01"
        onChange={onChange}
        clearable
      />,
    )

    await user.click(screen.getByRole("button", { name: "Clear date" }))

    expect(onChange).toHaveBeenCalledWith(null)
  })
})
