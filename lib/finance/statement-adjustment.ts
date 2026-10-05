export const STATEMENT_ADJUSTMENT_CONCEPT = "Statement adjustment"
export const STATEMENT_ADJUSTMENT_PAYMENT_METHOD =
  "credit_card_statement_adjustment" as const

export class StatementAdjustmentConflictError extends Error {
  readonly currentTotalCents: number

  constructor(currentTotalCents: number) {
    super(
      "This statement changed. Review the new amount and enter what the bank wants again.",
    )
    this.name = "StatementAdjustmentConflictError"
    this.currentTotalCents = currentTotalCents
  }
}

export interface AdjustmentStatementChoice {
  id: string
  lifecycleStatus: "open" | "closed" | "paid"
  totalAmount: number
  periodStart: string
  periodEnd: string
  paymentDueDate: string
}

export function isStatementAdjustmentPaymentMethod(
  paymentMethod: string | undefined,
) {
  return paymentMethod === STATEMENT_ADJUSTMENT_PAYMENT_METHOD
}

export function adjustmentPostedAt(
  periodStart: string,
  periodEnd: string,
  today: string,
) {
  if (today >= periodStart && today <= periodEnd) {
    return today
  }

  if (today > periodEnd) {
    return periodEnd
  }

  return periodStart
}

export function statementAdjustmentTransactionCents(
  currentTotalCents: number,
  targetTotalCents: number,
) {
  return currentTotalCents - targetTotalCents
}

export function parseNonNegativeDollarCents(value: string) {
  const normalized = value.trim().replaceAll(",", "")

  if (!normalized || !/^\d+(\.\d{1,2})?$/.test(normalized)) {
    return null
  }

  const amount = Number(normalized)

  if (!Number.isFinite(amount)) {
    return null
  }

  return Math.round(amount * 100)
}

export function selectDefaultAdjustmentStatement<
  T extends AdjustmentStatementChoice,
>(statements: T[], today: string) {
  const unpaid = statements.filter(
    (statement) => statement.lifecycleStatus !== "paid",
  )
  const withBalance = unpaid
    .filter((statement) => statement.totalAmount > 0)
    .sort((left, right) => {
      const dueDateComparison = left.paymentDueDate.localeCompare(
        right.paymentDueDate,
      )

      return dueDateComparison !== 0
        ? dueDateComparison
        : left.periodStart.localeCompare(right.periodStart)
    })

  if (withBalance.length > 0) {
    return withBalance[0]
  }

  return (
    unpaid.find(
      (statement) =>
        statement.periodStart <= today && today <= statement.periodEnd,
    ) ?? unpaid[0]
  )
}

export function statementPeriodHasCardTransactions(
  transactions: Array<{
    credit_card_id: string | null
    posted_at: string
  }>,
  cardId: string,
  periodStart: string,
  periodEnd: string,
) {
  return transactions.some((transaction) => {
    if (transaction.credit_card_id !== cardId) {
      return false
    }

    const postedAt = transaction.posted_at.slice(0, 10)

    return postedAt >= periodStart && postedAt <= periodEnd
  })
}
