import type { FinanceState, TransactionRecord } from "@/lib/finance/types"

export function getAccountOwnerContactId(state: FinanceState): string | null {
  return (
    state.counterparties.find((counterparty) => counterparty.is_account_owner)
      ?.id ?? null
  )
}

export function isPotMovementTransaction(
  transaction: TransactionRecord,
  ownerContactId: string | null,
): boolean {
  return (
    ownerContactId !== null && transaction.counterparty_id === ownerContactId
  )
}
