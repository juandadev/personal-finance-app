import type { TransactionProtection } from "@/lib/types"

export function getTransactionProtection(input: {
  isPotMovement: boolean
  potName: string | null
  billConcept: string | null
}): TransactionProtection | undefined {
  if (input.isPotMovement) {
    return {
      kind: "pot_movement",
      potName: input.potName ?? undefined,
      isPlannedSave: input.billConcept !== null,
    }
  }

  if (input.billConcept !== null) {
    return { kind: "bill_payment", billConcept: input.billConcept }
  }

  return undefined
}

export function describeProtectedTransaction(
  protection: TransactionProtection,
): string {
  if (protection.kind === "bill_payment") {
    return `This transaction pays the recurring bill '${protection.billConcept}'. Its type, amount, contact, payment method, and date are locked, and it can't be deleted.`
  }

  const subject = protection.isPlannedSave ? "a Planned Save" : "a pot movement"
  const target = protection.potName ? ` for the ${protection.potName} pot` : ""

  return `This transaction is ${subject}${target}. Its type, amount, contact, and date are locked, and it can't be deleted.`
}
