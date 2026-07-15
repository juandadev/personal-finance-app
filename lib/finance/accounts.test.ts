import { describe, expect, test } from "bun:test"

import { selectPrimaryPaymentAccount } from "@/lib/finance/accounts"
import type { AccountRecord } from "@/lib/finance/types"

function makeAccount(
  id: string,
  type: AccountRecord["type"],
  isPrimary = false,
): AccountRecord {
  return {
    id,
    user_id: "user-1",
    name: id,
    type,
    currency: "USD",
    current_balance_cents: 0,
    is_primary: isPrimary,
  }
}

describe("selectPrimaryPaymentAccount", () => {
  test("uses the account marked as primary", () => {
    const accounts = [
      makeAccount("credit", "credit"),
      makeAccount("savings", "savings", true),
      makeAccount("checking", "checking"),
    ]

    expect(selectPrimaryPaymentAccount(accounts)?.id).toBe("savings")
  })

  test("returns undefined without a primary account", () => {
    expect(
      selectPrimaryPaymentAccount([makeAccount("credit", "credit")]),
    ).toBeUndefined()
  })
})
