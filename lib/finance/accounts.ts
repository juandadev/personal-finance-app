import type { AccountRecord } from "@/lib/finance/types"

export function selectPrimaryPaymentAccount(
  accounts: AccountRecord[],
): AccountRecord | undefined {
  return accounts.find((account) => account.is_primary)
}
