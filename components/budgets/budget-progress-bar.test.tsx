import { describe, expect, test } from "bun:test"
import { cleanup, render, screen } from "@testing-library/react"

const { BudgetProgressBar } = await import("./budget-progress-bar")

describe("BudgetProgressBar", () => {
  test("uses neutral track styling when within budget", () => {
    render(<BudgetProgressBar spent={200} maximum={500} color="chart-1" />)

    expect(screen.getByRole("progressbar").className).toContain("bg-background")
    expect(screen.getByRole("progressbar").className).not.toContain(
      "bg-destructive/15",
    )

    cleanup()
  })

  test("uses destructive track styling when over budget", () => {
    render(<BudgetProgressBar spent={545} maximum={500} color="chart-1" />)

    expect(screen.getByRole("progressbar").className).toContain(
      "bg-destructive/15",
    )
  })
})
