import type { CounterpartyRecord } from "@/lib/finance/types"

export function filterSelectableCounterparties(
  counterparties: CounterpartyRecord[],
  options: { excludeAccountOwner?: boolean; selectedId: string },
): CounterpartyRecord[] {
  if (!options.excludeAccountOwner) {
    return counterparties
  }

  return counterparties.filter(
    (counterparty) =>
      !counterparty.is_account_owner || counterparty.id === options.selectedId,
  )
}
