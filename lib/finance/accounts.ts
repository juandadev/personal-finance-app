import type { AccountRecord } from "@/lib/finance/types"

/**
 * The first checking or savings account in the canonical account order is the
 * source for bill and card payments. Callers must preserve that order when
 * loading records (the database loader orders accounts by id).
 */
export function selectPrimaryPaymentAccount(
  accounts: AccountRecord[],
): AccountRecord | undefined {
  return accounts.find(
    (account) => account.type === "checking" || account.type === "savings",
  )
}
