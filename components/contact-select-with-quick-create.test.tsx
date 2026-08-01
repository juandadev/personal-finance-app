import { describe, expect, test } from "bun:test"

import { filterSelectableCounterparties } from "@/lib/finance/contact-selection"
import type { CounterpartyRecord } from "@/lib/finance/types"

const counterparties: CounterpartyRecord[] = [
  {
    id: "owner-1",
    user_id: "user-1",
    display_name: "Juan Martinez",
    avatar_url: null,
    type: "person",
    theme_color: "finance-grey",
    notes: "Account owner",
    is_account_owner: true,
  },
  {
    id: "merchant-1",
    user_id: "user-1",
    display_name: "Employer",
    avatar_url: null,
    type: "merchant",
    theme_color: "chart-2",
    notes: null,
    is_account_owner: false,
  },
]

describe("filterSelectableCounterparties", () => {
  test("hides the account owner from manual transaction entry", () => {
    expect(
      filterSelectableCounterparties(counterparties, {
        excludeAccountOwner: true,
        selectedId: "merchant-1",
      }).map((counterparty) => counterparty.display_name),
    ).toEqual(["Employer"])
  })

  test("keeps a selected account owner visible when editing a legacy transaction", () => {
    expect(
      filterSelectableCounterparties(counterparties, {
        excludeAccountOwner: true,
        selectedId: "owner-1",
      }).map((counterparty) => counterparty.display_name),
    ).toEqual(["Juan Martinez", "Employer"])
  })
})
