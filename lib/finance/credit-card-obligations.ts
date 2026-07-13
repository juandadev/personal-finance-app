import { getBillOccurrenceStatementCycle } from "@/lib/finance/recurring-bill-schedule"
import { resolveRecurringBillOccurrences } from "@/lib/finance/recurring-bill-schedule"
import type {
  CreditCardPaymentRecord,
  CreditCardRecord,
  CreditCardStatementRecord,
  RecurringBillPaymentRecord,
  RecurringBillRecord,
  TransactionRecord,
} from "@/lib/finance/types"

export interface CreditCardPendingBillObligationLine {
  key: string
  billId: string
  counterpartyId: string
  categoryId: string
  label: string
  dueDate: string
  amountCents: number
}

export interface CreditCardStatementChargeLine {
  key: string
  transactionId: string
  label: string
  postedAt: string
  amountCents: number
}

export interface CreditCardObligation {
  key: string
  cardId: string
  cardName: string
  statementId: string | null
  periodStart: string
  periodEnd: string
  paymentDueDate: string
  statementAmountCents: number
  pendingBillAmountCents: number
  amountCents: number
  lifecycleStatus: CreditCardStatementRecord["lifecycle_status"]
  paidAt: string | null
  isPaid: boolean
  isVirtual: boolean
  pendingBillLines: CreditCardPendingBillObligationLine[]
  statementChargeLines: CreditCardStatementChargeLine[]
}

interface CreditCardObligationInput {
  cards: CreditCardRecord[]
  statements: CreditCardStatementRecord[]
  cardPayments: CreditCardPaymentRecord[]
  transactions: TransactionRecord[]
  recurringBills: RecurringBillRecord[]
  recurringBillPayments: RecurringBillPaymentRecord[]
  asOfDate: string
  throughDate: string
  archiveCutoffTimezone?: string
}

interface PendingCycle {
  cardId: string
  periodStart: string
  periodEnd: string
  paymentDueDate: string
  lines: CreditCardPendingBillObligationLine[]
}

function groupBillPayments(payments: RecurringBillPaymentRecord[]) {
  const grouped = new Map<string, RecurringBillPaymentRecord[]>()

  for (const payment of payments) {
    const billPayments = grouped.get(payment.recurring_bill_id) ?? []

    billPayments.push(payment)
    grouped.set(payment.recurring_bill_id, billPayments)
  }

  return grouped
}

function groupStatements(statements: CreditCardStatementRecord[]) {
  const grouped = new Map<string, CreditCardStatementRecord[]>()

  for (const statement of statements) {
    const cardStatements = grouped.get(statement.credit_card_id) ?? []

    cardStatements.push(statement)
    grouped.set(statement.credit_card_id, cardStatements)
  }

  return grouped
}

function buildPendingCycles(
  input: CreditCardObligationInput,
): Map<string, PendingCycle> {
  const cardsById = new Map(input.cards.map((card) => [card.id, card]))
  const statementsByCardId = groupStatements(input.statements)
  const paymentsByBillId = groupBillPayments(input.recurringBillPayments)
  const cycles = new Map<string, PendingCycle>()

  for (const bill of input.recurringBills) {
    if (!bill.credit_card_id) {
      continue
    }

    const card = cardsById.get(bill.credit_card_id)

    if (!card) {
      continue
    }

    const occurrences = resolveRecurringBillOccurrences(
      bill,
      paymentsByBillId.get(bill.id) ?? [],
      input.asOfDate,
      {
        throughDate: input.throughDate,
        archiveCutoffTimezone: input.archiveCutoffTimezone,
      },
    )

    for (const occurrence of occurrences) {
      if (occurrence.status === "paid" || occurrence.status === "skipped") {
        continue
      }

      const cycle = getBillOccurrenceStatementCycle(
        occurrence.dueDate,
        card,
        statementsByCardId.get(card.id) ?? [],
        input.asOfDate,
      )
      const cycleKey = `${card.id}:${cycle.periodStart}`
      const group = cycles.get(cycleKey) ?? {
        cardId: card.id,
        periodStart: cycle.periodStart,
        periodEnd: cycle.periodEnd,
        paymentDueDate: cycle.paymentDueDate,
        lines: [],
      }

      group.lines.push({
        key: `bill:${bill.id}:${occurrence.dueDate}`,
        billId: bill.id,
        counterpartyId: bill.counterparty_id,
        categoryId: bill.category_id,
        label: bill.concept,
        dueDate: occurrence.dueDate,
        amountCents: occurrence.amountCents,
      })
      cycles.set(cycleKey, group)
    }
  }

  for (const cycle of cycles.values()) {
    cycle.lines.sort((left, right) => {
      const dueDateComparison = left.dueDate.localeCompare(right.dueDate)

      return dueDateComparison !== 0
        ? dueDateComparison
        : left.billId.localeCompare(right.billId)
    })
  }

  return cycles
}

function buildStatementChargeLines(
  transactions: TransactionRecord[],
): Map<string, CreditCardStatementChargeLine[]> {
  const linesByStatementId = new Map<string, CreditCardStatementChargeLine[]>()

  for (const transaction of transactions) {
    if (
      transaction.payment_method !== "credit_card" ||
      !transaction.credit_card_statement_id
    ) {
      continue
    }

    const lines =
      linesByStatementId.get(transaction.credit_card_statement_id) ?? []

    lines.push({
      key: `transaction:${transaction.id}`,
      transactionId: transaction.id,
      label: transaction.concept,
      postedAt: transaction.posted_at,
      amountCents: Math.abs(transaction.amount_cents),
    })
    linesByStatementId.set(transaction.credit_card_statement_id, lines)
  }

  for (const lines of linesByStatementId.values()) {
    lines.sort((left, right) => {
      const dateComparison = left.postedAt.localeCompare(right.postedAt)

      return dateComparison !== 0
        ? dateComparison
        : left.transactionId.localeCompare(right.transactionId)
    })
  }

  return linesByStatementId
}

export function buildCreditCardObligations(
  input: CreditCardObligationInput,
): CreditCardObligation[] {
  const cardsById = new Map(input.cards.map((card) => [card.id, card]))
  const pendingCycles = buildPendingCycles(input)
  const chargeLinesByStatementId = buildStatementChargeLines(input.transactions)
  const paidStatementIds = new Set(
    input.cardPayments.map((payment) => payment.statement_id),
  )
  const existingCycleKeys = new Set<string>()
  const obligations: CreditCardObligation[] = input.statements.map(
    (statement) => {
      const card = cardsById.get(statement.credit_card_id)
      const cycleKey = `${statement.credit_card_id}:${statement.period_start}`
      const pendingBillLines = pendingCycles.get(cycleKey)?.lines ?? []
      const pendingBillAmountCents = pendingBillLines.reduce(
        (sum, line) => sum + line.amountCents,
        0,
      )

      existingCycleKeys.add(cycleKey)

      return {
        key: `statement:${statement.id}`,
        cardId: statement.credit_card_id,
        cardName: card?.nickname ?? "Credit Card",
        statementId: statement.id,
        periodStart: statement.period_start,
        periodEnd: statement.period_end,
        paymentDueDate: statement.payment_due_date,
        statementAmountCents: statement.statement_amount_cents,
        pendingBillAmountCents,
        amountCents: statement.statement_amount_cents + pendingBillAmountCents,
        lifecycleStatus: statement.lifecycle_status,
        paidAt: statement.paid_at,
        isPaid:
          statement.lifecycle_status === "paid" ||
          paidStatementIds.has(statement.id),
        isVirtual: false,
        pendingBillLines,
        statementChargeLines: chargeLinesByStatementId.get(statement.id) ?? [],
      }
    },
  )

  for (const [cycleKey, cycle] of pendingCycles) {
    if (existingCycleKeys.has(cycleKey)) {
      continue
    }

    const card = cardsById.get(cycle.cardId)
    const pendingBillAmountCents = cycle.lines.reduce(
      (sum, line) => sum + line.amountCents,
      0,
    )

    obligations.push({
      key: `virtual-statement:${cycle.cardId}:${cycle.periodStart}`,
      cardId: cycle.cardId,
      cardName: card?.nickname ?? "Credit Card",
      statementId: null,
      periodStart: cycle.periodStart,
      periodEnd: cycle.periodEnd,
      paymentDueDate: cycle.paymentDueDate,
      statementAmountCents: 0,
      pendingBillAmountCents,
      amountCents: pendingBillAmountCents,
      lifecycleStatus: "open",
      paidAt: null,
      isPaid: false,
      isVirtual: true,
      pendingBillLines: cycle.lines,
      statementChargeLines: [],
    })
  }

  return obligations
}
