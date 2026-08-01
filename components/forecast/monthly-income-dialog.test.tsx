import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test"
import { useState, type ComponentProps, type ReactNode } from "react"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

type SaveResult =
  | {
      ok: true
      message: string
      data: {
        user_id: string
        default_monthly_income_cents: number
        included_budget_category_ids: string[]
        created_at: string
        updated_at: string
      }
    }
  | {
      ok: false
      message: string
      fieldErrors?: Record<string, string[] | undefined>
    }

const saveCashForecastSettings = mock(
  async (_amountCents: number): Promise<SaveResult> => {
    void _amountCents

    return {
      ok: false,
      message: "Unexpected save.",
    }
  },
)

mock.module("@/hooks/use-finance", () => ({
  useFinance: () => ({
    actions: {
      saveCashForecastSettings,
    },
  }),
}))

mock.module("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: { children: ReactNode; open?: boolean }) =>
    open ? children : null,
  DialogCloseButton: (props: ComponentProps<"button">) => (
    <button type="button" {...props} />
  ),
  DialogContent: ({ children }: { children: ReactNode }) => (
    <div role="dialog" aria-modal="true">
      {children}
    </div>
  ),
  DialogDescription: ({ children }: { children: ReactNode }) => (
    <p>{children}</p>
  ),
  DialogHeader: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  DialogFinanceForm: ({
    actions,
    children,
    ...props
  }: ComponentProps<"form"> & { actions: ReactNode }) => (
    <form {...props}>
      {children}
      {actions}
    </form>
  ),
}))

const { MonthlyIncomeDialog } =
  await import("@/components/forecast/monthly-income-dialog")

beforeEach(() => {
  saveCashForecastSettings.mockClear()
})

afterEach(cleanup)

describe("MonthlyIncomeDialog", () => {
  test("keeps realistic input after a failed save and closes after success", async () => {
    const user = userEvent.setup()

    saveCashForecastSettings
      .mockResolvedValueOnce({
        ok: false,
        message: "Monthly income could not be saved.",
      })
      .mockResolvedValueOnce({
        ok: true,
        message: "Monthly income saved.",
        data: {
          user_id: "user-1",
          default_monthly_income_cents: 450_025,
          included_budget_category_ids: [],
          created_at: "2026-07-12T00:00:00.000Z",
          updated_at: "2026-07-12T00:00:00.000Z",
        },
      })

    function DialogHarness() {
      const [open, setOpen] = useState(true)

      return <MonthlyIncomeDialog open={open} onOpenChange={setOpen} />
    }

    render(<DialogHarness />)

    const input = screen.getByRole("textbox", { name: "Monthly Income" })

    await user.type(input, "4500.25")
    await user.click(screen.getByRole("button", { name: "Save Income" }))

    expect(
      await screen.findByText("Monthly income could not be saved."),
    ).toBeTruthy()
    expect((input as HTMLInputElement).value).toBe("4,500.25")
    expect(
      screen.getByRole("heading", { name: "Set Monthly Income" }),
    ).toBeTruthy()
    expect(saveCashForecastSettings.mock.calls[0]?.[0]).toBe(450_025)

    await user.click(screen.getByRole("button", { name: "Save Income" }))

    await waitFor(() => {
      expect(saveCashForecastSettings).toHaveBeenCalledTimes(2)
      expect(
        screen.queryByRole("heading", { name: "Set Monthly Income" }),
      ).toBeNull()
    })
    expect(saveCashForecastSettings.mock.calls[1]?.[0]).toBe(450_025)
  })
})
