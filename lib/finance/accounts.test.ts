import { describe, expect, test } from "bun:test"

import { selectPrimaryPaymentAccount } from "@/lib/finance/accounts"
import type { AccountRecord } from "@/lib/finance/types"

function makeAccount(id: string, type: AccountRecord["type"]): AccountRecord {
  return {
    id,
    user_id: "user-1",
    name: id,
    type,
    currency: "USD",
    current_balance_cents: 0,
  }
}

describe("selectPrimaryPaymentAccount", () => {
  test("uses the first checking or savings account in canonical order", () => {
    const accounts = [
      makeAccount("credit", "credit"),
      makeAccount("savings", "savings"),
      makeAccount("checking", "checking"),
    ]

    expect(selectPrimaryPaymentAccount(accounts)?.id).toBe("savings")
  })

  test("returns undefined without a payment account", () => {
    expect(
      selectPrimaryPaymentAccount([makeAccount("credit", "credit")]),
    ).toBeUndefined()
  })
})
