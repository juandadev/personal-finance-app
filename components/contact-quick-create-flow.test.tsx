import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test"
import { useState } from "react"
import { act, cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { createInitialFinanceState } from "@/lib/finance/seed"
import type { FinanceActions } from "@/lib/finance/reducer"
import type { CounterpartyRecord, FinanceState } from "@/lib/finance/types"

const existingContact: CounterpartyRecord = {
  id: "existing-contact",
  user_id: "user-1",
  display_name: "Existing Contact",
  avatar_url: null,
  type: "person",
  theme_color: "chart-1",
  notes: null,
  is_account_owner: false,
}
const addCounterparty = mock<FinanceActions["addCounterparty"]>(async () => ({
  ok: true,
  message: "Contact added.",
}))
const addTransaction = mock<FinanceActions["addTransaction"]>(async () => ({
  ok: true,
  message: "Transaction added.",
}))
const addCategory = mock<FinanceActions["addCategory"]>(async () => ({
  ok: true,
  message: "Category added.",
}))
const financeState: FinanceState = {
  ...createInitialFinanceState(),
  counterparties: [existingContact],
  categories: [
    {
      id: "groceries",
      user_id: "user-1",
      name: "Groceries",
      slug: "groceries",
      theme_color: "chart-1",
    },
  ],
  accounts: [
    {
      id: "account-1",
      user_id: "user-1",
      name: "Bank",
      type: "checking",
      currency: "USD",
      current_balance_cents: 100_000,
      is_primary: true,
    },
  ],
}

mock.module("@/hooks/use-finance", () => ({
  useFinance: () => ({
    state: financeState,
    actions: { addCounterparty, addTransaction, addCategory },
  }),
}))

const { ContactSelectWithQuickCreate } =
  await import("./contact-select-with-quick-create")
const { AddTransactionDialog } =
  await import("./transactions/transaction-dialog")

function ContactForm({
  initialValue = existingContact.id,
}: {
  initialValue?: string
}) {
  const [value, setValue] = useState(initialValue)
  return (
    <form onSubmit={(event) => event.preventDefault()}>
      <input aria-label="Concept" defaultValue="Weekly groceries" />
      <ContactSelectWithQuickCreate
        id="contact"
        value={value}
        onValueChange={setValue}
      />
      <input aria-label="Description" />
      <output data-testid="selected-contact">{value}</output>
      <button type="button" onClick={() => setValue(existingContact.id)}>
        Reset contact
      </button>
    </form>
  )
}

async function openQuickCreate(user: ReturnType<typeof userEvent.setup>) {
  const trigger = screen.getByRole("combobox", { name: "Contact" })
  act(() => trigger.focus())
  await user.keyboard("{ArrowDown}")
  await screen.findByRole("option", { name: "Add a new contact" })
  await user.keyboard("{End}{Enter}")
  const name = await screen.findByRole("textbox", { name: "Name" })
  await waitFor(() => expect(document.activeElement).toBe(name))
  return name
}

beforeEach(() => {
  addCounterparty.mockClear()
  addTransaction.mockClear()
  addCategory.mockClear()
  financeState.counterparties = [existingContact]
})
afterEach(cleanup)

describe("contact quick create keyboard flow", () => {
  test("the shared dropdown still supports category creation and reopening after cancel", async () => {
    const user = userEvent.setup()
    render(<AddTransactionDialog open />)
    const category = screen.getByRole("combobox", { name: "Category" })
    for (const cancel of [true, false]) {
      act(() => category.focus())
      await user.keyboard("{ArrowDown}{End}{Enter}")
      const name = await screen.findByRole("textbox", { name: "Name" })
      await waitFor(() => expect(document.activeElement).toBe(name))
      if (cancel) {
        await user.click(screen.getByRole("button", { name: "Cancel" }))
        expect(category.textContent).toContain("Groceries")
      } else {
        await user.keyboard("New Category")
        await user.click(screen.getByRole("button", { name: "Add Category" }))
        await waitFor(() =>
          expect(category.textContent).toContain("New Category"),
        )
      }
    }
    expect(addCategory).toHaveBeenCalledTimes(1)
    expect(addTransaction).not.toHaveBeenCalled()
  })

  test("submits the real transaction dialog with the new contact and existing draft values", async () => {
    const user = userEvent.setup()
    render(<AddTransactionDialog open />)
    await user.type(screen.getByRole("textbox", { name: "Amount" }), "42.50")
    await user.type(
      screen.getByRole("textbox", { name: "Concept" }),
      "Weekly groceries",
    )
    await user.type(
      screen.getByRole("textbox", { name: "Description" }),
      "Keep this draft",
    )
    await openQuickCreate(user)
    await user.keyboard("New Merchant")
    await user.tab()
    await user.tab()
    await user.tab()
    await user.tab()
    await user.keyboard("{Enter}")
    const trigger = screen.getByRole("combobox", { name: "Contact" })
    await waitFor(() => {
      expect(trigger.textContent).toContain("New Merchant")
      expect(document.activeElement).toBe(trigger)
    })
    expect(addTransaction).not.toHaveBeenCalled()
    await user.tab()
    expect(document.activeElement).toBe(
      screen.getByRole("combobox", { name: "Budget" }),
    )
    await user.click(screen.getByRole("button", { name: "Add Transaction" }))
    await waitFor(() => expect(addTransaction).toHaveBeenCalledTimes(1))
    expect(addTransaction.mock.calls[0]?.[0]).toMatchObject({
      counterparty_id: addCounterparty.mock.calls[0]?.[0].id,
      amount_cents: -4250,
      concept: "Weekly groceries",
      description: "Keep this draft",
      category_id: "groceries",
      payment_method: "bank_account",
    })
  })

  test.each([existingContact.id, ""])(
    "selects the saved contact and resumes Tab from initial value '%s'",
    async (initialValue) => {
      const user = userEvent.setup()
      const view = render(<ContactForm initialValue={initialValue} />)
      await openQuickCreate(user)
      await user.keyboard("New Contact")
      await user.tab()
      await user.tab()
      await user.tab()
      await user.tab()
      expect(document.activeElement).toBe(
        screen.getByRole("button", { name: "Add Contact" }),
      )
      await user.keyboard("{Enter}")

      const trigger = screen.getByRole("combobox", { name: "Contact" })
      await waitFor(() => {
        expect(trigger.textContent).toContain("New Contact")
        expect(screen.getByTestId("selected-contact").textContent).toBe(
          addCounterparty.mock.calls[0]?.[0].id,
        )
        expect(document.activeElement).toBe(trigger)
      })
      await user.tab()
      expect(document.activeElement).toBe(
        screen.getByRole("textbox", { name: "Description" }),
      )
      expect(
        (screen.getByRole("textbox", { name: "Concept" }) as HTMLInputElement)
          .value,
      ).toBe("Weekly groceries")
      // The locally cached option survives until the provider publishes it.
      financeState.counterparties = [
        existingContact,
        {
          ...existingContact,
          ...addCounterparty.mock.calls[0]![0],
        },
      ]
      view.rerender(<ContactForm initialValue={initialValue} />)
      expect(trigger.textContent).toContain("New Contact")
      act(() => trigger.focus())
      await user.keyboard("{ArrowDown}{Home}{Enter}")
      await waitFor(() =>
        expect(trigger.textContent).toContain("Existing Contact"),
      )
      await openQuickCreate(user)
      await user.keyboard("Second Contact")
      await user.click(screen.getByRole("button", { name: "Add Contact" }))
      await waitFor(() =>
        expect(trigger.textContent).toContain("Second Contact"),
      )
      await user.click(screen.getByRole("button", { name: "Reset contact" }))
      expect(trigger.textContent).toContain("Existing Contact")
    },
  )

  test("validation keeps the quick form open without changing the selected contact", async () => {
    const user = userEvent.setup()
    render(<ContactForm />)
    await openQuickCreate(user)
    await user.click(screen.getByRole("button", { name: "Add Contact" }))
    expect(await screen.findByText("Enter a contact name.")).toBeTruthy()
    expect(screen.getByTestId("selected-contact").textContent).toBe(
      existingContact.id,
    )
    expect(addCounterparty).not.toHaveBeenCalled()
  })

  test("cancel preserves the selection and restores focus", async () => {
    const user = userEvent.setup()
    render(<ContactForm />)
    await openQuickCreate(user)
    await user.click(screen.getByRole("button", { name: "Cancel" }))
    const trigger = screen.getByRole("combobox", { name: "Contact" })
    expect(trigger.textContent).toContain("Existing Contact")
    expect(screen.getByTestId("selected-contact").textContent).toBe(
      existingContact.id,
    )
    expect(document.activeElement).toBe(trigger)
    expect(addCounterparty).not.toHaveBeenCalled()
  })

  test("failed saves keep the quick form and current selection for retry", async () => {
    addCounterparty.mockResolvedValueOnce({
      ok: false,
      message: "Could not save contact.",
    })
    const user = userEvent.setup()
    render(<ContactForm />)
    const name = await openQuickCreate(user)
    await user.keyboard("Retry Contact")
    await user.click(screen.getByRole("button", { name: "Add Contact" }))
    expect(await screen.findByText("Could not save contact.")).toBeTruthy()
    expect((name as HTMLInputElement).value).toBe("Retry Contact")
    expect(screen.getByTestId("selected-contact").textContent).toBe(
      existingContact.id,
    )
    await user.click(screen.getByRole("button", { name: "Add Contact" }))
    await waitFor(() =>
      expect(
        screen.getByRole("combobox", { name: "Contact" }).textContent,
      ).toContain("Retry Contact"),
    )
  })
})
